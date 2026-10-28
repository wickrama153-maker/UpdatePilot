import { AgentDaemon } from './daemon';
import { AgentClient } from './client';
import { loadConfig } from './config';
import { performFullDiscovery } from './scanner';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const config = loadConfig();

  if (command === '--pair') {
    const token = args[1] || process.env.PAIRING_SECRET || 'updatepilot_pair_token_default_12345';
    const client = new AgentClient();
    const success = await client.pair(token);
    if (success) {
      console.log('Device successfully paired with UpdatePilot backend!');
      process.exit(0);
    } else {
      console.error('Pairing failed. Check pairing token and backend connection.');
      process.exit(1);
    }
  }

  if (command === '--scan') {
    console.log('Running ad-hoc local application discovery scan...');
    const apps = await performFullDiscovery();
    console.log(`Discovered ${apps.length} applications.`);

    const client = new AgentClient();
    if (config.deviceId && config.agentToken) {
      console.log('Reporting scan results to backend...');
      await client.submitScanReport(undefined, apps);
    } else {
      console.log('Agent is not paired. Run with --pair <token> to report to backend.');
    }
    process.exit(0);
  }

  if (command === '--status') {
    console.log('UpdatePilot Windows Local Agent Status:');
    console.log(`Device Name:     ${config.deviceName}`);
    console.log(`OS:              ${config.osName} ${config.osVersion} (${config.architecture})`);
    console.log(`Agent Version:   ${config.agentVersion}`);
    console.log(`Backend URL:     ${config.backendUrl}`);
    console.log(`Paired:          ${Boolean(config.deviceId && config.agentToken)}`);
    console.log(`Device ID:       ${config.deviceId || 'None'}`);
    process.exit(0);
  }

  // Default: Start Daemon
  const daemon = new AgentDaemon();
  await daemon.start();

  process.on('SIGINT', () => {
    daemon.stop();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    daemon.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal agent error:', err);
  process.exit(1);
});
