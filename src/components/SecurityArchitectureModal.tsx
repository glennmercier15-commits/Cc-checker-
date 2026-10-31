import React from 'react';
import {
  ShieldCheck,
  Lock,
  Server,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Zap,
} from 'lucide-react';

interface SecurityArchitectureModalProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const SecurityArchitectureModal: React.FC<SecurityArchitectureModalProps> = ({
  onClose,
  isModal = false,
}) => {
  const content = (
    <div className="space-y-6">
      {/* Intro overview */}
      <div className="p-4 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs text-indigo-200 leading-relaxed">
        <strong className="text-white font-semibold">Core Principle: </strong>
        Client-side tokenization ensures that sensitive card numbers (PAN) and CVC codes are transmitted directly from the client’s browser to Stripe’s Level 1 PCI-compliant infrastructure. Your application backend only ever touches opaque tokens (<code className="text-indigo-300">pm_...</code> or <code className="text-indigo-300">tok_...</code>), keeping your server entirely out of PCI DSS audit scope.
      </div>

      {/* Visual Pipeline Step-by-Step Flow */}
      <div>
        <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-3">
          1. The 5-Stage Tokenization Lifecycle
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 text-xs">
          {/* Step 1 */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 mb-2">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-white block mb-1">
                1. Customer Entry
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                User enters cardholder name, PAN, exp, and CVC into a secure client interface.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-indigo-400 font-mono">
              Client Browser
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-300 mb-2">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-white block mb-1">
                2. Direct Tokenize
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Browser POSTs raw card data directly to Stripe API over TLS 1.3 using Publishable Key.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-indigo-400 font-mono">
              api.stripe.com
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-300 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-white block mb-1">
                3. Token Issued
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Stripe vaults the card and returns a non-reversible token (<code className="text-indigo-300">pm_1...</code>).
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 font-mono">
              PCI Vault
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 mb-2">
                <Server className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-white block mb-1">
                4. Token Hand-off
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Browser submits only the <code className="text-indigo-300">pm_...</code> ID to your backend server application.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
              Your App Server
            </div>
          </div>

          {/* Step 5 */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-300 mb-2">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-white block mb-1">
                5. Server Charge
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Your server confirms the PaymentIntent with Stripe using Secret Key (<code className="text-amber-300">sk_...</code>).
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-cyan-400 font-mono">
              Server-to-Server
            </div>
          </div>
        </div>
      </div>

      {/* PCI-DSS Scope Comparison: SAQ A vs SAQ D */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-900 border border-emerald-900/40 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>SAQ A Compliance (Recommended)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            When all card data is tokenized on the client via Stripe.js or direct tokenization:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 pl-2 list-disc list-inside">
            <li>Only ~22 security requirements to attest.</li>
            <li>No periodic expensive third-party vulnerability scans.</li>
            <li>Zero PAN or CVC data stored or transmitted by your database.</li>
            <li>Annual self-assessment questionnaire takes under 1 hour.</li>
          </ul>
        </div>

        <div className="p-4 bg-slate-900 border border-rose-900/40 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
            <AlertOctagon className="w-4 h-4" />
            <span>SAQ D Liability (Anti-Pattern)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            If your server ever receives or proxies raw card numbers before sending to Stripe:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 pl-2 list-disc list-inside">
            <li>Mandatory compliance with 300+ rigorous PCI controls.</li>
            <li>Quarterly ASV network penetration scans.</li>
            <li>Severe financial fines if data breach occurs ($5k - $100k/mo).</li>
            <li>Requires expensive QSA audits and hardware HSM isolation.</li>
          </ul>
        </div>
      </div>

      {/* Defending Against Automated Card Testing (Card Cracking) */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <h3 className="text-xs uppercase font-semibold text-slate-300 tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Card Testing & Fraud Prevention Safeguards (OWASP OAT-010)</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Fraudsters frequently use bot scripts to test stolen card lists against payment gateways. Legitimate applications must implement these safeguards:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="font-semibold text-slate-200 block mb-1">
              Rate Limiting & Velocity
            </span>
            <p className="text-slate-400 text-[11px]">
              Throttle checkout endpoint requests per IP, subnet, session, and fingerprint. Block bursts of declined attempts.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="font-semibold text-slate-200 block mb-1">
              CAPTCHA / Bot Protection
            </span>
            <p className="text-slate-400 text-[11px]">
              Trigger Cloudflare Turnstile or reCAPTCHA v3 on payment submission to weed out headless automation scripts.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="font-semibold text-slate-200 block mb-1">
              Stripe Radar & 3DS (SCA)
            </span>
            <p className="text-slate-400 text-[11px]">
              Enable Stripe Radar machine learning to block elevated risk scores and force 3D Secure biometric/SMS verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/BackgroundEraser_20261021_013404677_810e2d2a.png"
                alt="Mr. Nice Guy"
                className="w-10 h-10 object-contain drop-shadow-md select-none"
              />
              <div>
                <h2 className="text-base font-bold text-white">
                  PCI-DSS Compliance & Security Architecture
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  How modern tokenization eliminates sensitive cardholder data from your infrastructure.
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1 pr-1">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <img
          src="/assets/aistudio/BackgroundEraser_20261021_013404677_810e2d2a.png"
          alt="Mr. Nice Guy"
          className="w-10 h-10 object-contain drop-shadow-md select-none"
        />
        <div>
          <h2 className="text-base font-bold text-white">
            PCI-DSS Compliance & Security Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            How modern tokenization eliminates sensitive cardholder data from your infrastructure.
          </p>
        </div>
      </div>
      {content}
    </div>
  );
};
