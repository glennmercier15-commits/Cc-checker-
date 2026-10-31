import {
  CardBrand,
  StripeApiError,
  StripeLegacyTokenResponse,
  StripePaymentMethodResponse,
  StripePaymentIntentResponse,
  TokenType,
} from '../types/stripe';
import { detectCardBrand } from './cardUtils';

export interface TokenizeParams {
  name: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  postalCode?: string;
  country?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  email?: string;
  phone?: string;
  saveCard?: boolean;
  tokenType: TokenType;
  publishableKey?: string;
  secretKey?: string;
  useLiveApi?: boolean;
}

export interface TokenizeResult {
  success: boolean;
  data?: StripePaymentMethodResponse | StripeLegacyTokenResponse;
  error?: StripeApiError;
  durationMs: number;
  curlCommand: string;
  keyType?: 'secret' | 'publishable' | 'simulator';
}

/**
 * Executes tokenization either via live Stripe API (supporting Secret Key or Publishable Key)
 * or through the high-fidelity Sandbox Simulator
 */
export async function executeTokenization(params: TokenizeParams): Promise<TokenizeResult> {
  const startTime = performance.now();
  const cleanCardNumber = params.cardNumber.replace(/\D/g, '');
  const cleanCvc = params.cvc.replace(/\D/g, '');
  const cleanExpMonth = params.expMonth.replace(/\D/g, '').padStart(2, '0');
  let cleanExpYear = params.expYear.replace(/\D/g, '');
  if (cleanExpYear.length === 2) {
    cleanExpYear = `20${cleanExpYear}`;
  }

  // Generate equivalent cURL command for developers
  const curlCommand = generateCurlCommand({
    cardNumber: cleanCardNumber,
    expMonth: cleanExpMonth,
    expYear: cleanExpYear,
    cvc: cleanCvc,
    name: params.name,
    postalCode: params.postalCode,
    country: params.country,
    addressLine1: params.addressLine1,
    addressLine2: params.addressLine2,
    city: params.city,
    state: params.state,
    email: params.email,
    phone: params.phone,
    tokenType: params.tokenType,
    publishableKey: params.publishableKey || 'pk_test_sample51N01234567890abcdef',
    secretKey: params.secretKey,
  });

  const hasSecretKey = Boolean(params.secretKey && params.secretKey.trim().length > 0);
  const hasPublishableKey = Boolean(params.publishableKey && params.publishableKey.trim().length > 0);

  // If live mode is requested, or if any live key (Secret or Publishable) is supplied:
  if (params.useLiveApi || hasSecretKey || hasPublishableKey) {
    try {
      // Preferred path: Secure Server-side proxy route (/api/stripe/tokenize)
      // Handles both Secret Keys (sk_...) and Publishable Keys (pk_...) securely
      const proxyResponse = await fetch('/api/stripe/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: params.name,
          cardNumber: cleanCardNumber,
          expMonth: cleanExpMonth,
          expYear: cleanExpYear,
          cvc: cleanCvc,
          postalCode: params.postalCode,
          country: params.country,
          addressLine1: params.addressLine1,
          addressLine2: params.addressLine2,
          city: params.city,
          state: params.state,
          email: params.email,
          phone: params.phone,
          tokenType: params.tokenType,
          secretKey: params.secretKey?.trim(),
          publishableKey: params.publishableKey?.trim(),
        }),
      });

      const json = await proxyResponse.json();
      const durationMs = Math.round(performance.now() - startTime);

      if (json.success && json.data) {
        return {
          success: true,
          data: json.data,
          durationMs,
          curlCommand,
          keyType: json.keyType || (hasSecretKey ? 'secret' : 'publishable'),
        };
      } else {
        return {
          success: false,
          error: json.error || {
            type: 'card_error',
            code: 'card_declined',
            message: 'Card authorization failed or was declined by issuer.',
          },
          durationMs,
          curlCommand,
          keyType: json.keyType || (hasSecretKey ? 'secret' : 'publishable'),
        };
      }
    } catch {
      // If server proxy is unreachable and client has publishable key, try direct client call
      if (params.publishableKey && params.publishableKey.trim().startsWith('pk_')) {
        try {
          const liveResult = await callStripeApiLive({
            name: params.name,
            cardNumber: cleanCardNumber,
            expMonth: cleanExpMonth,
            expYear: cleanExpYear,
            cvc: cleanCvc,
            postalCode: params.postalCode,
            country: params.country,
            addressLine1: params.addressLine1,
            addressLine2: params.addressLine2,
            city: params.city,
            state: params.state,
            email: params.email,
            phone: params.phone,
            tokenType: params.tokenType,
            publishableKey: params.publishableKey.trim(),
          });
          const durationMs = Math.round(performance.now() - startTime);
          return {
            ...liveResult,
            durationMs,
            curlCommand,
            keyType: 'publishable',
          };
        } catch (clientErr: unknown) {
          const durationMs = Math.round(performance.now() - startTime);
          const errorMessage = clientErr instanceof Error ? clientErr.message : 'Unknown network failure';
          return {
            success: false,
            error: {
              type: 'api_connection_error',
              message: `Network error connecting to Stripe API: ${errorMessage}. Check your internet connection or API key.`,
            },
            durationMs,
            curlCommand,
            keyType: 'publishable',
          };
        }
      }

      const durationMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        error: {
          type: 'api_connection_error',
          message: 'Unable to reach backend Stripe proxy service at /api/stripe/tokenize.',
        },
        durationMs,
        curlCommand,
      };
    }
  }

  // Fallback or default: High-Fidelity Sandbox Simulator
  await new Promise((resolve) => setTimeout(resolve, 320 + Math.random() * 180));
  const simResult = simulateStripeResponse({
    name: params.name,
    cardNumber: cleanCardNumber,
    expMonth: parseInt(cleanExpMonth, 10),
    expYear: parseInt(cleanExpYear, 10),
    cvc: cleanCvc,
    postalCode: params.postalCode,
    country: params.country || 'US',
    addressLine1: params.addressLine1,
    addressLine2: params.addressLine2,
    city: params.city,
    state: params.state,
    email: params.email,
    phone: params.phone,
    saveCard: params.saveCard,
    tokenType: params.tokenType,
  });

  const durationMs = Math.round(performance.now() - startTime);
  return {
    ...simResult,
    durationMs,
    curlCommand,
  };
}

/**
 * Real HTTPS call directly to Stripe's tokenization endpoints
 */
async function callStripeApiLive(params: {
  name: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  postalCode?: string;
  country?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  email?: string;
  phone?: string;
  tokenType: TokenType;
  publishableKey: string;
}): Promise<{ success: boolean; data?: StripePaymentMethodResponse | StripeLegacyTokenResponse; error?: StripeApiError }> {
  const isPaymentMethod = params.tokenType === 'payment_method';
  const endpoint = isPaymentMethod
    ? 'https://api.stripe.com/v1/payment_methods'
    : 'https://api.stripe.com/v1/tokens';

  const formData = new URLSearchParams();

  if (isPaymentMethod) {
    formData.append('type', 'card');
    formData.append('card[number]', params.cardNumber);
    formData.append('card[exp_month]', params.expMonth);
    formData.append('card[exp_year]', params.expYear);
    formData.append('card[cvc]', params.cvc);
    formData.append('payment_user_agent', 'stripe.js/c1fbe29896; stripe-js-v3/c1fbe29896; payment-element; deferred-intent');
    formData.append('_stripe_version', '2024-06-20');
    formData.append('muid', '84839210-0000-0000-0000-1234567890ab');
    formData.append('sid', '92831024-0000-0000-0000-1234567890ab');
    formData.append('guid', '73628102-0000-0000-0000-1234567890ab');
    formData.append('client_attribution_metadata[client_session_id]', 'src_1OpSampleSessionId0123');
    formData.append('client_attribution_metadata[merchant_integration_source]', 'elements');
    formData.append('client_attribution_metadata[merchant_integration_subtype]', 'payment-element');
    formData.append('client_attribution_metadata[merchant_integration_version]', '2021');
    formData.append('client_attribution_metadata[payment_intent_creation_flow]', 'deferred');

    if (params.name) {
      formData.append('billing_details[name]', params.name);
    }
    if (params.email) {
      formData.append('billing_details[email]', params.email);
    }
    if (params.phone) {
      formData.append('billing_details[phone]', params.phone);
    }
    if (params.addressLine1) {
      formData.append('billing_details[address][line1]', params.addressLine1);
    }
    if (params.addressLine2) {
      formData.append('billing_details[address][line2]', params.addressLine2);
    }
    if (params.city) {
      formData.append('billing_details[address][city]', params.city);
    }
    if (params.state) {
      formData.append('billing_details[address][state]', params.state);
    }
    if (params.postalCode) {
      formData.append('billing_details[address][postal_code]', params.postalCode);
    }
    if (params.country) {
      formData.append('billing_details[address][country]', params.country);
    }
  } else {
    // Legacy token
    formData.append('card[number]', params.cardNumber);
    formData.append('card[exp_month]', params.expMonth);
    formData.append('card[exp_year]', params.expYear);
    formData.append('card[cvc]', params.cvc);
    if (params.name) {
      formData.append('card[name]', params.name);
    }
    if (params.addressLine1) {
      formData.append('card[address_line1]', params.addressLine1);
    }
    if (params.addressLine2) {
      formData.append('card[address_line2]', params.addressLine2);
    }
    if (params.city) {
      formData.append('card[address_city]', params.city);
    }
    if (params.state) {
      formData.append('card[address_state]', params.state);
    }
    if (params.postalCode) {
      formData.append('card[address_zip]', params.postalCode);
    }
    if (params.country) {
      formData.append('card[address_country]', params.country);
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.publishableKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const json = await response.json();

  if (!response.ok || json.error) {
    return {
      success: false,
      error: json.error || {
        type: 'api_error',
        message: 'Request failed with status ' + response.status,
      },
    };
  }

  return {
    success: true,
    data: json,
  };
}

/**
 * High-Fidelity Simulator that replicates Stripe's API behavior for test cards & standard cards
 */
function simulateStripeResponse(params: {
  name: string;
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  postalCode?: string;
  country?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  email?: string;
  phone?: string;
  saveCard?: boolean;
  tokenType: TokenType;
}): { success: boolean; data?: StripePaymentMethodResponse | StripeLegacyTokenResponse; error?: StripeApiError } {
  const brand = detectCardBrand(params.cardNumber);
  const last4 = params.cardNumber.slice(-4) || '4242';

  // Check specific test card trigger numbers
  if (params.cardNumber.endsWith('0002')) {
    return {
      success: false,
      error: {
        type: 'card_error',
        code: 'card_declined',
        decline_code: 'generic_decline',
        message: 'Your card was declined. The issuer rejected the transaction authorization.',
        param: '',
      },
    };
  }

  if (params.cardNumber.endsWith('9995')) {
    return {
      success: false,
      error: {
        type: 'card_error',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
        message: 'Your card has insufficient funds to complete this authorization check.',
        param: '',
      },
    };
  }

  if (params.cardNumber.endsWith('0069')) {
    return {
      success: false,
      error: {
        type: 'card_error',
        code: 'expired_card',
        message: 'Your card has expired. Please verify the expiry month and year.',
        param: 'exp_month',
      },
    };
  }

  if (params.cardNumber.endsWith('0127') || params.cvc === '999') {
    return {
      success: false,
      error: {
        type: 'card_error',
        code: 'incorrect_cvc',
        message: "Your card's security code is incorrect.",
        param: 'cvc',
      },
    };
  }

  // Generate authentic Stripe ID
  const timestamp = Math.floor(Date.now() / 1000);
  const randomSuffix = Math.random().toString(36).substring(2, 16) + Math.random().toString(36).substring(2, 12);
  const fingerprint = 'fg_' + Math.random().toString(36).substring(2, 18);

  const cvcCheck: 'pass' | 'fail' | 'unavailable' = 'pass';
  const postalCodeCheck: 'pass' | 'fail' | 'unavailable' = params.postalCode ? 'pass' : 'unavailable';
  const addressLine1Check = params.addressLine1 ? 'pass' : null;

  // Funding type detection
  let funding: 'credit' | 'debit' | 'prepaid' = 'credit';
  if (params.cardNumber.startsWith('4000') || params.cardNumber.startsWith('4242')) {
    funding = 'credit';
  } else if (params.cardNumber.startsWith('5555')) {
    funding = 'debit';
  }

  if (params.tokenType === 'payment_method') {
    const pmId = `pm_1${randomSuffix}`;
    const paymentMethod: StripePaymentMethodResponse = {
      id: pmId,
      object: 'payment_method',
      billing_details: {
        address: {
          city: params.city || null,
          country: params.country || 'US',
          line1: params.addressLine1 || null,
          line2: params.addressLine2 || null,
          postal_code: params.postalCode || null,
          state: params.state || null,
        },
        email: params.email || null,
        name: params.name || null,
        phone: params.phone || null,
      },
      card: {
        brand: brand as CardBrand,
        checks: {
          address_line1_check: addressLine1Check,
          address_postal_code_check: postalCodeCheck,
          cvc_check: cvcCheck,
        },
        country: params.country || 'US',
        exp_month: params.expMonth,
        exp_year: params.expYear,
        fingerprint,
        funding,
        generated_from: null,
        last4,
        three_d_secure_usage: {
          supported: true,
        },
        wallet: null,
      },
      created: timestamp,
      customer: null,
      livemode: false,
      type: 'card',
    };

    return {
      success: true,
      data: paymentMethod,
    };
  }

  // Legacy Card Token (tok_...)
  const tokId = `tok_1${randomSuffix}`;
  const cardTokenId = `card_1${randomSuffix}`;
  const token: StripeLegacyTokenResponse = {
    id: tokId,
    object: 'token',
    client_ip: '198.51.100.42',
    created: timestamp,
    livemode: false,
    type: 'card',
    used: false,
    card: {
      id: cardTokenId,
      object: 'card',
      brand: brand as CardBrand,
      name: params.name || null,
      address_line1: params.addressLine1 || null,
      address_line2: params.addressLine2 || null,
      address_city: params.city || null,
      address_state: params.state || null,
      address_zip: params.postalCode || null,
      address_country: params.country || 'US',
      checks: {
        address_line1_check: addressLine1Check,
        address_postal_code_check: postalCodeCheck,
        cvc_check: cvcCheck,
      },
      country: params.country || 'US',
      exp_month: params.expMonth,
      exp_year: params.expYear,
      fingerprint,
      funding,
      generated_from: null,
      last4,
      wallet: null,
    },
  };

  return {
    success: true,
    data: token,
  };
}

/**
 * Generates an exact terminal cURL snippet for developer copy-pasting
 */
export function generateCurlCommand(params: {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  name?: string;
  postalCode?: string;
  country?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  email?: string;
  phone?: string;
  tokenType: TokenType;
  publishableKey: string;
  secretKey?: string;
}): string {
  const isPaymentMethod = params.tokenType === 'payment_method';
  const endpoint = isPaymentMethod
    ? 'https://api.stripe.com/v1/payment_methods'
    : 'https://api.stripe.com/v1/tokens';

  const authKey = params.secretKey && params.secretKey.trim()
    ? `${params.secretKey.slice(0, 7)}••••••••`
    : params.publishableKey;

  const lines = [
    `curl ${endpoint} \\`,
    `  -u ${authKey}: \\`,
  ];

  if (isPaymentMethod) {
    lines.push(`  -d type="card" \\`);
    lines.push(`  -d "card[number]"="${params.cardNumber}" \\`);
    lines.push(`  -d "card[exp_month]"="${params.expMonth}" \\`);
    lines.push(`  -d "card[exp_year]"="${params.expYear}" \\`);
    lines.push(`  -d "card[cvc]"="${params.cvc}" \\`);
    if (params.name) {
      lines.push(`  -d "billing_details[name]"="${params.name}" \\`);
    }
    if (params.email) {
      lines.push(`  -d "billing_details[email]"="${params.email}" \\`);
    }
    if (params.phone) {
      lines.push(`  -d "billing_details[phone]"="${params.phone}" \\`);
    }
    if (params.addressLine1) {
      lines.push(`  -d "billing_details[address][line1]"="${params.addressLine1}" \\`);
    }
    if (params.addressLine2) {
      lines.push(`  -d "billing_details[address][line2]"="${params.addressLine2}" \\`);
    }
    if (params.city) {
      lines.push(`  -d "billing_details[address][city]"="${params.city}" \\`);
    }
    if (params.state) {
      lines.push(`  -d "billing_details[address][state]"="${params.state}" \\`);
    }
    if (params.postalCode) {
      lines.push(`  -d "billing_details[address][postal_code]"="${params.postalCode}" \\`);
    }
    if (params.country) {
      lines.push(`  -d "billing_details[address][country]"="${params.country}" \\`);
    }
  } else {
    lines.push(`  -d "card[number]"="${params.cardNumber}" \\`);
    lines.push(`  -d "card[exp_month]"="${params.expMonth}" \\`);
    lines.push(`  -d "card[exp_year]"="${params.expYear}" \\`);
    lines.push(`  -d "card[cvc]"="${params.cvc}" \\`);
    if (params.name) {
      lines.push(`  -d "card[name]"="${params.name}" \\`);
    }
    if (params.addressLine1) {
      lines.push(`  -d "card[address_line1]"="${params.addressLine1}" \\`);
    }
    if (params.addressLine2) {
      lines.push(`  -d "card[address_line2]"="${params.addressLine2}" \\`);
    }
    if (params.city) {
      lines.push(`  -d "card[address_city]"="${params.city}" \\`);
    }
    if (params.state) {
      lines.push(`  -d "card[address_state]"="${params.state}" \\`);
    }
    if (params.postalCode) {
      lines.push(`  -d "card[address_zip]"="${params.postalCode}" \\`);
    }
    if (params.country) {
      lines.push(`  -d "card[address_country]"="${params.country}" \\`);
    }
  }

  // Trim trailing backslash on last line
  lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, '');

  return lines.join('\n');
}

/**
 * Generates backend integration code snippets (Node.js, Python, PHP, Ruby)
 */
export function generateBackendSnippet(tokenId: string, language: 'node' | 'python' | 'php' | 'curl'): string {
  const isPaymentMethod = tokenId.startsWith('pm_');

  switch (language) {
    case 'node':
      if (isPaymentMethod) {
        return `// Server-side (Node.js / TypeScript) using stripe-node SDK
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Step 1: Create a PaymentIntent with the tokenized PaymentMethod
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2500, // $25.00 USD in cents
  currency: 'usd',
  payment_method: '${tokenId}',
  confirm: true,
  automatic_payment_methods: {
    enabled: true,
    allow_redirects: 'never',
  },
});

console.log('Payment status:', paymentIntent.status); // 'succeeded'`;
      } else {
        return `// Server-side legacy charge with Token (tok_...)
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const charge = await stripe.charges.create({
  amount: 2500,
  currency: 'usd',
  source: '${tokenId}',
  description: 'Software subscription',
});`;
      }

    case 'python':
      if (isPaymentMethod) {
        return `# Server-side Python using stripe-python
import os
import stripe

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

payment_intent = stripe.PaymentIntent.create(
    amount=2500,
    currency="usd",
    payment_method="${tokenId}",
    confirm=True,
    automatic_payment_methods={"enabled": True, "allow_redirects": "never"}
)

print(f"Charge status: {payment_intent.status}")`;
      } else {
        return `# Server-side Python legacy charge
import stripe
stripe.api_key = "sk_test_..."

charge = stripe.Charge.create(
    amount=2500,
    currency="usd",
    source="${tokenId}",
    description="Developer license"
)`;
      }

    case 'php':
      return `// Server-side PHP
\\Stripe\\Stripe::setApiKey(getenv('STRIPE_SECRET_KEY'));

$paymentIntent = \\Stripe\\PaymentIntent::create([
  'amount' => 2500,
  'currency' => 'usd',
  'payment_method' => '${tokenId}',
  'confirm' => true,
]);

echo $paymentIntent->status;`;

    case 'curl':
      return `# Server-to-server confirmation via Secret Key
curl https://api.stripe.com/v1/payment_intents \\
  -u sk_test_YOUR_SECRET_KEY: \\
  -d amount=2500 \\
  -d currency="usd" \\
  -d payment_method="${tokenId}" \\
  -d confirm=true`;

    default:
      return '';
  }
}

export interface PaymentIntentParams {
  amount: number;
  currency: string;
  name: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  postalCode?: string;
  country?: string;
  addressLine1?: string;
  city?: string;
  email?: string;
  publishableKey?: string;
  secretKey?: string;
  useLiveApi?: boolean;
}

export interface PaymentIntentResult {
  success: boolean;
  data?: StripePaymentIntentResponse;
  error?: StripeApiError;
  durationMs: number;
  curlCommand: string;
}

/**
 * Executes Stripe PaymentIntent creation and confirmation via backend proxy or simulator
 */
export async function executePaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
  const startTime = performance.now();
  const cleanCard = params.cardNumber.replace(/\D/g, '');
  const cleanCvc = params.cvc.replace(/\D/g, '');
  const cleanExpMonth = params.expMonth.replace(/\D/g, '').padStart(2, '0');
  let cleanExpYear = params.expYear.replace(/\D/g, '');
  if (cleanExpYear.length === 2) {
    cleanExpYear = `20${cleanExpYear}`;
  }

  const curlCommand = generatePaymentIntentCurl({
    amount: params.amount,
    currency: params.currency,
    cardNumber: cleanCard,
    expMonth: cleanExpMonth,
    expYear: cleanExpYear,
    cvc: cleanCvc,
    name: params.name,
    postalCode: params.postalCode,
    country: params.country || 'US',
    authKey: params.secretKey || params.publishableKey || 'sk_test_sample',
  });

  const hasSecretKey = Boolean(params.secretKey && params.secretKey.trim().length > 0);
  const hasPublishableKey = Boolean(params.publishableKey && params.publishableKey.trim().length > 0);

  if (params.useLiveApi || hasSecretKey || hasPublishableKey) {
    try {
      const response = await fetch('/api/stripe/payment_intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency,
          name: params.name,
          cardNumber: cleanCard,
          expMonth: cleanExpMonth,
          expYear: cleanExpYear,
          cvc: cleanCvc,
          postalCode: params.postalCode,
          country: params.country,
          addressLine1: params.addressLine1,
          city: params.city,
          email: params.email,
          secretKey: params.secretKey?.trim(),
          publishableKey: params.publishableKey?.trim(),
        }),
      });

      const json = await response.json();
      const durationMs = Math.round(performance.now() - startTime);

      if (json.success && json.data) {
        return { success: true, data: json.data, durationMs, curlCommand };
      } else {
        return {
          success: false,
          error: json.error || { type: 'card_error', message: 'Payment intent failed authorization.' },
          durationMs,
          curlCommand,
        };
      }
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - startTime);
      const msg = err instanceof Error ? err.message : 'Network error';
      return {
        success: false,
        error: { type: 'api_connection_error', message: `Failed to connect to PaymentIntent proxy: ${msg}` },
        durationMs,
        curlCommand,
      };
    }
  }

  // Simulator Fallback
  await new Promise((r) => setTimeout(r, 380 + Math.random() * 150));
  const durationMs = Math.round(performance.now() - startTime);

  // Check specific test card trigger numbers
  if (cleanCard.endsWith('0002')) {
    return {
      success: false,
      error: {
        type: 'card_error',
        code: 'card_declined',
        decline_code: 'generic_decline',
        message: 'Your card was declined. Issuer rejected payment intent authorization.',
      },
      durationMs,
      curlCommand,
    };
  }
  if (cleanCard.endsWith('9995')) {
    return {
      success: false,
      error: {
        type: 'card_error',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
        message: 'Your card has insufficient funds for this payment intent.',
      },
      durationMs,
      curlCommand,
    };
  }
  if (cleanCard.endsWith('0069')) {
    return {
      success: false,
      error: {
        type: 'card_error',
        code: 'expired_card',
        message: 'Your card has expired. Cannot confirm payment intent.',
      },
      durationMs,
      curlCommand,
    };
  }

  const randomSuffix = Math.random().toString(36).substring(2, 16);
  const piId = `pi_1${randomSuffix}`;
  const pmId = `pm_1${randomSuffix}`;

  const paymentIntent: StripePaymentIntentResponse = {
    id: piId,
    object: 'payment_intent',
    amount: params.amount,
    amount_received: params.amount,
    currency: params.currency,
    client_secret: `${piId}_secret_${randomSuffix}`,
    confirmation_method: 'automatic',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    status: 'succeeded',
    payment_method: pmId,
  };

  return {
    success: true,
    data: paymentIntent,
    durationMs,
    curlCommand,
  };
}

export function generatePaymentIntentCurl(params: {
  amount: number;
  currency: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  name?: string;
  postalCode?: string;
  country?: string;
  authKey: string;
}): string {
  const lines = [
    `curl https://api.stripe.com/v1/payment_intents \\`,
    `  -u ${params.authKey}: \\`,
    `  -d amount="${params.amount}" \\`,
    `  -d currency="${params.currency}" \\`,
    `  -d "payment_method_data[type]"="card" \\`,
    `  -d "payment_method_data[card][number]"="${params.cardNumber}" \\`,
    `  -d "payment_method_data[card][exp_month]"="${params.expMonth}" \\`,
    `  -d "payment_method_data[card][exp_year]"="${params.expYear}" \\`,
    `  -d "payment_method_data[card][cvc]"="${params.cvc}" \\`,
  ];
  if (params.name) {
    lines.push(`  -d "payment_method_data[billing_details][name]"="${params.name}" \\`);
  }
  if (params.postalCode) {
    lines.push(`  -d "payment_method_data[billing_details][address][postal_code]"="${params.postalCode}" \\`);
  }
  if (params.country) {
    lines.push(`  -d "payment_method_data[billing_details][address][country]"="${params.country}" \\`);
  }
  lines.push(`  -d confirm="true" \\`);
  lines.push(`  -d "automatic_payment_methods[enabled]"="true" \\`);
  lines.push(`  -d "automatic_payment_methods[allow_redirects]"="never"`);

  return lines.join('\n');
}

export async function retrieveStripeTokenHealth(
  tokenId: string,
  secretKey?: string,
  publishableKey?: string,
  useLiveApi?: boolean
): Promise<{ success: boolean; data?: any; error?: any; durationMs: number }> {
  const startTime = performance.now();

  if (useLiveApi || (secretKey && secretKey.trim()) || (publishableKey && publishableKey.trim())) {
    try {
      const res = await fetch(
        `/api/stripe/retrieve/${encodeURIComponent(tokenId)}?secretKey=${encodeURIComponent(secretKey || '')}&publishableKey=${encodeURIComponent(publishableKey || '')}`
      );
      const json = await res.json();
      const durationMs = Math.round(performance.now() - startTime);
      return { success: json.success, data: json.data, error: json.error, durationMs };
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        error: { message: err instanceof Error ? err.message : 'Network error reaching Stripe retrieve proxy' },
        durationMs,
      };
    }
  }

  // Simulator token health check
  await new Promise((r) => setTimeout(r, 220 + Math.random() * 100));
  const durationMs = Math.round(performance.now() - startTime);
  const isUsed = tokenId.includes('used') || Math.random() < 0.08;
  const isExpired = tokenId.includes('exp') || Math.random() < 0.04;

  return {
    success: true,
    data: {
      id: tokenId,
      object: tokenId.startsWith('pm_') ? 'payment_method' : tokenId.startsWith('pi_') ? 'payment_intent' : 'token',
      used: isUsed,
      status: isExpired ? 'expired' : isUsed ? 'used' : 'active',
      livemode: false,
      created: Math.floor(Date.now() / 1000) - 1800,
      health: isExpired ? 'Expired' : isUsed ? 'Already Used (Consumed)' : 'Active & Valid (Uncharged)',
    },
    durationMs,
  };
}
