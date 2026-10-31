import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, Check, HelpCircle, AlertCircle, Server, Sparkles, Eye, EyeOff, Lock } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretKey: string;
  setSecretKey: (key: string) => void;
  publishableKey: string;
  setPublishableKey: (key: string) => void;
  useLiveApi: boolean;
  setUseLiveApi: (useLive: boolean) => void;
}

interface ServerStatus {
  configured: boolean;
  hasSecretKey: boolean;
  hasPublishableKey: boolean;
  maskedSecretKey: string | null;
  maskedPublishableKey: string | null;
  mode: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  secretKey,
  setSecretKey,
  publishableKey,
  setPublishableKey,
  useLiveApi,
  setUseLiveApi,
}) => {
  const [localSecretKey, setLocalSecretKey] = useState(secretKey);
  const [localPublishableKey, setLocalPublishableKey] = useState(publishableKey);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'secret' | 'publishable' | 'env'>('secret');

  useEffect(() => {
    if (isOpen) {
      setLocalSecretKey(secretKey);
      setLocalPublishableKey(publishableKey);
      setErrorMsg(null);
      setSuccessNotice(null);

      // Check server proxy status for backend environment variables
      fetch('/api/stripe/status')
        .then((res) => res.json())
        .then((data: ServerStatus) => {
          setServerStatus(data);
        })
        .catch(() => {
          setServerStatus(null);
        });
    }
  }, [isOpen, secretKey, publishableKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    setErrorMsg(null);
    const trimmedSecret = localSecretKey.trim();
    const trimmedPub = localPublishableKey.trim();

    // Validation checks
    if (trimmedSecret && !trimmedSecret.startsWith('sk_') && !trimmedSecret.startsWith('rk_')) {
      setErrorMsg('Stripe Secret Keys must start with sk_test_ or sk_live_ (or rk_ for restricted keys).');
      return;
    }

    if (trimmedPub && !trimmedPub.startsWith('pk_test_') && !trimmedPub.startsWith('pk_live_')) {
      setErrorMsg('Stripe Publishable Keys must start with pk_test_ or pk_live_.');
      return;
    }

    setSecretKey(trimmedSecret);
    setPublishableKey(trimmedPub);

    if (trimmedSecret || trimmedPub || (serverStatus && serverStatus.hasSecretKey)) {
      setUseLiveApi(true);
    }

    onClose();
  };

  const handleResetToSimulator = () => {
    setLocalSecretKey('');
    setLocalPublishableKey('');
    setSecretKey('');
    setPublishableKey('');
    setUseLiveApi(false);
    onClose();
  };

  const handleUseServerKey = () => {
    if (serverStatus?.hasSecretKey) {
      setUseLiveApi(true);
      setSuccessNotice('Active: Using backend environment STRIPE_SECRET_KEY');
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/BackgroundEraser_20261021_013404677_810e2d2a.png"
              alt="Mr. Nice Guy"
              className="w-11 h-11 object-contain drop-shadow-md select-none shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Stripe API Configuration</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Secret Key Support
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure your Stripe Secret Key or Publishable Key for Live/Dead validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Mode Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Execution Mode
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setUseLiveApi(false)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                !useLiveApi
                  ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-lg ring-1 ring-indigo-500/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs block">Sandbox Simulator</span>
                {!useLiveApi && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
              <span className="text-[11px] opacity-80 block leading-tight">
                Offline mock suite simulating successful, declined, and expired test cards.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setUseLiveApi(true)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                useLiveApi
                  ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg ring-1 ring-emerald-500/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs block text-emerald-400">Live Stripe API</span>
                {useLiveApi && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <span className="text-[11px] opacity-80 block leading-tight">
                Real requests to Stripe via backend proxy with live/dead celebrations.
              </span>
            </button>
          </div>
        </div>

        {/* Server Environment Key Banner (if present) */}
        {serverStatus?.hasSecretKey && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-emerald-200">
              <Server className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Server Secret Key Active:</span>{' '}
                <code className="text-emerald-300 font-mono text-[11px]">{serverStatus.maskedSecretKey}</code>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseServerKey}
              className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
            >
              Use Server Key
            </button>
          </div>
        )}

        {/* Configuration Tabs */}
        <div className="flex border-b border-slate-800 space-x-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('secret')}
            className={`pb-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'secret'
                ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Stripe Secret Key (sk_...)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('publishable')}
            className={`pb-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'publishable'
                ? 'text-indigo-400 border-b-2 border-indigo-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Publishable Key (pk_...)
          </button>
        </div>

        {/* Secret Key Input Panel */}
        {activeTab === 'secret' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300">
                Stripe Secret API Key
              </label>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                sk_test_... or sk_live_...
              </span>
            </div>

            <div className="relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                value={localSecretKey}
                onChange={(e) => {
                  setLocalSecretKey(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="sk_test_51N0..."
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showSecretKey ? 'Hide key' : 'Show key'}
              >
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Backend Proxy Protection Note */}
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Backend Proxy Protected: </strong>
                Your Secret Key is dispatched exclusively through the backend proxy route (<code className="text-emerald-300">/api/stripe/tokenize</code>).
                This ensures safe server-side execution, full card validity checks, and prevents browser CORS blocks.
              </p>
            </div>
          </div>
        )}

        {/* Publishable Key Input Panel */}
        {activeTab === 'publishable' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300">
                Stripe Publishable Key
              </label>
              <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/20">
                pk_test_... or pk_live_...
              </span>
            </div>

            <input
              type="text"
              value={localPublishableKey}
              onChange={(e) => {
                setLocalPublishableKey(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="pk_test_51N0..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              Used for client-side token generation or fallback Stripe requests.
            </p>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Notice */}
        {successNotice && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetToSimulator}
            className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            Reset to Sandbox
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer shadow-md shadow-emerald-900/30 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
