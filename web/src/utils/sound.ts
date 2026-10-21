// Subtle tactical UI sounds, synthesized with Web Audio: short tone blips and filtered noise
// bursts, so there are no sound files to ship or license. The volume comes from the
// inventory:uisound convar (0 turns sounds off); nothing is created until the first sound plays,
// and the audio engine is suspended whenever it has been quiet for a moment, so idle costs nothing.

export type SoundName =
  | 'open'
  | 'close'
  | 'hover'
  | 'toggle'
  | 'pickup'
  | 'drop'
  | 'cancel'
  | 'use'
  | 'add'
  | 'pay'
  | 'error';

let volume = 0.5;
let context: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

// longer than any sound (the open sweep is about 250 ms), so nothing is cut off
const IDLE_SUSPEND_MS = 2000;

// the hover tick fires on every slot the cursor crosses; keep it from chattering
const MIN_GAP: Partial<Record<SoundName, number>> = { hover: 45, toggle: 30 };
const lastPlayed: Partial<Record<SoundName, number>> = {};

export const setSoundVolume = (value: number) => {
  volume = Math.max(0, Math.min(1, value));
  if (master) master.gain.value = volume;
};

const getContext = () => {
  if (volume <= 0) return null;

  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = volume;
    master.connect(context.destination);

    noiseBuffer = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  // suspended while idle (and, in a browser, until the first click or key press); sounds
  // scheduled now start as soon as it resumes
  if (context.state === 'suspended') context.resume();

  return context;
};

// stop the audio thread once everything has finished playing; the next sound wakes it
const scheduleSuspend = () => {
  clearTimeout(idleTimer);
  // not gated on state === 'running': a resume that is still settling would skip the suspend and
  // leave the thread on; suspend calls queue behind it, and suspending a suspended context is a no-op
  idleTimer = setTimeout(() => {
    if (context && context.state !== 'closed') context.suspend();
  }, IDLE_SUSPEND_MS);
};

// A gain stage that snaps open and decays away; every sound is built from these.
const envelope = (ctx: AudioContext, start: number, duration: number, peak: number) => {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  gain.connect(master!);
  return gain;
};

interface Blip {
  from: number;
  to?: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
  delay?: number;
}

const blip = (ctx: AudioContext, { from, to = from, duration, gain, type = 'triangle', delay = 0 }: Blip) => {
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
  oscillator.connect(envelope(ctx, start, duration, gain));
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
};

interface Burst {
  duration: number;
  gain: number;
  filter: BiquadFilterType;
  from: number;
  to?: number;
  q?: number;
  delay?: number;
}

const burst = (ctx: AudioContext, { duration, gain, filter, from, to = from, q = 1, delay = 0 }: Burst) => {
  const start = ctx.currentTime + delay;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  const biquad = ctx.createBiquadFilter();
  biquad.type = filter;
  biquad.Q.value = q;
  biquad.frequency.setValueAtTime(from, start);
  if (to !== from) biquad.frequency.exponentialRampToValueAtTime(to, start + duration);

  source.connect(biquad);
  biquad.connect(envelope(ctx, start, duration, gain));
  source.start(start);
  source.stop(start + duration + 0.02);
};

const SOUNDS: Record<SoundName, (ctx: AudioContext) => void> = {
  // a filtered sweep up over a low thump, then a small lock-in tick
  open: (ctx) => {
    burst(ctx, { duration: 0.22, gain: 0.16, filter: 'bandpass', from: 400, to: 3000, q: 1.2 });
    blip(ctx, { from: 140, to: 90, duration: 0.12, gain: 0.3, type: 'sine' });
    blip(ctx, { from: 2400, duration: 0.02, gain: 0.06, delay: 0.2 });
  },
  close: (ctx) => {
    burst(ctx, { duration: 0.18, gain: 0.12, filter: 'bandpass', from: 3000, to: 400, q: 1.2 });
    blip(ctx, { from: 1800, duration: 0.02, gain: 0.05 });
  },
  hover: (ctx) => blip(ctx, { from: 3200, to: 2800, duration: 0.018, gain: 0.035, type: 'sine' }),
  toggle: (ctx) => {
    burst(ctx, { duration: 0.015, gain: 0.1, filter: 'highpass', from: 4000 });
    blip(ctx, { from: 1600, to: 1400, duration: 0.03, gain: 0.1 });
  },
  // rising: the item lifts off the tile
  pickup: (ctx) => {
    burst(ctx, { duration: 0.03, gain: 0.2, filter: 'bandpass', from: 2500, q: 2 });
    blip(ctx, { from: 900, to: 1400, duration: 0.04, gain: 0.1 });
  },
  // a dull mechanical clack: low thump plus a short mid click
  drop: (ctx) => {
    blip(ctx, { from: 220, to: 120, duration: 0.08, gain: 0.3, type: 'sine' });
    burst(ctx, { duration: 0.04, gain: 0.24, filter: 'bandpass', from: 1800, q: 1.5 });
  },
  cancel: (ctx) => blip(ctx, { from: 700, to: 400, duration: 0.07, gain: 0.08 }),
  use: (ctx) => {
    blip(ctx, { from: 880, duration: 0.05, gain: 0.12 });
    blip(ctx, { from: 1320, duration: 0.07, gain: 0.12, delay: 0.06 });
  },
  add: (ctx) => {
    burst(ctx, { duration: 0.02, gain: 0.16, filter: 'highpass', from: 3000 });
    blip(ctx, { from: 1500, to: 1700, duration: 0.05, gain: 0.1 });
  },
  // three rising steps: confirmed
  pay: (ctx) => {
    burst(ctx, { duration: 0.02, gain: 0.14, filter: 'highpass', from: 3000 });
    blip(ctx, { from: 660, duration: 0.06, gain: 0.11 });
    blip(ctx, { from: 990, duration: 0.06, gain: 0.11, delay: 0.07 });
    blip(ctx, { from: 1320, duration: 0.1, gain: 0.11, delay: 0.14 });
  },
  // two low muted buzzes
  error: (ctx) => {
    blip(ctx, { from: 150, to: 130, duration: 0.07, gain: 0.05, type: 'square' });
    blip(ctx, { from: 150, to: 130, duration: 0.07, gain: 0.05, type: 'square', delay: 0.09 });
  },
};

export const playSound = (name: SoundName) => {
  const gap = MIN_GAP[name];
  const now = performance.now();
  if (gap && now - (lastPlayed[name] ?? -Infinity) < gap) return;
  lastPlayed[name] = now;

  try {
    const ctx = getContext();
    if (!ctx) return;

    SOUNDS[name](ctx);
    scheduleSuspend();
  } catch {
    // no audio device or Web Audio unavailable: stay silent
  }
};
