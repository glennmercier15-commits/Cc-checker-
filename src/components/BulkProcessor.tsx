import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Sparkles,
  Bomb,
  Copy,
  Check,
  Download,
  Trash2,
  Layers,
  FileCode,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Code2,
  Terminal,
} from 'lucide-react';
import {
  CardBrand,
  StripeApiError,
  StripeLegacyTokenResponse,
  StripePaymentMethodResponse,
  TokenizationHistoryItem,
  TokenType,
} from '../types/stripe';
import { BulkCardInput, BulkCardResult, BulkCardStatus } from '../types/bulk';
import { parseBulkCardsInput } from '../utils/bulkParser';
import { detectCardBrand, formatCardNumber } from '../utils/cardUtils';
import { executeTokenization } from '../utils/stripeApi';
import { generateLiveImagery, generateDeadImagery, VividLogEntry } from '../utils/vividImagery';
import { BrandBadge } from './BrandBadge';
import { JsonTreeViewer } from './JsonTreeViewer';

interface BulkProcessorProps {
  publishableKey: string;
  secretKey?: string;
  useLiveApi: boolean;
  tokenType: TokenType;
  onAddHistoryItem: (item: TokenizationHistoryItem) => void;
  onTriggerNotification: (entry: VividLogEntry) => void;
  onOpenKeyModal: () => void;
}

// Preset test scenarios for 1-click loading
const SAMPLE_JSON_BATCH = JSON.stringify(
  [
    {
      cardNumber: '4242424242424242',
      expMonth: '12',
      expYear: '2028',
      cvc: '123',
      cardholderName: 'Alice Green (Live Visa)',
      postalCode: '90210',
    },
    {
      cardNumber: '4000000000000002',
      expMonth: '10',
      expYear: '2027',
      cvc: '999',
      cardholderName: 'Bob Decline (Dead 0002)',
      postalCode: '10001',
    },
    {
      cardNumber: '5555555555554444',
      expMonth: '11',
      expYear: '2029',
      cvc: '888',
      cardholderName: 'Charlie Brown (Live Mastercard)',
      postalCode: '94103',
    },
    {
      cardNumber: '4000000000009995',
      expMonth: '08',
      expYear: '2028',
      cvc: '777',
      cardholderName: 'Diana Radar (Dead Fraud)',
      postalCode: '33101',
    },
    {
      cardNumber: '378282246310005',
      expMonth: '05',
      expYear: '2028',
      cvc: '0005',
      cardholderName: 'Edward Amex (Live 15-Digit)',
      postalCode: '02138',
    },
  ],
  null,
  2
);

const SAMPLE_PIPE_DELIMITED = `# Format: cardNumber|expMonth|expYear|cvc|cardholderName|postalCode
4242424242424242|12|28|123|Alice Green|90210
4000000000000002|10|27|999|Bob Generic Decline|10001
5555555555554444|11|29|888|Charlie Mastercard|94103
4000000000000069|06|28|123|Frank Expired Card|60601
378282246310005|08|28|0005|Edward Amex 15-Digit|02138`;

const SAMPLE_ALL_LIVE = JSON.stringify(
  [
    {
      cardNumber: '4242424242424242',
      expMonth: '12',
      expYear: '2028',
      cvc: '123',
      cardholderName: 'Visa Victorious',
      postalCode: '90210',
    },
    {
      cardNumber: '5555555555554444',
      expMonth: '10',
      expYear: '2029',
      cvc: '888',
      cardholderName: 'Mastercard Celebration',
      postalCode: '10001',
    },
    {
      cardNumber: '378282246310005',
      expMonth: '08',
      expYear: '2028',
      cvc: '0005',
      cardholderName: 'Amex Platinum Fireworks',
      postalCode: '94103',
    },
    {
      cardNumber: '6011111111111117',
      expMonth: '04',
      expYear: '2029',
      cvc: '456',
      cardholderName: 'Discover Sparkler',
      postalCode: '30301',
    },
  ],
  null,
  2
);

const SAMPLE_ALL_DEAD = `# Test cards that simulate bank decline, fraud blocks, and expiration
4000000000000002|10|27|999|Card 0002 Generic Issuer Decline|10001
4000000000009995|08|28|777|Card 9995 Radar High Risk Fraud Block|33101
4000000000000069|05|23|123|Card 0069 Expired Card Decline|60601
4000000000000119|04|28|123|Card 0119 Processing Error|02138`;

export const BulkProcessor: React.FC<BulkProcessorProps> = ({
  publishableKey,
  secretKey,
  useLiveApi,
  tokenType: initialTokenType,
  onAddHistoryItem,
  onTriggerNotification,
  onOpenKeyModal,
}) => {
  // Input state
  const [inputText, setInputText] = useState<string>(SAMPLE_JSON_BATCH);
  const [activeTokenType, setActiveTokenType] = useState<TokenType>(initialTokenType);
  const [delayMs, setDelayMs] = useState<number>(500);
  const [stopOnDecline, setStopOnDecline] = useState<boolean>(false);

  // Execution state
  const [results, setResults] = useState<BulkCardResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'live' | 'dead'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Abort reference
  const stopRequestedRef = useRef<boolean>(false);
  const pauseRequestedRef = useRef<boolean>(false);

  // Live parsed count
  const parsedPreview = React.useMemo(() => {
    return parseBulkCardsInput(inputText);
  }, [inputText]);

  // Keep refs in sync
  useEffect(() => {
    pauseRequestedRef.current = isPaused;
  }, [isPaused]);

  // Execute bulk processing sequentially
  const handleStartBulkProcessing = async () => {
    const { cards, errors } = parseBulkCardsInput(inputText);
    if (cards.length === 0) {
      return;
    }

    stopRequestedRef.current = false;
    pauseRequestedRef.current = false;
    setIsRunning(true);
    setIsPaused(false);

    // Initialize blank results array
    const initialResults: BulkCardResult[] = cards.map((c) => ({
      id: c.id,
      card: c,
      brand: detectCardBrand(c.cardNumber),
      status: 'pending',
    }));
    setResults(initialResults);

    for (let i = 0; i < cards.length; i++) {
      if (stopRequestedRef.current) {
        break;
      }

      // Check pause
      while (pauseRequestedRef.current && !stopRequestedRef.current) {
        await new Promise((r) => setTimeout(r, 150));
      }

      if (stopRequestedRef.current) {
        break;
      }

      setCurrentIndex(i);
      const card = cards[i];
      const brand = detectCardBrand(card.cardNumber);
      const last4 = card.cardNumber.slice(-4) || '4242';

      // Set card to 'processing'
      setResults((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'processing' } : item))
      );

      // Execute tokenization
      const result = await executeTokenization({
        cardNumber: card.cardNumber,
        expMonth: card.expMonth,
        expYear: card.expYear,
        cvc: card.cvc,
        name: card.cardholderName || 'Jane Doe',
        postalCode: card.postalCode,
        country: card.country,
        tokenType: activeTokenType,
        publishableKey,
        secretKey,
        useLiveApi,
      });

      const isLive = result.success && !!result.data;
      const status: BulkCardStatus = isLive ? 'live' : 'dead';

      let technicalData = '';
      let vividImagery = '';

      if (isLive && result.data) {
        const gen = generateLiveImagery({
          cardNumber: card.cardNumber,
          brand,
          last4,
          durationMs: result.durationMs,
          data: result.data,
        });
        technicalData = gen.technicalData;
        vividImagery = gen.vividImagery;

        // Record history item
        const historyItem: TokenizationHistoryItem = {
          id: 'hist_' + Date.now() + '_' + i,
          tokenId: result.data.id,
          tokenType: activeTokenType,
          brand,
          last4,
          expMonth: parseInt(card.expMonth, 10),
          expYear: parseInt(card.expYear, 10),
          createdAt: Math.floor(Date.now() / 1000),
          cardholderName: card.cardholderName || 'Jane Doe',
          status: 'succeeded',
          rawResponse: result.data,
          rawError: null,
          mode: useLiveApi ? 'live_api' : 'simulator',
        };
        onAddHistoryItem(historyItem);
      } else {
        const errorObj: StripeApiError = result.error || {
          type: 'card_error',
          code: 'card_declined',
          decline_code: 'generic_decline',
          message: 'The card was declined by the issuer.',
        };
        const gen = generateDeadImagery({
          cardNumber: card.cardNumber,
          brand,
          last4,
          durationMs: result.durationMs,
          error: errorObj,
        });
        technicalData = gen.technicalData;
        vividImagery = gen.vividImagery;

        // Record decline history item
        const historyItem: TokenizationHistoryItem = {
          id: 'hist_' + Date.now() + '_' + i,
          tokenId: errorObj.code ? `error_${errorObj.code}` : 'error_declined',
          tokenType: activeTokenType,
          brand,
          last4,
          expMonth: parseInt(card.expMonth, 10) || 0,
          expYear: parseInt(card.expYear, 10) || 0,
          createdAt: Math.floor(Date.now() / 1000),
          cardholderName: card.cardholderName || 'Jane Doe',
          status: 'declined',
          rawResponse: null,
          rawError: errorObj,
          mode: useLiveApi ? 'live_api' : 'simulator',
        };
        onAddHistoryItem(historyItem);
      }

      // Trigger high-impact notification overlay
      onTriggerNotification({
        id: `notif_${Date.now()}_${i}`,
        status,
        cardNumber: card.cardNumber,
        brand,
        last4,
        technicalData,
        vividImagery,
        durationMs: result.durationMs,
        timestamp: Date.now(),
      });

      // Update card result state
      setResults((prev) =>
        prev.map((item, idx) =>
          idx === i
            ? {
                ...item,
                status,
                technicalData,
                vividImagery,
                durationMs: result.durationMs,
                rawResponse: result.data || null,
                rawError: result.error || null,
                timestamp: Date.now(),
              }
            : item
        )
      );

      // Stop on decline if configured
      if (!isLive && stopOnDecline) {
        break;
      }

      // Optional delay before proceeding to next card
      if (i < cards.length - 1 && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(-1);
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    setIsRunning(false);
    setIsPaused(false);
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Export results as JSON
  const handleExportJSON = () => {
    const exportData = results.map((r) => ({
      status: r.status,
      cardNumber: `•••• •••• •••• ${r.card.cardNumber.slice(-4)}`,
      brand: r.brand,
      expMonth: r.card.expMonth,
      expYear: r.card.expYear,
      cardholderName: r.card.cardholderName,
      technicalData: r.technicalData,
      vividImagery: r.vividImagery,
      durationMs: r.durationMs,
      responseId: r.rawResponse?.id,
      errorCode: r.rawError?.code,
      declineCode: r.rawError?.decline_code,
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : undefined,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stripe-bulk-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export live cards only
  const handleExportLiveCards = () => {
    const liveCards = results.filter((r) => r.status === 'live');
    const exportData = liveCards.map((r) => ({
      id: r.rawResponse?.id,
      brand: r.brand,
      last4: r.card.cardNumber.slice(-4),
      expMonth: r.card.expMonth,
      expYear: r.card.expYear,
      name: r.card.cardholderName,
      rawResponse: r.rawResponse,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stripe-live-cards-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered results
  const filteredResults = results.filter((r) => {
    if (filterMode === 'live') return r.status === 'live';
    if (filterMode === 'dead') return r.status === 'dead';
    return true;
  });

  const totalCount = results.length;
  const liveCount = results.filter((r) => r.status === 'live').length;
  const deadCount = results.filter((r) => r.status === 'dead').length;
  const processedCount = liveCount + deadCount;
  const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Context */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shadow-inner">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Sequential Bulk Tokenizer & Status Monitor</span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Accepts a list of card objects (JSON or delimited) and executes client-side tokenization sequentially.
                </p>
              </div>
            </div>
          </div>

          {/* Mode Badge & Config Action */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center gap-2">
              <span className="text-slate-400">Environment:</span>
              <span className="font-semibold text-slate-200">
                {useLiveApi
                  ? secretKey
                    ? 'Live Stripe API (Secret Key 🔒)'
                    : publishableKey
                      ? 'Live Stripe API (pk_...)'
                      : 'Live Stripe API'
                  : 'Sandbox Simulator'}
              </span>
            </div>
            <button
              onClick={onOpenKeyModal}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium underline cursor-pointer"
            >
              Configure API
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Input & Options (Left) | Execution Monitor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Box & Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>Card Objects Input</span>
              </label>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                  parsedPreview.cards.length > 0
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {parsedPreview.cards.length} valid cards detected
              </span>
            </div>

            {/* Quick Template Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 block font-medium">Quick Preset Templates:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setInputText(SAMPLE_JSON_BATCH)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
                >
                  🌟 Mixed Batch (JSON)
                </button>
                <button
                  type="button"
                  onClick={() => setInputText(SAMPLE_ALL_LIVE)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 text-emerald-300 rounded-lg transition-colors cursor-pointer"
                >
                  🎆 All Live Cards
                </button>
                <button
                  type="button"
                  onClick={() => setInputText(SAMPLE_ALL_DEAD)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/40 text-rose-300 rounded-lg transition-colors cursor-pointer"
                >
                  💣 Declines & Frauds
                </button>
                <button
                  type="button"
                  onClick={() => setInputText(SAMPLE_PIPE_DELIMITED)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors cursor-pointer"
                >
                  📄 Pipe Delimited
                </button>
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                  title="Clear input"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Text Area */}
            <div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isRunning}
                rows={11}
                placeholder={`Paste a JSON array of card objects or pipe-delimited lines:\n[\n  { "cardNumber": "4242424242424242", "expMonth": "12", "expYear": "2028", "cvc": "123", "name": "Jane Doe" }\n]\n\nOR:\n4242424242424242|12|28|123|Jane Doe|90210`}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-y"
              />
              <span className="text-[11px] text-slate-500 block mt-1">
                Accepts JSON arrays of objects or standard format: <code>number|MM|YY|CVC|name|zip</code>
              </span>
            </div>

            {/* Parse Warnings */}
            {parsedPreview.errors.length > 0 && (
              <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-xl text-[11px] text-amber-300 space-y-1">
                <span className="font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Parse warnings:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-400/90 max-h-20 overflow-y-auto">
                  {parsedPreview.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Batch Execution Settings */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Token Type */}
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Stripe Target Endpoint
                  </label>
                  <select
                    value={activeTokenType}
                    onChange={(e) => setActiveTokenType(e.target.value as TokenType)}
                    disabled={isRunning}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="payment_method">PaymentMethod (Recommended)</option>
                    <option value="token">Legacy Token (v1/tokens)</option>
                  </select>
                </div>

                {/* Delay between requests */}
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Sequential Interval: <span className="text-amber-400 font-mono">{delayMs}ms</span>
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={delayMs}
                    onChange={(e) => setDelayMs(parseInt(e.target.value, 10))}
                    disabled={isRunning}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Stop on decline checkbox */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stopOnDecline}
                  onChange={(e) => setStopOnDecline(e.target.checked)}
                  disabled={isRunning}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500/30 accent-amber-500"
                />
                <span>Halt execution immediately on first card decline</span>
              </label>
            </div>

            {/* Action Execution Bar */}
            <div className="pt-2 flex items-center gap-2">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={handleStartBulkProcessing}
                  disabled={parsedPreview.cards.length === 0}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Run Sequential Tokenization ({parsedPreview.cards.length} Cards)</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    <span>{isPaused ? 'Resume Processing' : 'Pause'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    className="py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-rose-300" />
                    <span>Stop</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Monitor & Status Display (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Progress & Stat Cards Header */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Batch Execution Status</span>
                  {isRunning && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse border border-amber-500/20">
                      Processing card {currentIndex + 1} of {totalCount}...
                    </span>
                  )}
                </h3>
                <span className="text-xs text-slate-400">
                  Real-time status monitor triggering 🎆 Fireworks on Live and 💣 Bombs on Dead cards.
                </span>
              </div>

              {/* Export Actions */}
              {results.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportLiveCards}
                    disabled={liveCount === 0}
                    className="px-2.5 py-1 text-xs font-medium bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title="Export only live cards"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export Live ({liveCount})</span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export All</span>
                  </button>
                </div>
              )}
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Total Batch</span>
                <span className="text-lg font-bold text-slate-100 font-mono">{totalCount}</span>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3">
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span>🎆 Live (Success)</span>
                </span>
                <span className="text-lg font-bold text-emerald-300 font-mono">{liveCount}</span>
              </div>
              <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3">
                <span className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                  <span>💣 Dead (Declined)</span>
                </span>
                <span className="text-lg font-bold text-rose-300 font-mono">{deadCount}</span>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Remaining</span>
                <span className="text-lg font-bold text-slate-300 font-mono">
                  {Math.max(0, totalCount - processedCount)}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            {totalCount > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">
                    {processedCount} of {totalCount} completed ({progressPercent}%)
                  </span>
                  <span className="text-amber-400 font-medium">
                    {isRunning ? (isPaused ? 'Paused' : 'Sequential Running') : 'Idle'}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-950 border border-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isRunning
                        ? 'bg-gradient-to-r from-violet-500 via-amber-400 to-lime-400 animate-pulse'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Results Filter & List View */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({results.length})
                </button>
                <button
                  onClick={() => setFilterMode('live')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    filterMode === 'live'
                      ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800/50'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  🎆 Live ({liveCount})
                </button>
                <button
                  onClick={() => setFilterMode('dead')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    filterMode === 'dead'
                      ? 'bg-rose-950 text-rose-300 font-semibold border border-rose-800/50'
                      : 'text-slate-400 hover:text-rose-400'
                  }`}
                >
                  💣 Dead ({deadCount})
                </button>
              </div>

              {results.length > 0 && (
                <button
                  onClick={() => setResults([])}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear List</span>
                </button>
              )}
            </div>

            {/* Results Items */}
            {filteredResults.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-600 stroke-[1.5]" />
                <p className="text-xs font-medium">No card results to display.</p>
                <p className="text-[11px] text-slate-600 max-w-sm mx-auto">
                  Click &quot;Run Sequential Tokenization&quot; to begin processing card objects from the text area.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {filteredResults.map((item, idx) => {
                  const isExpanded = expandedResultId === item.id;
                  const last4 = item.card.cardNumber.slice(-4);
                  const isCurrent = currentIndex === idx;

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-3.5 transition-all ${
                        item.status === 'live'
                          ? 'bg-slate-950/70 border-emerald-500/40 shadow-sm shadow-emerald-950/30'
                          : item.status === 'dead'
                          ? 'bg-slate-950/70 border-rose-500/40 shadow-sm shadow-rose-950/30'
                          : item.status === 'processing'
                          ? 'bg-indigo-950/30 border-indigo-500/50 animate-pulse'
                          : 'bg-slate-950/40 border-slate-800'
                      }`}
                    >
                      {/* Top Row: Card Info & Status Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <BrandBadge brand={item.brand} />
                          <span className="font-mono text-xs font-bold text-slate-200">
                            •••• •••• •••• {last4}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {item.card.expMonth}/{item.card.expYear.slice(-2)}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            CVC: {item.card.cvc}
                          </span>
                          {item.card.cardholderName && (
                            <span className="text-xs text-slate-400 truncate max-w-[140px]">
                              ({item.card.cardholderName})
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {item.status === 'live' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-emerald-950 border border-emerald-500/50 text-emerald-300 rounded-full shadow-sm shadow-emerald-900/40">
                              <span>🎆</span>
                              <span>LIVE</span>
                            </span>
                          )}

                          {item.status === 'dead' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-rose-950 border border-rose-500/50 text-rose-300 rounded-full shadow-sm shadow-rose-900/40">
                              <span>💣</span>
                              <span>DEAD</span>
                            </span>
                          )}

                          {item.status === 'processing' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold bg-indigo-950 border border-indigo-500/50 text-indigo-300 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                              <span>Tokenizing...</span>
                            </span>
                          )}

                          {item.status === 'pending' && (
                            <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-900 text-slate-500 rounded-full border border-slate-800">
                              Pending
                            </span>
                          )}

                          {/* Quick Expand Button */}
                          {(item.rawResponse || item.rawError) && (
                            <button
                              onClick={() => setExpandedResultId(isExpanded ? null : item.id)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                              title={isExpanded ? 'Hide details' : 'Inspect JSON Tree'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Technical Data Line (When Processed) */}
                      {item.technicalData && (
                        <div className="mt-2.5 bg-slate-900/90 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-slate-300 flex items-start gap-2 select-all">
                          <Terminal className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span className="break-all">{item.technicalData}</span>
                        </div>
                      )}

                      {/* Vivid Imagery Sentence (When Processed) */}
                      {item.vividImagery && (
                        <div
                          className={`mt-2 p-2 rounded-lg text-xs leading-relaxed italic ${
                            item.status === 'live'
                              ? 'bg-emerald-950/25 border border-emerald-900/30 text-emerald-200'
                              : 'bg-rose-950/25 border border-rose-900/30 text-rose-200'
                          }`}
                        >
                          <p>{item.vividImagery}</p>
                        </div>
                      )}

                      {/* Expanded Raw JSON Tree Viewer */}
                      {isExpanded && (item.rawResponse || item.rawError) && (
                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                              <span>
                                {item.rawResponse
                                  ? 'Stripe API Raw Response Object'
                                  : 'Stripe API Raw Error Object'}
                              </span>
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  JSON.stringify(item.rawResponse || item.rawError, null, 2),
                                  item.id
                                )
                              }
                              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Raw JSON</span>
                                </>
                              )}
                            </button>
                          </div>

                          <JsonTreeViewer
                            data={item.rawResponse || item.rawError}
                            rootName={item.rawResponse ? 'rawResponse' : 'rawError'}
                            initialExpandedDepth={2}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
