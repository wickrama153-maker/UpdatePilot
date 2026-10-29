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
      <div className="p-4 rounded border border-border bg-card space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            [DATA.FILTER // SEARCH REGISTRY]
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            INDEXED: <strong className="text-foreground">{total}</strong> PACKAGES
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by application title, publisher, or WinGet package ID..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-[#F06435] font-mono transition-colors"
            />
          </form>

          <div className="flex items-center gap-2">
            <select
              value={publisherFilter}
              onChange={(e) => {
                setPublisherFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:border-[#F06435] font-mono transition-colors"
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
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs border-t border-border">
          {[
            { id: 'ALL', label: 'ALL PACKAGES' },
            { id: 'UPDATE_AVAILABLE', label: 'UPDATE READY' },
            { id: 'UP_TO_DATE', label: 'UP TO DATE' },
            { id: 'UNMATCHED', label: 'REGISTRY UNMATCHED' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded font-mono text-[11px] font-bold uppercase transition-colors ${
                statusFilter === tab.id
                  ? 'border border-[#F06435] bg-[#F06435] text-white'
                  : 'border border-border bg-background hover:bg-muted text-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto font-mono text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
            SHOWING {apps.length} OF {total}
          </span>
        </div>
      </div>

      {/* Applications Table */}
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/80 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-4">
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1.5 hover:text-foreground font-bold"
                  >
                    Application Name
                    <ArrowUpDown className="w-3 h-3 text-[#F06435]" />
                  </button>
                </th>
                <th className="py-2.5 px-4">
                  <button
                    onClick={() => toggleSort('publisher')}
                    className="flex items-center gap-1.5 hover:text-foreground font-bold"
                  >
                    Publisher
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 font-bold">Installed</th>
                <th className="py-2.5 px-4 font-bold">Target Version</th>
                <th className="py-2.5 px-4 font-bold">Package ID</th>
                <th className="py-2.5 px-4 font-bold">Source</th>
                <th className="py-2.5 px-4 font-bold">
                  <button
                    onClick={() => toggleSort('updateStatus')}
                    className="flex items-center gap-1.5 hover:text-foreground"
                  >
                    Status
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground font-mono text-xs">
                    [QUERYING INVENTORY DATA...]
                  </td>
                </tr>
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground font-mono text-xs">
                    [NO MATCHING ENTITIES RECORDED]
                  </td>
                </tr>
              ) : (
                apps.map((app) => (
                  <tr key={app.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePin(app.id)}
                          className={`p-1 rounded hover:bg-muted ${
                            app.isPinned
                              ? 'text-[#F06435]'
                              : 'text-muted-foreground/30 hover:text-muted-foreground'
                          }`}
                          title={app.isPinned ? 'Unpin application' : 'Pin to top of list'}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <span className="font-semibold text-foreground">{app.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px] truncate max-w-[140px]">
                      {app.publisher || '—'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                      {app.installedVersion}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs font-bold text-[#F06435]">
                      {app.availableVersion || '—'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground truncate max-w-[180px]">
                      {app.packageId || '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-background border border-border text-[9px] font-mono uppercase text-muted-foreground">
                        {app.source}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={app.updateStatus} size="sm" />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded border border-border hover:bg-muted text-foreground transition-colors"
                        >
                          DETAILS
                        </button>
                        {app.updateStatus === 'UPDATE_AVAILABLE' && (
                          <button
                            onClick={() => onSelectUpdate(app.id)}
                            className="px-2.5 py-1 text-[11px] font-mono font-bold rounded bg-[#F06435] text-white hover:bg-[#D95528] transition-colors"
                          >
                            UPDATE
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
        <div className="flex items-center justify-between p-3.5 border-t border-border bg-background/50 font-mono text-xs">
          <span className="text-muted-foreground text-[11px]">
            PAGE {page} OF {totalPages} ({total} PACKAGES REGISTERED)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-border bg-card hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-border bg-card hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Application Details Modal: Swiss Engineering Specification Sheet */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in duration-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-background/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded border border-[#F06435] bg-[#F06435]/10 text-[#F06435]">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wide">
                    {selectedApp.name}
                  </h3>
                  <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
                    [SPECIFICATION // METADATA]
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spec Sheet Body */}
            <div className="p-5 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded border border-border bg-background">
                <div>
                  <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                    INSTALLED VERSION
                  </span>
                  <p className="text-sm font-bold text-foreground mt-0.5 tabular-nums">
                    {selectedApp.installedVersion}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                    TARGET AVAILABLE
                  </span>
                  <p className="text-sm font-bold text-[#F06435] mt-0.5 tabular-nums">
                    {selectedApp.availableVersion || 'CURRENT / UP TO DATE'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground text-[11px]">PUBLISHER</span>
                  <span className="font-semibold text-foreground">{selectedApp.publisher || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground text-[11px]">PACKAGE IDENTIFIER</span>
                  <span className="text-foreground">{selectedApp.packageId || 'None (Legacy Registry)'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground text-[11px]">PACKAGE SOURCE</span>
                  <span className="font-bold text-[#F06435] uppercase">{selectedApp.source}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground text-[11px]">STATUS CODE</span>
                  <StatusBadge status={selectedApp.updateStatus} size="sm" />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground text-[11px]">LAST AUDITED</span>
                  <span className="text-foreground">
                    {new Date(selectedApp.lastScannedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedApp.publisherUrl && (
                <div className="pt-2 border-t border-border">
                  <a
                    href={selectedApp.publisherUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#F06435] hover:underline text-xs"
                  >
                    Official Publisher Page <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-3.5 border-t border-border bg-background/50">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded border border-border hover:bg-muted text-foreground"
              >
                CLOSE
              </button>
              {selectedApp.updateStatus === 'UPDATE_AVAILABLE' && (
                <button
                  onClick={() => {
                    const id = selectedApp.id;
                    setSelectedApp(null);
                    onSelectUpdate(id);
                  }}
                  className="px-4 py-1.5 text-xs font-mono font-bold uppercase rounded bg-[#F06435] text-white hover:bg-[#D95528]"
                >
                  PROCEED TO UPDATE CENTER
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
