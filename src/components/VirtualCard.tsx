import React from 'react';
import { CardBrand } from '../types/stripe';
import { Wifi } from 'lucide-react';

interface VirtualCardProps {
  cardNumber: string;
  cardholderName: string;
  expMonth: string;
  expYear: string;
  brand: CardBrand;
  cvc: string;
  isFlipped?: boolean;
  isExpired?: boolean;
}

export const VirtualCard: React.FC<VirtualCardProps> = ({
  cardNumber,
  cardholderName,
  expMonth,
  expYear,
  brand,
  cvc,
  isExpired = false,
}) => {
  // Format card number with dots for missing digits
  const rawClean = cardNumber.replace(/\D/g, '');
  const isAmex = brand === 'amex';
  const targetLength = isAmex ? 15 : 16;

  let displayNum = '';
  if (isAmex) {
    const p1 = (rawClean.slice(0, 4) || '••••').padEnd(4, '•');
    const p2 = (rawClean.slice(4, 10) || '••••••').padEnd(6, '•');
    const p3 = (rawClean.slice(10, 15) || '•••••').padEnd(5, '•');
    displayNum = `${p1} ${p2} ${p3}`;
  } else {
    const p1 = (rawClean.slice(0, 4) || '••••').padEnd(4, '•');
    const p2 = (rawClean.slice(4, 8) || '••••').padEnd(4, '•');
    const p3 = (rawClean.slice(8, 12) || '••••').padEnd(4, '•');
    const p4 = (rawClean.slice(12, 16) || '••••').padEnd(4, '•');
    displayNum = `${p1} ${p2} ${p3} ${p4}`;
  }

  const formattedExp = `${(expMonth || 'MM').padStart(2, '0')} / ${expYear ? expYear.slice(-2) : 'YY'}`;
  const displayName = cardholderName.trim() ? cardholderName.toUpperCase() : 'CARDHOLDER NAME';

  // Gradient themes per brand
  const getBrandStyling = () => {
    switch (brand) {
      case 'visa':
        return {
          gradient: 'from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/30',
          accent: 'text-indigo-400',
        };
      case 'mastercard':
        return {
          gradient: 'from-slate-900 via-stone-900 to-amber-950/40 border-amber-600/30',
          accent: 'text-amber-400',
        };
      case 'amex':
        return {
          gradient: 'from-zinc-900 via-slate-900 to-cyan-950/40 border-cyan-500/30',
          accent: 'text-cyan-400',
        };
      case 'discover':
        return {
          gradient: 'from-slate-900 via-orange-950/40 to-slate-900 border-orange-500/30',
          accent: 'text-orange-400',
        };
      default:
        return {
          gradient: 'from-slate-900 via-slate-800 to-slate-950 border-slate-700/60',
          accent: 'text-slate-400',
        };
    }
  };

  const brandStyle = getBrandStyling();

  return (
    <div className="relative w-full max-w-[390px] h-[230px] rounded-2xl p-6 bg-gradient-to-br shadow-2xl border flex flex-col justify-between overflow-hidden select-none transition-all duration-300 transform-gpu hover:scale-[1.01] hover:border-amber-500/50 hover:shadow-amber-500/10 text-white">
      {/* Background card texture highlights reflecting Mr. Nice Guy logo */}
      <div className={`absolute inset-0 bg-gradient-to-br ${brandStyle.gradient} -z-10`} />
      <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -top-16 w-56 h-56 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />
      {/* Background card watermark */}
      <img
        src="/assets/aistudio/BackgroundEraser_20261021_013404677_810e2d2a.png"
        alt=""
        aria-hidden="true"
        className="absolute -right-6 -bottom-6 w-36 h-36 object-contain opacity-15 pointer-events-none select-none filter contrast-125"
      />

      {/* Top row: Chip, Contactless icon, Mr. Nice Guy Insignia & Brand logo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Metallic EMV Chip */}
          <div className="w-12 h-9 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full border border-yellow-800/50 rounded grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5 bg-yellow-400/30">
              <div className="border border-yellow-900/40 rounded-sm" />
              <div className="border border-yellow-900/40 rounded-sm" />
              <div className="border border-yellow-900/40 rounded-sm" />
              <div className="border border-yellow-900/40 rounded-sm" />
            </div>
          </div>
          {/* Contactless waves */}
          <Wifi className="w-5 h-5 text-slate-400 rotate-90 opacity-80" />
          {/* Mr. Nice Guy Card Insignia */}
          <img
            src="/assets/aistudio/BackgroundEraser_20261021_013404677_810e2d2a.png"
            alt="Mr. Nice Guy Insignia"
            className="h-8 w-auto object-contain opacity-95 drop-shadow-md select-none"
          />
        </div>

        {/* Card Brand Badge */}
        <div className="h-8 flex items-center justify-end">
          {brand === 'visa' && (
            <span className="font-extrabold italic text-2xl tracking-tighter text-blue-400 font-sans">
              VISA
            </span>
          )}
          {brand === 'mastercard' && (
            <div className="flex items-center -space-x-2.5">
              <div className="w-6 h-6 rounded-full bg-red-500 opacity-90 shadow" />
              <div className="w-6 h-6 rounded-full bg-amber-400 opacity-90 shadow" />
            </div>
          )}
          {brand === 'amex' && (
            <div className="px-2 py-0.5 border border-cyan-400/60 rounded bg-cyan-950/60 text-cyan-300 font-bold text-xs tracking-wider">
              AMEX
            </div>
          )}
          {brand === 'discover' && (
            <div className="flex items-center">
              <span className="font-bold text-sm tracking-wide text-white">DISC</span>
              <span className="w-3.5 h-3.5 rounded-full bg-orange-500 inline-block mx-0.5" />
              <span className="font-bold text-sm tracking-wide text-white">VER</span>
            </div>
          )}
          {brand === 'diners' && (
            <span className="font-bold text-xs tracking-widest text-slate-300">DINERS CLUB</span>
          )}
          {brand === 'jcb' && (
            <span className="font-extrabold text-sm tracking-wider text-emerald-400">JCB</span>
          )}
          {brand === 'unknown' && (
            <span className="text-xs font-mono tracking-widest text-slate-400">PAYMENT CARD</span>
          )}
        </div>
      </div>

      {/* Middle row: Card Number */}
      <div className="my-auto pt-3">
        <p className="font-mono text-xl sm:text-[22px] tracking-[0.16em] font-medium text-slate-100 tabular-nums drop-shadow-sm">
          {displayNum}
        </p>
      </div>

      {/* Bottom row: Cardholder Name, Expiration & Security Tag */}
      <div className="flex items-end justify-between text-xs">
        <div className="max-w-[190px]">
          <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">
            Cardholder
          </span>
          <p className="font-mono text-xs tracking-wider text-slate-200 font-medium truncate">
            {displayName}
          </p>
        </div>

        <div className="text-right">
          <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">
            Expires
          </span>
          <div className="flex items-center justify-end gap-1">
            <p
              className={`font-mono text-xs tracking-wider font-medium tabular-nums ${
                isExpired ? 'text-rose-400 font-bold' : 'text-slate-200'
              }`}
            >
              {formattedExp}
            </p>
            {isExpired && (
              <span className="text-[8px] uppercase tracking-wider font-semibold text-rose-400">
                (EXPIRED)
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">
            CVV
          </span>
          <p className="font-mono text-xs tracking-wider text-slate-300 font-medium tabular-nums">
            {cvc ? (cvc.length > 2 ? '•••' : cvc) : '•••'}
          </p>
        </div>
      </div>
    </div>
  );
};
