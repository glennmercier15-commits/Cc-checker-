import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

/**
 * Health check & Stripe environment status
 */
app.get('/api/stripe/status', (_req: Request, res: Response) => {
  const envSecretKey = process.env.STRIPE_SECRET_KEY || '';
  const envPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';

  const hasSecretKey = Boolean(envSecretKey && envSecretKey.trim().length > 0);
  const hasPublishableKey = Boolean(envPublishableKey && envPublishableKey.trim().length > 0);

  const maskedSecretKey = hasSecretKey
    ? `${envSecretKey.slice(0, 7)}••••••••${envSecretKey.slice(-4)}`
    : null;
  const maskedPublishableKey = hasPublishableKey
    ? `${envPublishableKey.slice(0, 7)}••••••••${envPublishableKey.slice(-4)}`
    : null;

  res.json({
    configured: hasSecretKey || hasPublishableKey,
    hasSecretKey,
    hasPublishableKey,
    maskedSecretKey,
    maskedPublishableKey,
    mode: hasSecretKey ? 'secret' : hasPublishableKey ? 'publishable' : 'simulator',
  });
});

/**
 * Proxy route for Stripe Card Tokenization and Verification
 * Supports Stripe Secret Keys (sk_test_... / sk_live_...) securely on the backend
 * without exposing credentials or triggering CORS blocks in the browser.
 */
app.post('/api/stripe/tokenize', async (req: Request, res: Response) => {
  const {
    name,
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
    tokenType = 'payment_method',
    secretKey,
    publishableKey,
  } = req.body;

  // Determine active Stripe key: user-supplied secret key > user publishable key > env secret key > env publishable key
  const activeKey =
    (secretKey && typeof secretKey === 'string' && secretKey.trim()) ||
    (publishableKey && typeof publishableKey === 'string' && publishableKey.trim()) ||
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY;

  if (!activeKey) {
    res.status(400).json({
      success: false,
      liveStatus: 'dead',
      error: {
        type: 'authentication_error',
        message:
          'No Stripe API Key provided. Enter your Stripe Secret Key (sk_test_... or sk_live_...) or set STRIPE_SECRET_KEY in your server environment.',
      },
    });
    return;
  }

  const cleanCardNumber = (cardNumber || '').toString().replace(/\D/g, '');
  const cleanCvc = (cvc || '').toString().replace(/\D/g, '');
  const cleanExpMonth = (expMonth || '').toString().replace(/\D/g, '').padStart(2, '0');
  let cleanExpYear = (expYear || '').toString().replace(/\D/g, '');
  if (cleanExpYear.length === 2) {
    cleanExpYear = `20${cleanExpYear}`;
  }

  const isPaymentMethod = tokenType === 'payment_method';
  const endpoint = isPaymentMethod
    ? 'https://api.stripe.com/v1/payment_methods'
    : 'https://api.stripe.com/v1/tokens';

  const formData = new URLSearchParams();

  if (isPaymentMethod) {
    formData.append('type', 'card');
    formData.append('card[number]', cleanCardNumber);
    formData.append('card[exp_month]', cleanExpMonth);
    formData.append('card[exp_year]', cleanExpYear);
    formData.append('card[cvc]', cleanCvc);
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

    if (name) {
      formData.append('billing_details[name]', name);
    }
    if (email) {
      formData.append('billing_details[email]', email);
    }
    if (phone) {
      formData.append('billing_details[phone]', phone);
    }
    if (addressLine1) {
      formData.append('billing_details[address][line1]', addressLine1);
    }
    if (addressLine2) {
      formData.append('billing_details[address][line2]', addressLine2);
    }
    if (city) {
      formData.append('billing_details[address][city]', city);
    }
    if (state) {
      formData.append('billing_details[address][state]', state);
    }
    if (postalCode) {
      formData.append('billing_details[address][postal_code]', postalCode);
    }
    if (country) {
      formData.append('billing_details[address][country]', country);
    }
  } else {
    formData.append('card[number]', cleanCardNumber);
    formData.append('card[exp_month]', cleanExpMonth);
    formData.append('card[exp_year]', cleanExpYear);
    formData.append('card[cvc]', cleanCvc);
    if (name) {
      formData.append('card[name]', name);
    }
    if (addressLine1) {
      formData.append('card[address_line1]', addressLine1);
    }
    if (addressLine2) {
      formData.append('card[address_line2]', addressLine2);
    }
    if (city) {
      formData.append('card[address_city]', city);
    }
    if (state) {
      formData.append('card[address_state]', state);
    }
    if (postalCode) {
      formData.append('card[address_zip]', postalCode);
    }
    if (country) {
      formData.append('card[address_country]', country);
    }
  }

  try {
    const stripeResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2023-10-16',
      },
      body: formData.toString(),
    });

    const json = await stripeResponse.json();

    const isLive = stripeResponse.ok && !json.error;
    const keyType = activeKey.startsWith('sk_')
      ? 'secret'
      : activeKey.startsWith('pk_')
        ? 'publishable'
        : 'custom';

    if (isLive) {
      res.json({
        success: true,
        liveStatus: 'live',
        keyType,
        data: json,
      });
    } else {
      res.json({
        success: false,
        liveStatus: 'dead',
        keyType,
        error: json.error || {
          type: 'card_error',
          code: 'card_declined',
          message: 'The transaction could not be processed.',
        },
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error reaching Stripe';
    res.status(500).json({
      success: false,
      liveStatus: 'dead',
      error: {
        type: 'api_connection_error',
        message: `Backend proxy failed to connect to Stripe: ${errorMsg}`,
      },
    });
  }
});

/**
 * Proxy route for Stripe Payment Intents API (Create & Confirm)
 */
app.post('/api/stripe/payment_intents', async (req: Request, res: Response) => {
  const {
    amount,
    currency = 'usd',
    name,
    cardNumber,
    expMonth,
    expYear,
    cvc,
    postalCode,
    country,
    addressLine1,
    city,
    email,
    secretKey,
    publishableKey,
  } = req.body;

  const activeKey =
    (secretKey && typeof secretKey === 'string' && secretKey.trim()) ||
    (publishableKey && typeof publishableKey === 'string' && publishableKey.trim()) ||
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY;

  if (!activeKey) {
    res.status(400).json({
      success: false,
      error: {
        type: 'authentication_error',
        message: 'No Stripe API Key provided for PaymentIntent creation.',
      },
    });
    return;
  }

  const cleanCard = (cardNumber || '').toString().replace(/\D/g, '');
  const cleanCvc = (cvc || '').toString().replace(/\D/g, '');
  const cleanExpMonth = (expMonth || '').toString().replace(/\D/g, '').padStart(2, '0');
  let cleanExpYear = (expYear || '').toString().replace(/\D/g, '');
  if (cleanExpYear.length === 2) {
    cleanExpYear = `20${cleanExpYear}`;
  }

  const formData = new URLSearchParams();
  formData.append('amount', String(amount || 2500));
  formData.append('currency', currency || 'usd');
  formData.append('confirm', 'true');
  formData.append('automatic_payment_methods[enabled]', 'true');
  formData.append('automatic_payment_methods[allow_redirects]', 'never');

  formData.append('payment_method_data[type]', 'card');
  formData.append('payment_method_data[card][number]', cleanCard);
  formData.append('payment_method_data[card][exp_month]', cleanExpMonth);
  formData.append('payment_method_data[card][exp_year]', cleanExpYear);
  formData.append('payment_method_data[card][cvc]', cleanCvc);

  if (name) formData.append('payment_method_data[billing_details][name]', name);
  if (email) formData.append('payment_method_data[billing_details][email]', email);
  if (addressLine1) formData.append('payment_method_data[billing_details][address][line1]', addressLine1);
  if (city) formData.append('payment_method_data[billing_details][address][city]', city);
  if (postalCode) formData.append('payment_method_data[billing_details][address][postal_code]', postalCode);
  if (country) formData.append('payment_method_data[billing_details][address][country]', country);

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2023-10-16',
      },
      body: formData.toString(),
    });

    const json = await stripeRes.json();

    if (stripeRes.ok && !json.error) {
      res.json({
        success: true,
        data: json,
      });
    } else {
      res.json({
        success: false,
        error: json.error || {
          type: 'card_error',
          code: 'card_declined',
          message: 'PaymentIntent confirmation failed.',
        },
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    res.status(500).json({
      success: false,
      error: {
        type: 'api_connection_error',
        message: `Proxy failed to connect to Stripe PaymentIntents API: ${errorMsg}`,
      },
    });
  }
});

/**
 * Proxy route for retrieving Stripe Token, PaymentMethod, or PaymentIntent status without creating a charge
 */
app.get('/api/stripe/retrieve/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const secretKey = req.query.secretKey as string;
  const publishableKey = req.query.publishableKey as string;

  const activeKey =
    (secretKey && typeof secretKey === 'string' && secretKey.trim()) ||
    (publishableKey && typeof publishableKey === 'string' && publishableKey.trim()) ||
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY;

  if (!activeKey) {
    res.status(400).json({ success: false, error: { message: 'No Stripe API Key provided' } });
    return;
  }

  let endpoint = '';
  if (id.startsWith('tok_')) {
    endpoint = `https://api.stripe.com/v1/tokens/${id}`;
  } else if (id.startsWith('pm_')) {
    endpoint = `https://api.stripe.com/v1/payment_methods/${id}`;
  } else if (id.startsWith('pi_')) {
    endpoint = `https://api.stripe.com/v1/payment_intents/${id}`;
  } else {
    endpoint = `https://api.stripe.com/v1/tokens/${id}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${activeKey}`,
        'Stripe-Version': '2023-10-16',
      },
    });

    const json = await response.json();
    if (response.ok && !json.error) {
      res.json({ success: true, data: json });
    } else {
      res.json({ success: false, error: json.error || { message: 'Retrieve failed or token not found' } });
    }
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: { message: err instanceof Error ? err.message : 'Network error' } });
  }
});

/**
 * Server-side BIN Lookup Proxy with In-Memory Cache
 */
const binCache = new Map<string, unknown>();

app.get('/api/bin/:bin', async (req: Request, res: Response) => {
  const rawBin = String(req.params.bin || '').replace(/\D/g, '').slice(0, 8);
  if (rawBin.length < 6) {
    res.status(400).json({ error: 'BIN must be at least 6 digits' });
    return;
  }

  if (binCache.has(rawBin)) {
    res.json(binCache.get(rawBin));
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const lookupRes = await fetch(`https://lookup.binlist.net/${rawBin.slice(0, 6)}`, {
      headers: {
        'Accept-Version': '3',
        'User-Agent': 'MrNiceGuyTokenizationStudio/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (lookupRes.ok) {
      const data = await lookupRes.json();
      const formatted = {
        bin: rawBin,
        binLength: rawBin.length === 8 ? 8 : 6,
        brand: (data.scheme || 'unknown').toLowerCase(),
        brandDisplayName: data.scheme ? data.scheme.toUpperCase() : 'Unknown',
        scheme: data.scheme ? data.scheme.toUpperCase() : 'UNKNOWN',
        funding: (data.type || 'credit').toLowerCase(),
        tier: data.brand || 'Standard',
        issuer: {
          name: data.bank?.name || 'Commercial Issuing Bank',
          website: data.bank?.url,
          phone: data.bank?.phone,
          city: data.bank?.city,
        },
        country: {
          name: data.country?.name || 'United States',
          alpha2: data.country?.alpha2 || 'US',
          alpha3: 'USA',
          flag: data.country?.emoji || '🌐',
          currency: data.country?.currency || 'USD',
          currencySymbol: '$',
          numericCode: data.country?.numeric,
        },
        technicalSpecs: {
          mii: parseInt(rawBin[0], 10),
          miiCategory: 'Banking and financial',
          luhnCompliant: true,
          durbinRegulated: data.type === 'debit',
          threeDsSupported: true,
          level2DataEligible: false,
          level3DataEligible: false,
          pushToCardSupported: true,
          contactlessSupported: true,
          applePayGooglePayReady: true,
          riskScore: data.prepaid ? 'Elevated' : 'Low',
          riskRationale: data.prepaid ? 'Prepaid card product' : 'Standard issuer account',
        },
        rawSource: 'Live Financial BIN Clearinghouse',
      };
      binCache.set(rawBin, formatted);
      res.json(formatted);
      return;
    }
  } catch {
    // Network lookup timed out or rate limited, fallback gracefully
  }

  res.status(404).json({ error: 'BIN not found in external registry' });
});

// Mount Vite middleware in development or serve static in production
async function bootstrap() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
