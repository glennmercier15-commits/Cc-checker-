import React, { useState } from 'react';
import {
  Copy,
  Check,
  Code2,
  Terminal,
  Server,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  StripeApiError,
  StripeLegacyTokenResponse,
  StripePaymentMethodResponse,
} from '../types/stripe';
import { generateBackendSnippet } from '../utils/stripeApi';
import { getBrandDisplayName } from '../utils/cardUtils';
import { JsonTreeViewer } from './JsonTreeViewer';

interface TokenInspectorProps {
  data?: StripePaymentMethodResponse | StripeLegacyTokenResponse | null;
  rawResponse?: unknown;
  error?: StripeApiError | null;
  curlCommand: string;
  durationMs: number;
}

export const TokenInspector: React.FC<TokenInspectorProps> = ({
  data,
  rawResponse,
  error,
  curlCommand,
  durationMs,
}) => {
  const [activeTab, setActiveTab] = useState<'json' | 'curl' | 'backend' | 'pci'>('json');
  const [backendLang, setBackendLang] = useState<'node' | 'python' | 'php' | 'curl'>('node');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const responseData = rawResponse !== undefined ? rawResponse : data;
  const tokenId = (responseData as StripePaymentMethodResponse | StripeLegacyTokenResponse)?.id || data?.id || '';
  const isPaymentMethod = (responseData as StripePaymentMethodResponse)?.object === 'payment_method' || data?.object === 'payment_method';
  const cardData = isPaymentMethod
    ? ((responseData as StripePaymentMethodResponse)?.card || (data as StripePaymentMethodResponse)?.card)
    : ((responseData as StripeLegacyTokenResponse)?.card || (data as StripeLegacyTokenResponse)?.card);

  const copyToClipboard = (text: string, isId: boolean) => {
    navigator.clipboard.writeText(text);
    if (isId) {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  // If there's an error from the API / simulation
  if (error) {
    return (
      <div className="bg-slate-900/90 border border-red-900/40 rounded-2xl p-6 text-slate-100 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center justify-center shrink-0 text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-red-200">
              Stripe API Error: {error.code || error.type}
            </h3>
            <p className="text-sm text-slate-300 mt-1">{error.message}</p>
            {error.decline_code && (
              <p className="text-xs font-mono text-red-400 mt-1">
                decline_code: {error.decline_code}
              </p>
            )}
          </div>
        </div>

        {/* Error Object Tree Viewer */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-medium text-slate-400 block">
            Stripe API Error Object Tree
          </span>
          <JsonTreeViewer data={error} rootName="error" initialExpandedDepth={2} />
        </div>

        {/* cURL diagnostic */}
        <div>
          <span className="text-xs font-medium text-slate-400 block mb-1">
            Debug with cURL
          </span>
          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto">
            {curlCommand}
          </pre>
        </div>
      </div>
    );
  }

  // If no token generated yet (Empty state)
  if (!responseData && !data) {
    return (
      <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center text-slate-400 min-h-[380px]">
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 mb-4">
          <Code2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">
          No Token Generated Yet
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
          Submit the card form or pick an official Stripe test card to tokenize the payment details into a secure payment method token.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-5">
      {/* Top Header: Token ID Banner */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">
              {isPaymentMethod ? 'PaymentMethod ID' : 'Card Token ID'}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Tokenized
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            <span>{durationMs}ms</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
          <span className="font-mono text-sm font-semibold text-indigo-300 truncate selection:bg-indigo-500/40">
            {tokenId}
          </span>
          <button
            onClick={() => copyToClipboard(tokenId, true)}
            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1.5 shrink-0"
          >
            {copiedId ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Card Metadata Grid */}
      {cardData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
            <span className="text-slate-400 text-[11px] block">Brand & Funding</span>
            <span className="font-semibold text-slate-200 capitalize">
              {getBrandDisplayName(cardData.brand)} ({cardData.funding})
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
            <span className="text-slate-400 text-[11px] block">Last 4 Digits</span>
            <span className="font-mono font-semibold text-slate-200 tabular-nums">
              •••• {cardData.last4}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
            <span className="text-slate-400 text-[11px] block">Expiration</span>
            <span className="font-mono font-semibold text-slate-200 tabular-nums">
              {String(cardData.exp_month).padStart(2, '0')} / {cardData.exp_year}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
            <span className="text-slate-400 text-[11px] block">CVC / AVS Checks</span>
            <span className="font-mono font-semibold text-emerald-400">
              CVC: {cardData.checks.cvc_check} · Zip: {cardData.checks.address_postal_code_check}
            </span>
          </div>
        </div>
      )}

      {/* Full Billing Address & Contact Overview if present */}
      {(() => {
        const bd = isPaymentMethod
          ? (responseData as StripePaymentMethodResponse)?.billing_details
          : null;
        const tc = !isPaymentMethod
          ? (responseData as StripeLegacyTokenResponse)?.card
          : null;

        const addrParts = [
          bd?.address?.line1 || tc?.address_line1,
          bd?.address?.line2 || tc?.address_line2,
          bd?.address?.city || tc?.address_city,
          bd?.address?.state || tc?.address_state,
          bd?.address?.postal_code || tc?.address_zip,
          bd?.address?.country || tc?.address_country,
        ].filter(Boolean);

        const billingName = bd?.name || tc?.name;
        const billingEmail = bd?.email;
        const billingPhone = bd?.phone;

        if (addrParts.length === 0 && !billingName && !billingEmail && !billingPhone) {
          return null;
        }

        return (
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold text-slate-300">Attached Billing Address & Contact Details</span>
              <span className="font-mono text-emerald-400 text-[10px] bg-emerald-950/50 border border-emerald-800/40 px-1.5 py-0.5 rounded">AVS Protected</span>
            </div>
            <div className="text-slate-200 text-xs font-mono flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
              {billingName && <span><strong>Name:</strong> {billingName}</span>}
              {addrParts.length > 0 && <span><strong>Address:</strong> {addrParts.join(', ')}</span>}
              {billingEmail && <span><strong>Email:</strong> {billingEmail}</span>}
              {billingPhone && <span><strong>Phone:</strong> {billingPhone}</span>}
            </div>
          </div>
        );
      })()}

      {/* Inspection Navigation Tabs (Segmented Control) */}
      <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('json')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'json'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Stripe API JSON</span>
        </button>

        <button
          onClick={() => setActiveTab('curl')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'curl'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>cURL Request</span>
        </button>

        <button
          onClick={() => setActiveTab('backend')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'backend'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Server Code Snippet</span>
        </button>

        <button
          onClick={() => setActiveTab('pci')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'pci'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>PCI Scope</span>
        </button>
      </div>

      {/* Tab 1: Interactive JSON Tree View */}
      {activeTab === 'json' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>rawResponse Payload Tree</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              Click keys to expand · Search values · Copy nodes
            </span>
          </div>
          <JsonTreeViewer
            data={responseData}
            rootName={isPaymentMethod ? 'payment_method' : 'token'}
            initialExpandedDepth={2}
          />
        </div>
      )}

      {/* Tab 2: cURL View */}
      {activeTab === 'curl' && (
        <div className="relative">
          <div className="absolute top-2 right-2">
            <button
              onClick={() => copyToClipboard(curlCommand, false)}
              className="p-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/80 rounded-md hover:bg-slate-700 transition-colors"
              title="Copy cURL"
            >
              {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-amber-200/90 overflow-x-auto max-h-[340px]">
            {curlCommand}
          </pre>
        </div>
      )}

      {/* Tab 3: Server Implementation */}
      {activeTab === 'backend' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setBackendLang('node')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  backendLang === 'node'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Node.js / TS
              </button>
              <button
                onClick={() => setBackendLang('python')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  backendLang === 'python'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Python
              </button>
              <button
                onClick={() => setBackendLang('php')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  backendLang === 'php'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PHP
              </button>
              <button
                onClick={() => setBackendLang('curl')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  backendLang === 'curl'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Server cURL
              </button>
            </div>

            <button
              onClick={() =>
                copyToClipboard(generateBackendSnippet(tokenId, backendLang), false)
              }
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-md transition-colors"
            >
              {copiedSnippet ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-cyan-200/90 overflow-x-auto max-h-[320px]">
            {generateBackendSnippet(tokenId, backendLang)}
          </pre>
        </div>
      )}

      {/* Tab 4: PCI Scoping Breakdown */}
      {activeTab === 'pci' && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-3 leading-relaxed">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Shield className="w-4 h-4" />
            <span>PCI-DSS SAQ A Scope Qualification</span>
          </div>
          <p className="text-slate-300">
            By sending credit card details directly from the customer’s browser to Stripe’s tokenization API endpoints, your backend servers never receive, store, or transmit sensitive PAN (Primary Account Number) or CVC data.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="font-semibold text-slate-200 block mb-1">
                SAQ A vs SAQ A-EP
              </span>
              <p className="text-slate-400 text-[11px]">
                SAQ A requires only ~22 checklist controls because payment data is collected via Stripe Elements or direct Stripe tokenization without backend proxying.
              </p>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="font-semibold text-slate-200 block mb-1">
                Zero Server Exposure
              </span>
              <p className="text-slate-400 text-[11px]">
                Your server receives only the token (<code className="text-indigo-300">{tokenId}</code>), which is useless to attackers if intercepted without your secret key.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
