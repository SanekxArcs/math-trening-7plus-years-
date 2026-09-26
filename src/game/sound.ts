/**
 * Web Audio, created lazily and resumed on demand.
 *
 * The old version built an AudioContext at module load. Browsers create one in
 * the `suspended` state until a user gesture, and nothing ever resumed it, so a
 * freshly loaded page was silent. Constructing on first play — which is always
 * inside a tap handler — and resuming defensively fixes both halves.
 */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Tone = {
  freq: number;
  to?: number;
  type: OscillatorType;
  duration: number;
  gain: number;
  delay?: number;
};

function play(tones: Tone[]) {
  const audio = context();
  if (!audio) return;

  for (const tone of tones) {
    const start = audio.currentTime + (tone.delay ?? 0);
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, start);
    if (tone.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(tone.to, start + tone.duration);
    }

    // Ramp from ~0 rather than stepping, so the attack does not click.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(start);
    osc.stop(start + tone.duration + 0.02);
  }
}

export const sounds = {
  correct: () => play([{ freq: 523.25, to: 880, type: "sine", duration: 0.28, gain: 0.09 }]),

  wrong: () =>
    play([{ freq: 180, to: 90, type: "triangle", duration: 0.32, gain: 0.08 }]),

  // Rising arpeggio, so a tier-up is audibly different from a plain correct
  // answer rather than the same sound played twice at the same instant.
  comboUp: () =>
    play([
      { freq: 523.25, type: "sine", duration: 0.12, gain: 0.07 },
      { freq: 659.25, type: "sine", duration: 0.12, gain: 0.07, delay: 0.1 },
      { freq: 783.99, type: "sine", duration: 0.2, gain: 0.08, delay: 0.2 },
    ]),

  win: () =>
    play([
      { freq: 523.25, type: "sine", duration: 0.15, gain: 0.08 },
      { freq: 659.25, type: "sine", duration: 0.15, gain: 0.08, delay: 0.13 },
      { freq: 783.99, type: "sine", duration: 0.15, gain: 0.08, delay: 0.26 },
      { freq: 1046.5, type: "sine", duration: 0.45, gain: 0.09, delay: 0.39 },
    ]),

  tick: () => play([{ freq: 1200, type: "square", duration: 0.04, gain: 0.03 }]),

  // The pets. Short and soft: they are tapped a lot.
  pat: () =>
    play([
      { freq: 660, to: 990, type: "sine", duration: 0.12, gain: 0.05 },
      { freq: 880, to: 1320, type: "sine", duration: 0.12, gain: 0.04, delay: 0.1 },
    ]),

  pop: () => play([{ freq: 400, to: 1100, type: "sine", duration: 0.1, gain: 0.07 }]),

  chomp: () =>
    play([
      { freq: 220, to: 140, type: "triangle", duration: 0.07, gain: 0.07 },
      { freq: 220, to: 140, type: "triangle", duration: 0.07, gain: 0.07, delay: 0.16 },
    ]),

  splash: () =>
    play([
      { freq: 900, to: 300, type: "sine", duration: 0.18, gain: 0.05 },
      { freq: 1200, to: 500, type: "sine", duration: 0.16, gain: 0.04, delay: 0.1 },
    ]),

  // The till for something saved up for: two bright coins landing.
  buy: () =>
    play([
      { freq: 1318.5, type: "square", duration: 0.08, gain: 0.03 },
      { freq: 1975.5, type: "square", duration: 0.3, gain: 0.03, delay: 0.08 },
    ]),
};

export type SoundName = keyof typeof sounds;

export function playSound(name: SoundName, enabled: boolean) {
  if (enabled) sounds[name]();
}
