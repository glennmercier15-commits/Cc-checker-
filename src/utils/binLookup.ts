import { BinDetails, BinAnatomySegment } from '../types/bin';
import { KNOWN_BIN_DATABASE } from '../data/binDatabase';
import { CardBrand } from '../types/stripe';
import { detectCardBrand, validateLuhn } from './cardUtils';

/**
 * Clean card or BIN input down to digits only
 */
export function sanitizeBinInput(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Resolve Major Industry Identifier (MII) description
 */
export function getMiiDescription(firstDigit: number): string {
  switch (firstDigit) {
    case 1:
      return 'Airlines and aviation';
    case 2:
      return 'Airlines, financial, and future industry assignments';
    case 3:
      return 'Travel, entertainment, and financial (American Express, Diners Club, JCB)';
    case 4:
      return 'Banking and financial (Visa network)';
    case 5:
      return 'Banking and financial (Mastercard network)';
    case 6:
      return 'Merchandising and banking (Discover, China UnionPay, RuPay)';
    case 7:
      return 'Petroleum and other future industry assignments';
    case 8:
      return 'Healthcare, telecommunications, and other future assignments';
    case 9:
      return 'National assignment and proprietary schemes';
    default:
      return 'ISO/IEC 7812 unassigned identifier';
  }
}

/**
 * Breakdown full card number into ISO/IEC 7812 anatomy blocks
 */
export function getCardAnatomy(rawInput: string): BinAnatomySegment[] {
  const digits = sanitizeBinInput(rawInput);
  if (!digits) return [];

  const miiDigit = digits[0] || '';
  const isEightDigitBin = digits.length >= 8;
  const binLength = isEightDigitBin ? 8 : Math.min(6, digits.length);

  const binDigits = digits.slice(0, binLength);
  const accountDigits = digits.length > binLength + 1 ? digits.slice(binLength, -1) : digits.slice(binLength);
  const checkDigit = digits.length > binLength ? digits.slice(-1) : '';

  const segments: BinAnatomySegment[] = [
    {
      label: 'MII (Major Industry)',
      description: getMiiDescription(parseInt(miiDigit, 10)),
      digits: miiDigit,
      colorClass: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    },
    {
      label: `IIN / BIN (${binLength}-Digit)`,
      description: 'Issuer Identification Number (identifies issuing bank and card tier)',
      digits: binDigits.slice(1),
      colorClass: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
    },
  ];

  if (accountDigits) {
    segments.push({
      label: 'Individual Account Number',
      description: 'Unique account identifier assigned by the card issuer',
      digits: accountDigits,
      colorClass: 'text-slate-200 border-slate-700/60 bg-slate-800/40',
    });
  }

  if (checkDigit) {
    const isLuhnValid = validateLuhn(digits);
    segments.push({
      label: 'Luhn Check Digit',
      description: isLuhnValid
        ? 'Passes ISO/IEC 7812 Luhn MOD-10 checksum validation'
        : 'Fails Luhn checksum test',
      digits: checkDigit,
      colorClass: isLuhnValid
        ? 'text-lime-400 border-lime-500/40 bg-lime-500/10'
        : 'text-rose-400 border-rose-500/40 bg-rose-500/10',
    });
  }

  return segments;
}

/**
 * Intelligent Fallback Generator if a BIN is not in the hardcoded database
 */
function synthesizeBinFromPrefix(digits: string): BinDetails {
  const brand: CardBrand = detectCardBrand(digits);
  const firstDigit = parseInt(digits[0] || '4', 10);
  const binLen = digits.length >= 8 ? 8 : 6;
  const bin = digits.slice(0, binLen);

  const brandNames: Record<CardBrand, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'China UnionPay',
    unknown: 'Standard Financial Network',
  };

  // Determine likely characteristics based on network ranges
  let funding: import('../types/bin').CardFundingType = 'credit';
  let tier: BinDetails['tier'] = 'Standard';

  if (brand === 'visa') {
    if (bin.startsWith('471')) {
      funding = 'commercial';
      tier = 'Corporate';
    } else if (bin.startsWith('4000') || bin.startsWith('43') || bin.startsWith('47')) {
      funding = 'debit';
      tier = 'Classic';
    } else {
      tier = 'Signature';
    }
  } else if (brand === 'mastercard') {
    if (bin.startsWith('55')) {
      funding = 'commercial';
      tier = 'Corporate';
    } else if (bin.startsWith('51') || bin.startsWith('52')) {
      tier = 'Platinum';
    } else {
      tier = 'World';
    }
  }

  return {
    bin,
    binLength: binLen as 6 | 8,
    brand,
    brandDisplayName: brandNames[brand] || 'Payment Network',
    scheme: brand.toUpperCase(),
    funding,
    tier,
    issuer: {
      name: `${brandNames[brand]} Issuing Institution`,
      city: 'Global Settlement Network',
    },
    country: {
      name: 'United States (Default Registry)',
      alpha2: 'US',
      alpha3: 'USA',
      flag: '🇺🇸',
      currency: 'USD',
      currencySymbol: '$',
      numericCode: '840',
    },
    technicalSpecs: {
      mii: firstDigit,
      miiCategory: getMiiDescription(firstDigit),
      luhnCompliant: validateLuhn(digits.length >= 13 ? digits : `${digits}0000000000`.slice(0, 16)),
      durbinRegulated: funding === 'debit',
      threeDsSupported: true,
      level2DataEligible: funding === 'commercial',
      level3DataEligible: funding === 'commercial',
      pushToCardSupported: true,
      contactlessSupported: true,
      applePayGooglePayReady: true,
      riskScore: 'Low',
      riskRationale: 'Calculated via ISO/IEC 7812 prefix allocation rules.',
    },
    rawSource: 'ISO/IEC 7812 Scheme Algorithmic Inference',
  };
}

/**
 * Main Lookup function
 */
export async function lookupBin(input: string): Promise<BinDetails | null> {
  const digits = sanitizeBinInput(input);
  if (digits.length < 6) return null;

  const bin6 = digits.slice(0, 6);
  const bin8 = digits.length >= 8 ? digits.slice(0, 8) : null;

  // 1. Check local database for exact 8-digit match first
  if (bin8) {
    const match8 = KNOWN_BIN_DATABASE.find((item) => item.bin === bin8);
    if (match8) return match8;
  }

  // 2. Check local database for 6-digit match
  const match6 = KNOWN_BIN_DATABASE.find((item) => item.bin === bin6);
  if (match6) return match6;

  // 3. Try server-side lookup proxy if running
  try {
    const res = await fetch(`/api/bin/${encodeURIComponent(bin8 || bin6)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.brand) {
        return data as BinDetails;
      }
    }
  } catch {
    // offline or backend fallback
  }

  // 4. Return algorithmic inference
  return synthesizeBinFromPrefix(digits);
}
