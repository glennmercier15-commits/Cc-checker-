import { CardBrand } from './stripe';

export type CardFundingType = 'credit' | 'debit' | 'prepaid' | 'charge' | 'commercial';

export type CardTier =
  | 'Standard'
  | 'Classic'
  | 'Gold'
  | 'Platinum'
  | 'Signature'
  | 'Infinite'
  | 'World'
  | 'World Elite'
  | 'Corporate'
  | 'Business'
  | 'Centurion'
  | 'Prepaid Reloadable'
  | 'Virtual';

export interface BinDetails {
  bin: string; // 6 or 8 digits
  binLength: 6 | 8;
  brand: CardBrand;
  brandDisplayName: string;
  scheme: string;
  funding: CardFundingType;
  tier: CardTier;
  issuer: {
    name: string;
    website?: string;
    phone?: string;
    city?: string;
  };
  country: {
    name: string;
    alpha2: string;
    alpha3: string;
    flag: string;
    currency: string;
    currencySymbol: string;
    numericCode?: string;
  };
  technicalSpecs: {
    mii: number;
    miiCategory: string;
    luhnCompliant: boolean;
    durbinRegulated: boolean; // US Durbin Amendment debit fee cap
    threeDsSupported: boolean;
    level2DataEligible: boolean; // Commercial B2B interchange optimization
    level3DataEligible: boolean;
    pushToCardSupported: boolean; // Visa Direct / Mastercard Send
    contactlessSupported: boolean;
    applePayGooglePayReady: boolean;
    riskScore: 'Low' | 'Medium' | 'Elevated';
    riskRationale: string;
  };
  rawSource?: string;
}

export interface BinAnatomySegment {
  label: string;
  description: string;
  digits: string;
  colorClass: string;
}
