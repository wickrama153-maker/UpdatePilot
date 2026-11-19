'use client';

import React, { useState } from 'react';
import { api, setAuthToken, setAuthUser } from '../lib/api';
import { LogIn, UserPlus, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: any) => void;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await api.register({ email, password, name: name.trim() || undefined });
        setAuthToken(res.token);
        setAuthUser(res.user);
        onSuccess(res.user);
      } else {
        const res = await api.login({ email, password });
        setAuthToken(res.token);
        setAuthUser(res.user);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const isDevMode = process.env.NODE_ENV === 'development';

  const handleDemoSignIn = async () => {
    if (!isDevMode) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({
        email: 'admin@updatepilot.local',
        password: 'AdminPassword123!',
      });
      setAuthToken(res.token);
      setAuthUser(res.user);
      onSuccess(res.user);
    } catch (err: any) {
      setError('Development administrator credentials unavailable: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B111C]/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-enterprise-dark overflow-hidden">
        {/* Header with UpdatePilot branding */}
        <div className="p-6 text-center border-b border-border bg-secondary/30 relative">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#009F91]/15 dark:bg-[#19C6B4]/15 border border-[#009F91]/30 dark:border-[#19C6B4]/30 text-[#009F91] dark:text-[#19C6B4] flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 3L20 18.5L12 15.5L4 18.5L12 3Z" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">UpdatePilot Account</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Sign in to manage your private Windows workstations and software updates
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-lg p-1 bg-secondary border border-border mt-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-[#EF5350]/15 border border-[#EF5350]/30 text-xs text-[#B91C1C] dark:text-[#EF5350] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#009F91] dark:focus:border-[#19C6B4]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#009F91] dark:focus:border-[#19C6B4]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#009F91] dark:focus:border-[#19C6B4]"
            />
            {mode === 'register' && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Must be at least 8 characters.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-[#009F91] hover:bg-[#008A7E] dark:bg-[#19C6B4] dark:hover:bg-[#15A898] text-[#0B111C] font-semibold text-xs tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : mode === 'register' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create UpdatePilot Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
              </>
            )}
          </button>

          {isDevMode && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span className="bg-card px-2">Development Access Only</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={loading}
                className="w-full py-2 px-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Shield className="w-3.5 h-3.5 text-[#009F91] dark:text-[#19C6B4]" />
                <span>Sign in as Default Administrator (Dev Only)</span>
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
