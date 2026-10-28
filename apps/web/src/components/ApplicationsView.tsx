import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Pin,
  ExternalLink,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ArrowUpCircle,
  X,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { api } from '../lib/api';

interface ApplicationsViewProps {
  onSelectUpdate: (appId: string) => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({ onSelectUpdate }) => {
  const [apps, setApps] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [publisherFilter, setPublisherFilter] = useState('');
  const [publishersList, setPublishersList] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Detail Modal
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const res = await api.getApplications({
        page,
        pageSize: 15,
        search,
        status: statusFilter,
        publisher: publisherFilter,
        sortBy,
        sortOrder,
      });
      setApps(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch applications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [page, statusFilter, publisherFilter, sortBy, sortOrder]);

  // Load distinct publishers once
  useEffect(() => {
    api.getPublishers().then((pubs) => setPublishersList(pubs)).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApps();
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const handleTogglePin = async (appId: string) => {
    try {
      await api.togglePinApplication(appId);
      setApps((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, isPinned: !a.isPinned } : a))
      );
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp({ ...selectedApp, isPinned: !selectedApp.isPinned });
      }
    } catch (err) {
      console.error('Error toggling pin', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by application name, publisher, or WinGet package ID..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </form>

          <div className="flex items-center gap-2">
            <select
              value={publisherFilter}
              onChange={(e) => {
                setPublisherFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Publishers ({publishersList.length})</option>
              {publishersList.map((pub) => (
                <option key={pub} value={pub}>
                  {pub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Packages' },
            { id: 'UPDATE_AVAILABLE', label: 'Updates Available' },
            { id: 'UP_TO_DATE', label: 'Up to Date' },
            { id: 'UNMATCHED', label: 'Unmatched / Registry' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-background hover:bg-accent text-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
            Showing {apps.length} of {total} items
          </span>
        </div>
      </div>

      {/* Applications Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1.5 hover:text-foreground"
                  >
                    Application Name
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    onClick={() => toggleSort('publisher')}
                    className="flex items-center gap-1.5 hover:text-foreground"
                  >
                    Publisher
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4">Installed Version</th>
                <th className="py-3 px-4">Target Version</th>
                <th className="py-3 px-4">Package ID</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">
                  <button
                    onClick={() => toggleSort('updateStatus')}
                    className="flex items-center gap-1.5 hover:text-foreground"
                  >
                    Status
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Loading inventory data...
                  </td>
                </tr>
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No matching applications found. Try adjusting your search or filters.
                  </td>
                </tr>
              ) : (
                apps.map((app) => (
                  <tr key={app.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePin(app.id)}
                          className={`p-1 rounded hover:bg-muted ${
                            app.isPinned ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-muted-foreground'
                          }`}
                          title={app.isPinned ? 'Unpin' : 'Pin to top'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-semibold text-foreground">{app.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{app.publisher || '—'}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{app.installedVersion}</td>
                    <td className="py-3 px-4 font-mono font-medium text-amber-500">
                      {app.availableVersion || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                      {app.packageId || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-muted text-[11px] font-mono uppercase text-muted-foreground">
                        {app.source}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={app.updateStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent text-foreground"
                        >
                          Details
                        </button>
                        {app.updateStatus === 'UPDATE_AVAILABLE' && (
                          <button
                            onClick={() => onSelectUpdate(app.id)}
                            className="px-2.5 py-1 text-xs rounded bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold"
                          >
                            Update
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-background/50">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({total} applications total)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedApp.name}</h3>
                  <p className="text-xs text-muted-foreground">Package Metadata & Verification</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-background">
                <div>
                  <span className="text-muted-foreground">Installed Version</span>
                  <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                    {selectedApp.installedVersion}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Available</span>
                  <p className="font-mono text-sm font-bold text-amber-500 mt-0.5">
                    {selectedApp.availableVersion || 'Up to Date'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Publisher</span>
                  <span className="font-medium text-foreground">{selectedApp.publisher || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Package Identifier</span>
                  <span className="font-mono text-foreground">{selectedApp.packageId || 'None (Legacy Registry)'}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Package Source</span>
                  <span className="font-mono uppercase text-blue-500">{selectedApp.source}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Current Status</span>
                  <StatusBadge status={selectedApp.updateStatus} size="sm" />
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Last Scanned</span>
                  <span className="text-foreground">
                    {new Date(selectedApp.lastScannedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedApp.publisherUrl && (
                <div className="pt-2">
                  <a
                    href={selectedApp.publisherUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-500 hover:underline"
                  >
                    Official Publisher Page <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-background/50">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-accent text-foreground"
              >
                Close
              </button>
              {selectedApp.updateStatus === 'UPDATE_AVAILABLE' && (
                <button
                  onClick={() => {
                    const id = selectedApp.id;
                    setSelectedApp(null);
                    onSelectUpdate(id);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  Proceed to Update Center
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
