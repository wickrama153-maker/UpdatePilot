import axios, { AxiosInstance } from 'axios';
import { loadConfig, saveConfig } from './config';
import { DiscoveredApp } from './types';
import { UpdateExecutionResult } from './updater';

export class AgentClient {
  private http: AxiosInstance;
  private config = loadConfig();

  constructor() {
    this.http = axios.create({
      baseURL: this.config.backendUrl,
      timeout: 15000,
    });
  }

  public updateConfig() {
    this.config = loadConfig();
  }

  private getAuthHeaders() {
    return {
      'x-agent-device-id': this.config.deviceId || '',
      'x-agent-token': this.config.agentToken || '',
    };
  }

  public async pair(pairingToken: string): Promise<boolean> {
    try {
      console.log(`[Agent] Pairing with backend at ${this.config.backendUrl}...`);
      const res = await this.http.post('/api/v1/devices/pair', {
        deviceName: this.config.deviceName,
        osName: this.config.osName,
        osVersion: this.config.osVersion,
        architecture: this.config.architecture,
        agentVersion: this.config.agentVersion,
        pairingToken,
      });

      if (res.data?.success) {
        const { device, agentToken } = res.data.data;
        saveConfig({
          deviceId: device.id,
          agentToken,
        });
        this.updateConfig();
        console.log(`[Agent] Successfully paired! Device ID: ${device.id}`);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[Agent] Pairing failed:', err.response?.data?.error || err.message);
      return false;
    }
  }

  public async sendHeartbeat(): Promise<boolean> {
    if (!this.config.deviceId || !this.config.agentToken) return false;
    try {
      await this.http.post(
        '/api/v1/agent/heartbeat',
        {
          agentVersion: this.config.agentVersion,
          status: 'ONLINE',
        },
        { headers: this.getAuthHeaders() }
      );
      return true;
    } catch (err: any) {
      // Disconnection / network failure handled gracefully
      return false;
    }
  }

  public async checkPendingJobs(): Promise<{ scanJob: any; updateJob: any } | null> {
    if (!this.config.deviceId || !this.config.agentToken) return null;
    try {
      const res = await this.http.get('/api/v1/agent/pending-jobs', {
        headers: this.getAuthHeaders(),
      });
      return res.data?.data || null;
    } catch (err: any) {
      return null;
    }
  }

  public async submitScanReport(jobId: string | undefined, applications: DiscoveredApp[], errorSummary?: string) {
    if (!this.config.deviceId || !this.config.agentToken) return;
    try {
      await this.http.post(
        '/api/v1/agent/scan-results',
        {
          deviceId: this.config.deviceId,
          jobId,
          applications,
          errorSummary,
        },
        { headers: this.getAuthHeaders() }
      );
      console.log(`[Agent] Reported ${applications.length} applications to backend.`);
    } catch (err: any) {
      console.error('[Agent] Failed to report scan results:', err.response?.data?.error || err.message);
    }
  }

  public async reportJobStatus(jobId: string, result: UpdateExecutionResult) {
    if (!this.config.deviceId || !this.config.agentToken) return;
    try {
      await this.http.post(
        '/api/v1/agent/job-status',
        {
          jobId,
          deviceId: this.config.deviceId,
          status: result.status,
          exitCode: result.exitCode,
          verificationResult: result.verificationResult,
          errorSummary: result.errorSummary,
          requiresReboot: result.requiresReboot,
          resultingVersion: result.resultingVersion,
        },
        { headers: this.getAuthHeaders() }
      );
      console.log(`[Agent] Reported update status [${result.status}] for job ${jobId}.`);
    } catch (err: any) {
      console.error('[Agent] Failed to report job status:', err.response?.data?.error || err.message);
    }
  }
}
