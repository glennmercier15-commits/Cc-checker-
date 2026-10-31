import React, { useState } from 'react';
import {
  Download,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Activity,
  X,
  Code2,
} from 'lucide-react';
import { TokenizationHistoryItem } from '../types/stripe';
import { getBrandDisplayName } from '../utils/cardUtils';
import { retrieveStripeTokenHealth } from '../utils/stripeApi';
import { JsonTreeViewer } from './JsonTreeViewer';

interface HistoryLedgerProps {
  history: TokenizationHistoryItem[];
  onSelectHistoryItem: (item: TokenizationHistoryItem) => void;
  onClearHistory: () => void;
  onNavigateToTokenizer: () => void;
  secretKey?: string;
  publishableKey?: string;
  useLiveApi?: boolean;
}

export const HistoryLedger: React.FC<HistoryLedgerProps> = ({
  history,
  onSelectHistoryItem,
  onClearHistory,
  onNavigateToTokenizer,
  secretKey,
  publishableKey,
  useLiveApi,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeHealthModal, setActiveHealthModal] = useState<{
    item: TokenizationHistoryItem;
    result?: any;
    error?: any;
    durationMs?: number;
    isLoading: boolean;
  } | null>(null);

  const copyToken = (tokenId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tokenId);
    setCopiedId(tokenId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunHealthCheck = async (item: TokenizationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveHealthModal({ item, isLoading: true });

    const res = await retrieveStripeTokenHealth(item.tokenId, secretKey, publishableKey, useLiveApi);
    setActiveHealthModal({
      item,
      result: res.data,
      error: res.error,
      durationMs: res.durationMs,
      isLoading: false,
    });
  };

  const exportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `stripe-tokenization-history-${Date.now()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (history.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 mb-4">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">
          No Token History Yet
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed mb-5">
          Tokens and PaymentMethods generated during this session will be recorded here for inspection, replay, and token health checking.
        </p>
        <button
          onClick={onNavigateToTokenizer}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Tokenize a Card Now
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Session Token Activity Log & Health Validator</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {history.length} {history.length === 1 ? 'token' : 'tokens'} recorded in current session · Verify status via API Retrieve
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Log</span>
          </button>
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase font-medium text-[11px] border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Token ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Card & Brand</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-900/80">
            {history.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelectHistoryItem(item)}
                className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3 font-mono font-medium text-indigo-300 tabular-nums">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[160px]">{item.tokenId}</span>
                    <button
                      onClick={(e) => copyToken(item.tokenId, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-slate-400 transition-opacity cursor-pointer"
                      title="Copy Token ID"
                    >
                      {copiedId === item.tokenId ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                  {item.tokenType === 'payment_method' ? 'payment_method' : 'token'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="capitalize font-medium text-slate-200">
                      {getBrandDisplayName(item.brand)}
                    </span>
                    <span className="font-mono text-slate-400 tabular-nums text-[11px]">
                      •••• {item.last4}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-slate-400">
                  {String(item.expMonth).padStart(2, '0')}/{item.expYear}
                </td>
                <td className="px-4 py-3">
                  {item.status === 'succeeded' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Succeeded
                    </span>
                  )}
                  {item.status === 'declined' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-medium">
                      <AlertTriangle className="w-3 h-3" /> Declined
                    </span>
                  )}
                  {item.status === 'requires_action' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 font-medium">
                      <Clock className="w-3 h-3" /> 3DS Action
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                      <AlertTriangle className="w-3 h-3" /> Error
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400 text-[11px] capitalize">
                  {item.mode === 'simulator' ? 'Sandbox' : 'Live API'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => handleRunHealthCheck(item, e)}
                      className="px-2.5 py-1 bg-violet-950/60 hover:bg-violet-900/60 border border-violet-600/40 text-violet-300 font-medium text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                      title="Run API Retrieve call to verify token health without charge"
                    >
                      <Activity className="w-3 h-3 text-violet-400" />
                      <span>Health Check</span>
                    </button>
                    <button
                      onClick={() => onSelectHistoryItem(item)}
                      className="text-indigo-400 hover:text-indigo-300 font-medium text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Token Health Modal Popup */}
      {activeHealthModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Token Health Validator</h3>
                  <span className="text-[10px] text-slate-400 font-mono">API Retrieve Call · Zero Charge</span>
                </div>
              </div>
              <button
                onClick={() => setActiveHealthModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeHealthModal.isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                <p className="text-xs text-slate-300 font-mono">
                  Calling Stripe Retrieve API for <code className="text-indigo-300">{activeHealthModal.item.tokenId}</code>...
                </p>
              </div>
            ) : activeHealthModal.error ? (
              <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl space-y-2 text-xs text-red-200">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Token Retrieve Failed</span>
                </div>
                <p className="text-slate-300">{activeHealthModal.error.message || 'Token not found or API key error.'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Health Status Badge */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Verified Status</span>
                    <span className="text-base font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{activeHealthModal.result?.health || 'Active & Valid (Uncharged)'}</span>
                    </span>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-400">
                    <div>{activeHealthModal.durationMs}ms</div>
                    <div className="text-[10px] text-slate-500">Retrieval Latency</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Retrieved Object JSON</span>
                  </span>
                  <JsonTreeViewer data={activeHealthModal.result} rootName="retrieved_object" initialExpandedDepth={2} />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveHealthModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                Close Validator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
