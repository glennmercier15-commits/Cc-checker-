import { BulkCardInput } from '../types/bulk';

interface ParseResult {
  cards: BulkCardInput[];
  errors: string[];
}

/**
 * Normalizes two-digit years (e.g., "28" -> "2028")
 */
function normalizeYear(yearStr: string): string {
  const clean = yearStr.replace(/\D/g, '');
  if (clean.length === 2) {
    return `20${clean}`;
  }
  return clean;
}

/**
 * Normalizes month to 2 digits (e.g., "7" -> "07")
 */
function normalizeMonth(monthStr: string): string {
  const clean = monthStr.replace(/\D/g, '');
  return clean.padStart(2, '0');
}

/**
 * Extracts card fields from generic object key-value pairs
 */
function extractCardFromRecord(record: Record<string, unknown>, index: number): BulkCardInput | null {
  const findValue = (...keys: string[]): string => {
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null) {
        return String(record[key]).trim();
      }
    }
    // Also check case-insensitive match
    for (const [k, v] of Object.entries(record)) {
      if (keys.some((target) => target.toLowerCase() === k.toLowerCase())) {
        if (v !== undefined && v !== null) {
          return String(v).trim();
        }
      }
    }
    return '';
  };

  const cardNumber = findValue('cardNumber', 'number', 'card_number', 'pan', 'card');
  const expMonth = findValue('expMonth', 'exp_month', 'month', 'expiry_month', 'mm');
  const expYear = findValue('expYear', 'exp_year', 'year', 'expiry_year', 'yy', 'yyyy');
  const cvc = findValue('cvc', 'cvv', 'securityCode', 'security_code', 'code');
  const cardholderName = findValue('cardholderName', 'name', 'cardholder_name', 'holder_name') || 'Jane Doe';
  const postalCode = findValue('postalCode', 'postal_code', 'zip', 'zipCode', 'zip_code') || '90210';
  const country = findValue('country') || 'US';

  const cleanNum = cardNumber.replace(/\D/g, '');
  if (cleanNum.length < 12 || cleanNum.length > 19) {
    return null;
  }

  return {
    id: `card_${Date.now()}_${index}`,
    cardNumber: cleanNum,
    expMonth: normalizeMonth(expMonth || '12'),
    expYear: normalizeYear(expYear || '2028'),
    cvc: cvc.replace(/\D/g, '') || '123',
    cardholderName,
    postalCode,
    country,
    rawSourceText: JSON.stringify(record),
  };
}

/**
 * Parses pipe/comma/slash delimited string line
 * e.g., 4242424242424242|12|28|123|Jane Doe|90210
 * or 4242424242424242, 12, 2028, 123
 */
function parseDelimitedLine(line: string, index: number): BulkCardInput | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return null;
  }

  // Determine delimiter
  let delimiter = '|';
  if (trimmed.includes('|')) {
    delimiter = '|';
  } else if (trimmed.includes(';')) {
    delimiter = ';';
  } else if (trimmed.includes(',')) {
    delimiter = ',';
  } else if (trimmed.includes(':') && !trimmed.startsWith('{')) {
    delimiter = ':';
  } else if (trimmed.includes('\t')) {
    delimiter = '\t';
  }

  const parts = trimmed.split(delimiter).map((p) => p.trim());
  if (parts.length < 3) {
    return null;
  }

  const rawNumber = parts[0].replace(/\D/g, '');
  if (rawNumber.length < 12 || rawNumber.length > 19) {
    return null;
  }

  // Part 1 might be MM or MM/YY
  let month = '12';
  let year = '2028';
  let cvc = '123';
  let name = 'Jane Doe';
  let zip = '90210';

  if (parts[1].includes('/')) {
    const [m, y] = parts[1].split('/');
    month = normalizeMonth(m);
    year = normalizeYear(y);
    cvc = (parts[2] || '123').replace(/\D/g, '');
    if (parts[3]) name = parts[3];
    if (parts[4]) zip = parts[4];
  } else {
    month = normalizeMonth(parts[1] || '12');
    year = normalizeYear(parts[2] || '2028');
    cvc = (parts[3] || '123').replace(/\D/g, '');
    if (parts[4]) name = parts[4];
    if (parts[5]) zip = parts[5];
  }

  return {
    id: `card_${Date.now()}_${index}`,
    cardNumber: rawNumber,
    expMonth: month,
    expYear: year,
    cvc,
    cardholderName: name,
    postalCode: zip,
    country: 'US',
    rawSourceText: line,
  };
}

/**
 * Parses user input text into structured BulkCardInput objects
 */
export function parseBulkCardsInput(input: string): ParseResult {
  const trimmed = input.trim();
  const errors: string[] = [];
  const cards: BulkCardInput[] = [];

  if (!trimmed) {
    return { cards: [], errors: [] };
  }

  // Check if input begins with [ or { (JSON)
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        parsed.forEach((item, idx) => {
          if (typeof item === 'object' && item !== null) {
            const card = extractCardFromRecord(item as Record<string, unknown>, idx);
            if (card) {
              cards.push(card);
            } else {
              errors.push(`Row ${idx + 1}: Invalid card object or missing valid card number.`);
            }
          } else if (typeof item === 'string') {
            const card = parseDelimitedLine(item, idx);
            if (card) {
              cards.push(card);
            } else {
              errors.push(`Row ${idx + 1}: Unrecognized string format.`);
            }
          }
        });
        return { cards, errors };
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Single object or wrapped object like { cards: [...] }
        const wrappedList = (parsed as Record<string, unknown>).cards || (parsed as Record<string, unknown>).data;
        if (Array.isArray(wrappedList)) {
          wrappedList.forEach((item, idx) => {
            if (typeof item === 'object' && item !== null) {
              const card = extractCardFromRecord(item as Record<string, unknown>, idx);
              if (card) cards.push(card);
            }
          });
          return { cards, errors };
        } else {
          const card = extractCardFromRecord(parsed as Record<string, unknown>, 0);
          if (card) {
            cards.push(card);
          } else {
            errors.push('Single JSON object missing valid card number.');
          }
          return { cards, errors };
        }
      }
    } catch {
      // Not valid strict JSON, fallback to line-by-line parsing
    }
  }

  // Line by line parsing
  const lines = trimmed.split('\n');
  lines.forEach((line, idx) => {
    const l = line.trim();
    if (!l || l.startsWith('#') || l.startsWith('//')) {
      return;
    }

    // Try parsing line as JSON object
    if (l.startsWith('{') && l.endsWith('}')) {
      try {
        const obj = JSON.parse(l);
        const card = extractCardFromRecord(obj, idx);
        if (card) {
          cards.push(card);
          return;
        }
      } catch {
        // proceed to delimited
      }
    }

    const card = parseDelimitedLine(l, idx);
    if (card) {
      cards.push(card);
    } else {
      errors.push(`Line ${idx + 1}: Could not parse card ("${l.substring(0, 30)}...")`);
    }
  });

  return { cards, errors };
}
