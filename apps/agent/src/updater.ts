import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { compareVersions } from '@updatepilot/shared';
import { validateUpdateOperation } from './safety';
import {
  resolveWinGetExecutable,
  inspectPackageManifest,
  verifyPackageVersion,
} from './winget';

const execFileAsync = promisify(execFile);

const WIN_EXIT_SUCCESS = 0;
const WIN_EXIT_REBOOT_REQUIRED = 3010;
const WIN_EXIT_REBOOT_INITIATED = 1641;
const WINGET_NO_APPLICABLE_UPGRADE = -1978335189; // 0x8A15002B
const WIN_ERROR_ELEVATION_REQUIRED = 740;
const WINGET_ELEVATION_REQUIRED = -1978335151; // 0x8A150051

export interface UpdateExecutionResult {
  status:
    | 'RUNNING'
    | 'VERIFYING'
    | 'COMPLETED'
    | 'FAILED'
    | 'REBOOT_REQUIRED'
    | 'REQUIRES_RESTART'
    | 'TIMED_OUT'
    | 'CANCELLED';
  exitCode: number | null;
  stage?: string;
  progressPercent?: number | null;
  command?: string;
  stdoutLog?: string;
  stderrLog?: string;
  verificationResult: string;
  resultingVersion: string | null;
  requiresReboot: boolean;
  errorSummary?: string;
}

export interface UpdateProgressEvent {
  status: 'RUNNING' | 'VERIFYING';
  stage: string;
  progressPercent: number | null;
  command?: string;
  stdoutLog?: string;
  stderrLog?: string;
  verificationResult?: string;
}

export interface ExecuteUpdateOptions {
  onProgress?: (event: UpdateProgressEvent) => Promise<void> | void;
  checkCancelled?: () => Promise<boolean>;
  timeoutMs?: number;
}

function sanitizeOutputChunk(raw: string): string {
  // Strip ANSI escape sequences and carriage-return spinner noise
  return raw
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\r+/g, '\n')
    .replace(/^\s*[-\\|/]\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Windows returns unsigned 32-bit HRESULT/NTSTATUS codes (e.g. 2316632107 for 0x8A15002B),
 * whereas WinGet constants & 32-bit SQLite INT storage expect signed 32-bit integers (-1978335189).
 */
export function toSignedInt32(code: number): number {
  return Number.isFinite(code) ? (code | 0) : 1;
}

function parseUnitMb(val: number, unit: string): number {
  const u = unit.toUpperCase();
  if (u === 'GB') return val * 1024;
  if (u === 'KB') return val / 1024;
  return val;
}

function inferStageAndProgress(cleanLine: string): { stage?: string; progressPercent?: number | null } {
  const lower = cleanLine.toLowerCase();

  // Real byte-ratio progress from WinGet download output (e.g., "12.4 MB / 45.0 MB")
  const ratioMatch = cleanLine.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB)\s*\/\s*(\d+(?:\.\d+)?)\s*(KB|MB|GB)/i);
  if (ratioMatch) {
    const done = parseUnitMb(parseFloat(ratioMatch[1]), ratioMatch[2]);
    const total = parseUnitMb(parseFloat(ratioMatch[3]), ratioMatch[4]);
    if (total > 0) {
      const rawPct = Math.round((done / total) * 80); // reserve 80-100 for install + verify
      return {
        stage: 'Downloading package',
        progressPercent: Math.min(80, Math.max(5, rawPct)),
      };
    }
  }

  if (lower.includes('downloading ') || lower.includes('download')) {
    return { stage: 'Downloading package', progressPercent: null };
  }
  if (
    lower.includes('starting package install') ||
    lower.includes('installing') ||
    lower.includes('successfully verified installer hash')
  ) {
    return { stage: 'Installing update', progressPercent: null };
  }
  if (lower.includes('found ')) {
    return { stage: 'Preparing package manager', progressPercent: null };
  }

  return {};
}

function killProcessTree(pid?: number) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/t', '/f'], { windowsHide: true });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch {
    // Ignore already exited processes
  }
}

async function isProcessElevated(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('whoami', ['/groups'], { timeout: 5000, windowsHide: true });
    return /High Mandatory Level|System Mandatory Level/i.test(stdout);
  } catch {
    return false;
  }
}

function describeWinGetFailure(exitCode: number, combinedOutput: string): {
  summary: string;
  needsElevation: boolean;
} {
  const lower = combinedOutput.toLowerCase();
  const signedHex = `0x${(exitCode >>> 0).toString(16).toUpperCase()}`;

  const needsElevation =
    exitCode === WIN_ERROR_ELEVATION_REQUIRED ||
    exitCode === WINGET_ELEVATION_REQUIRED ||
    lower.includes('requires elevation') ||
    lower.includes('run as administrator') ||
    lower.includes('access is denied') ||
    lower.includes('0x8a150051') ||
    lower.includes('0x80070005');

  if (needsElevation) {
    return {
      needsElevation: true,
      summary: `Insufficient Windows privileges (exit ${exitCode} / ${signedHex}). This installer requires Administrator (UAC) elevation.`,
    };
  }
  if (lower.includes('no package found') || lower.includes('no applicable') || exitCode === -1978335212) {
    return {
      needsElevation: false,
      summary: `WinGet could not locate the package or target version (exit ${exitCode} / ${signedHex}).`,
    };
  }
  if (lower.includes('internet') || lower.includes('network') || lower.includes('0x80072ee7') || lower.includes('0x80072efd')) {
    return {
      needsElevation: false,
      summary: `Network connection error while downloading package manifest or installer (exit ${exitCode} / ${signedHex}).`,
    };
  }
  if (exitCode === 1618 || lower.includes('another installation is already in progress')) {
    return {
      needsElevation: false,
      summary: `Another Windows installation is currently in progress (Exit 1618). Wait for it to finish and retry.`,
    };
  }
  if (exitCode === 1603 || lower.includes('in use') || lower.includes('running')) {
    return {
      needsElevation: false,
      summary: `Installer exited with code ${exitCode} (${signedHex}). Close running instances of the application or elevate UpdatePilot and retry.`,
    };
  }

  return {
    needsElevation: false,
    summary: `WinGet exited with code ${exitCode} (${signedHex}).`,
  };
}

/**
 * Attempts a legitimate Windows UAC-elevated WinGet invocation via ShellExecute ("runas")
 * ONLY when non-elevated WinGet fails specifically due to missing administrator privileges.
 */
async function runElevatedViaUacPrompt(
  wingetExe: string,
  args: string[],
  timeoutMs: number
): Promise<{ exitCode: number; stdout: string; stderr: string; timedOut: boolean }> {
  const tempLog = path.join(os.tmpdir(), `updatepilot-uac-${Date.now()}.log`);
  const fullArgs = [...args, '--log', tempLog];
  const quotedArgs = fullArgs.map((a) => `'${a.replace(/'/g, "''")}'`).join(', ');
  const psScript = [
    '$ErrorActionPreference = "Stop";',
    `$argList = @(${quotedArgs});`,
    `$p = Start-Process -FilePath '${wingetExe.replace(/'/g, "''")}' -ArgumentList $argList -Verb RunAs -Wait -PassThru;`,
    'exit $p.ExitCode;',
  ].join(' ');

  return new Promise((resolve) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', psScript],
      { windowsHide: true }
    );
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child.pid);
    }, timeoutMs);

    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));

    child.on('close', (code) => {
      clearTimeout(timer);
      let fileLog = '';
      try {
        if (fs.existsSync(tempLog)) {
          fileLog = fs.readFileSync(tempLog, 'utf-8').slice(-4000);
          fs.unlinkSync(tempLog);
        }
      } catch {
        // Ignore temp cleanup issue
      }
      resolve({
        exitCode: toSignedInt32(typeof code === 'number' ? code : 1),
        stdout: fileLog ? `${stdout}\n${fileLog}`.trim() : stdout.trim(),
        stderr: stderr.trim(),
        timedOut,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout,
        stderr: err.message,
        timedOut,
      });
    });
  });
}

export async function executeApprovedUpdate(
  packageId: string,
  targetVersion: string,
  options: ExecuteUpdateOptions = {}
): Promise<UpdateExecutionResult> {
  const valid = validateUpdateOperation(packageId, targetVersion);
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;

  const emitProgress = async (evt: UpdateProgressEvent) => {
    if (!options.onProgress) return;
    try {
      await options.onProgress(evt);
    } catch {
      // Never abort execution because a status ping failed
    }
  };

  // 1. Resolve WinGet executable cleanly
  const wingetExe = await resolveWinGetExecutable();
  if (!wingetExe) {
    return {
      status: 'FAILED',
      exitCode: null,
      stage: 'WinGet unavailable',
      progressPercent: null,
      verificationResult: 'Windows Package Manager (winget.exe) is not installed or accessible on this system.',
      errorSummary: 'winget.exe could not be located in WindowsApps or system PATH.',
      resultingVersion: null,
      requiresReboot: false,
    };
  }

  await emitProgress({
    status: 'RUNNING',
    stage: 'Preparing package manager',
    progressPercent: null,
    verificationResult: 'Checking installed version and WinGet package manifest...',
  });

  // 2. Check live installed version before upgrade (avoid downgrades / detect already up to date)
  const priorVersion = await verifyPackageVersion(valid.packageId);
  if (priorVersion && !priorVersion.startsWith('<')) {
    const cmp = compareVersions(valid.targetVersion, priorVersion);
    if (cmp < 0) {
      return {
        status: 'FAILED',
        exitCode: null,
        stage: 'Safety downgrade block',
        progressPercent: null,
        verificationResult: `Blocked downgrade attempt: installed version (${priorVersion}) is already newer than target (${valid.targetVersion}).`,
        errorSummary: `Installed version ${priorVersion} is newer than requested ${valid.targetVersion}.`,
        resultingVersion: priorVersion,
        requiresReboot: false,
      };
    }
    if (cmp === 0) {
      return {
        status: 'COMPLETED',
        exitCode: 0,
        stage: 'Completed and verified',
        progressPercent: 100,
        verificationResult: `Verified: ${valid.packageId} is already installed at version ${priorVersion}.`,
        resultingVersion: priorVersion,
        requiresReboot: false,
      };
    }
  }

  // 3. Inspect manifest before building allowlisted CLI arguments
  const manifest = await inspectPackageManifest(valid.packageId, valid.targetVersion);
  if (!manifest.found) {
    return {
      status: 'FAILED',
      exitCode: null,
      stage: 'Manifest lookup failed',
      progressPercent: null,
      verificationResult: `Package identifier "${valid.packageId}" could not be found in WinGet sources.`,
      errorSummary: `Invalid or unavailable package identifier "${valid.packageId}" (check network connectivity or package ID).`,
      resultingVersion: priorVersion,
      requiresReboot: false,
    };
  }

  const args: string[] = ['upgrade', '--id', valid.packageId, '--exact'];
  if (manifest.hasTargetVersion) {
    args.push('--version', valid.targetVersion);
  }
  args.push(
    '--silent',
    '--accept-source-agreements',
    '--accept-package-agreements',
    '--disable-interactivity'
  );

  const commandDisplay = `winget ${args.join(' ')}`;
  console.log(`[Updater] Spawning: ${commandDisplay}`);

  await emitProgress({
    status: 'RUNNING',
    stage: 'Preparing package manager',
    progressPercent: null,
    command: commandDisplay,
    verificationResult: `Executing ${commandDisplay}`,
  });

  // 4. Spawn streaming child process with timeout + mid-flight cancellation check
  let stdoutBuffer = '';
  let stderrBuffer = '';
  let currentStage = 'Preparing package manager';
  let currentProgress: number | null = null;
  let lastProgressSentAt = 0;

  const spawnResult = await new Promise<{
    exitCode: number;
    timedOut: boolean;
    cancelled: boolean;
  }>((resolve) => {
    const child = spawn(wingetExe, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let settled = false;
    let timedOut = false;
    let cancelled = false;

    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(execTimer);
      clearInterval(cancelTimer);
      resolve({ exitCode: toSignedInt32(code), timedOut, cancelled });
    };

    const execTimer = setTimeout(() => {
      timedOut = true;
      console.error(`[Updater] Timeout (${timeoutMs}ms) reached for ${valid.packageId}. Terminating process tree...`);
      killProcessTree(child.pid);
      finish(1460);
    }, timeoutMs);

    const cancelTimer = setInterval(async () => {
      if (settled || !options.checkCancelled) return;
      try {
        const isCancelled = await options.checkCancelled();
        if (isCancelled) {
          cancelled = true;
          console.warn(`[Updater] Cancellation signal received for ${valid.packageId}. Terminating process tree...`);
          killProcessTree(child.pid);
          finish(1223);
        }
      } catch {
        // Ignore transient network blip
      }
    }, 2500);

    const handleChunk = async (chunk: Buffer, isError: boolean) => {
      const cleaned = sanitizeOutputChunk(chunk.toString('utf-8'));
      if (!cleaned.trim()) return;

      if (isError) {
        stderrBuffer = (stderrBuffer + '\n' + cleaned).slice(-8000);
      } else {
        stdoutBuffer = (stdoutBuffer + '\n' + cleaned).slice(-8000);
      }

      const inferred = inferStageAndProgress(cleaned);
      const stageChanged = Boolean(inferred.stage && inferred.stage !== currentStage);
      if (inferred.stage) currentStage = inferred.stage;
      if (inferred.progressPercent !== undefined) currentProgress = inferred.progressPercent;

      const now = Date.now();
      if (stageChanged || now - lastProgressSentAt >= 1800) {
        lastProgressSentAt = now;
        await emitProgress({
          status: 'RUNNING',
          stage: currentStage,
          progressPercent: currentProgress,
          command: commandDisplay,
          stdoutLog: stdoutBuffer.trim(),
          stderrLog: stderrBuffer.trim(),
        });
      }
    };

    child.stdout?.on('data', (d) => handleChunk(d, false));
    child.stderr?.on('data', (d) => handleChunk(d, true));

    child.on('error', (err) => {
      stderrBuffer += `\nSpawn error: ${err.message}`;
      finish(1);
    });

    child.on('close', (code) => {
      finish(typeof code === 'number' ? code : 1);
    });
  });

  if (spawnResult.cancelled) {
    return {
      status: 'CANCELLED',
      exitCode: spawnResult.exitCode,
      stage: 'Cancelled by user',
      progressPercent: null,
      command: commandDisplay,
      stdoutLog: stdoutBuffer.trim(),
      stderrLog: stderrBuffer.trim(),
      verificationResult: 'Update process terminated at operator request.',
      errorSummary: 'Job cancelled by user request.',
      resultingVersion: priorVersion,
      requiresReboot: false,
    };
  }

  if (spawnResult.timedOut) {
    return {
      status: 'TIMED_OUT',
      exitCode: spawnResult.exitCode,
      stage: 'Execution timed out',
      progressPercent: null,
      command: commandDisplay,
      stdoutLog: stdoutBuffer.trim(),
      stderrLog: stderrBuffer.trim(),
      verificationResult: `WinGet execution exceeded ${Math.round(timeoutMs / 1000)}s and was terminated safely.`,
      errorSummary: 'Update installer timed out. Check for blocking prompts or locked application files.',
      resultingVersion: priorVersion,
      requiresReboot: false,
    };
  }

  let exitCode = spawnResult.exitCode;
  const combined = `${stdoutBuffer}\n${stderrBuffer}`;
  const failureInfo = describeWinGetFailure(exitCode, combined);

  // 5. Legitimate UAC fallback if non-elevated and WinGet specifically required Administrator elevation
  if (
    exitCode !== WIN_EXIT_SUCCESS &&
    exitCode !== WIN_EXIT_REBOOT_REQUIRED &&
    exitCode !== WIN_EXIT_REBOOT_INITIATED &&
    (failureInfo.needsElevation || manifest.requiresElevationHint)
  ) {
    const elevatedAlready = await isProcessElevated();
    if (!elevatedAlready && failureInfo.needsElevation) {
      await emitProgress({
        status: 'RUNNING',
        stage: 'Waiting for Windows UAC elevation',
        progressPercent: null,
        command: commandDisplay,
        verificationResult: 'Installer requested Administrator privileges via Windows UAC...',
      });
      const uacRes = await runElevatedViaUacPrompt(wingetExe, args, timeoutMs);
      if (uacRes.timedOut) {
        return {
          status: 'TIMED_OUT',
          exitCode: 1460,
          stage: 'Execution timed out',
          progressPercent: null,
          command: commandDisplay,
          stdoutLog: `${stdoutBuffer}\n${uacRes.stdout}`.trim(),
          stderrLog: `${stderrBuffer}\n${uacRes.stderr}`.trim(),
          verificationResult: 'Elevated installation timed out.',
          errorSummary: 'Elevated UAC installation timed out.',
          resultingVersion: priorVersion,
          requiresReboot: false,
        };
      }
      exitCode = uacRes.exitCode;
      if (uacRes.stdout) stdoutBuffer = `${stdoutBuffer}\n${uacRes.stdout}`.slice(-8000);
      if (uacRes.stderr) stderrBuffer = `${stderrBuffer}\n${uacRes.stderr}`.slice(-8000);
    }
  }

  console.log(`[Updater] Installer finished with exit code: ${exitCode}`);

  // 6. Post-update real verification
  await emitProgress({
    status: 'VERIFYING',
    stage: 'Verifying installed version',
    progressPercent: null,
    command: commandDisplay,
    stdoutLog: stdoutBuffer.trim(),
    stderrLog: stderrBuffer.trim(),
    verificationResult: `Installer exited with code ${exitCode}. Querying live installed version...`,
  });

  await new Promise((r) => setTimeout(r, 1500));
  const resultingVersion = await verifyPackageVersion(valid.packageId);

  const postCombined = `${stdoutBuffer}\n${stderrBuffer}`.toLowerCase();
  const requiresReboot =
    exitCode === WIN_EXIT_REBOOT_REQUIRED ||
    exitCode === WIN_EXIT_REBOOT_INITIATED ||
    postCombined.includes('restart is required') ||
    postCombined.includes('reboot is required');

  const alreadyAtTarget =
    resultingVersion !== null &&
    compareVersions(resultingVersion, valid.targetVersion) >= 0;

  if (
    exitCode === WIN_EXIT_SUCCESS ||
    requiresReboot ||
    (exitCode === WINGET_NO_APPLICABLE_UPGRADE && alreadyAtTarget)
  ) {
    if (requiresReboot) {
      return {
        status: 'REQUIRES_RESTART',
        exitCode,
        stage: 'Requires Windows restart',
        progressPercent: 100,
        command: commandDisplay,
        stdoutLog: stdoutBuffer.trim(),
        stderrLog: stderrBuffer.trim(),
        requiresReboot: true,
        verificationResult: `Installer succeeded with reboot requirement (Exit Code ${exitCode}). Verified version: ${resultingVersion || valid.targetVersion}.`,
        resultingVersion: resultingVersion || valid.targetVersion,
      };
    }

    if (resultingVersion && (alreadyAtTarget || (priorVersion && compareVersions(resultingVersion, priorVersion) > 0))) {
      return {
        status: 'COMPLETED',
        exitCode: 0,
        stage: 'Completed and verified',
        progressPercent: 100,
        command: commandDisplay,
        stdoutLog: stdoutBuffer.trim(),
        stderrLog: stderrBuffer.trim(),
        requiresReboot: false,
        verificationResult: `Verified installed version ${resultingVersion} (Exit Code ${exitCode}).`,
        resultingVersion,
      };
    }

    // Honest reporting if exit code was 0 but version didn't advance
    return {
      status: 'FAILED',
      exitCode,
      stage: 'Version verification failed',
      progressPercent: null,
      command: commandDisplay,
      stdoutLog: stdoutBuffer.trim(),
      stderrLog: stderrBuffer.trim(),
      requiresReboot: false,
      verificationResult: resultingVersion
        ? `WinGet exited with code ${exitCode}, but installed version is still ${resultingVersion} (expected ${valid.targetVersion}).`
        : `WinGet exited with code ${exitCode}, but post-update version check returned no version match.`,
      errorSummary: `Version verification mismatch after install (detected: ${resultingVersion ?? 'unknown'}, expected: ${valid.targetVersion}).`,
      resultingVersion,
    };
  }

  const finalFailure = describeWinGetFailure(exitCode, `${stdoutBuffer}\n${stderrBuffer}`);
  return {
    status: 'FAILED',
    exitCode,
    stage: 'Update failed',
    progressPercent: null,
    command: commandDisplay,
    stdoutLog: stdoutBuffer.trim(),
    stderrLog: stderrBuffer.trim(),
    requiresReboot: false,
    verificationResult: finalFailure.summary,
    errorSummary: stderrBuffer.trim() || finalFailure.summary,
    resultingVersion,
  };
}
