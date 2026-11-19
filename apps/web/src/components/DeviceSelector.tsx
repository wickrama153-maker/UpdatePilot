'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Laptop, ChevronDown, Check, Plus, Download, HardDrive } from 'lucide-react';

interface DeviceSelectorProps {
  devices: any[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string | null) => void;
  onOpenPairModal: () => void;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onOpenPairModal,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeDevice = devices.find((d) => d.id === selectedDeviceId);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary/70 text-foreground transition-colors text-xs font-medium"
      >
        <Laptop className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="truncate max-w-[130px]">
          {activeDevice ? activeDevice.name : 'All Workstations'}
        </span>
        {activeDevice && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              activeDevice.status === 'ONLINE' ? 'bg-[#22C55E]' : 'bg-[#EF5350]'
            }`}
          />
        )}
        <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-enterprise-dark overflow-hidden z-50 animate-in fade-in duration-100">
          <div className="px-3 py-2 border-b border-border bg-secondary/30">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Connected Workstations ({devices.length})
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-border/40">
            {/* Option: All Workstations */}
            <button
              type="button"
              onClick={() => {
                onSelectDevice(null);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-secondary/60 transition-colors ${
                selectedDeviceId === null ? 'bg-[#009F91]/10 dark:bg-[#19C6B4]/10 text-foreground font-semibold' : 'text-foreground/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
                <span>All Workstations (Aggregate)</span>
              </div>
              {selectedDeviceId === null && <Check className="w-3.5 h-3.5 text-[#009F91] dark:text-[#19C6B4]" />}
            </button>

            {/* List of individual devices */}
            {devices.map((device) => {
              const isSelected = selectedDeviceId === device.id;
              const isOnline = device.status === 'ONLINE';
              return (
                <button
                  key={device.id}
                  type="button"
                  onClick={() => {
                    onSelectDevice(device.id);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-secondary/60 transition-colors ${
                    isSelected ? 'bg-[#009F91]/10 dark:bg-[#19C6B4]/10 text-foreground font-semibold' : 'text-foreground/80'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isOnline ? 'bg-[#22C55E]' : 'bg-[#EF5350]'
                      }`}
                    />
                    <div className="truncate">
                      <p className="truncate font-medium">{device.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {device.osName} • {isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#009F91] dark:text-[#19C6B4] shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Quick Actions: Download Agent & Pair New Workstation */}
          <div className="p-2 border-t border-border bg-secondary/20 space-y-1">
            <a
              href="/downloads/UpdatePilot-Agent-Setup-1.0.0.exe"
              download
              className="w-full py-1.5 px-2.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#009F91] dark:text-[#19C6B4]" />
              <span>Download Agent Installer (.exe)</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenPairModal();
              }}
              className="w-full py-1.5 px-2.5 rounded-lg bg-[#009F91] hover:bg-[#008A7E] dark:bg-[#19C6B4] dark:hover:bg-[#15A898] text-[#0B111C] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Pair New Workstation</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
