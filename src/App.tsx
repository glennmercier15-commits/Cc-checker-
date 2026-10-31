/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Zap,
  Lock,
  History,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  CardBrand,
  StripeApiError,
  StripeLegacyTokenResponse,
  StripePaymentMethodResponse,
  TestCardScenario,
  TokenizationHistoryItem,
  TokenType,
} from './types/stripe';
import { checkExpiryStatus, detectCardBrand, formatCardNumber } from './utils/cardUtils';
import { STRIPE_TEST_CARDS } from './data/testCards';
import { executeTokenization, generateCurlCommand } from './utils/stripeApi';
import { generateLiveImagery, generateDeadImagery, VividLogEntry } from './utils/vividImagery';
import { TopNav, NavigationTab } from './components/TopNav';
import { VirtualCard } from './components/VirtualCard';
import { TokenizationForm } from './components/TokenizationForm';
import { TokenInspector } from './components/TokenInspector';
import { TestCardPicker } from './components/TestCardPicker';
import { HistoryLedger } from './components/HistoryLedger';
import { SecurityArchitectureModal } from './components/SecurityArchitectureModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { BulkProcessor } from './components/BulkProcessor';
import { BinResourceChecker } from './components/BinResourceChecker';
import { PaymentIntentChecker } from './components/PaymentIntentChecker';
import { StatusNotificationOverlay } from './components/StatusNotificationOverlay';

export default function App() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<NavigationTab>('tokenizer');

  // Form input states (clean by default so user does not need to delete sample text)
  const [cardholderName, setCardholderName] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [expMonth, setExpMonth] = useState<string>('');
  const [expYear, setExpYear] = useState<string>('');
  const [cvc, setCvc] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [country, setCountry] = useState<string>('US');
  const [addressLine1, setAddressLine1] = useState<string>('');
  const [addressLine2, setAddressLine2] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [saveCard, setSaveCard] = useState<boolean>(false);
  const [tokenType, setTokenType] = useState<TokenType>('payment_method');

  // API Key & Environment state
  const [publishableKey, setPublishableKey] = useState<string>(() => {
    return localStorage.getItem('stripe_publishable_key') || '';
  });
  const [secretKey, setSecretKey] = useState<string>(() => {
    return localStorage.getItem('stripe_secret_key') || '';
  });
  const [hasServerSecretKey, setHasServerSecretKey] = useState<boolean>(false);
  const [useLiveApi, setUseLiveApi] = useState<boolean>(() => {
    return localStorage.getItem('stripe_use_live_api') === 'true';
  });

  // Tokenization execution state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokenResult, setTokenResult] = useState<
    StripePaymentMethodResponse | StripeLegacyTokenResponse | null
  >(null);
  const [tokenError, setTokenError] = useState<StripeApiError | null>(null);
  const [lastDurationMs, setLastDurationMs] = useState<number>(340);
  const [lastCurlCommand, setLastCurlCommand] = useState<string>('');

  // Modals state
  const [isTestCardModalOpen, setIsTestCardModalOpen] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  // Persistent notifications for Live (🎆) and Dead (💣) cards
  const [notifications, setNotifications] = useState<VividLogEntry[]>([]);

  // History state
  const [history, setHistory] = useState<TokenizationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('stripe_token_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Query server status on mount to detect STRIPE_SECRET_KEY in environment
  useEffect(() => {
    fetch('/api/stripe/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.hasSecretKey) {
          setHasServerSecretKey(true);
          if (localStorage.getItem('stripe_use_live_api') === null) {
            setUseLiveApi(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Save history and API key changes
  useEffect(() => {
    try {
      localStorage.setItem('stripe_token_history', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history to localStorage', e);
    }
  }, [history]);

  useEffect(() => {
    localStorage.setItem('stripe_secret_key', secretKey);
    localStorage.setItem('stripe_publishable_key', publishableKey);
    localStorage.setItem('stripe_use_live_api', useLiveApi ? 'true' : 'false');
  }, [secretKey, publishableKey, useLiveApi]);

  const isLiveActive = useLiveApi && Boolean(secretKey || publishableKey || hasServerSecretKey);
  const hasActiveSecretKey = Boolean(secretKey || hasServerSecretKey);

  // Detected card brand
  const activeBrand: CardBrand = detectCardBrand(cardNumber);

  // Load a test card into the form
  const handleSelectTestCard = (scenario: TestCardScenario) => {
    setCardNumber(formatCardNumber(scenario.number));
    setExpMonth(scenario.expMonth);
    setExpYear(scenario.expYear);
    setCvc(scenario.cvc);
    setPostalCode(scenario.postalCode);
    setCardholderName('Jane Doe');
    setActiveTab('tokenizer');
  };

  // Perform card tokenization
  const handleTokenize = async (formValues: {
    name: string;
    cardNumber: string;
    expMonth: string;
    expYear: string;
    cvc: string;
    postalCode: string;
    country?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    email?: string;
    phone?: string;
    saveCard?: boolean;
    tokenType: TokenType;
  }) => {
    setIsLoading(true);
    setTokenError(null);

    const result = await executeTokenization({
      name: formValues.name,
      cardNumber: formValues.cardNumber,
      expMonth: formValues.expMonth,
      expYear: formValues.expYear,
      cvc: formValues.cvc,
      postalCode: formValues.postalCode,
      country: formValues.country,
      addressLine1: formValues.addressLine1,
      addressLine2: formValues.addressLine2,
      city: formValues.city,
      state: formValues.state,
      email: formValues.email,
      phone: formValues.phone,
      saveCard: formValues.saveCard,
      tokenType: formValues.tokenType,
      publishableKey,
      secretKey,
      useLiveApi,
    });

    setIsLoading(false);
    setLastDurationMs(result.durationMs);
    setLastCurlCommand(result.curlCommand);

    const cleanCard = formValues.cardNumber.replace(/\D/g, '');
    const last4 = cleanCard.slice(-4) || '4242';

    if (result.success && result.data) {
      setTokenResult(result.data);
      setTokenError(null);

      // Trigger Live Fireworks imagery & persistent overlay notification
      const gen = generateLiveImagery({
        cardNumber: formValues.cardNumber,
        brand: activeBrand,
        last4,
        durationMs: result.durationMs,
        data: result.data,
      });

      setNotifications((prev) => [
        {
          id: 'notif_' + Date.now(),
          status: 'live',
          cardNumber: formValues.cardNumber,
          brand: activeBrand,
          last4,
          technicalData: gen.technicalData,
          vividImagery: gen.vividImagery,
          durationMs: result.durationMs,
          timestamp: Date.now(),
        },
        ...prev,
      ]);

      // Record to session history
      const newHistoryItem: TokenizationHistoryItem = {
        id: 'hist_' + Date.now(),
        tokenId: result.data.id,
        tokenType: formValues.tokenType,
        brand: activeBrand,
        last4,
        expMonth: parseInt(formValues.expMonth, 10),
        expYear: parseInt(formValues.expYear, 10),
        createdAt: Math.floor(Date.now() / 1000),
        cardholderName: formValues.name,
        status: 'succeeded',
        rawResponse: result.data,
        rawError: null,
        mode: useLiveApi ? 'live_api' : 'simulator',
      };

      setHistory((prev) => [newHistoryItem, ...prev]);
    } else {
      const errorObj = result.error || { type: 'api_error', message: 'Tokenization failed.' };
      setTokenResult(null);
      setTokenError(errorObj);

      // Trigger Dead Bomb explosion imagery & persistent overlay notification
      const gen = generateDeadImagery({
        cardNumber: formValues.cardNumber,
        brand: activeBrand,
        last4,
        durationMs: result.durationMs,
        error: errorObj,
      });

      setNotifications((prev) => [
        {
          id: 'notif_' + Date.now(),
          status: 'dead',
          cardNumber: formValues.cardNumber,
          brand: activeBrand,
          last4,
          technicalData: gen.technicalData,
          vividImagery: gen.vividImagery,
          durationMs: result.durationMs,
          timestamp: Date.now(),
        },
        ...prev,
      ]);

      // Record failure attempt to history for debugging
      const newHistoryItem: TokenizationHistoryItem = {
        id: 'hist_' + Date.now(),
        tokenId: result.error?.code ? `error_${result.error.code}` : 'error_declined',
        tokenType: formValues.tokenType,
        brand: activeBrand,
        last4,
        expMonth: parseInt(formValues.expMonth, 10) || 0,
        expYear: parseInt(formValues.expYear, 10) || 0,
        createdAt: Math.floor(Date.now() / 1000),
        cardholderName: formValues.name,
        status: 'declined',
        rawResponse: null,
        rawError: result.error,
        mode: useLiveApi ? 'live_api' : 'simulator',
      };

      setHistory((prev) => [newHistoryItem, ...prev]);
    }
  };

  // Inspect history item
  const handleInspectHistory = (item: TokenizationHistoryItem) => {
    if (item.rawResponse) {
      setTokenResult(item.rawResponse);
      setTokenError(null);
    } else if (item.rawError) {
      setTokenError(item.rawError);
      setTokenResult(null);
    }

    setLastCurlCommand(
      generateCurlCommand({
        cardNumber: `•••• •••• •••• ${item.last4}`,
        expMonth: String(item.expMonth).padStart(2, '0'),
        expYear: String(item.expYear),
        cvc: '•••',
        name: item.cardholderName,
        tokenType: item.tokenType,
        publishableKey: publishableKey || 'pk_test_sample',
      })
    );

    setActiveTab('tokenizer');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Signature Mr. Nice Guy atmospheric spray glows reflecting the logo */}
      <div className="absolute top-0 left-[-100px] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/4 right-[-120px] w-[550px] h-[550px] bg-lime-500/8 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute top-10 left-1/3 w-[400px] h-[300px] bg-amber-500/8 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Top Bar Contract Navigation */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLiveApi={isLiveActive}
        hasSecretKey={hasActiveSecretKey}
        onOpenKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 relative">
        {/* Workspace Sub-header with Breadcrumb and Environment Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <img
              src="/assets/aistudio/BackgroundEraser_20261021_013404677_810e2d2a.png"
              alt="Mr. Nice Guy"
              className="w-5 h-5 object-contain select-none"
            />
            <span className="text-amber-400 font-bold">Mr. Nice Guy Gateway</span>
            <span aria-hidden="true" className="text-slate-600">/</span>
            <span>Client-Side Tokenizer</span>
            <span aria-hidden="true" className="text-slate-600">/</span>
            <span className="text-amber-400 font-mono font-medium">
              {tokenType === 'payment_method' ? 'v1/payment_methods' : 'v1/tokens'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/90 border border-slate-800 rounded-lg">
              <span className="text-slate-400 text-[11px]">Mode:</span>
              <span className="font-semibold text-slate-200">
                {isLiveActive
                  ? hasActiveSecretKey
                    ? 'Live Stripe API (Secret Key 🔒)'
                    : 'Live Stripe API (pk_...)'
                  : 'Sandbox Simulator'}
              </span>
            </div>

            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 text-xs font-medium underline flex items-center gap-1 cursor-pointer"
            >
              Configure
            </button>
          </div>
        </div>

        {/* Tab 1: Tokenizer Console */}
        {activeTab === 'tokenizer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Virtual Card & Form (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Virtual Card Graphic */}
              <div className="flex justify-center">
                <VirtualCard
                  cardNumber={cardNumber}
                  cardholderName={cardholderName}
                  expMonth={expMonth}
                  expYear={expYear}
                  brand={activeBrand}
                  cvc={cvc}
                  isExpired={checkExpiryStatus(expMonth, expYear).isExpired}
                />
              </div>

              {/* Tokenization Form */}
              <div className="bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-6 shadow-sm transition-colors">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Card Information</span>
                  </h2>
                  <span className="text-[11px] text-amber-400/80 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Stripe.js protocol
                  </span>
                </div>

                <TokenizationForm
                  onTokenize={handleTokenize}
                  isLoading={isLoading}
                  activeBrand={activeBrand}
                  cardNumber={cardNumber}
                  setCardNumber={setCardNumber}
                  cardholderName={cardholderName}
                  setCardholderName={setCardholderName}
                  expMonth={expMonth}
                  setExpMonth={setExpMonth}
                  expYear={expYear}
                  setExpYear={setExpYear}
                  cvc={cvc}
                  setCvc={setCvc}
                  postalCode={postalCode}
                  setPostalCode={setPostalCode}
                  country={country}
                  setCountry={setCountry}
                  addressLine1={addressLine1}
                  setAddressLine1={setAddressLine1}
                  addressLine2={addressLine2}
                  setAddressLine2={setAddressLine2}
                  city={city}
                  setCity={setCity}
                  state={state}
                  setState={setState}
                  email={email}
                  setEmail={setEmail}
                  phone={phone}
                  setPhone={setPhone}
                  saveCard={saveCard}
                  setSaveCard={setSaveCard}
                  tokenType={tokenType}
                  setTokenType={setTokenType}
                  onOpenTestCardsModal={() => setIsTestCardModalOpen(true)}
                  onOpenBinChecker={() => setActiveTab('bin-checker')}
                />
              </div>
            </div>

            {/* Right Column: Token Inspector & Test Presets (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Quick Preset Test Cards Row */}
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quick Test Scenarios</span>
                  </span>
                  <button
                    onClick={() => setActiveTab('test-cards')}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    View All Test Cards →
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSelectTestCard(STRIPE_TEST_CARDS[0])}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-lg text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Visa 4242 (Success)
                  </button>
                  <button
                    onClick={() => handleSelectTestCard(STRIPE_TEST_CARDS[1])}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-lg text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Mastercard 5555
                  </button>
                  <button
                    onClick={() => handleSelectTestCard(STRIPE_TEST_CARDS[2])}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-lg text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Amex 3782 (15-digit)
                  </button>
                  <button
                    onClick={() => handleSelectTestCard(STRIPE_TEST_CARDS[3])}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-violet-500/40 rounded-lg text-violet-300 hover:text-white transition-colors cursor-pointer"
                  >
                    3DS Challenge (SCA)
                  </button>
                  <button
                    onClick={() => handleSelectTestCard(STRIPE_TEST_CARDS[7])}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-amber-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Bank Decline (0002)
                  </button>
                  <button
                    onClick={() => handleSelectTestCard(STRIPE_TEST_CARDS[5])}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-rose-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Radar Fraud Block
                  </button>
                </div>
              </div>

              {/* Quick Jump to Bulk Processor */}
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-950/25 via-violet-950/20 to-lime-950/25 border border-amber-500/30 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2.5 text-xs text-amber-200">
                  <span className="text-base">⚡</span>
                  <div>
                    <span className="font-semibold block text-white">Need to tokenize multiple card objects?</span>
                    <span className="text-slate-400 text-[11px]">
                      Sequential bulk processor with 🎆 Live fireworks and 💣 Dead bomb monitor.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('bulk')}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-all shadow-md shadow-amber-500/20 cursor-pointer shrink-0"
                >
                  <span>Open Bulk Processor</span>
                  <span>→</span>
                </button>
              </div>

              {/* Returned Token Inspector */}
              <TokenInspector
                data={tokenResult}
                rawResponse={tokenResult}
                error={tokenError}
                curlCommand={lastCurlCommand}
                durationMs={lastDurationMs}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Sequential Bulk Processor */}
        {activeTab === 'bulk' && (
          <BulkProcessor
            publishableKey={publishableKey}
            secretKey={secretKey}
            useLiveApi={useLiveApi}
            tokenType={tokenType}
            onAddHistoryItem={(item) => setHistory((prev) => [item, ...prev])}
            onTriggerNotification={(entry) => setNotifications((prev) => [entry, ...prev])}
            onOpenKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {/* Tab 3: BIN / IIN Financial Resource Checker */}
        {activeTab === 'bin-checker' && (
          <BinResourceChecker
            initialQuery={cardNumber ? cardNumber.replace(/\D/g, '').slice(0, 8) || '424242' : '424242'}
            onLoadIntoTokenizer={(cardNum) => {
              setCardNumber(formatCardNumber(cardNum));
              setCardholderName('Jane Doe');
              setExpMonth('12');
              setExpYear('2028');
              setCvc('123');
              setPostalCode('90210');
              setActiveTab('tokenizer');
            }}
          />
        )}

        {/* Tab: Payment Intents API Checker */}
        {activeTab === 'payment-intents' && (
          <PaymentIntentChecker
            publishableKey={publishableKey}
            secretKey={secretKey}
            useLiveApi={useLiveApi}
            onOpenTestCardsModal={() => setIsTestCardModalOpen(true)}
          />
        )}

        {/* Tab 4: Test Card Library */}
        {activeTab === 'test-cards' && (
          <TestCardPicker
            onSelectCard={handleSelectTestCard}
            isModal={false}
          />
        )}

        {/* Tab 4: History Activity Log */}
        {activeTab === 'history' && (
          <HistoryLedger
            history={history}
            onSelectHistoryItem={handleInspectHistory}
            onClearHistory={() => setHistory([])}
            onNavigateToTokenizer={() => setActiveTab('tokenizer')}
            secretKey={secretKey}
            publishableKey={publishableKey}
            useLiveApi={useLiveApi}
          />
        )}

        {/* Tab 5: PCI-DSS Architecture & Anti-Card-Testing Security */}
        {activeTab === 'security' && (
          <SecurityArchitectureModal isModal={false} />
        )}
      </main>

      {/* Persistent Notification Overlay for Live (🎆) and Dead (💣) Events */}
      <StatusNotificationOverlay
        notifications={notifications}
        onClear={() => setNotifications([])}
      />

      {/* Test Card Quick-Picker Modal */}
      {isTestCardModalOpen && (
        <TestCardPicker
          onSelectCard={handleSelectTestCard}
          onClose={() => setIsTestCardModalOpen(false)}
          isModal={true}
        />
      )}

      {/* API Key & Environment Config Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        secretKey={secretKey}
        setSecretKey={setSecretKey}
        publishableKey={publishableKey}
        setPublishableKey={setPublishableKey}
        useLiveApi={useLiveApi}
        setUseLiveApi={setUseLiveApi}
      />

      {/* Quiet Footer complying with Anti-Slop Guidelines */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/BackgroundEraser_20261021_013404677_810e2d2a.png"
              alt="Mr. Nice Guy"
              className="w-4 h-4 object-contain select-none"
            />
            <span className="font-semibold text-slate-400">Mr. Nice Guy Tokenization Studio</span>
            <span aria-hidden="true">·</span>
            <span>PCI-DSS SAQ A Reference Architecture</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-400">API 2024-06-20</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('bulk')}
              className="hover:text-amber-400 transition-colors"
            >
              Bulk Processor
            </button>
            <button
              onClick={() => setActiveTab('bin-checker')}
              className="hover:text-amber-400 transition-colors"
            >
              BIN Checker
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className="hover:text-amber-400 transition-colors"
            >
              Security Policy
            </button>
            <button
              onClick={() => setActiveTab('test-cards')}
              className="hover:text-amber-400 transition-colors"
            >
              Test Cards
            </button>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="hover:text-amber-400 transition-colors"
            >
              API Credentials
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
