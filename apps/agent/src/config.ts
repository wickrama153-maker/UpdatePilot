import fs from 'fs';
import path from 'path';
import os from 'os';

export interface AgentConfig {
  backendUrl: string;
  deviceId: string | null;
  agentToken: string | null;
  deviceName: string;
  osName: string;
  osVersion: string;
  architecture: string;
  agentVersion: string;
  pollIntervalMs: number;
}

const CONFIG_PATH = path.join(process.cwd(), 'agent-config.json');

const DEFAULT_CONFIG: AgentConfig = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:4000',
  deviceId: null,
  agentToken: null,
  deviceName: os.hostname(),
  osName: 'Windows',
  osVersion: `${os.type()} ${os.release()}`,
  architecture: os.arch(),
  agentVersion: '1.0.0',
  pollIntervalMs: 5000,
};

export function loadConfig(): AgentConfig {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...data };
    } catch (e) {
      console.warn('[Agent Config] Warning: Failed to parse agent-config.json, using defaults.');
    }
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: Partial<AgentConfig>) {
  const current = loadConfig();
  const merged = { ...current, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}
