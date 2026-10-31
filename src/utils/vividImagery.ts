/**
 * Vivid imagery and technical logging generator for Live and Dead card transactions
 * Adheres to:
 * - Live: Shoot fireworks, celebratory party energy, brightness, sound, victory.
 * - Dead: Bomb blow up, shockwave, smoke, sudden collapse of funds, wreckage.
 * - Format: One line of technical data followed by one sentence of vivid imagery.
 */

import { CardBrand, StripeApiError, StripeLegacyTokenResponse, StripePaymentMethodResponse } from '../types/stripe';

export interface VividLogEntry {
  id: string;
  status: 'live' | 'dead';
  cardNumber: string;
  brand: CardBrand;
  last4: string;
  technicalData: string;
  vividImagery: string;
  durationMs: number;
  timestamp: number;
}

const LIVE_FIREWORKS_IMAGERY = [
  "🎆 Radiant violet and gold peony fireworks detonate across the midnight sky with a thunderous celebratory crackle as the card authorizes with pure victory.",
  "✨ An incandescent cascade of emerald starbursts and crackling willow sparks rains down upon the ledger in an ecstatic celebration of approved funds.",
  "🎆 Blinding crimson and sapphire aerial shells explode in rapid succession, shaking the arena with jubilant cheers as the token seals the hit.",
  "🎇 Shimmering golden comets shoot into the stratosphere and burst into a dazzling canopy of glitter, filling the air with the festive roar of a triumphant checkout.",
  "🎆 A magnificent grand-finale barrage of neon fireworks illuminates the entire horizon with deafening festive booms as the payment method locks in live.",
  "✨ Prismatic star-shells streak upward and erupt into shimmering rings of electric cyan, igniting the atmosphere with untamed party energy.",
  "🎆 A stadium-rattling volley of glittering fireworks bursts in synchronized glory, bathing the gateway in brilliant victory light."
];

const DEAD_BOMB_IMAGERY = [
  "💣 A concussive high-explosive shockwave obliterates the authorization terminal in a blinding fireball, billowing thick black smoke as the transaction dies on impact.",
  "💥 An ear-splitting detonation rips through the payment pipeline, sending fiery shrapnel scattering into the abyss as funds collapse into utter ruin.",
  "💣 A catastrophic blast crater replaces the gateway as a mushroom cloud of scorched acrid smoke curls upward from the violently rejected charge.",
  "💥 The issuer slams the iron blast doors shut and detonates the perimeter charges, reducing the authorization attempt to smoldering metallic debris.",
  "💣 A deafening sonic bomb blasts the connection to ash, leaving only scorched silicon and the echoing wreckage of a thoroughly dead card.",
  "💥 A ferocious explosion tears the transaction into charred ribbons, sending shockwaves through the ledger while red emergency alarms blare in the smoke.",
  "💣 The charge implodes with devastating violence, collapsing inward before detonating in a shockwave of red sparks and extinguished hope."
];

let liveIndex = 0;
let deadIndex = 0;

/**
 * Generates technical data line and vivid imagery sentence for Live (successful) cards
 */
export function generateLiveImagery(params: {
  cardNumber: string;
  brand: CardBrand;
  last4: string;
  durationMs: number;
  data: StripePaymentMethodResponse | StripeLegacyTokenResponse;
}): { technicalData: string; vividImagery: string } {
  const isPaymentMethod = params.data.object === 'payment_method';
  const id = params.data.id;
  const brandUpper = params.brand.toUpperCase();
  const cvcCheck = isPaymentMethod
    ? (params.data as StripePaymentMethodResponse).card?.checks?.cvc_check || 'pass'
    : 'pass';
  const zipCheck = isPaymentMethod
    ? (params.data as StripePaymentMethodResponse).card?.checks?.address_postal_code_check || 'pass'
    : 'pass';

  const technicalData = `[LIVE - HTTP 200 OK] ID: ${id} | BRAND: ${brandUpper} | LAST4: ${params.last4} | CHECKS: [CVC=${cvcCheck.toUpperCase()}, ZIP=${zipCheck.toUpperCase()}] | LATENCY: ${params.durationMs}ms`;

  const vividImagery = LIVE_FIREWORKS_IMAGERY[liveIndex % LIVE_FIREWORKS_IMAGERY.length];
  liveIndex++;

  return { technicalData, vividImagery };
}

/**
 * Generates technical data line and vivid imagery sentence for Dead (declined / error) cards
 */
export function generateDeadImagery(params: {
  cardNumber: string;
  brand: CardBrand;
  last4: string;
  durationMs: number;
  error: StripeApiError;
}): { technicalData: string; vividImagery: string } {
  const code = params.error.code || 'card_declined';
  const declineCode = params.error.decline_code || 'generic_decline';
  const param = params.error.param ? ` | PARAM: ${params.error.param}` : '';
  const message = params.error.message ? ` | MSG: "${params.error.message.slice(0, 40)}..."` : '';

  const technicalData = `[DEAD - HTTP 402 DECLINE] CODE: ${code} | REASON: ${declineCode}${param} | LAST4: ${params.last4} | LATENCY: ${params.durationMs}ms${message}`;

  const vividImagery = DEAD_BOMB_IMAGERY[deadIndex % DEAD_BOMB_IMAGERY.length];
  deadIndex++;

  return { technicalData, vividImagery };
}

/**
 * Plays Web Audio synthesized sound effect (fireworks or explosion) without external media files
 */
export function playSynthesizedSound(type: 'firework' | 'bomb'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'firework') {
      // Ascending whistle + celebratory pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.18);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else {
      // Sub-bass detonation rumble + noise blast
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.4);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.48);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noise.stop(ctx.currentTime + 0.5);
    }
  } catch {
    // Audio synthesis is non-blocking and safe to fail silently
  }
}
