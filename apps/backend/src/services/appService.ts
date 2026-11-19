import { prisma } from '../lib/prisma';
import { Application, UpdateStatus } from '@updatepilot/shared';

export interface AppQueryFilter {
  userId?: string;
  deviceId?: string;
  search?: string;
  status?: string; // UP_TO_DATE, UPDATE_AVAILABLE, UNKNOWN, UNSUPPORTED, UNMATCHED
  publisher?: string;
  sortBy?: 'name' | 'publisher' | 'installedVersion' | 'lastScannedAt' | 'updateStatus';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function listApplications(filter: AppQueryFilter) {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (filter.deviceId) {
    where.deviceId = filter.deviceId;
    if (filter.userId) {
      where.device = { userId: filter.userId };
    }
  } else if (filter.userId) {
    where.device = { userId: filter.userId };
  }

  if (filter.status && filter.status !== 'ALL') {
    where.updateStatus = filter.status;
  }

  if (filter.publisher) {
    where.publisher = { contains: filter.publisher };
  }

  if (filter.search && filter.search.trim()) {
    const term = filter.search.trim();
    where.OR = [
      { name: { contains: term } },
      { publisher: { contains: term } },
      { packageId: { contains: term } },
    ];
  }

  const orderBy: any = {};
  const sortCol = filter.sortBy ?? 'name';
  const sortDir = filter.sortOrder ?? 'asc';
  orderBy[sortCol] = sortDir;

  const [total, items] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        device: {
          select: { id: true, name: true, osName: true },
        },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getApplicationById(id: string, userId?: string) {
  const where: any = { id };
  if (userId) {
    where.device = { userId };
  }
  return prisma.application.findFirst({
    where,
    include: {
      device: true,
      updateJobs: {
        orderBy: { startedAt: 'desc' },
        take: 5,
      },
    },
  });
}

export async function togglePinApplication(id: string, userId?: string) {
  const where: any = { id };
  if (userId) {
    where.device = { userId };
  }
  const app = await prisma.application.findFirst({ where });
  if (!app) throw new Error('Application not found or not authorized for this account');

  return prisma.application.update({
    where: { id },
    data: { isPinned: !app.isPinned },
  });
}

export async function getPublishersList(deviceId?: string, userId?: string): Promise<string[]> {
  const where: any = {};
  if (deviceId) {
    where.deviceId = deviceId;
  }
  if (userId) {
    where.device = { userId };
  }

  const apps = await prisma.application.findMany({
    where,
    select: { publisher: true },
    distinct: ['publisher'],
  });

  return apps
    .map((a) => a.publisher)
    .filter((p): p is string => Boolean(p && p.trim().length > 0))
    .sort();
}
