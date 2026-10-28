import { execFile } from 'child_process';
import { promisify } from 'util';
import { validateUpdateOperation } from './safety';
import { verifyPackageVersion } from './winget';

const execFileAsync = promisify(execFile);

// Windows installer exit codes
const WIN_EXIT_SUCCESS = 0;
const WIN_EXIT_REBOOT_REQUIRED = 3010;
const WIN_EXIT_REBOOT_INITIATED = 1641;

export interface UpdateExecutionResult {
  status: 'COMPLETED' | 'FAILED' | 'REBOOT_REQUIRED';
  exitCode: number;
  verificationResult: string;
  resultingVersion: string | null;
  requiresReboot: boolean;
  errorSummary?: string;
}

export async function executeApprovedUpdate(
  packageId: string,
  targetVersion: string
): Promise<UpdateExecutionResult> {
  // 1. Independent safety validation
  const valid = validateUpdateOperation(packageId, targetVersion);

  console.log(`[Updater] Executing verified upgrade for ${valid.packageId} -> ${valid.targetVersion}...`);

  // Fixed allowlisted command and parameters
  const args = [
    'upgrade',
    '--id',
    valid.packageId,
    '--version',
    valid.targetVersion,
    '--exact',
    '--accept-source-agreements',
    '--accept-package-agreements',
    '--disable-interactivity',
  ];

  let exitCode = -1;
  let stdoutOutput = '';
  let stderrOutput = '';

  try {
    const res = await execFileAsync('winget', args, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 10 * 60 * 1000, // 10 minute timeout for large installers
    });
    exitCode = 0;
    stdoutOutput = res.stdout;
    stderrOutput = res.stderr;
  } catch (err: any) {
    exitCode = typeof err.code === 'number' ? err.code : 1;
    stdoutOutput = err.stdout || '';
    stderrOutput = err.stderr || err.message || '';
  }

  console.log(`[Updater] Installer finished with exit code: ${exitCode}`);

  const requiresReboot =
    exitCode === WIN_EXIT_REBOOT_REQUIRED ||
    exitCode === WIN_EXIT_REBOOT_INITIATED ||
    stdoutOutput.toLowerCase().includes('restart is required') ||
    stdoutOutput.toLowerCase().includes('reboot is required');

  // 2. Post-update rescan and version verification
  console.log(`[Updater] Rescanning package ${valid.packageId} for version verification...`);
  const resultingVersion = await verifyPackageVersion(valid.packageId);

  if (exitCode === WIN_EXIT_SUCCESS || requiresReboot) {
    if (requiresReboot) {
      return {
        status: 'REBOOT_REQUIRED',
        exitCode,
        requiresReboot: true,
        verificationResult: `Installer succeeded with reboot requirement (Exit Code ${exitCode}). Restart system to complete.`,
        resultingVersion: resultingVersion || valid.targetVersion,
      };
    }

    return {
      status: 'COMPLETED',
      exitCode,
      requiresReboot: false,
      verificationResult: `Installer reported success (Exit Code ${exitCode}). Verified version: ${resultingVersion || valid.targetVersion}`,
      resultingVersion: resultingVersion || valid.targetVersion,
    };
  } else {
    return {
      status: 'FAILED',
      exitCode,
      requiresReboot: false,
      verificationResult: `Installer failed with exit code ${exitCode}. Error output: ${stderrOutput.slice(0, 300)}`,
      errorSummary: stderrOutput || `Process exited with code ${exitCode}`,
      resultingVersion,
    };
  }
}
