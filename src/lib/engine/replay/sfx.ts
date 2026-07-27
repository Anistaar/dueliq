/**
 * DuelIQ — Synthetic SFX via Web Audio API
 * All sounds are 100% synthesized (oscillators + noise) — zero Riot assets, CC0-safe.
 * Muted by default on mobile (autoplay policy), toggle via setMuted().
 */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
}
export function getMuted(): boolean {
  return muted;
}

/** Auto-detect mobile and mute by default */
export function initSfx() {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  muted = isMobile;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function master(ac: AudioContext, vol = 0.12): GainNode {
  const g = ac.createGain();
  g.gain.value = vol;
  g.connect(ac.destination);
  return g;
}

function ramp(param: AudioParam, from: number, to: number, start: number, dur: number) {
  param.setValueAtTime(from, start);
  param.linearRampToValueAtTime(to, start + dur);
}

// ── Footstep (move event) ──────────────────────────────────────────────────
// Short thud: noise burst with low-pass filter
export function playSfxStep() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const g = master(ac, 0.08);

  const buf = ac.createBuffer(1, ac.sampleRate * 0.04, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buf;

  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 180;
  lp.Q.value = 0.5;

  src.connect(lp);
  lp.connect(g);
  src.start(t);

  // Small body osc
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(60, t);
  osc.frequency.linearRampToValueAtTime(30, t + 0.04);
  const og = ac.createGain();
  ramp(og.gain, 0.25, 0, t, 0.05);
  osc.connect(og); og.connect(g);
  osc.start(t); osc.stop(t + 0.06);
}

// ── Util deploy (smoke / molly appears) ───────────────────────────────────
// Soft whoosh: bandpass noise
export function playSfxUtil() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const g = master(ac, 0.12);

  const buf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buf;

  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 800;
  bp.Q.value = 0.8;

  const envG = ac.createGain();
  ramp(envG.gain, 0, 0.6, t, 0.05);
  ramp(envG.gain, 0.6, 0, t + 0.05, 0.25);

  src.connect(bp); bp.connect(envG); envG.connect(g);
  src.start(t);
}

// ── Kill impact ────────────────────────────────────────────────────────────
// Dry punch: attack noise + low sine thump
export function playSfxKill() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const g = master(ac, 0.18);

  // Noise attack
  const buf = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  src.connect(lp); lp.connect(g);
  src.start(t);

  // Thump
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
  const og = ac.createGain();
  ramp(og.gain, 0.5, 0, t, 0.12);
  osc.connect(og); og.connect(g);
  osc.start(t); osc.stop(t + 0.14);
}

// ── Spike plant (double-tone beep) ─────────────────────────────────────────
export function playSfxPlant() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const g = master(ac, 0.14);

  [[0, 660, 0.08], [0.10, 880, 0.1]].forEach(([delay, freq, dur]) => {
    const osc = ac.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq as number;
    const og = ac.createGain();
    og.gain.setValueAtTime(0, t + (delay as number));
    og.gain.linearRampToValueAtTime(0.35, t + (delay as number) + 0.005);
    og.gain.linearRampToValueAtTime(0, t + (delay as number) + (dur as number));
    osc.connect(og); og.connect(g);
    osc.start(t + (delay as number));
    osc.stop(t + (delay as number) + (dur as number) + 0.01);
  });
}

// ── Freeze sting (tension chord) ──────────────────────────────────────────
// White flash accompaniment: minor 7th brief chord + noise cut
export function playSfxFreeze() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const g = master(ac, 0.15);

  // Noise burst (white flash feel)
  const buf = ac.createBuffer(1, ac.sampleRate * 0.06, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3000;
  src.connect(hp); hp.connect(g);
  src.start(t);

  // Tension tones: 440 + 523 (minor 3rd)
  [440, 523, 349].forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const og = ac.createGain();
    og.gain.setValueAtTime(0, t + i * 0.01);
    og.gain.linearRampToValueAtTime(0.12, t + i * 0.01 + 0.02);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(og); og.connect(g);
    osc.start(t + i * 0.01);
    osc.stop(t + 0.4);
  });
}

// ── Grade stinger ──────────────────────────────────────────────────────────
// S = rising major chord; X = descending diminished
export function playSfxGrade(grade: "S" | "A" | "C" | "X") {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const g = master(ac, 0.16);

  if (grade === "S") {
    // Victory: C4 E4 G4 arpeggio up
    [261, 329, 392, 523].forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const og = ac.createGain();
      og.gain.setValueAtTime(0, t + i * 0.07);
      og.gain.linearRampToValueAtTime(0.3, t + i * 0.07 + 0.02);
      og.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.22);
      osc.connect(og); og.connect(g);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.25);
    });
  } else if (grade === "A") {
    // Positive: G4 B4
    [392, 493].forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const og = ac.createGain();
      og.gain.setValueAtTime(0, t + i * 0.06);
      og.gain.linearRampToValueAtTime(0.25, t + i * 0.06 + 0.02);
      og.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.2);
      osc.connect(og); og.connect(g);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.22);
    });
  } else if (grade === "C") {
    // Warning: low D minor
    [294, 349].forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const og = ac.createGain();
      og.gain.setValueAtTime(0, t + i * 0.05);
      og.gain.linearRampToValueAtTime(0.15, t + i * 0.05 + 0.02);
      og.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.25);
      osc.connect(og); og.connect(g);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.28);
    });
  } else {
    // X = mistake: diminished drop
    [440, 415, 370, 311].forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const og = ac.createGain();
      og.gain.setValueAtTime(0.2, t + i * 0.05);
      og.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.18);
      osc.connect(og); og.connect(g);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.2);
    });
  }
}

// ── Timer tick (last 5s) ───────────────────────────────────────────────────
export function playSfxTick() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const g = master(ac, 0.06);
  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.value = 1200;
  const og = ac.createGain();
  og.gain.setValueAtTime(0.4, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(og); og.connect(g);
  osc.start(t); osc.stop(t + 0.05);
}
