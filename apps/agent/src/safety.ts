import { isValidPackageId, isValidVersionString } from '@updatepilot/shared';

export interface ValidatedUpdateOperation {
  packageId: string;
  targetVersion: string;
}

export function validateUpdateOperation(packageId: string, targetVersion: string): ValidatedUpdateOperation {
  if (!packageId || typeof packageId !== 'string') {
    throw new Error('Agent Safety Violation: Package ID is missing or invalid.');
  }

  const cleanPackageId = packageId.trim();
  if (!isValidPackageId(cleanPackageId)) {
    throw new Error(`Agent Safety Violation: Disallowed or unsafe characters in Package ID: "${packageId}".`);
  }

  if (!targetVersion || typeof targetVersion !== 'string') {
    throw new Error('Agent Safety Violation: Target version is missing or invalid.');
  }

  const cleanVersion = targetVersion.trim();
  if (!isValidVersionString(cleanVersion)) {
    throw new Error(`Agent Safety Violation: Disallowed or unsafe characters in Target Version: "${targetVersion}".`);
  }

  return {
    packageId: cleanPackageId,
    targetVersion: cleanVersion,
  };
}
