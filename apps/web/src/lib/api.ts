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

const TOKEN_KEY = 'updatepilot_auth_token';
const USER_KEY = 'updatepilot_auth_user';

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const getAuthUser = (): any | null => {
  if (typeof window !== 'undefined') {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
  return null;
};

export const setAuthUser = (user: any): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const clearAuth = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
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
  // Auth endpoints
  register: (data: { email: string; password: string; name?: string }) =>
    fetchApi<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    fetchApi<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => fetchApi<{ user: any }>('/auth/me'),

  // Scoped Operations
  getDashboard: (deviceId?: string) =>
    fetchApi<any>(`/dashboard${deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ''}`),
  getDevices: () => fetchApi<any[]>('/devices'),
  getAgentInstallerInfo: () => fetchApi<any>('/devices/installer/info'),
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
  getUpdates: (deviceId?: string) =>
    fetchApi<any[]>(`/updates${deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ''}`),
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
  getHistory: (type?: string, deviceId?: string) => {
    const q = new URLSearchParams();
    if (type) q.append('type', type);
    if (deviceId) q.append('deviceId', deviceId);
    return fetchApi<any>(`/history?${q.toString()}`);
  },
  exportInventoryCsvUrl: (deviceId?: string) =>
    `${getBaseUrl()}/history/export?format=csv${deviceId ? `&deviceId=${encodeURIComponent(deviceId)}` : ''}`,
  exportInventoryJsonUrl: (deviceId?: string) =>
    `${getBaseUrl()}/history/export?format=json${deviceId ? `&deviceId=${encodeURIComponent(deviceId)}` : ''}`,
  getAllApplicationsRaw: (deviceId?: string) =>
    fetchApi<any[]>(`/history/export?format=json${deviceId ? `&deviceId=${encodeURIComponent(deviceId)}` : ''}`),
  getSecurityFindings: () => fetchApi<any[]>('/security/findings'),
  triggerSecurityScan: () => fetchApi<any>('/security/scan', { method: 'POST' }),
  getSettings: () => fetchApi<any>('/settings'),
  updateSettings: (data: any) => fetchApi<any>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};
