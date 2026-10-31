import { CardBrand } from '../types/stripe';

/**
 * Card Brand Rules with exact prefix, length, and full network regular expressions
 */
export interface CardBrandRules {
  brand: CardBrand;
  displayName: string;
  prefixRegex: RegExp;
  fullRegex: RegExp;
  lengths: number[];
  cvcLength: number;
  cvcName: string;
}

export const CARD_BRAND_RULES: Record<CardBrand, CardBrandRules> = {
  visa: {
    brand: 'visa',
    displayName: 'Visa',
    prefixRegex: /^4/,
    fullRegex: /^4(\d{12}|\d{15}|\d{18})$/,
    lengths: [13, 16, 19],
    cvcLength: 3,
    cvcName: 'CVV',
  },
  mastercard: {
    brand: 'mastercard',
    displayName: 'Mastercard',
    prefixRegex: /^(5[1-5]|2[2-7])/,
    fullRegex: /^(5[1-5]\d{14}|2(22[1-9]|2[3-9]\d|[3-6]\d{2}|7[0-1]\d|720)\d{12})$/,
    lengths: [16],
    cvcLength: 3,
    cvcName: 'CVC',
  },
  amex: {
    brand: 'amex',
    displayName: 'American Express',
    prefixRegex: /^3[47]/,
    fullRegex: /^3[47]\d{13}$/,
    lengths: [15],
    cvcLength: 4,
    cvcName: 'CID (Front)',
  },
  discover: {
    brand: 'discover',
    displayName: 'Discover',
    prefixRegex: /^6(011|5|4[4-9]|22)/,
    fullRegex: /^6(?:011|5\d{2}|4[4-9]\d|22(?:1(?:2[6-9]|[3-9]\d)|[2-8]\d{2}|9(?:[01]\d|2[0-5])))\d{12}$/,
    lengths: [16],
    cvcLength: 3,
    cvcName: 'CID',
  },
  diners: {
    brand: 'diners',
    displayName: 'Diners Club',
    prefixRegex: /^3(0[0-5]|[68])/,
    fullRegex: /^3(?:0[0-5]|[68]\d)\d{11}$/,
    lengths: [14],
    cvcLength: 3,
    cvcName: 'CVV',
  },
  jcb: {
    brand: 'jcb',
    displayName: 'JCB',
    prefixRegex: /^(352[89]|35[3-8][0-9])/,
    fullRegex: /^(?:2131|1800|35\d{3})\d{11}$/,
    lengths: [15, 16],
    cvcLength: 3,
    cvcName: 'CAV',
  },
  unionpay: {
    brand: 'unionpay',
    displayName: 'UnionPay',
    prefixRegex: /^62/,
    fullRegex: /^62\d{14,17}$/,
    lengths: [16, 17, 18, 19],
    cvcLength: 3,
    cvcName: 'CVN',
  },
  unknown: {
    brand: 'unknown',
    displayName: 'Card',
    prefixRegex: /^\d/,
    fullRegex: /^\d{13,19}$/,
    lengths: [16],
    cvcLength: 3,
    cvcName: 'CVC / CVV',
  },
};

/**
 * Detect card brand based on Bank Identification Number (BIN) prefixes
 */
export function detectCardBrand(cardNumber: string): CardBrand {
  const cleanNumber = cardNumber.replace(/\D/g, '');

  if (/^4/.test(cleanNumber)) {
    return 'visa';
  }
  if (/^(5[1-5]|2[2-7])/.test(cleanNumber)) {
    return 'mastercard';
  }
  if (/^3[47]/.test(cleanNumber)) {
    return 'amex';
  }
  if (/^6(011|5|4[4-9]|22)/.test(cleanNumber)) {
    return 'discover';
  }
  if (/^3(0[0-5]|[68])/.test(cleanNumber)) {
    return 'diners';
  }
  if (/^(352[89]|35[3-8][0-9])/.test(cleanNumber)) {
    return 'jcb';
  }
  if (/^62/.test(cleanNumber)) {
    return 'unionpay';
  }

  return 'unknown';
}

/**
 * Validates a credit card number using the Luhn Algorithm (Mod 10 Checksum)
 */
export function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

export interface CardNumberValidation {
  status: 'empty' | 'incomplete' | 'valid' | 'invalid_luhn' | 'invalid_length';
  brand: CardBrand;
  brandRules: CardBrandRules;
  isLuhnValid: boolean | null;
  digitsCount: number;
  expectedLength: number;
  message: string;
}

/**
 * Real-time card number validator using brand regex patterns and Luhn checksum
 */
export function validateCardNumberRealtime(rawNumber: string): CardNumberValidation {
  const clean = rawNumber.replace(/\D/g, '');
  const brand = detectCardBrand(clean);
  const rules = CARD_BRAND_RULES[brand] || CARD_BRAND_RULES.unknown;
  const primaryLength = rules.lengths[0] || 16;

  if (clean.length === 0) {
    return {
      status: 'empty',
      brand,
      brandRules: rules,
      isLuhnValid: null,
      digitsCount: 0,
      expectedLength: primaryLength,
      message: 'Enter card number (15–16 digits)',
    };
  }

  const minLength = Math.min(...rules.lengths);
  const maxLength = Math.max(...rules.lengths);

  if (clean.length < minLength) {
    return {
      status: 'incomplete',
      brand,
      brandRules: rules,
      isLuhnValid: null,
      digitsCount: clean.length,
      expectedLength: primaryLength,
      message: `${clean.length} of ${primaryLength} digits (${rules.displayName})`,
    };
  }

  const isMatchLength = rules.lengths.includes(clean.length);
  const passesLuhn = validateLuhn(clean);

  if (isMatchLength) {
    if (passesLuhn) {
      return {
        status: 'valid',
        brand,
        brandRules: rules,
        isLuhnValid: true,
        digitsCount: clean.length,
        expectedLength: clean.length,
        message: `Valid ${rules.displayName} number · Luhn Mod-10 passed`,
      };
    } else {
      return {
        status: 'invalid_luhn',
        brand,
        brandRules: rules,
        isLuhnValid: false,
        digitsCount: clean.length,
        expectedLength: primaryLength,
        message: 'Checksum error: Failed Luhn algorithm check (check for typos)',
      };
    }
  }

  if (clean.length > maxLength) {
    return {
      status: 'invalid_length',
      brand,
      brandRules: rules,
      isLuhnValid: passesLuhn,
      digitsCount: clean.length,
      expectedLength: primaryLength,
      message: `Card number exceeds maximum of ${maxLength} digits for ${rules.displayName}`,
    };
  }

  if (passesLuhn) {
    return {
      status: 'valid',
      brand,
      brandRules: rules,
      isLuhnValid: true,
      digitsCount: clean.length,
      expectedLength: clean.length,
      message: `Valid ${rules.displayName} number · Luhn Mod-10 passed`,
    };
  }

  return {
    status: 'invalid_luhn',
    brand,
    brandRules: rules,
    isLuhnValid: false,
    digitsCount: clean.length,
    expectedLength: primaryLength,
    message: 'Invalid card number checksum',
  };
}

/**
 * Formats card number input with appropriate grouping (Amex 4-6-5, others 4-4-4-4)
 */
export function formatCardNumber(value: string): string {
  const clean = value.replace(/\D/g, '');
  const brand = detectCardBrand(clean);

  if (brand === 'amex') {
    // 4 - 6 - 5
    const match = clean.substring(0, 15).match(/(\d{1,4})(\d{0,6})(\d{0,5})/);
    if (!match) return clean;
    return [match[1], match[2], match[3]].filter(Boolean).join(' ');
  }

  // Standard 4 - 4 - 4 - 4 (up to 19 digits)
  const parts = [];
  for (let i = 0; i < clean.length && i < 19; i += 4) {
    parts.push(clean.substring(i, i + 4));
  }
  return parts.join(' ');
}

/**
 * Formats MM/YY expiration date
 */
export function formatExpiry(value: string): string {
  const clean = value.replace(/\D/g, '').substring(0, 4);
  if (clean.length >= 2) {
    return `${clean.substring(0, 2)} / ${clean.substring(2, 4)}`;
  }
  return clean;
}

export interface ExpiryValidation {
  status: 'empty' | 'incomplete' | 'invalid_month' | 'expired' | 'too_far' | 'valid';
  isComplete: boolean;
  isValidMonth: boolean;
  isExpired: boolean;
  message: string;
  month: number | null;
  year: number | null;
}

/**
 * Real-time expiration date validation against calendar dates and regex rules
 */
export function validateExpiryRealtime(expMonth: string, expYear: string): ExpiryValidation {
  const cleanMonth = expMonth.replace(/\D/g, '');
  const cleanYear = expYear.replace(/\D/g, '');

  if (!cleanMonth && !cleanYear) {
    return {
      status: 'empty',
      isComplete: false,
      isValidMonth: true,
      isExpired: false,
      message: 'MM / YY',
      month: null,
      year: null,
    };
  }

  const monthNum = parseInt(cleanMonth, 10);

  // Month check: must match regex /^(0[1-9]|1[0-2])$/ when 2 digits are entered
  if (cleanMonth.length === 2 && (isNaN(monthNum) || monthNum < 1 || monthNum > 12)) {
    return {
      status: 'invalid_month',
      isComplete: false,
      isValidMonth: false,
      isExpired: false,
      message: 'Month must be between 01 and 12',
      month: monthNum,
      year: null,
    };
  }

  if (cleanMonth.length < 2 || cleanYear.length < 2) {
    return {
      status: 'incomplete',
      isComplete: false,
      isValidMonth: isNaN(monthNum) || (monthNum >= 1 && monthNum <= 12),
      isExpired: false,
      message: cleanMonth.length < 2 ? 'Enter 2-digit month' : 'Enter 2-digit year',
      month: !isNaN(monthNum) ? monthNum : null,
      year: null,
    };
  }

  let yearNum = parseInt(cleanYear, 10);
  if (yearNum < 100) {
    yearNum += 2000;
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-indexed

  if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
    return {
      status: 'expired',
      isComplete: true,
      isValidMonth: true,
      isExpired: true,
      message: `Card expired in ${String(monthNum).padStart(2, '0')}/${String(yearNum).slice(-2)}`,
      month: monthNum,
      year: yearNum,
    };
  }

  if (yearNum > currentYear + 25) {
    return {
      status: 'too_far',
      isComplete: true,
      isValidMonth: true,
      isExpired: false,
      message: 'Expiration date is more than 25 years in the future',
      month: monthNum,
      year: yearNum,
    };
  }

  return {
    status: 'valid',
    isComplete: true,
    isValidMonth: true,
    isExpired: false,
    message: `Valid through ${String(monthNum).padStart(2, '0')}/${String(yearNum).slice(-2)}`,
    month: monthNum,
    year: yearNum,
  };
}

/**
 * Backward compatibility alias for existing callers
 */
export function checkExpiryStatus(expMonth: string, expYear: string) {
  const v = validateExpiryRealtime(expMonth, expYear);
  return {
    isComplete: v.isComplete,
    isExpired: v.isExpired,
    isValidMonth: v.isValidMonth,
    message: v.message,
  };
}

export interface CvcValidation {
  status: 'empty' | 'incomplete' | 'valid' | 'invalid';
  expectedLength: number;
  currentLength: number;
  label: string;
  message: string;
}

/**
 * Real-time CVV / CVC validator based on card brand regex
 */
export function validateCvcRealtime(cvc: string, brand: CardBrand): CvcValidation {
  const clean = cvc.replace(/\D/g, '');
  const isAmex = brand === 'amex';
  const expectedLength = isAmex ? 4 : 3;
  const label = isAmex ? 'CID (4 digits)' : 'CVC / CVV (3 digits)';

  if (clean.length === 0) {
    return {
      status: 'empty',
      expectedLength,
      currentLength: 0,
      label,
      message: isAmex ? '4 digits on front' : '3 digits on back',
    };
  }

  if (clean.length < expectedLength) {
    return {
      status: 'incomplete',
      expectedLength,
      currentLength: clean.length,
      label,
      message: `${clean.length} of ${expectedLength} digits entered`,
    };
  }

  if (clean.length === expectedLength) {
    // Regex verification: exactly 3 or 4 digits
    const regex = isAmex ? /^\d{4}$/ : /^\d{3}$/;
    if (regex.test(clean)) {
      return {
        status: 'valid',
        expectedLength,
        currentLength: clean.length,
        label,
        message: `Valid ${isAmex ? 'Amex CID' : 'CVC'} code`,
      };
    }
  }

  return {
    status: 'invalid',
    expectedLength,
    currentLength: clean.length,
    label,
    message: `Expected exactly ${expectedLength} digits`,
  };
}

/**
 * Validates CVC/CVV length
 */
export function validateCvc(cvc: string, brand: CardBrand): boolean {
  return validateCvcRealtime(cvc, brand).status === 'valid';
}

export interface PostalCodeValidation {
  status: 'empty' | 'valid' | 'invalid';
  message: string;
}

/**
 * Real-time postal code validator by country
 */
export function validatePostalCodeRealtime(postalCode: string, countryCode: string = 'US'): PostalCodeValidation {
  const trimmed = postalCode.trim();
  if (!trimmed) {
    return { status: 'empty', message: 'AVS postal code' };
  }

  let regex: RegExp;
  let formatDesc: string;

  switch (countryCode) {
    case 'US':
      regex = /^\d{5}(-\d{4})?$/;
      formatDesc = '5-digit ZIP or ZIP+4 (e.g. 90210)';
      break;
    case 'CA':
      regex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
      formatDesc = 'e.g. M5V 2T6';
      break;
    case 'GB':
      regex = /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/;
      formatDesc = 'e.g. SW1A 1AA';
      break;
    case 'DE':
      regex = /^\d{5}$/;
      formatDesc = '5 digits (e.g. 10115)';
      break;
    case 'FR':
      regex = /^\d{5}$/;
      formatDesc = '5 digits (e.g. 75001)';
      break;
    case 'AU':
      regex = /^\d{4}$/;
      formatDesc = '4 digits (e.g. 2000)';
      break;
    case 'JP':
      regex = /^\d{3}-?\d{4}$/;
      formatDesc = '7 digits (e.g. 100-0001)';
      break;
    default:
      regex = /^[A-Za-z0-9\s-]{2,10}$/;
      formatDesc = 'Postal code';
  }

  if (regex.test(trimmed)) {
    return { status: 'valid', message: 'Valid AVS format' };
  }

  return { status: 'invalid', message: `Format: ${formatDesc}` };
}

/**
 * Returns human-readable brand label
 */
export function getBrandDisplayName(brand: CardBrand): string {
  const rules = CARD_BRAND_RULES[brand];
  return rules ? rules.displayName : 'Card';
}
