import React, { useState, useEffect } from 'react';
import {
  Search,
  CreditCard,
  Building2,
  Globe,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  Terminal,
  HelpCircle,
  FileText,
  BadgeAlert,
  Flame,
} from 'lucide-react';
import { BinDetails, BinAnatomySegment } from '../types/bin';
import { lookupBin, getCardAnatomy, sanitizeBinInput } from '../utils/binLookup';
import { KNOWN_BIN_DATABASE } from '../data/binDatabase';
import { BrandBadge } from './BrandBadge';
import { getBrandDisplayName } from '../utils/cardUtils';

interface BinResourceCheckerProps {
  onLoadIntoTokenizer?: (cardNumber: string) => void;
  initialQuery?: string;
}

const SAMPLE_PRESETS = [
  { label: 'Visa Default (Stripe)', bin: '424242', desc: 'Stripe Sandbox Primary' },
  { label: 'Chase Sapphire Reserve', bin: '41472023', desc: '8-Digit Visa Infinite' },
  { label: 'Capital One Venture X', bin: '517805', desc: 'Mastercard World Elite' },
  { label: 'Amex Platinum', bin: '378282', desc: '15-Digit Centurion Bank' },
  { label: 'BofA Durbin Debit', bin: '434256', desc: 'Reg II Regulated Debit' },
  { label: 'Stripe Commercial', bin: '471563', desc: 'Celtic Bank Level 3 B2B' },
  { label: 'Cash App Prepaid', bin: '532959', desc: 'Sutton Bank Reloadable' },
  { label: 'Barclays UK Debit', bin: '454313', desc: 'European IFR 0.20% Cap' },
];

export const BinResourceChecker: React.FC<BinResourceCheckerProps> = ({
  onLoadIntoTokenizer,
  initialQuery = '424242',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeBin, setActiveBin] = useState<BinDetails | null>(null);
  const [anatomy, setAnatomy] = useState<BinAnatomySegment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'single' | 'batch' | 'standards'>('single');

  // Batch lookup state
  const [batchInput, setBatchInput] = useState<string>(
    '424242\n41472023\n517805\n378282\n434256\n471563\n532959\n454313'
  );
  const [batchResults, setBatchResults] = useState<BinDetails[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);

  // Perform single BIN lookup
  const performLookup = async (inputStr: string) => {
    const clean = sanitizeBinInput(inputStr);
    if (clean.length < 6) {
      setActiveBin(null);
      setAnatomy(getCardAnatomy(clean));
      return;
    }

    setIsLoading(true);
    setAnatomy(getCardAnatomy(clean));
    try {
      const result = await lookupBin(clean);
      setActiveBin(result);
    } catch {
      setActiveBin(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    performLookup(query);
  }, [query]);

  // Execute Batch Lookup
  const handleRunBatch = async () => {
    setIsBatchRunning(true);
    const lines = batchInput
      .split('\n')
      .map((l) => sanitizeBinInput(l))
      .filter((l) => l.length >= 6);

    const results: BinDetails[] = [];
    for (const line of lines) {
      const res = await lookupBin(line);
      if (res) results.push(res);
    }
    setBatchResults(results);
    setIsBatchRunning(false);
  };

  const handleCopyJson = () => {
    if (!activeBin) return;
    navigator.clipboard.writeText(JSON.stringify(activeBin, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleSendToTokenizer = () => {
    if (!onLoadIntoTokenizer || !activeBin) return;
    // Generate a valid length synthetic number based on brand
    const isAmex = activeBin.brand === 'amex';
    const targetLen = isAmex ? 15 : 16;
    const padded = (activeBin.bin + '4242424242424242').slice(0, targetLen);
    onLoadIntoTokenizer(padded);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title Bar styled with Mr. Nice Guy Logo Theme */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shadow-inner">
              <Search className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">
                  BIN / IIN Financial Resource Checker
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                  ISO/IEC 7812
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full">
                  8-Digit 2022 Spec
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect Bank Identification Numbers, issuer routing, card tier classification, Durbin debit regulation, and interchange specs.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-amber-200'
              }`}
            >
              Interactive Lookup
            </button>
            <button
              onClick={() => setViewMode('batch')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'batch'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-amber-200'
              }`}
            >
              Batch Matrix
            </button>
            <button
              onClick={() => setViewMode('standards')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'standards'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-amber-200'
              }`}
            >
              ISO Standards
            </button>
          </div>
        </div>
      </div>

      {/* Mode 1: Single Interactive BIN Lookup */}
      {viewMode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input, Quick Presets & Card Anatomy (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Search Input Box */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
                <span>Enter BIN / IIN or Full Card Number</span>
                <span className="text-[11px] font-mono text-amber-400">
                  {sanitizeBinInput(query).length >= 8
                    ? '8-Digit Modern BIN'
                    : sanitizeBinInput(query).length >= 6
                    ? '6-Digit Legacy BIN'
                    : 'Requires 6+ digits'}
                </span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. 424242 or 41472023..."
                  maxLength={19}
                  className="w-full pl-10 pr-24 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-medium block">
                  Quick Issuer Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_PRESETS.map((preset) => (
                    <button
                      key={preset.bin}
                      type="button"
                      onClick={() => setQuery(preset.bin)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all cursor-pointer ${
                        sanitizeBinInput(query).startsWith(preset.bin)
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold shadow-sm'
                          : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                      title={preset.desc}
                    >
                      <span>{preset.label}</span>
                      <span className="ml-1 text-[10px] font-mono opacity-70">({preset.bin})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual Card Anatomy Strip */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                  <span>ISO/IEC 7812 Card Anatomy</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  Structure breakdown
                </span>
              </div>

              {anatomy.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex gap-1 p-2 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto font-mono text-sm">
                    {anatomy.map((seg, i) => (
                      <div
                        key={i}
                        className={`px-2 py-1 rounded border flex flex-col items-center justify-center shrink-0 ${seg.colorClass}`}
                      >
                        <span className="font-bold tracking-widest">{seg.digits}</span>
                        <span className="text-[9px] uppercase tracking-tighter opacity-80 mt-0.5">
                          {seg.label.split(' ')[0]}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Legend explanation list */}
                  <div className="space-y-1.5 pt-1">
                    {anatomy.map((seg, i) => (
                      <div key={i} className="text-[11px] text-slate-400 flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-amber-400/80" />
                        <div>
                          <strong className="text-slate-200">{seg.label}: </strong>
                          <span className="text-slate-400">{seg.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                  Enter at least 1 digit to visualize card structure.
                </div>
              )}
            </div>

            {/* Quick Actions Card */}
            {activeBin && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Ready to tokenize this card range?</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedJson ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedJson ? 'Copied' : 'Copy Spec'}</span>
                  </button>
                  {onLoadIntoTokenizer && (
                    <button
                      type="button"
                      onClick={handleSendToTokenizer}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <span>Load in Tokenizer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Detailed Card Intelligence & Specifications (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {activeBin ? (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6">
                {/* Header: Bank & Card Brand Title with Flag */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{activeBin.country.flag}</span>
                      <h2 className="text-base font-bold text-white">
                        {activeBin.issuer.name}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{activeBin.country.name} ({activeBin.country.alpha2})</span>
                      <span>·</span>
                      <span className="font-mono">{activeBin.country.currency} ({activeBin.country.currencySymbol})</span>
                      {activeBin.issuer.city && (
                        <>
                          <span>·</span>
                          <span>{activeBin.issuer.city}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <BrandBadge brand={activeBin.brand} size="md" />
                    <div className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl font-mono text-xs font-bold">
                      BIN {activeBin.bin}
                    </div>
                  </div>
                </div>

                {/* Classification Badges Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Payment Scheme</span>
                    <span className="font-bold text-slate-200 uppercase font-mono text-sm">
                      {activeBin.scheme}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Funding Type</span>
                    <span className="font-bold text-amber-300 capitalize text-sm">
                      {activeBin.funding}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Card Tier / Level</span>
                    <span className="font-bold text-violet-300 text-sm">
                      {activeBin.tier}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">BIN Specification</span>
                    <span className="font-bold text-lime-400 font-mono text-sm">
                      {activeBin.binLength}-Digit
                    </span>
                  </div>
                </div>

                {/* Technical Specifications & Interchange Matrix */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
                    <span>Technical Capabilities & Regulatory Profile</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Durbin Amendment Status */}
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-white block">
                          US Durbin Debit Regulation (Reg II)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {activeBin.technicalSpecs.durbinRegulated
                            ? 'Statutory interchange cap: $0.21 + 0.05%'
                            : 'Exempt / Standard credit or non-regulated interchange'}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ml-2 ${
                          activeBin.technicalSpecs.durbinRegulated
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {activeBin.technicalSpecs.durbinRegulated ? 'Covered' : 'Exempt'}
                      </span>
                    </div>

                    {/* 3D Secure / SCA Support */}
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-white block">
                          3D Secure / SCA Support
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Supports 3DS2 frictionless biometric & challenge flows
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-lime-500/20 text-lime-300 border border-lime-500/30 shrink-0 ml-2">
                        Supported
                      </span>
                    </div>

                    {/* Level 2 & 3 Commercial Data */}
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-white block">
                          Level 2 / 3 B2B Interchange Data
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {activeBin.technicalSpecs.level3DataEligible
                            ? 'Eligible for line-item tax and PO interchange discounts'
                            : 'Consumer card; standard single-line settlement'}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ml-2 ${
                          activeBin.technicalSpecs.level3DataEligible
                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {activeBin.technicalSpecs.level3DataEligible ? 'L3 Ready' : 'Consumer'}
                      </span>
                    </div>

                    {/* Push-to-Card / Real-Time Payouts */}
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-white block">
                          Push-to-Card (Visa Direct / Send)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Instant card payouts and debit rail disbursement
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-lime-500/20 text-lime-300 border border-lime-500/30 shrink-0 ml-2">
                        {activeBin.technicalSpecs.pushToCardSupported ? 'Active' : 'Unsupported'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Risk & Card-Testing Vulnerability Assessment */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Card-Testing Fraud Vulnerability Score</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        activeBin.technicalSpecs.riskScore === 'Low'
                          ? 'bg-lime-500/20 text-lime-300 border-lime-500/30'
                          : activeBin.technicalSpecs.riskScore === 'Medium'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {activeBin.technicalSpecs.riskScore} Risk Profile
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {activeBin.technicalSpecs.riskRationale}
                  </p>
                </div>

                {/* Source Provenance */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Registry Source: {activeBin.rawSource || 'Verified Clearinghouse'}</span>
                  <span>ISO/IEC 7812 Certified</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-amber-400 mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Enter a 6 or 8-digit BIN to start
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                  Type any card number or pick from the quick presets on the left to reveal bank routing, Durbin debit rules, and interchange tiering.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Batch Matrix Analyzer */}
      {viewMode === 'batch' && (
        <div className="space-y-5">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Batch BIN Matrix Analyzer</h3>
                <p className="text-xs text-slate-400">
                  Paste multiple 6-digit or 8-digit BINs (one per line) to process issuer specs in bulk.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunBatch}
                disabled={isBatchRunning}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
              >
                {isBatchRunning ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>Resolving BINs...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Analyze Batch</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              rows={5}
              placeholder="424242&#10;41472023&#10;517805&#10;378282"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          {/* Batch Results Table */}
          {batchResults.length > 0 && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  Resolved Issuers ({batchResults.length})
                </span>
                <span className="text-[11px] font-mono text-amber-400">
                  Global Financial Matrix
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-medium text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">BIN / IIN</th>
                      <th className="px-4 py-3">Brand & Scheme</th>
                      <th className="px-4 py-3">Issuing Institution</th>
                      <th className="px-4 py-3">Country</th>
                      <th className="px-4 py-3">Funding</th>
                      <th className="px-4 py-3">Tier</th>
                      <th className="px-4 py-3">Durbin Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/80 font-mono">
                    {batchResults.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-amber-300">{item.bin}</td>
                        <td className="px-4 py-3">
                          <BrandBadge brand={item.brand} size="sm" />
                        </td>
                        <td className="px-4 py-3 font-sans font-medium text-white max-w-[200px] truncate">
                          {item.issuer.name}
                        </td>
                        <td className="px-4 py-3 font-sans">
                          <span className="mr-1.5">{item.country.flag}</span>
                          <span>{item.country.name}</span>
                        </td>
                        <td className="px-4 py-3 capitalize">{item.funding}</td>
                        <td className="px-4 py-3 text-violet-300 font-sans">{item.tier}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.technicalSpecs.durbinRegulated
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'text-slate-400'
                            }`}
                          >
                            {item.technicalSpecs.durbinRegulated ? 'Regulated' : 'Exempt'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-sans">
                          {onLoadIntoTokenizer && (
                            <button
                              type="button"
                              onClick={() => {
                                const pad = (item.bin + '4242424242424242').slice(0, 16);
                                onLoadIntoTokenizer(pad);
                              }}
                              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                            >
                              Load
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Standards & Educational Reference Guide */}
      {viewMode === 'standards' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>ISO/IEC 7812 Identification Cards Reference Standard</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              International Organization for Standardization specifications governing Bank Identification Numbers (BIN) and Issuer Identification Numbers (IIN).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="font-bold text-amber-400 block">
                The 2022 8-Digit BIN Migration
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                In April 2022, Visa and Mastercard formally adopted the 8-digit BIN standard under ISO/IEC 7812-1:2017. While legacy 6-digit BINs remain functional, financial institutions now allocate 8-digit prefixes to expand routing capacity for fintechs, virtual card providers, and commercial expense platforms.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="font-bold text-lime-400 block">
                Durbin Amendment (Federal Reserve Reg II)
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Section 1075 of the Dodd-Frank Act caps debit card interchange fees for banks with assets exceeding $10 billion to 21 cents plus 5 basis points. Credit cards, commercial corporate cards, and debit cards issued by small financial institutions under $10B are legally exempt.
              </p>
            </div>
          </div>

          {/* MII Table */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-slate-200 block uppercase tracking-wider">
              Major Industry Identifier (MII) Digit Table
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-amber-400 font-bold">Digit 1 & 2:</span> Airlines & Aviation
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-amber-400 font-bold">Digit 3:</span> Travel (Amex, Diners, JCB)
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-amber-400 font-bold">Digit 4:</span> Banking & Financial (Visa)
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-amber-400 font-bold">Digit 5:</span> Banking (Mastercard)
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-amber-400 font-bold">Digit 6:</span> Merchandising (Discover, UnionPay)
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-amber-400 font-bold">Digit 7-9:</span> Petroleum, Telecom & National
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
