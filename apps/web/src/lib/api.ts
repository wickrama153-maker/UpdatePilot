const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // If running in browser/electron pointing to our local backend server
    if (window.location && window.location.origin && window.location.origin.startsWith('http')) {
      const port = window.location.port;
      if (port === '4000' || port === '' || !port) {
        return `${window.location.origin}/api/v1`;
      }
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
};

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errMsg = `API error: ${res.statusText} (${res.status})`;
    try {
      const json = await res.json();
      if (json.error) errMsg = json.error;
    } catch {}
    throw new Error(errMsg);
  }

  const json = await res.json();
  return json.data ?? json;
}

export const api = {
  getDashboard: () => fetchApi<any>('/dashboard'),
  getDevices: () => fetchApi<any[]>('/devices'),
  generatePairingToken: () => fetchApi<{ pairingToken: string; expiresInSeconds: number }>('/devices/token', { method: 'POST' }),
  revokeDevice: (id: string) => fetchApi<any>(`/devices/${id}/revoke`, { method: 'POST' }),
  triggerScan: (deviceId: string) => fetchApi<any>(`/devices/${deviceId}/scans`, { method: 'POST' }),
  getScanJob: (id: string) => fetchApi<any>(`/scans/${id}`),
  getApplications: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
      });
    }
    return fetchApi<any>(`/applications?${q.toString()}`);
  },
  getPublishers: () => fetchApi<string[]>('/applications/publishers'),
  getApplication: (id: string) => fetchApi<any>(`/applications/${id}`),
  togglePinApplication: (id: string) => fetchApi<any>(`/applications/${id}/pin`, { method: 'POST' }),
  getUpdates: () => fetchApi<any[]>('/updates'),
  previewUpdate: (id: string, targetVersion?: string) => fetchApi<any>(`/updates/${id}/preview`, {
    method: 'POST',
    body: JSON.stringify({ targetVersion }),
  }),
  executeUpdate: (id: string, targetVersion: string) => fetchApi<any>(`/updates/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify({ targetVersion, confirmed: true }),
  }),
  getUpdateJob: (id: string) => fetchApi<any>(`/jobs/${id}`),
  cancelUpdateJob: (id: string) => fetchApi<any>(`/jobs/${id}/cancel`, { method: 'POST' }),
  getNotifications: (onlyUnread?: boolean) => fetchApi<any>(`/notifications${onlyUnread ? '?unread=true' : ''}`),
  markNotificationRead: (id: string) => fetchApi<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => fetchApi<any>('/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: string) => fetchApi<any>(`/notifications/${id}`, { method: 'DELETE' }),
  getHistory: (type?: string) => fetchApi<any>(`/history${type ? `?type=${type}` : ''}`),
  exportInventoryCsvUrl: () => `${getBaseUrl()}/history/export?format=csv`,
  getSecurityFindings: () => fetchApi<any[]>('/security/findings'),
  triggerSecurityScan: () => fetchApi<any>('/security/scan', { method: 'POST' }),
  getSettings: () => fetchApi<any>('/settings'),
  updateSettings: (data: any) => fetchApi<any>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};
