import React from 'react';
import { ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

export type NavigationTab = 'tokenizer' | 'bulk' | 'bin-checker' | 'payment-intents' | 'test-cards' | 'history' | 'security';

interface TopNavProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isLiveApi: boolean;
  hasSecretKey?: boolean;
  onOpenKeyModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  isLiveApi,
  hasSecretKey,
  onOpenKeyModal,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 relative">
      {/* Top micro-accent line reflecting logo colors */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-600 via-amber-400 to-lime-400 opacity-90" />
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Brand wordmark with Mr. Nice Guy Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/assets/aistudio/BackgroundEraser_20261021_013404677_810e2d2a.png"
            alt="Mr. Nice Guy Logo"
            className="w-9 h-9 object-contain drop-shadow-md select-none hover:scale-105 transition-transform"
          />
          <button
            onClick={() => setActiveTab('tokenizer')}
            className="text-base font-bold tracking-tight text-white whitespace-nowrap hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Mr. Nice Guy</span>
            <span className="text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
              Studio
            </span>
          </button>
        </div>

        {/* Zone 2: Concise text nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('tokenizer')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'tokenizer'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-amber-200'
            }`}
          >
            Card Tokenizer
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'bulk'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-amber-200'
            }`}
          >
            <span>Bulk Processor</span>
            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
              Batch
            </span>
          </button>
          <button
            onClick={() => setActiveTab('bin-checker')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'bin-checker'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-amber-200'
            }`}
          >
            <span>BIN Resource Checker</span>
            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-violet-500/20 text-violet-300 rounded border border-violet-500/30">
              ISO
            </span>
          </button>
          <button
            onClick={() => setActiveTab('payment-intents')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'payment-intents'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-amber-200'
            }`}
          >
            <span>Payment Intents API</span>
            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-lime-500/20 text-lime-300 rounded border border-lime-500/30">
              PI
            </span>
          </button>
          <button
            onClick={() => setActiveTab('test-cards')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'test-cards'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-amber-200'
            }`}
          >
            Test Card Library
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-amber-200'
            }`}
          >
            Token Activity Log
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'security'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-amber-200'
            }`}
          >
            PCI-DSS Architecture
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenKeyModal}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              isLiveApi
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60 shadow-sm shadow-emerald-950'
                : 'bg-slate-900 border-amber-500/30 text-amber-200 hover:bg-slate-800 hover:border-amber-400 hover:text-white'
            }`}
          >
            <KeyRound className={`w-3.5 h-3.5 ${isLiveApi ? 'text-lime-400' : 'text-amber-400'}`} />
            <span>
              {isLiveApi
                ? hasSecretKey
                  ? 'Live Stripe API (Secret Key 🔒)'
                  : 'Live Stripe API Active'
                : 'Sandbox Simulator'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
