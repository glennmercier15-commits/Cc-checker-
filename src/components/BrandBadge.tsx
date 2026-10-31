import React from 'react';
import { CardBrand } from '../types/stripe';

interface BrandBadgeProps {
  brand: CardBrand;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandBadge: React.FC<BrandBadgeProps> = ({ brand, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-7 text-[9px]',
    md: 'h-6 w-9 text-[10px]',
    lg: 'h-8 w-12 text-xs',
  };

  switch (brand) {
    case 'visa':
      return (
        <div
          className={`flex items-center justify-center font-extrabold italic tracking-tighter text-blue-400 bg-blue-950/60 border border-blue-800/60 rounded px-1.5 font-sans select-none ${sizeClasses[size]} ${className}`}
        >
          VISA
        </div>
      );
    case 'mastercard':
      return (
        <div
          className={`flex items-center justify-center -space-x-1.5 bg-slate-900 border border-slate-700 rounded px-1.5 select-none ${sizeClasses[size]} ${className}`}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-red-500 opacity-90 shadow-sm" />
          <div className="w-3.5 h-3.5 rounded-full bg-amber-400 opacity-90 shadow-sm" />
        </div>
      );
    case 'amex':
      return (
        <div
          className={`flex items-center justify-center font-bold tracking-tight text-cyan-300 bg-cyan-950/70 border border-cyan-700/70 rounded px-1 select-none ${sizeClasses[size]} ${className}`}
        >
          AMEX
        </div>
      );
    case 'discover':
      return (
        <div
          className={`flex items-center justify-center font-bold text-white bg-slate-900 border border-orange-500/60 rounded px-1 text-[8px] select-none ${sizeClasses[size]} ${className}`}
        >
          <span>DIS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mx-0.5 inline-block" />
          <span>C</span>
        </div>
      );
    case 'jcb':
      return (
        <div
          className={`flex items-center justify-center font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 rounded px-1 text-[9px] select-none ${sizeClasses[size]} ${className}`}
        >
          JCB
        </div>
      );
    case 'diners':
      return (
        <div
          className={`flex items-center justify-center font-semibold text-slate-300 bg-slate-900 border border-slate-700 rounded px-1 text-[8px] tracking-tighter select-none ${sizeClasses[size]} ${className}`}
        >
          DINERS
        </div>
      );
    case 'unionpay':
      return (
        <div
          className={`flex items-center justify-center font-semibold text-red-300 bg-red-950/70 border border-red-800 rounded px-1 text-[8px] select-none ${sizeClasses[size]} ${className}`}
        >
          UNION
        </div>
      );
    default:
      return null;
  }
};
