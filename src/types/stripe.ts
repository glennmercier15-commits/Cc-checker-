export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'diners'
  | 'jcb'
  | 'unionpay'
  | 'unknown';

export type TokenType = 'payment_method' | 'token';

export interface CardChecks {
  address_line1_check: string | null;
  address_postal_code_check: 'pass' | 'fail' | 'unavailable' | 'unchecked';
  cvc_check: 'pass' | 'fail' | 'unavailable' | 'unchecked';
}

export interface StripeCardDetails {
  brand: CardBrand;
  checks: CardChecks;
  country: string;
  exp_month: number;
  exp_year: number;
  fingerprint: string;
  funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
  generated_from: null | string;
  last4: string;
  three_d_secure_usage?: {
    supported: boolean;
  };
  wallet: null | string;
}

export interface StripeBillingDetails {
  address: {
    city: string | null;
    country: string | null;
    line1: string | null;
    line2: string | null;
    postal_code: string | null;
    state: string | null;
  };
  email: string | null;
  name: string | null;
  phone: string | null;
}

export interface StripePaymentMethodResponse {
  id: string; // e.g. pm_1Op...
  object: 'payment_method';
  billing_details: StripeBillingDetails;
  card: StripeCardDetails;
  created: number;
  customer: string | null;
  livemode: boolean;
  type: 'card';
  metadata?: Record<string, string>;
}

export interface StripePaymentIntentResponse {
  id: string; // e.g. pi_1Op...
  object: 'payment_intent';
  amount: number;
  amount_received: number;
  currency: string;
  client_secret: string;
  confirmation_method: 'automatic' | 'manual';
  created: number;
  livemode: boolean;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  payment_method?: string | StripePaymentMethodResponse;
  last_payment_error?: StripeApiError | null;
  cancellation_reason?: string | null;
  metadata?: Record<string, string>;
}

export interface BillingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface StripeLegacyTokenResponse {
  id: string; // e.g. tok_1Op...
  object: 'token';
  card: StripeCardDetails & {
    id: string;
    object: 'card';
    name: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_zip: string | null;
    address_country?: string | null;
  };
  client_ip: string;
  created: number;
  livemode: boolean;
  type: 'card';
  used: boolean;
}

export interface StripeApiError {
  type: string; // 'card_error', 'invalid_request_error', 'authentication_error'
  code?: string; // 'card_declined', 'expired_card', 'incorrect_cvc', etc.
  message: string;
  param?: string;
  decline_code?: string;
}

export interface TokenizationFormValues {
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
  publishableKey: string;
  useLiveStripeApi: boolean;
}

export interface TokenizationHistoryItem {
  id: string;
  tokenId: string;
  tokenType: TokenType;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  createdAt: number;
  cardholderName: string;
  status: 'succeeded' | 'declined' | 'requires_action' | 'error';
  rawResponse?: StripePaymentMethodResponse | StripeLegacyTokenResponse | null;
  rawError?: StripeApiError | null;
  mode: 'simulator' | 'live_api';
}

export interface TestCardScenario {
  id: string;
  title: string;
  category: 'Standard Success' | '3D Secure (SCA)' | 'Declines & Errors' | 'Fraud & Radar';
  number: string;
  brand: CardBrand;
  expMonth: string;
  expYear: string;
  cvc: string;
  postalCode: string;
  expectedOutcome: string;
  description: string;
  riskAssessment?: 'normal' | 'elevated' | 'highest' | 'declined';
  triggerOutcome?: 'succeeded' | 'declined' | 'requires_action' | 'card_error';
  declineCode?: string;
}
