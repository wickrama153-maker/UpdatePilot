import readline from 'readline';
import { AgentDaemon } from './daemon';
import { AgentClient } from './client';
import { loadConfig, saveConfig } from './config';
import { performFullDiscovery } from './scanner';

function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let pairRequested = false;
  let pairToken: string | null = null;
  let serverUrl: string | null = null;
  let scanRequested = false;
  let statusRequested = false;
  let helpRequested = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--pair' || arg === '-p') {
      pairRequested = true;
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        pairToken = args[++i];
      }
    } else if (arg === '--server' || arg === '--backend' || arg === '-s') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        serverUrl = args[++i];
      }
    } else if (arg === '--scan') {
      scanRequested = true;
    } else if (arg === '--status') {
      statusRequested = true;
    } else if (arg === '--help' || arg === '-h') {
      helpRequested = true;
    }
  }

  if (helpRequested) {
    console.log(`
UpdatePilot Windows Local Agent
Usage:
  updatepilot-agent [options]

Options:
  --server, -s <url>    Set UpdatePilot backend server URL (e.g. http://localhost:4000 or https://updatepilot.cloud)
  --pair, -p [token]    Pair this computer with an UpdatePilot account using pairing token
  --scan                Perform one-shot application discovery scan and submit report
  --status              Print current device identity, pairing status, and server URL
  --help, -h            Show this help message
`);
    process.exit(0);
  }

  // Update server URL if specified via CLI
  if (serverUrl) {
    saveConfig({ backendUrl: serverUrl.replace(/\/+$/, '') });
    console.log(`[Agent] Server URL set to: ${serverUrl}`);
  }

  let config = loadConfig();

  if (statusRequested) {
    console.log('==================================================');
    console.log('UpdatePilot Windows Local Agent Status:');
    console.log('==================================================');
    console.log(`Device Name:     ${config.deviceName}`);
    console.log(`Hardware ID:     ${config.hardwareId}`);
    console.log(`OS:              ${config.osName} ${config.osVersion} (${config.architecture})`);
    console.log(`Agent Version:   ${config.agentVersion}`);
    console.log(`Backend URL:     ${config.backendUrl}`);
    console.log(`Paired:          ${Boolean(config.deviceId && config.agentToken)}`);
    console.log(`Device ID:       ${config.deviceId || 'None'}`);
    console.log('==================================================');
    process.exit(0);
  }

  // Handle Pairing
  if (pairRequested) {
    if (!pairToken) {
      if (process.stdin.isTTY) {
        pairToken = await promptUser('Enter 8-character Pairing Token from UpdatePilot Web Dashboard: ');
      } else {
        pairToken = process.env.PAIRING_SECRET || 'updatepilot_pair_token_default_12345';
      }
    }

    if (!pairToken) {
      console.error('[Agent] Error: No pairing token provided.');
      process.exit(1);
    }

    const client = new AgentClient();
    const success = await client.pair(pairToken);
    if (success) {
      console.log('[Agent] Device successfully paired with UpdatePilot account!');
      process.exit(0);
    } else {
      console.error('[Agent] Pairing failed. Please verify the pairing token in your web dashboard.');
      process.exit(1);
    }
  }

  if (scanRequested) {
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

  // Default: Start Daemon
  // If running interactively and not paired, prompt user to pair first
  if (!config.deviceId || !config.agentToken) {
    if (process.stdin.isTTY) {
      console.log('==================================================');
      console.log('UpdatePilot Windows Local Agent');
      console.log('==================================================');
      console.log(`Device: ${config.deviceName} (${config.hardwareId})`);
      console.log(`Server: ${config.backendUrl}`);
      console.log('Status: UNPAIRED');
      console.log('--------------------------------------------------');
      const token = await promptUser('Enter Pairing Token from UpdatePilot Web Dashboard (or press Enter to skip): ');
      if (token) {
        const client = new AgentClient();
        const success = await client.pair(token);
        if (success) {
          console.log('[Agent] Successfully paired! Starting daemon...');
          config = loadConfig();
        } else {
          console.warn('[Agent] Pairing failed. Starting daemon in unpaired mode.');
        }
      }
    }
  }

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
