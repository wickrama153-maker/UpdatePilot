import React, { useState, useEffect } from 'react';
import {
  Search,
  ArrowUpDown,
  Pin,
  ExternalLink,
  Info,
  ChevronLeft,
  ChevronRight,
  Download,
  Package,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { StatusBadge } from './StatusBadge';
import { TableRowSkeleton } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';
import { api } from '../lib/api';

interface ApplicationsViewProps {
  onSelectUpdate: (appId: string) => void;
  externalSearchQuery?: string;
  selectedDeviceId?: string | null;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  onSelectUpdate,
  externalSearchQuery,
  selectedDeviceId,
}) => {
  const [apps, setApps] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(externalSearchQuery || '');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [publisherFilter, setPublisherFilter] = useState('');
  const [publishersList, setPublishersList] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Detail Modal
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  useEffect(() => {
    if (externalSearchQuery !== undefined && externalSearchQuery !== search) {
      setSearch(externalSearchQuery);
      setPage(1);
    }
  }, [externalSearchQuery]);

  const fetchApps = async (overrideSearch?: string) => {
    try {
      setLoading(true);
      const res = await api.getApplications({
        page,
        pageSize: 15,
        search: overrideSearch !== undefined ? overrideSearch : search,
        status: statusFilter,
        publisher: publisherFilter,
        sortBy,
        sortOrder,
        deviceId: selectedDeviceId || undefined,
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
  }, [page, statusFilter, publisherFilter, sortBy, sortOrder, externalSearchQuery]);

  // Load distinct publishers once
  useEffect(() => {
    api.getPublishers().then((pubs) => setPublishersList(pubs)).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApps(search);
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

  const handleExportCsv = () => {
    window.open(api.exportInventoryCsvUrl(), '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Toolbar: Search, Publisher Filter, Status Tabs, Export */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applications by name, publisher, or package ID..."
              className="w-full pl-9 pr-20 py-2 text-xs rounded-lg border border-border bg-secondary/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#009F91] dark:focus:border-[#19C6B4] focus:bg-card transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-medium rounded-md bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <select
              value={publisherFilter}
              onChange={(e) => {
                setPublisherFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by publisher"
              className="px-3 py-2 text-xs rounded-lg border border-border bg-secondary/40 text-foreground focus:outline-none focus:border-[#009F91] dark:focus:border-[#19C6B4] transition-colors"
            >
              <option value="">All Publishers ({publishersList.length})</option>
              {publishersList.map((pub) => (
                <option key={pub} value={pub}>
                  {pub}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="md"
              onClick={handleExportCsv}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-border flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Applications' },
              { id: 'UPDATE_AVAILABLE', label: 'Updates Available' },
              { id: 'UP_TO_DATE', label: 'Up to Date' },
              { id: 'UNMATCHED', label: 'Registry Only' },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#009F91] dark:bg-[#19C6B4] text-white dark:text-[#0B141D] font-semibold shadow-sm'
                      : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span className="text-xs text-muted-foreground tabular-nums">
            Showing <strong className="text-foreground">{apps.length}</strong> of{' '}
            <strong className="text-foreground">{total}</strong> applications
          </span>
        </div>
      </Card>

      {/* Enterprise Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/50 text-muted-foreground font-semibold">
                <th className="py-3 px-4">
                  <button
                    onClick={() => toggleSort('name')}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    Application
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    onClick={() => toggleSort('publisher')}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    Publisher
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4">Installed Version</th>
                <th className="py-3 px-4">Latest Available Version</th>
                <th className="py-3 px-4">
                  <button
                    onClick={() => toggleSort('updateStatus')}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    Update Status
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4">Last Checked</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {loading ? (
                <TableRowSkeleton cols={7} rows={8} />
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      icon={<Package className="w-5 h-5" />}
                      title="No Matching Applications"
                      description="Try clearing your search filter or triggering a new local inventory scan."
                    />
                  </td>
                </tr>
              ) : (
                apps.map((app) => (
                  <tr key={app.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleTogglePin(app.id)}
                          className={`p-1 rounded-md hover:bg-secondary transition-colors ${
                            app.isPinned
                              ? 'text-[#009F91] dark:text-[#19C6B4]'
                              : 'text-muted-foreground/35 hover:text-muted-foreground'
                          }`}
                          title={app.isPinned ? 'Unpin application' : 'Pin application'}
                          aria-label={app.isPinned ? `Unpin ${app.name}` : `Pin ${app.name}`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center text-[11px] font-bold text-[#009F91] dark:text-[#19C6B4] shrink-0">
                          {(app.name || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate max-w-[220px]" title={app.name}>
                            {app.name}
                          </p>
                          {app.packageId && (
                            <p className="text-[11px] font-mono text-muted-foreground truncate max-w-[200px]">
                              {app.packageId}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-[160px] truncate">
                      {app.publisher || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-foreground tabular-nums">
                      {app.installedVersion}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums">
                      {app.availableVersion ? (
                        <span className="font-semibold text-[#B45309] dark:text-[#F5B942]">
                          {app.availableVersion}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.updateStatus} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {new Date(app.lastScannedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedApp(app)}
                        >
                          Details
                        </Button>
                        {app.updateStatus === 'UPDATE_AVAILABLE' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onSelectUpdate(app.id)}
                          >
                            Update
                          </Button>
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30 text-xs">
          <span className="text-muted-foreground tabular-nums">
            Page <strong className="text-foreground">{page}</strong> of{' '}
            <strong className="text-foreground">{totalPages}</strong> ({total} total records)
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Application Details Modal */}
      <Modal
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        title={selectedApp?.name || 'Application Details'}
        subtitle="Verified Package Metadata & Source Telemetry"
        icon={<Info className="w-4 h-4" />}
        footer={
          selectedApp && (
            <>
              <Button variant="outline" onClick={() => setSelectedApp(null)}>
                Close
              </Button>
              {selectedApp.updateStatus === 'UPDATE_AVAILABLE' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const id = selectedApp.id;
                    setSelectedApp(null);
                    onSelectUpdate(id);
                  }}
                >
                  Open in Available Updates
                </Button>
              )}
            </>
          )
        }
      >
        {selectedApp && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-secondary/40">
              <div>
                <span className="text-muted-foreground block">Installed Version</span>
                <p className="font-mono text-sm font-semibold text-foreground mt-1">
                  {selectedApp.installedVersion}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground block">Latest Available Version</span>
                <p className="font-mono text-sm font-semibold text-[#B45309] dark:text-[#F5B942] mt-1">
                  {selectedApp.availableVersion || 'Up to Date'}
                </p>
              </div>
            </div>

            <div className="divide-y divide-border">
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Publisher</span>
                <span className="font-medium text-foreground">{selectedApp.publisher || 'Unknown'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Package Identifier</span>
                <span className="font-mono text-foreground">{selectedApp.packageId || 'None (Registry)'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Detection Source</span>
                <span className="px-2 py-0.5 rounded-md bg-secondary border border-border font-mono uppercase text-[11px] text-foreground">
                  {selectedApp.source}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selectedApp.updateStatus} size="sm" />
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Last Checked</span>
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
                  className="inline-flex items-center gap-1.5 text-[#009F91] dark:text-[#19C6B4] hover:underline font-medium"
                >
                  Official Publisher Website <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
