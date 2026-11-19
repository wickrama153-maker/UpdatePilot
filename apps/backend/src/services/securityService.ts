import axios from 'axios';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const OSV_API = process.env.OSV_API_URL || 'https://api.osv.dev/v1/query';

export interface PackageAuditResult {
  packageId: string;
  status: 'FOUND' | 'CLEAN' | 'FAILED' | 'UNINDEXED';
  findings: any[];
  error?: string;
}

export async function checkPackageVulnerabilities(
  packageName: string,
  version: string,
  ecosystem?: string
): Promise<PackageAuditResult> {
  try {
    const payload: any = {
      version,
      package: {
        name: packageName,
      },
    };

    if (ecosystem) {
      payload.package.ecosystem = ecosystem;
    }

    const response = await axios.post(OSV_API, payload, { timeout: 6000 });
    const vulns = response.data?.vulns || [];

    if (vulns.length === 0) {
      return {
        packageId: packageName,
        status: 'CLEAN',
        findings: [],
      };
    }

    const findings = [];
    for (const v of vulns) {
      const advisoryId = v.id;
      const title = v.summary || v.details?.slice(0, 150) || `Advisory ${advisoryId}`;
      const severity = v.database_specific?.severity || (v.severity?.[0]?.score ? 'HIGH' : 'MEDIUM');
      const advisoryUrl = v.references?.[0]?.url || `https://osv.dev/vulnerability/${advisoryId}`;
      const publishedAt = v.published || null;

      // Extract affected range
      let affectedRange = 'Specified version';
      if (v.affected?.[0]?.ranges?.[0]?.events) {
        affectedRange = v.affected[0].ranges[0].events
          .map((e: any) => Object.entries(e).map(([k, val]) => `${k}: ${val}`).join(' '))
          .join(', ');
      }

      const record = await prisma.securityFinding.upsert({
        where: {
          packageId_advisoryId: {
            packageId: packageName,
            advisoryId,
          },
        },
        update: {
          title,
          severity,
          affectedVersionRange: affectedRange,
          advisoryUrl,
          lastVerifiedAt: new Date(),
        },
        create: {
          packageId: packageName,
          applicationName: packageName,
          advisoryId,
          title,
          severity,
          affectedVersionRange: affectedRange,
          source: 'OSV',
          advisoryUrl,
          publishedAt,
          lastVerifiedAt: new Date(),
        },
      });

      findings.push(record);
    }

    return {
      packageId: packageName,
      status: 'FOUND',
      findings,
    };
  } catch (err: any) {
    logger.warn('OSV API check failed for package', { package: packageName, error: err.message });
    return {
      packageId: packageName,
      status: 'FAILED',
      findings: [],
      error: err.message,
    };
  }
}

export async function listSecurityFindings() {
  return prisma.securityFinding.findMany({
    orderBy: { lastVerifiedAt: 'desc' },
  });
}
