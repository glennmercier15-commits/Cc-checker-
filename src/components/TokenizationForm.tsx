import React, { useState, useRef } from 'react';
import {
  CreditCard,
  Lock,
  User,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ShieldCheck,
  RotateCcw,
  Globe,
  Info,
  Check,
  X,
  MapPin,
  Mail,
  Phone,
  Building,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { CardBrand, TokenType } from '../types/stripe';
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  getBrandDisplayName,
  validateCardNumberRealtime,
  validateExpiryRealtime,
  validateCvcRealtime,
  validatePostalCodeRealtime,
} from '../utils/cardUtils';
import { BrandBadge } from './BrandBadge';

export interface TokenizationFormProps {
  onTokenize: (values: {
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
  }) => Promise<void>;
  isLoading: boolean;
  activeBrand: CardBrand;
  cardNumber: string;
  setCardNumber: (val: string) => void;
  cardholderName: string;
  setCardholderName: (val: string) => void;
  expMonth: string;
  setExpMonth: (val: string) => void;
  expYear: string;
  setExpYear: (val: string) => void;
  cvc: string;
  setCvc: (val: string) => void;
  postalCode: string;
  setPostalCode: (val: string) => void;
  country?: string;
  setCountry?: (val: string) => void;
  addressLine1?: string;
  setAddressLine1?: (val: string) => void;
  addressLine2?: string;
  setAddressLine2?: (val: string) => void;
  city?: string;
  setCity?: (val: string) => void;
  state?: string;
  setState?: (val: string) => void;
  email?: string;
  setEmail?: (val: string) => void;
  phone?: string;
  setPhone?: (val: string) => void;
  saveCard?: boolean;
  setSaveCard?: (val: boolean) => void;
  tokenType: TokenType;
  setTokenType: (type: TokenType) => void;
  onOpenTestCardsModal: () => void;
  onOpenBinChecker?: () => void;
}

const COUNTRIES = [
  { code: 'US', name: 'United States', zipPlaceholder: '90210', zipLabel: 'ZIP Code', stateLabel: 'State', statePlaceholder: 'CA' },
  { code: 'GB', name: 'United Kingdom', zipPlaceholder: 'SW1A 1AA', zipLabel: 'Postal Code', stateLabel: 'County / Region', statePlaceholder: 'Greater London' },
  { code: 'CA', name: 'Canada', zipPlaceholder: 'M5V 2T6', zipLabel: 'Postal Code', stateLabel: 'Province', statePlaceholder: 'ON' },
  { code: 'DE', name: 'Germany', zipPlaceholder: '10115', zipLabel: 'Postleitzahl', stateLabel: 'Federal State', statePlaceholder: 'Berlin' },
  { code: 'FR', name: 'France', zipPlaceholder: '75001', zipLabel: 'Code Postal', stateLabel: 'Region / Dept', statePlaceholder: 'Île-de-France' },
  { code: 'JP', name: 'Japan', zipPlaceholder: '100-0001', zipLabel: 'Postal Code', stateLabel: 'Prefecture', statePlaceholder: 'Tokyo' },
  { code: 'AU', name: 'Australia', zipPlaceholder: '2000', zipLabel: 'Postcode', stateLabel: 'State / Territory', statePlaceholder: 'NSW' },
];

export const TokenizationForm: React.FC<TokenizationFormProps> = ({
  onTokenize,
  isLoading,
  activeBrand,
  cardNumber,
  setCardNumber,
  cardholderName,
  setCardholderName,
  expMonth,
  setExpMonth,
  expYear,
  setExpYear,
  cvc,
  setCvc,
  postalCode,
  setPostalCode,
  country = 'US',
  setCountry,
  addressLine1 = '',
  setAddressLine1,
  addressLine2 = '',
  setAddressLine2,
  city = '',
  setCity,
  state = '',
  setState,
  email = '',
  setEmail,
  phone = '',
  setPhone,
  saveCard = false,
  setSaveCard,
  tokenType,
  setTokenType,
  onOpenTestCardsModal,
  onOpenBinChecker,
}) => {
  const [formError, setFormError] = useState<string | null>(null);
  const [showCvcTip, setShowCvcTip] = useState(false);
  const [showBillingAddressSection, setShowBillingAddressSection] = useState(true);
  const [parseNotification, setParseNotification] = useState<string | null>(null);

  // Input refs for automatic field advancement
  const cardNumberInputRef = useRef<HTMLInputElement>(null);
  const expiryInputRef = useRef<HTMLInputElement>(null);
  const cvcInputRef = useRef<HTMLInputElement>(null);
  const postalCodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-select helper so existing data disappears on keystroke without needing to backspace
  const handleFocusSelect = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleClickSelect = (e: React.MouseEvent<HTMLInputElement>) => {
    if (e.currentTarget.value) {
      e.currentTarget.select();
    }
  };

  // Real-time validations using algorithms & regex
  const cardValidation = validateCardNumberRealtime(cardNumber);
  const expiryValidation = validateExpiryRealtime(expMonth, expYear);
  const cvcValidation = validateCvcRealtime(cvc, activeBrand);
  const postalValidation = validatePostalCodeRealtime(postalCode, country);

  // Real-time email validation
  const isEmailValid = email.trim() ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) : null;

  const isAmex = activeBrand === 'amex';
  const targetCvcLength = isAmex ? 4 : 3;

  const currentCountry = COUNTRIES.find((c) => c.code === country) || COUNTRIES[0];

  // Helper to parse pasted developer test strings (e.g. 4242424242424242|12|28|123)
  const parseCardString = (rawText: string): boolean => {
    const trimmed = rawText.trim();
    const parts = trimmed.split(/[|;,/\s]+/).filter(Boolean);

    if (parts.length >= 3 && /^\d{13,19}$/.test(parts[0].replace(/\D/g, ''))) {
      const num = formatCardNumber(parts[0]);
      setCardNumber(num);

      if (parts[1].length === 2 && parts.length >= 3 && parts[2].length >= 2 && parts[2].length <= 4) {
        setExpMonth(parts[1].padStart(2, '0'));
        setExpYear(parts[2].slice(-2));
        if (parts[3]) setCvc(parts[3].slice(0, 4));
        if (parts[4]) setPostalCode(parts[4]);
      } else if (parts[1].length === 4) {
        setExpMonth(parts[1].slice(0, 2));
        setExpYear(parts[1].slice(2, 4));
        if (parts[2]) setCvc(parts[2].slice(0, 4));
        if (parts[3]) setPostalCode(parts[3]);
      }

      setParseNotification('Developer card string parsed successfully');
      setTimeout(() => setParseNotification(null), 3000);
      return true;
    }

    return false;
  };

  // Handle card number input with auto-paste parser & auto-advancement
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (parseCardString(val)) return;

    const formatted = formatCardNumber(val);
    setCardNumber(formatted);
    if (formError) setFormError(null);

    // Auto-advance to expiry if complete & Luhn valid
    const digits = formatted.replace(/\D/g, '');
    const maxDigits = activeBrand === 'amex' ? 15 : 16;
    if (digits.length === maxDigits) {
      expiryInputRef.current?.focus();
    }
  };

  const handleNumberPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (parseCardString(text)) {
      e.preventDefault();
    }
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

    if (raw.length === 4) {
      cvcInputRef.current?.focus();
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, targetCvcLength);
    setCvc(clean);

    if (clean.length === targetCvcLength) {
      postalCodeInputRef.current?.focus();
    }
  };

  // Clear card and address fields while strictly preserving tokenization mode and environment settings
  const handleClearCardFields = () => {
    setCardNumber('');
    setCardholderName('');
    setExpMonth('');
    setExpYear('');
    setCvc('');
    setPostalCode('');
    setFormError(null);
    setParseNotification('Card fields cleared · Tokenization mode preserved');
    setTimeout(() => setParseNotification(null), 3000);
    cardNumberInputRef.current?.focus();
  };

  const handleClearAllFields = () => {
    setCardNumber('');
    setCardholderName('');
    setExpMonth('');
    setExpYear('');
    setCvc('');
    setPostalCode('');
    if (setAddressLine1) setAddressLine1('');
    if (setAddressLine2) setAddressLine2('');
    if (setCity) setCity('');
    if (setState) setState('');
    if (setEmail) setEmail('');
    if (setPhone) setPhone('');
    setFormError(null);
    setParseNotification('All card & address fields reset · Mode preserved');
    setTimeout(() => setParseNotification(null), 3000);
    cardNumberInputRef.current?.focus();
  };

  // Sample Address Autofill Helpers
  const handleAutofillAddress = (scenario: 'US' | 'UK' | 'GB' | 'CA') => {
    if (scenario === 'US') {
      if (setCountry) setCountry('US');
      if (setAddressLine1) setAddressLine1('123 Market Street');
      if (setAddressLine2) setAddressLine2('Suite 400');
      if (setCity) setCity('San Francisco');
      if (setState) setState('CA');
      setPostalCode('94105');
      if (setEmail && !email) setEmail('developer.billing@example.com');
      if (setPhone && !phone) setPhone('+1 415-555-0199');
      if (!cardholderName) setCardholderName('Jane Doe');
    } else if (scenario === 'UK' || scenario === 'GB') {
      if (setCountry) setCountry('GB');
      if (setAddressLine1) setAddressLine1('10 Downing Street');
      if (setAddressLine2) setAddressLine2('Flat 2B');
      if (setCity) setCity('London');
      if (setState) setState('Greater London');
      setPostalCode('SW1A 2AA');
      if (setEmail && !email) setEmail('alex.turner@example.co.uk');
      if (setPhone && !phone) setPhone('+44 20 7946 0912');
      if (!cardholderName) setCardholderName('Alex Turner');
    } else if (scenario === 'CA') {
      if (setCountry) setCountry('CA');
      if (setAddressLine1) setAddressLine1('250 Front Street West');
      if (setAddressLine2) setAddressLine2('Suite 1200');
      if (setCity) setCity('Toronto');
      if (setState) setState('ON');
      setPostalCode('M5V 3G5');
      if (setEmail && !email) setEmail('sarah.connor@example.ca');
      if (setPhone && !phone) setPhone('+1 416-555-0143');
      if (!cardholderName) setCardholderName('Sarah Connor');
    }

    const displayCountry = scenario === 'GB' ? 'UK' : scenario;
    setParseNotification(`Filled sample ${displayCountry} billing details`);
    setTimeout(() => setParseNotification(null), 3000);
  };

  const hasCardData = Boolean(
    cardNumber || cardholderName || expMonth || expYear || cvc || postalCode || addressLine1 || city || email
  );

  const expiryCombined = expMonth
    ? `${expMonth}${expYear ? ` / ${expYear}` : ''}`
    : '';

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanNumber = cardNumber.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 13) {
      setFormError('Please enter a valid credit card number');
      cardNumberInputRef.current?.focus();
      return;
    }

    if (cardValidation.status === 'invalid_luhn') {
      setFormError('Card number failed the Luhn checksum check. Please verify digits.');
      cardNumberInputRef.current?.focus();
      return;
    }

    if (!expMonth || !expYear) {
      setFormError('Please enter a complete expiration date (MM / YY)');
      expiryInputRef.current?.focus();
      return;
    }

    if (expiryValidation.status === 'invalid_month') {
      setFormError('Expiration month must be between 01 and 12');
      expiryInputRef.current?.focus();
      return;
    }

    if (expiryValidation.status === 'expired') {
      setFormError('Card expiration date has already passed');
      expiryInputRef.current?.focus();
      return;
    }

    if (!cvc || cvc.length < 3) {
      setFormError('Please provide a security code (CVC)');
      cvcInputRef.current?.focus();
      return;
    }

    if (email && isEmailValid === false) {
      setFormError('Please enter a valid billing email address (e.g. name@domain.com)');
      return;
    }

    onTokenize({
      name: cardholderName,
      cardNumber,
      expMonth,
      expYear,
      cvc,
      postalCode,
      country,
      addressLine1,
      addressLine2,
      city,
      state,
      email,
      phone,
      saveCard,
      tokenType,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header with Quick Actions: Clear Form & Status Notice */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">
            Payment Method & Cardholder Details
          </span>
          {parseNotification && (
            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-fadeIn">
              <Check className="w-2.5 h-2.5" />
              {parseNotification}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleClearCardFields}
            disabled={!hasCardData || isLoading}
            className="text-[11px] text-slate-400 hover:text-amber-300 disabled:opacity-35 disabled:hover:text-slate-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
            title="Clear card fields while keeping tokenization mode settings intact"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Fields</span>
          </button>
        </div>
      </div>

      {/* Stripe Tokenization Standard Selector */}
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Stripe Tokenization Standard
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setTokenType('payment_method')}
            className={`py-2 px-3 text-xs font-medium rounded-lg transition-all text-left flex flex-col justify-center cursor-pointer ${
              tokenType === 'payment_method'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-amber-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="font-semibold flex items-center justify-between">
              PaymentMethod
              <span className={`text-[10px] font-mono ${tokenType === 'payment_method' ? 'text-slate-900 font-bold' : 'opacity-80'}`}>pm_...</span>
            </span>
            <span className={`text-[11px] mt-0.5 truncate ${tokenType === 'payment_method' ? 'text-slate-900/90 font-medium' : 'opacity-80'}`}>
              Modern standard (PaymentIntents, SCA)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTokenType('token')}
            className={`py-2 px-3 text-xs font-medium rounded-lg transition-all text-left flex flex-col justify-center cursor-pointer ${
              tokenType === 'token'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-amber-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="font-semibold flex items-center justify-between">
              Card Token
              <span className={`text-[10px] font-mono ${tokenType === 'token' ? 'text-slate-900 font-bold' : 'opacity-80'}`}>tok_...</span>
            </span>
            <span className={`text-[11px] mt-0.5 truncate ${tokenType === 'token' ? 'text-slate-900/90 font-medium' : 'opacity-80'}`}>
              Legacy token (Direct charges)
            </span>
          </button>
        </div>
      </div>

      {/* Cardholder Name */}
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">
          Cardholder Name
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <User className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            onFocus={handleFocusSelect}
            onClick={handleClickSelect}
            placeholder="Jane Doe"
            className="w-full pl-10 pr-9 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          />
          {cardholderName && (
            <button
              type="button"
              onClick={() => setCardholderName('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              title="Clear cardholder name"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Card Number Field with Real-Time Luhn Checksum Feedback & Brand Indicator */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <span>Card Number</span>
            {activeBrand !== 'unknown' && (
              <span className="text-amber-400 font-semibold font-mono text-[11px]">
                {getBrandDisplayName(activeBrand)}
              </span>
            )}
          </label>
          <div className="flex items-center gap-2 text-xs">
            {cardNumber.replace(/\D/g, '').length >= 6 && onOpenBinChecker && (
              <button
                type="button"
                onClick={onOpenBinChecker}
                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                title="Inspect this Bank Identification Number in BIN Resource Checker"
              >
                <span>BIN {cardNumber.replace(/\D/g, '').slice(0, 6)}</span>
                <span className="text-[10px] opacity-80">🔍</span>
              </button>
            )}

            {/* Real-time Luhn feedback chip */}
            {cardValidation.status === 'valid' && (
              <span className="text-[10px] font-mono font-medium text-lime-400 bg-lime-950/60 border border-lime-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                <Check className="w-3 h-3 text-lime-400" />
                <span>Luhn Mod-10 Passed</span>
              </span>
            )}

            {cardValidation.status === 'invalid_luhn' && (
              <span className="text-[10px] font-mono font-medium text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Checksum Error</span>
              </span>
            )}

            {cardValidation.status === 'incomplete' && (
              <span className="text-[10px] font-mono text-slate-400">
                {cardValidation.digitsCount}/{cardValidation.expectedLength} digits
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          {/* Dynamic Embedded Brand Badge */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {activeBrand !== 'unknown' ? (
              <BrandBadge brand={activeBrand} size="sm" />
            ) : (
              <CreditCard className="w-4 h-4 text-slate-500" />
            )}
          </div>

          <input
            ref={cardNumberInputRef}
            type="text"
            value={cardNumber}
            onChange={handleNumberChange}
            onPaste={handleNumberPaste}
            onFocus={handleFocusSelect}
            onClick={handleClickSelect}
            placeholder={isAmex ? '3782 822463 10005' : '4242 4242 4242 4242'}
            maxLength={23}
            aria-invalid={cardValidation.status === 'invalid_luhn'}
            className={`w-full pl-12 pr-32 py-2.5 bg-slate-900/90 border rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 tracking-wider tabular-nums focus:outline-none transition-colors ${
              cardValidation.status === 'valid'
                ? 'border-lime-500/80 ring-1 ring-lime-500/30 focus:ring-2 focus:ring-lime-500 focus:border-lime-500'
                : cardValidation.status === 'invalid_luhn'
                ? 'border-rose-500/80 bg-rose-950/15 ring-1 ring-rose-500/30 text-rose-100 focus:ring-2 focus:ring-rose-500 focus:border-rose-500'
                : 'border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:border-amber-500'
            }`}
          />

          <div className="absolute inset-y-1.5 right-1.5 flex items-center gap-1">
            {cardNumber && (
              <button
                type="button"
                onClick={() => {
                  setCardNumber('');
                  cardNumberInputRef.current?.focus();
                }}
                className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                title="Clear card number"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenTestCardsModal}
              className="px-2.5 py-1 text-xs font-semibold text-amber-200 bg-amber-950/70 hover:bg-amber-900/70 border border-amber-600/50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Test Cards</span>
            </button>
          </div>
        </div>

        {/* Real-time Card Validation Feedback Helper */}
        <div className="flex items-center justify-between text-[11px] mt-1.5 px-0.5">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Networks:</span>
            <span className={activeBrand === 'visa' ? 'text-blue-400 font-bold' : 'opacity-60'}>Visa</span>
            <span aria-hidden="true">·</span>
            <span className={activeBrand === 'mastercard' ? 'text-amber-400 font-bold' : 'opacity-60'}>Mastercard</span>
            <span aria-hidden="true">·</span>
            <span className={activeBrand === 'amex' ? 'text-cyan-400 font-bold' : 'opacity-60'}>Amex</span>
            <span aria-hidden="true">·</span>
            <span className={activeBrand === 'discover' ? 'text-orange-400 font-bold' : 'opacity-60'}>Discover</span>
            <span aria-hidden="true">·</span>
            <span className={activeBrand === 'jcb' ? 'text-emerald-400 font-bold' : 'opacity-60'}>JCB</span>
          </div>

          {cardValidation.status === 'invalid_luhn' ? (
            <span className="text-[10px] text-rose-400 font-medium">
              Luhn Mod-10 checksum mismatch
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Format: <code className="text-violet-400">NUM|MM|YY|CVC</code>
            </span>
          )}
        </div>
      </div>

      {/* Expiration Date, CVC & Postal Code in 3-Column Grid */}
      <div className="grid grid-cols-3 gap-3 items-start">
        {/* Real-time Expiration Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-slate-300">
              Expires
            </label>
            {expiryValidation.status === 'expired' && (
              <span className="text-[10px] font-medium text-rose-400 flex items-center gap-1 font-mono">
                <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                Expired
              </span>
            )}
            {expiryValidation.status === 'valid' && (
              <span className="text-[10px] font-medium text-lime-400 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-2.5 h-2.5 text-lime-400" />
                Valid
              </span>
            )}
            {expiryValidation.status === 'invalid_month' && (
              <span className="text-[10px] font-medium text-amber-400 font-mono">
                01-12
              </span>
            )}
          </div>
          <div className="relative">
            <input
              ref={expiryInputRef}
              type="text"
              value={expiryCombined}
              onChange={handleExpiryChange}
              onFocus={handleFocusSelect}
              onClick={handleClickSelect}
              placeholder="MM / YY"
              maxLength={7}
              aria-invalid={expiryValidation.status === 'expired' || expiryValidation.status === 'invalid_month'}
              className={`w-full pl-3 pr-8 py-2.5 bg-slate-900/90 border rounded-xl text-sm font-mono placeholder-slate-500 tabular-nums focus:outline-none transition-colors ${
                expiryValidation.status === 'expired'
                  ? 'border-rose-500/80 bg-rose-950/20 text-rose-200 ring-1 ring-rose-500/30 focus:ring-2 focus:ring-rose-500'
                  : expiryValidation.status === 'invalid_month'
                  ? 'border-amber-500/80 bg-amber-950/20 text-amber-200 ring-1 ring-amber-500/30 focus:ring-2 focus:ring-amber-500'
                  : expiryValidation.status === 'valid'
                  ? 'border-lime-500/80 ring-1 ring-lime-500/30 text-lime-200 focus:ring-2 focus:ring-lime-500'
                  : 'border-slate-700/80 text-slate-100 focus:ring-2 focus:ring-amber-500'
              }`}
            />
            {expiryCombined && (
              <button
                type="button"
                onClick={() => {
                  setExpMonth('');
                  setExpYear('');
                  expiryInputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                title="Clear expiration"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="block mt-1 text-[10px] font-mono text-slate-400 truncate">
            {expiryValidation.message}
          </span>
        </div>

        {/* Real-time CVC / CVV Field with Brand Awareness */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
              <span>{isAmex ? 'CID (Front)' : 'CVC / CVV'}</span>
            </label>
            <div className="flex items-center gap-1">
              {cvcValidation.status === 'valid' && (
                <span className="text-[10px] font-medium text-lime-400 flex items-center gap-0.5 font-mono">
                  <Check className="w-2.5 h-2.5 text-lime-400" />
                  Valid
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowCvcTip(!showCvcTip)}
                className="text-slate-400 hover:text-slate-200 p-0.5 transition-colors cursor-pointer"
                title="Where is my security code?"
              >
                <Info className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              ref={cvcInputRef}
              type="password"
              value={cvc}
              onChange={handleCvcChange}
              onFocus={handleFocusSelect}
              onClick={handleClickSelect}
              placeholder={isAmex ? '0005' : '123'}
              maxLength={targetCvcLength}
              className={`w-full pl-3 pr-8 py-2.5 bg-slate-900/90 border rounded-xl text-sm font-mono placeholder-slate-500 tabular-nums focus:outline-none transition-colors ${
                cvcValidation.status === 'valid'
                  ? 'border-lime-500/80 ring-1 ring-lime-500/30 text-lime-200 focus:ring-2 focus:ring-lime-500'
                  : 'border-slate-700/80 text-slate-100 focus:ring-2 focus:ring-amber-500'
              }`}
            />
            {cvc ? (
              <button
                type="button"
                onClick={() => {
                  setCvc('');
                  cvcInputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                title="Clear CVC"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          <span className="block mt-1 text-[10px] text-slate-400 font-mono truncate">
            {cvcValidation.message}
          </span>
        </div>

        {/* Postal Code Field with Country Regex Feedback */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-slate-300">
              {currentCountry.zipLabel}
            </label>
            {postalValidation.status === 'valid' && (
              <span className="text-[10px] font-medium text-lime-400 flex items-center gap-0.5 font-mono">
                <Check className="w-2.5 h-2.5 text-lime-400" />
                AVS
              </span>
            )}
          </div>
          <div className="relative">
            <input
              ref={postalCodeInputRef}
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
              onFocus={handleFocusSelect}
              onClick={handleClickSelect}
              placeholder={currentCountry.zipPlaceholder}
              maxLength={10}
              className={`w-full pl-3 pr-8 py-2.5 bg-slate-900/90 border rounded-xl text-sm font-mono placeholder-slate-500 tabular-nums focus:outline-none transition-colors ${
                postalValidation.status === 'valid'
                  ? 'border-lime-500/80 ring-1 ring-lime-500/30 text-lime-200 focus:ring-2 focus:ring-lime-500'
                  : postalValidation.status === 'invalid'
                  ? 'border-amber-500/80 bg-amber-950/15 text-amber-200 focus:ring-2 focus:ring-amber-500'
                  : 'border-slate-700/80 text-slate-100 focus:ring-2 focus:ring-amber-500'
              }`}
            />
            {postalCode && (
              <button
                type="button"
                onClick={() => {
                  setPostalCode('');
                  postalCodeInputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                title="Clear postal code"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="block mt-1 text-[10px] text-slate-400 font-mono truncate">
            {postalValidation.message}
          </span>
        </div>
      </div>

      {/* CVC Explanatory Popout / Tip Box */}
      {showCvcTip && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">
              Card Verification Code (CVC / CID)
            </span>
            <button
              type="button"
              onClick={() => setShowCvcTip(false)}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            {isAmex ? (
              <>
                On <strong>American Express</strong> cards, the 4-digit card identification number (CID) is printed flat above the account number on the <strong>front</strong> of the card.
              </>
            ) : (
              <>
                On <strong>Visa, Mastercard, and Discover</strong> cards, the 3-digit card verification code (CVC) is printed in reverse italics on the signature strip on the <strong>back</strong> of the card.
              </>
            )}
          </p>
        </div>
      )}

      {/* FULL BILLING ADDRESS CAPABILITIES SECTION */}
      <div className="pt-2 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowBillingAddressSection(!showBillingAddressSection)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Full Billing Address & AVS Protection</span>
            {showBillingAddressSection ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Quick 1-click Sample Address Autofill Helpers */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[10px] text-slate-500 hidden sm:inline">Autofill:</span>
            <button
              type="button"
              onClick={() => handleAutofillAddress('US')}
              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-[10px] transition-colors cursor-pointer"
              title="Autofill sample US billing address"
            >
              US
            </button>
            <button
              type="button"
              onClick={() => handleAutofillAddress('GB')}
              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-[10px] transition-colors cursor-pointer"
              title="Autofill sample UK billing address"
            >
              UK
            </button>
            <button
              type="button"
              onClick={() => handleAutofillAddress('CA')}
              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-[10px] transition-colors cursor-pointer"
              title="Autofill sample Canada billing address"
            >
              CA
            </button>
          </div>
        </div>

        {showBillingAddressSection && (
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3 animate-fadeIn">
            {/* Street Address Line 1 & Line 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Street Address (Line 1)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1 && setAddressLine1(e.target.value)}
                    placeholder="123 Market St"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {addressLine1 && (
                    <button
                      type="button"
                      onClick={() => setAddressLine1 && setAddressLine1('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Apt, Suite, Unit (Line 2)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2 && setAddressLine2(e.target.value)}
                    placeholder="Suite 400 (Optional)"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {addressLine2 && (
                    <button
                      type="button"
                      onClick={() => setAddressLine2 && setAddressLine2('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* City, State & Billing Country */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity && setCity(e.target.value)}
                  placeholder="San Francisco"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {currentCountry.stateLabel}
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState && setState(e.target.value)}
                  placeholder={currentCountry.statePlaceholder}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" />
                  <span>Country</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry && setCountry(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email & Phone Contact for Receipts & Stripe Radar Verification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-slate-300 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>Billing Email</span>
                  </label>
                  {isEmailValid === true && (
                    <span className="text-[10px] text-lime-400 flex items-center gap-0.5 font-mono">
                      <Check className="w-2.5 h-2.5" /> Valid
                    </span>
                  )}
                  {isEmailValid === false && (
                    <span className="text-[10px] text-amber-400 font-mono">
                      Check format
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail && setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className={`w-full px-3 py-2 bg-slate-950/80 border rounded-lg text-xs placeholder-slate-500 focus:outline-none transition-colors ${
                    isEmailValid === true
                      ? 'border-lime-500/70 text-lime-100 focus:ring-2 focus:ring-lime-500'
                      : isEmailValid === false
                      ? 'border-amber-500/70 text-amber-100 focus:ring-2 focus:ring-amber-500'
                      : 'border-slate-700/80 text-slate-100 focus:ring-2 focus:ring-amber-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone && setPhone(e.target.value)}
                  placeholder="+1 555-019-2834"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Setup Future Usage (Off-Session) Toggle */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 p-2 bg-slate-900/70 border border-slate-800/80 rounded-xl text-xs text-slate-300 cursor-pointer hover:bg-slate-800/50 transition-colors">
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(e) => setSaveCard && setSaveCard(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-950"
            />
            <div className="leading-tight">
              <span className="font-medium text-slate-200 block text-xs">
                Save for Future Use (Vaulting)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                setup_future_usage: off_session
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Prominent Visual Expiry Validation Alert */}
      {expiryValidation.status === 'expired' && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold text-rose-200 block">
              Expiration Date Passed ({expiryCombined})
            </span>
            <p className="text-[11px] text-rose-300/90 mt-0.5">
              This card&apos;s validity period has ended. If submitted, Stripe will reject the tokenization authorization with decline code <code className="font-mono text-[10px] bg-rose-900/60 px-1 py-0.5 rounded border border-rose-700/50 text-rose-100">expired_card</code>.
            </p>
          </div>
        </div>
      )}

      {/* Form Validation Error Alert */}
      {formError && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center gap-2.5 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{formError}</span>
        </div>
      )}

      {/* Submit Action Bar with Dedicated Clear Fields Button */}
      <div className="pt-2 flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleClearCardFields}
          disabled={!hasCardData || isLoading}
          className="px-4 py-3 bg-slate-900/90 hover:bg-slate-800/90 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/80 hover:border-amber-500/40 text-slate-300 hover:text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
          title="Clear card fields while keeping current tokenization mode settings intact"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Clear Fields</span>
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              <span>Tokenizing Card with Stripe...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>
                {tokenType === 'payment_method'
                  ? 'Create PaymentMethod (pm_...)'
                  : 'Create Card Token (tok_...)'}
              </span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
          Direct Browser-to-Stripe Tokenization (SAQ A)
        </span>
        <span>TLS 1.3 · Zero PAN Server Storage</span>
      </div>
    </form>
  );
};
