import { AgentClient } from './client';
import { loadConfig } from './config';
import { performFullDiscovery } from './scanner';
import { executeApprovedUpdate } from './updater';

export class AgentDaemon {
  private client: AgentClient;
  private isRunning = false;
  private isProcessing = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.client = new AgentClient();
  }

  public async start() {
    this.isRunning = true;
    const config = loadConfig();
    console.log(`[Daemon] UpdatePilot Agent Daemon started (backend: ${config.backendUrl}).`);

    // Initial heartbeat and poll
    await this.sendBeat();
    await this.pollJobs();

    // Independent heartbeat timer so active updates never let device drop OFFLINE
    this.heartbeatTimer = setInterval(() => {
      this.sendBeat();
    }, 15000);

    // Job polling timer
    this.pollTimer = setInterval(() => {
      this.pollJobs();
    }, config.pollIntervalMs || 5000);
  }

  public stop() {
    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    console.log('[Daemon] UpdatePilot Agent Daemon stopped.');
  }

  private async sendBeat() {
    if (!this.isRunning) return;
    const config = loadConfig();
    if (!config.deviceId || !config.agentToken) return;
    this.client.updateConfig();
    await this.client.sendHeartbeat(this.isProcessing ? 'BUSY' : 'ONLINE');
  }

  private async pollJobs() {
    if (!this.isRunning || this.isProcessing) return;

    try {
      const config = loadConfig();
      if (!config.deviceId || !config.agentToken) {
        console.log('[Daemon] Agent is not yet paired. Run with --pair <token> to pair with backend.');
        return;
      }

      this.client.updateConfig();
      const jobs = await this.client.checkPendingJobs();
      if (!jobs) return;

      // 1. Pending Scan Job
      if (jobs.scanJob) {
        this.isProcessing = true;
        console.log(`[Daemon] Received scan job ${jobs.scanJob.id}. Running full scan...`);
        try {
          const apps = await performFullDiscovery();
          await this.client.submitScanReport(jobs.scanJob.id, apps);
        } catch (err: any) {
          console.error('[Daemon] Scan failed:', err.message);
          await this.client.submitScanReport(jobs.scanJob.id, [], err.message);
        } finally {
          this.isProcessing = false;
        }
      }

      // 2. Approved / Dispatched Update Job
      if (jobs.updateJob) {
        this.isProcessing = true;
        const job = jobs.updateJob;
        console.log(`[Daemon] Executing update job ${job.id} (${job.packageId} -> ${job.targetVersion})...`);
        try {
          const result = await executeApprovedUpdate(job.packageId, job.targetVersion, {
            onProgress: async (evt) => {
              await this.client.reportJobStatus(job.id, {
                status: evt.status,
                stage: evt.stage,
                progressPercent: evt.progressPercent,
                command: evt.command,
                stdoutLog: evt.stdoutLog,
                stderrLog: evt.stderrLog,
                exitCode: null,
                verificationResult: evt.verificationResult || evt.stage,
                resultingVersion: null,
                requiresReboot: false,
              });
            },
            checkCancelled: async () => {
              const state = await this.client.getJobState(job.id);
              return state?.status === 'CANCELLED';
            },
          });

          await this.client.reportJobStatus(job.id, result);
        } catch (err: any) {
          console.error('[Daemon] Update execution error:', err.message);
          await this.client.reportJobStatus(job.id, {
            status: 'FAILED',
            stage: 'Execution failed',
            progressPercent: null,
            exitCode: 1,
            verificationResult: `Execution error: ${err.message}`,
            resultingVersion: null,
            requiresReboot: false,
            errorSummary: err.message,
          });
        } finally {
          this.isProcessing = false;
        }
      }
    } catch (err: any) {
      console.warn('[Daemon] Loop warning:', err.message);
    }
  }
}
