import React, { useState } from 'react';
import {
  CreditCard,
  Lock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Terminal,
  Code2,
  Server,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { CardBrand, StripePaymentIntentResponse, StripeApiError } from '../types/stripe';
import { detectCardBrand, formatCardNumber, formatExpiry, validateCardNumberRealtime } from '../utils/cardUtils';
import { executePaymentIntent, PaymentIntentParams, PaymentIntentResult } from '../utils/stripeApi';
import { JsonTreeViewer } from './JsonTreeViewer';
import { BrandBadge } from './BrandBadge';

interface PaymentIntentCheckerProps {
  publishableKey: string;
  secretKey: string;
  useLiveApi: boolean;
  onOpenTestCardsModal: () => void;
}

export const PaymentIntentChecker: React.FC<PaymentIntentCheckerProps> = ({
  publishableKey,
  secretKey,
  useLiveApi,
  onOpenTestCardsModal,
}) => {
  const [amount, setAmount] = useState<string>('2500'); // $25.00 default in cents
  const [currency, setCurrency] = useState<string>('usd');
  const [cardholderName, setCardholderName] = useState<string>('Jane Doe');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [expMonth, setExpMonth] = useState<string>('');
  const [expYear, setExpYear] = useState<string>('');
  const [cvc, setCvc] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('94105');
  const [country, setCountry] = useState<string>('US');
  const [addressLine1, setAddressLine1] = useState<string>('123 Market St');
  const [city, setCity] = useState<string>('San Francisco');
  const [email, setEmail] = useState<string>('customer@example.com');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultData, setResultData] = useState<StripePaymentIntentResponse | null>(null);
  const [resultError, setResultError] = useState<StripeApiError | null>(null);
  const [lastDurationMs, setLastDurationMs] = useState<number>(310);
  const [lastCurl, setLastCurl] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'json' | 'curl'>('json');
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const activeBrand: CardBrand = detectCardBrand(cardNumber);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length <= 2) {
      setExpMonth(raw);
      setExpYear('');
    } else {
      setExpMonth(raw.slice(0, 2));
      setExpYear(raw.slice(2, 4));
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxLen = activeBrand === 'amex' ? 4 : 3;
    setCvc(e.target.value.replace(/\D/g, '').slice(0, maxLen));
  };

  const handleExecuteIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResultError(null);

    const amountNum = parseInt(amount, 10) || 2500;

    const res: PaymentIntentResult = await executePaymentIntent({
      amount: amountNum,
      currency,
      name: cardholderName,
      cardNumber,
      expMonth,
      expYear,
      cvc,
      postalCode,
      country,
      addressLine1,
      city,
      email,
      publishableKey,
      secretKey,
      useLiveApi,
    });

    setIsLoading(false);
    setLastDurationMs(res.durationMs);
    setLastCurl(res.curlCommand);

    if (res.success && res.data) {
      setResultData(res.data);
      setResultError(null);
    } else {
      setResultData(null);
      setResultError(res.error || { type: 'card_error', message: 'PaymentIntent confirmation failed.' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Payment Intent Form */}
      <div className="lg:col-span-5 bg-slate-900/85 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Payment Intent Creator</h2>
              <span className="text-[10px] text-slate-400 font-mono">v1/payment_intents · Create & Confirm</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenTestCardsModal}
            className="px-2.5 py-1 text-xs font-semibold text-amber-200 bg-amber-950/70 hover:bg-amber-900/70 border border-amber-600/50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Test Cards</span>
          </button>
        </div>

        <form onSubmit={handleExecuteIntent} className="space-y-4">
          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Amount (in cents)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="2500"
                  min="50"
                  required
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                {(parseInt(amount || '0', 10) / 100).toLocaleString('en-US', { style: 'currency', currency: currency.toUpperCase() })} {currency.toUpperCase()}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
                <option value="gbp">GBP (£)</option>
                <option value="cad">CAD ($)</option>
                <option value="aud">AUD ($)</option>
                <option value="jpy">JPY (¥)</option>
              </select>
            </div>
          </div>

          {/* Cardholder Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          {/* Card Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                Card Number
              </label>
              {activeBrand !== 'unknown' && (
                <span className="text-amber-400 font-mono text-[11px] font-semibold">
                  {activeBrand.toUpperCase()}
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BrandBadge brand={activeBrand} size="sm" />
              </div>
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="4242 4242 4242 4242"
                maxLength={23}
                className="w-full pl-11 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm font-mono text-slate-100 tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Expiry, CVC, Postal */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Expires</label>
              <input
                type="text"
                value={expMonth ? `${expMonth}${expYear ? ` / ${expYear}` : ''}` : ''}
                onChange={handleExpiryChange}
                placeholder="MM / YY"
                maxLength={7}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">CVC / CVV</label>
              <input
                type="password"
                value={cvc}
                onChange={handleCvcChange}
                placeholder="123"
                maxLength={4}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Postal ZIP</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                placeholder="94105"
                maxLength={10}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Billing Email & City */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Billing Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Francisco"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                <span>Creating & Confirming PaymentIntent...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Create & Confirm Payment Intent</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Inspector & Response Viewer */}
      <div className="lg:col-span-7 space-y-6">
        {resultError ? (
          <div className="bg-slate-900/90 border border-red-900/40 rounded-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center justify-center shrink-0 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-red-200">
                  Payment Intent Declined / Error: {resultError.code || resultError.type}
                </h3>
                <p className="text-sm text-slate-300 mt-1">{resultError.message}</p>
                {resultError.decline_code && (
                  <p className="text-xs font-mono text-red-400 mt-1">
                    decline_code: {resultError.decline_code}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-medium text-slate-400 block">Stripe API Error Object</span>
              <JsonTreeViewer data={resultError} rootName="error" initialExpandedDepth={2} />
            </div>

            {lastCurl && (
              <div>
                <span className="text-xs font-medium text-slate-400 block mb-1">cURL Command</span>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto">
                  {lastCurl}
                </pre>
              </div>
            )}
          </div>
        ) : resultData ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-5">
            {/* Status Banner */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">PaymentIntent ID</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${
                      resultData.status === 'succeeded'
                        ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300'
                        : 'bg-amber-950/80 border border-amber-700/60 text-amber-300'
                    }`}
                  >
                    {resultData.status === 'succeeded' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>Status: {resultData.status}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{lastDurationMs}ms</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                <span className="font-mono text-sm font-semibold text-amber-300 truncate">
                  {resultData.id}
                </span>
                <button
                  onClick={() => copyToClipboard(resultData.id)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                <span className="text-slate-400 text-[11px] block">Amount</span>
                <span className="font-mono font-semibold text-slate-200">
                  {(resultData.amount / 100).toLocaleString('en-US', { style: 'currency', currency: resultData.currency.toUpperCase() })}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                <span className="text-slate-400 text-[11px] block">Currency</span>
                <span className="font-mono font-semibold text-slate-200 uppercase">{resultData.currency}</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                <span className="text-slate-400 text-[11px] block">Live Mode</span>
                <span className="font-mono font-semibold text-slate-200">{resultData.livemode ? 'Live' : 'Test / Simulated'}</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                <span className="text-slate-400 text-[11px] block">Client Secret</span>
                <span className="font-mono text-[10px] text-indigo-300 truncate block" title={resultData.client_secret}>
                  {resultData.client_secret ? `${resultData.client_secret.slice(0, 16)}...` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Sub Tabs: JSON vs cURL */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                onClick={() => setActiveSubTab('json')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeSubTab === 'json' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>API JSON Response</span>
              </button>
              <button
                onClick={() => setActiveSubTab('curl')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeSubTab === 'curl' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>cURL Command</span>
              </button>
            </div>

            {activeSubTab === 'json' ? (
              <JsonTreeViewer data={resultData} rootName="payment_intent" initialExpandedDepth={3} />
            ) : (
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
                {lastCurl}
              </pre>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center text-slate-400 min-h-[400px]">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-amber-400 mb-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Payment Intents API Sandbox</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
              Create and confirm payment intents instantly with test cards or live keys. Handles authorization, declines, and 3D Secure workflows.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
