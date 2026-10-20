import React, { useState, useEffect } from 'react';
import { Lock, User, ShieldCheck, AlertCircle, UtensilsCrossed, ArrowRight, Server, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuthWorkerUrl, setAuthWorkerUrl } from '../services/api';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [workerUrlInput, setWorkerUrlInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setWorkerUrlInput(getAuthWorkerUrl());
  }, []);

  const handleSaveWorkerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthWorkerUrl(workerUrlInput);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setShowServerConfig(false);
    }, 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both your Employee ID / Username and Password.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-emerald-50/30 flex flex-col justify-center items-center px-4 py-8">
      
      {/* Brand Header */}
      <div className="w-full max-w-sm mb-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-xl shadow-brand-500/20 mx-auto mb-3">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          SSIP Cafeteria
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Shimano Employee Meal Ordering Portal
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70">
          <h2 className="font-extrabold text-slate-900 text-base">Employee Sign In</h2>
          <p className="text-xs text-slate-500 mt-0.5">Please log in to view menus and cafeteria wallet</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Employee ID / Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your Employee ID or Username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2 p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-800">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>Secure login. Your session credentials stay securely in your device.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl text-sm shadow-md shadow-brand-600/25 active:scale-95 transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Signing In...' : 'Sign In to Cafeteria'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Server Config Collapsible */}
        <div className="px-5 sm:px-6 pb-4 pt-1 border-t border-slate-100/80 bg-slate-50/40">
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            className="w-full flex items-center justify-between text-[11px] text-slate-500 hover:text-slate-800 transition-colors font-medium py-1"
          >
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Auth Edge Worker (Cloudflare)</span>
            </span>
            <span className="text-[10px] text-brand-600 font-bold hover:underline">
              {showServerConfig ? 'Close' : 'Configure'}
            </span>
          </button>

          {showServerConfig && (
            <form onSubmit={handleSaveWorkerUrl} className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-2 animate-in fade-in duration-150">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Paste your deployed Cloudflare Worker URL to validate staff passwords directly via edge proxy.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={workerUrlInput}
                  onChange={(e) => setWorkerUrlInput(e.target.value)}
                  placeholder="https://ssip-cafeteria-auth.YOUR_SUBDOMAIN.workers.dev"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-brand-500 text-slate-800 font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors flex items-center gap-1"
                >
                  {savedSuccess ? <Check className="w-3.5 h-3.5" /> : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

      {/* Footer */}
      <p className="text-[11px] text-slate-400 mt-6 text-center">
        Shimano Singapore (SSIP) Canteen Ordering System
      </p>

    </div>
  );
};
