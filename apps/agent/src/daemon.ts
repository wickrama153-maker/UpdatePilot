import { AgentClient } from './client';
import { loadConfig } from './config';
import { performFullDiscovery } from './scanner';
import { executeApprovedUpdate } from './updater';

export class AgentDaemon {
  private client: AgentClient;
  private isRunning = false;
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.client = new AgentClient();
  }

  public async start() {
    this.isRunning = true;
    console.log('[Daemon] UpdatePilot Agent Daemon started.');

    // Initial heartbeat
    await this.heartbeatAndPoll();

    const config = loadConfig();
    this.timer = setInterval(() => {
      this.heartbeatAndPoll();
    }, config.pollIntervalMs || 5000);
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[Daemon] UpdatePilot Agent Daemon stopped.');
  }

  private async heartbeatAndPoll() {
    if (!this.isRunning || this.isProcessing) return;

    try {
      const config = loadConfig();
      if (!config.deviceId || !config.agentToken) {
        console.log('[Daemon] Agent is not yet paired. Run with --pair <token> to pair with backend.');
        return;
      }

      await this.client.sendHeartbeat();
      const jobs = await this.client.checkPendingJobs();

      if (!jobs) return;

      // 1. Check for Pending Scan Job
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

      // 2. Check for Approved Update Job
      if (jobs.updateJob) {
        this.isProcessing = true;
        console.log(`[Daemon] Received approved update job ${jobs.updateJob.id} for ${jobs.updateJob.packageId}...`);
        try {
          const result = await executeApprovedUpdate(
            jobs.updateJob.packageId,
            jobs.updateJob.targetVersion
          );
          await this.client.reportJobStatus(jobs.updateJob.id, result);
        } catch (err: any) {
          console.error('[Daemon] Update execution error:', err.message);
          await this.client.reportJobStatus(jobs.updateJob.id, {
            status: 'FAILED',
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
