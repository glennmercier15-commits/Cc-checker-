import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ArrowRight,
  Search,
} from 'lucide-react';
import { STRIPE_TEST_CARDS } from '../data/testCards';
import { TestCardScenario } from '../types/stripe';
import { getBrandDisplayName } from '../utils/cardUtils';

interface TestCardPickerProps {
  onSelectCard: (scenario: TestCardScenario) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const TestCardPicker: React.FC<TestCardPickerProps> = ({
  onSelectCard,
  onClose,
  isModal = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    'All',
    'Standard Success',
    '3D Secure (SCA)',
    'Declines & Errors',
    'Fraud & Radar',
  ];

  const filteredCards = STRIPE_TEST_CARDS.filter((card) => {
    const matchesCategory =
      selectedCategory === 'All' || card.category === selectedCategory;
    const matchesQuery =
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.number.includes(searchQuery) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Standard Success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case '3D Secure (SCA)':
        return <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Declines & Errors':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'Fraud & Radar':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <CreditCard className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const content = (
    <div className="space-y-4">
      {/* Header with Search and Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search test cards, bin numbers, or decline codes..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Categories as clean interactive button tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-900/90 border border-slate-800 rounded-lg">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Test Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
        {filteredCards.map((card) => (
          <div
            key={card.id}
            className="p-4 bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  {getCategoryIcon(card.category)}
                  <span>{card.title}</span>
                </div>
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  {getBrandDisplayName(card.brand)}
                </span>
              </div>

              <div className="p-2 bg-slate-950 border border-slate-800/80 rounded-lg font-mono text-xs text-indigo-300 font-semibold tracking-wider mb-2 flex items-center justify-between">
                <span>{card.number}</span>
                <span className="text-slate-400 text-[10px] font-normal">
                  {card.expMonth}/{card.expYear} · CVC {card.cvc}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                {card.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                {card.expectedOutcome}
              </span>
              <button
                onClick={() => {
                  onSelectCard(card);
                  if (onClose) onClose();
                }}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <span>Load Card</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {filteredCards.length === 0 && (
          <div className="col-span-full py-8 text-center text-xs text-slate-400">
            No test cards found matching &quot;{searchQuery}&quot;.
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Official Stripe Test Card Library
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select any test card to test tokenization, 3D Secure verification, declines, or Radar triggers.
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-white">
          Official Stripe Test Card Library
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Stripe provides standardized test cards to verify checkout workflows, 3D Secure challenges, issuer declines, and fraud rules.
        </p>
      </div>
      {content}
    </div>
  );
};
