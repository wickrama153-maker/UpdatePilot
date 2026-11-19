import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';

export interface AgentConfig {
  backendUrl: string;
  deviceId: string | null;
  agentToken: string | null;
  deviceName: string;
  hardwareId: string;
  osName: string;
  osVersion: string;
  architecture: string;
  agentVersion: string;
  pollIntervalMs: number;
}

export function resolveHardwareId(): string {
  try {
    if (process.platform === 'win32') {
      const output = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
        encoding: 'utf-8',
        windowsHide: true,
      });
      const match = output.match(/MachineGuid\s+REG_SZ\s+([A-Fa-f0-9-]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch {
    // Fallback if reg query fails or non-windows
  }
  return crypto.randomUUID();
}

export function resolveConfigPath(): string {
  if (process.env.UPDATEPILOT_AGENT_CONFIG && process.env.UPDATEPILOT_AGENT_CONFIG.trim()) {
    return path.resolve(process.env.UPDATEPILOT_AGENT_CONFIG.trim());
  }
  // Local project/cwd config (preserves dev and test environments)
  const localConfig = path.join(process.cwd(), 'agent-config.json');
  if (fs.existsSync(localConfig)) {
    return localConfig;
  }
  // Standalone installed Windows Agent in %LOCALAPPDATA%\UpdatePilotAgent
  if (process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'UpdatePilotAgent', 'agent-config.json');
  }
  return localConfig;
}

function resolveEnvBackendUrl(): string | null {
  if (process.env.BACKEND_URL && process.env.BACKEND_URL.trim()) {
    return process.env.BACKEND_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.API_BASE_URL && process.env.API_BASE_URL.trim()) {
    return process.env.API_BASE_URL.trim().replace(/\/api\/v\d+\/?$/, '').replace(/\/+$/, '');
  }
  return null;
}

const DEFAULT_CONFIG: AgentConfig = {
  backendUrl: resolveEnvBackendUrl() || 'http://localhost:4000',
  deviceId: null,
  agentToken: null,
  deviceName: os.hostname(),
  hardwareId: resolveHardwareId(),
  osName: 'Windows',
  osVersion: `${os.type()} ${os.release()}`,
  architecture: os.arch(),
  agentVersion: '1.0.0',
  pollIntervalMs: 5000,
};

export function loadConfig(): AgentConfig {
  const configPath = resolveConfigPath();
  const envBackend = resolveEnvBackendUrl();
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        ...DEFAULT_CONFIG,
        ...data,
        // Ensure hardwareId is always set
        hardwareId: data.hardwareId || DEFAULT_CONFIG.hardwareId,
        // Always honor runtime-injected Desktop backend port when present
        backendUrl: envBackend || data.backendUrl || DEFAULT_CONFIG.backendUrl,
      };
    } catch {
      console.warn('[Agent Config] Warning: Failed to parse agent-config.json, using defaults.');
    }
  }
  return {
    ...DEFAULT_CONFIG,
    backendUrl: envBackend || DEFAULT_CONFIG.backendUrl,
  };
}

export function saveConfig(config: Partial<AgentConfig>) {
  const configPath = resolveConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const current = loadConfig();
  const merged = { ...current, ...config };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}
