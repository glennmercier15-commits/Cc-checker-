import { CardBrand, StripeApiError, StripeLegacyTokenResponse, StripePaymentMethodResponse } from './stripe';

export interface BulkCardInput {
  id: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  cardholderName?: string;
  postalCode?: string;
  country?: string;
  rawSourceText?: string;
}

export type BulkCardStatus = 'pending' | 'processing' | 'live' | 'dead';

export interface BulkCardResult {
  id: string;
  card: BulkCardInput;
  brand: CardBrand;
  status: BulkCardStatus;
  technicalData?: string;
  vividImagery?: string;
  durationMs?: number;
  rawResponse?: StripePaymentMethodResponse | StripeLegacyTokenResponse | null;
  rawError?: StripeApiError | null;
  timestamp?: number;
}
