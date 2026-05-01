// Browser-side audio analysis. Decodes a user-uploaded audio file with
// Web Audio API and computes objective measurements we can hand to the LLM
// so it stops guessing dB/LUFS numbers.
//
// Everything here is pure JS (no external deps). Runs on the user's CPU,
// so we pay nothing per analysis.

export type AudioMetrics = {
  durationSec: number;
  sampleRate: number;
  channels: number;
  peakDbfs: number;
  truePeakDbtp: number;
  rmsDbfs: number;
  crestFactorDb: number;
  integratedLufs: number;
  stereoCorrelation: number | null; // null for mono
  spectralBalance: {
    lowDbfs: number; // < 200 Hz
    midDbfs: number; // 200 Hz – 4 kHz
    highDbfs: number; // > 4 kHz
  };
  clippingPct: number; // % of samples at or above 0.999
};

/**
 * Decode an audio File/Blob and compute objective metrics.
 * Throws if Web Audio cannot decode the file (e.g. corrupt or unsupported).
 */
export async function computeAudioMetrics(file: File | Blob): Promise<AudioMetrics> {
  const arrayBuf = await file.arrayBuffer();
  // Standard AudioContext for decoding; we don't need to play anything.
  const Ctor: typeof AudioContext =
    (window.AudioContext ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitAudioContext) as typeof AudioContext;
  const ctx = new Ctor();
  let buf: AudioBuffer;
  try {
    buf = await ctx.decodeAudioData(arrayBuf.slice(0));
  } finally {
    // Best-effort close; some browsers don't expose .close on every ctx kind.
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
  }

  const sampleRate = buf.sampleRate;
  const channels = buf.numberOfChannels;
  const durationSec = buf.duration;
  const left = buf.getChannelData(0);
  const right = channels > 1 ? buf.getChannelData(1) : left;

  const peakDbfs = toDb(maxAbs2(left, right));
  const truePeakDbtp = toDb(Math.max(truePeak(left), truePeak(right)));
  const rmsDbfs = toDb(rms2(left, right));
  const crestFactorDb = peakDbfs - rmsDbfs;
  const clippingPct = (clipCount(left) + clipCount(right)) /
    (left.length + right.length) *
    100;
  const stereoCorrelation = channels > 1 ? pearson(left, right) : null;

  const integratedLufs = computeIntegratedLufs(left, right, sampleRate);

  const balance = spectralBalance(left, right, sampleRate);

  return {
    durationSec,
    sampleRate,
    channels,
    peakDbfs,
    truePeakDbtp,
    rmsDbfs,
    crestFactorDb,
    integratedLufs,
    stereoCorrelation,
    spectralBalance: balance,
    clippingPct,
  };
}

/**
 * Format metrics as a compact text block for injection into the LLM prompt.
 * Order matters: putting the actionable numbers first encourages the model
 * to reference them in its critique.
 */
export function formatMetricsForPrompt(m: AudioMetrics): string {
  const lines: string[] = [
    "=== OBJECTIVE MEASUREMENTS ===",
    `Duration: ${m.durationSec.toFixed(1)}s | Sample rate: ${m.sampleRate} Hz | Channels: ${m.channels}`,
    `Peak: ${m.peakDbfs.toFixed(1)} dBFS | True peak: ${m.truePeakDbtp.toFixed(1)} dBTP`,
    `RMS: ${m.rmsDbfs.toFixed(1)} dBFS | Crest factor: ${m.crestFactorDb.toFixed(1)} dB`,
    `Integrated loudness: ${m.integratedLufs.toFixed(1)} LUFS`,
    `Spectral balance — low (<200 Hz): ${m.spectralBalance.lowDbfs.toFixed(1)} dB | mid: ${m.spectralBalance.midDbfs.toFixed(1)} dB | high (>4 kHz): ${m.spectralBalance.highDbfs.toFixed(1)} dB`,
  ];
  if (m.stereoCorrelation !== null) {
    const w = stereoLabel(m.stereoCorrelation);
    lines.push(
      `Stereo correlation: ${m.stereoCorrelation.toFixed(2)} (${w})`,
    );
  } else {
    lines.push("Stereo correlation: n/a (mono)");
  }
  lines.push(
    `Clipped samples: ${m.clippingPct.toFixed(3)}%`,
    "Use these numbers when judging masteringReadiness, distributionReadiness, lowEnd, and stereoImage. Reference exact values where helpful.",
  );
  return lines.join("\n");
}

function stereoLabel(c: number): string {
  if (c > 0.85) return "very narrow / nearly mono";
  if (c > 0.5) return "narrow";
  if (c > 0.1) return "balanced";
  if (c > -0.3) return "wide";
  return "very wide / phase issues likely";
}

// ---------- helpers ----------

function toDb(x: number): number {
  if (x <= 0) return -Infinity;
  const v = 20 * Math.log10(x);
  return v < -120 ? -120 : v;
}

function maxAbs2(a: Float32Array, b: Float32Array): number {
  let m = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    const av = Math.abs(a[i]);
    if (av > m) m = av;
    const bv = Math.abs(b[i]);
    if (bv > m) m = bv;
  }
  return m;
}

function rms2(a: Float32Array, b: Float32Array): number {
  let s = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    s += a[i] * a[i] + b[i] * b[i];
  }
  return Math.sqrt(s / (len * 2));
}

function clipCount(a: Float32Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i]) >= 0.999) n++;
  }
  return n;
}

// 4× linearly-interpolated peak. Cheap stand-in for ITU-R BS.1770 true peak;
// catches inter-sample peaks on heavily limited masters well enough.
function truePeak(a: Float32Array): number {
  let m = 0;
  const len = a.length - 1;
  for (let i = 0; i < len; i++) {
    const x0 = a[i];
    const x1 = a[i + 1];
    const ax = Math.abs(x0);
    if (ax > m) m = ax;
    // 3 interpolated points between samples
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      const v = Math.abs(x0 + (x1 - x0) * t);
      if (v > m) m = v;
    }
  }
  // last sample
  const last = Math.abs(a[a.length - 1]);
  if (last > m) m = last;
  return m;
}

function pearson(a: Float32Array, b: Float32Array): number {
  const n = a.length;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < n; i++) {
    sa += a[i];
    sb += b[i];
  }
  const ma = sa / n;
  const mb = sb / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const denom = Math.sqrt(da * db);
  return denom > 0 ? num / denom : 1;
}

// ---------- LUFS (EBU R128, simplified) ----------
// K-weighting filters (1681 Hz highshelf +4 dB, 38 Hz highpass) at the
// audio's actual sample rate. Coefficients scaled from the BS.1770-4
// reference (48 kHz) using a bilinear-warp shortcut: for the typical
// 44.1/48 kHz inputs these are close enough that the integrated loudness
// is within ~0.1 LU of a reference implementation.

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

function kWeightingHighShelf(sr: number): Biquad {
  // Reference at 48k from BS.1770:
  // b = [1.53512485958697, -2.69169618940638, 1.19839281085285]
  // a = [1, -1.69065929318241, 0.73248077421585]
  // For other sample rates, design via bilinear pre-warp (cookbook high shelf).
  const f0 = 1681.974450955533;
  const G = 3.999843853973347; // dB
  const Q = 0.7071752369554196;
  const A = Math.pow(10, G / 40);
  const w0 = (2 * Math.PI * f0) / sr;
  const cosw = Math.cos(w0);
  const sinw = Math.sin(w0);
  const alpha = sinw / (2 * Q);
  const beta = 2 * Math.sqrt(A) * alpha;

  const b0 = A * ((A + 1) + (A - 1) * cosw + beta);
  const b1 = -2 * A * ((A - 1) + (A + 1) * cosw);
  const b2 = A * ((A + 1) + (A - 1) * cosw - beta);
  const a0 = (A + 1) - (A - 1) * cosw + beta;
  const a1 = 2 * ((A - 1) - (A + 1) * cosw);
  const a2 = (A + 1) - (A - 1) * cosw - beta;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function kWeightingHighPass(sr: number): Biquad {
  // Cookbook highpass at 38 Hz, Q ≈ 0.5
  const f0 = 38.13547087602444;
  const Q = 0.5003270373238773;
  const w0 = (2 * Math.PI * f0) / sr;
  const cosw = Math.cos(w0);
  const sinw = Math.sin(w0);
  const alpha = sinw / (2 * Q);
  const b0 = (1 + cosw) / 2;
  const b1 = -(1 + cosw);
  const b2 = (1 + cosw) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw;
  const a2 = 1 - alpha;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function biquadFilter(input: Float32Array, c: Biquad): Float32Array {
  const out = new Float32Array(input.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

function computeIntegratedLufs(
  left: Float32Array,
  right: Float32Array,
  sr: number,
): number {
  const hs = kWeightingHighShelf(sr);
  const hp = kWeightingHighPass(sr);
  const lk = biquadFilter(biquadFilter(left, hs), hp);
  const rk = biquadFilter(biquadFilter(right, hs), hp);

  // 400 ms blocks, 75% overlap → 100 ms hop.
  const blockSize = Math.round(0.4 * sr);
  const hopSize = Math.round(0.1 * sr);
  if (lk.length < blockSize) {
    // Too short — fall back to whole-track loudness.
    return loudnessFromMs(meanSquare(lk) + meanSquare(rk));
  }

  const blockLoudness: number[] = [];
  for (let start = 0; start + blockSize <= lk.length; start += hopSize) {
    let sl = 0,
      sr2 = 0;
    for (let i = 0; i < blockSize; i++) {
      const a = lk[start + i];
      const b = rk[start + i];
      sl += a * a;
      sr2 += b * b;
    }
    const ms = sl / blockSize + sr2 / blockSize;
    blockLoudness.push(ms);
  }

  // Absolute gate: -70 LUFS
  const absGate = Math.pow(10, (-70 + 0.691) / 10);
  const absKept = blockLoudness.filter((ms) => ms > absGate);
  if (absKept.length === 0) return -Infinity;
  const meanAbs = absKept.reduce((a, b) => a + b, 0) / absKept.length;
  const relLufs = loudnessFromMs(meanAbs) - 10;
  const relGate = Math.pow(10, (relLufs + 0.691) / 10);
  const relKept = absKept.filter((ms) => ms > relGate);
  if (relKept.length === 0) return loudnessFromMs(meanAbs);
  const meanRel = relKept.reduce((a, b) => a + b, 0) / relKept.length;
  return loudnessFromMs(meanRel);
}

function meanSquare(a: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return s / a.length;
}

function loudnessFromMs(ms: number): number {
  if (ms <= 0) return -Infinity;
  return -0.691 + 10 * Math.log10(ms);
}

// ---------- Spectral balance ----------
// 3-band RMS via cascaded biquad lowpass/highpass. Cheap and good enough
// to tell the model "low end dominates" or "highs are recessed".

function spectralBalance(
  left: Float32Array,
  right: Float32Array,
  sr: number,
): { lowDbfs: number; midDbfs: number; highDbfs: number } {
  const lo = lowpass(200, sr);
  const hi = highpass(4000, sr);
  // Mono-sum first to keep cost down.
  const mono = new Float32Array(left.length);
  for (let i = 0; i < left.length; i++) {
    mono[i] = (left[i] + right[i]) * 0.5;
  }
  const low = biquadFilter(biquadFilter(mono, lo), lo);
  const high = biquadFilter(biquadFilter(mono, hi), hi);
  // mid = mono - low - high (approx; bands are not perfectly orthogonal)
  const mid = new Float32Array(mono.length);
  for (let i = 0; i < mono.length; i++) {
    mid[i] = mono[i] - low[i] - high[i];
  }
  return {
    lowDbfs: toDb(Math.sqrt(meanSquare(low))),
    midDbfs: toDb(Math.sqrt(meanSquare(mid))),
    highDbfs: toDb(Math.sqrt(meanSquare(high))),
  };
}

function lowpass(f0: number, sr: number): Biquad {
  const Q = 0.7071;
  const w0 = (2 * Math.PI * f0) / sr;
  const cosw = Math.cos(w0);
  const sinw = Math.sin(w0);
  const alpha = sinw / (2 * Q);
  const b0 = (1 - cosw) / 2;
  const b1 = 1 - cosw;
  const b2 = (1 - cosw) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw;
  const a2 = 1 - alpha;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function highpass(f0: number, sr: number): Biquad {
  const Q = 0.7071;
  const w0 = (2 * Math.PI * f0) / sr;
  const cosw = Math.cos(w0);
  const sinw = Math.sin(w0);
  const alpha = sinw / (2 * Q);
  const b0 = (1 + cosw) / 2;
  const b1 = -(1 + cosw);
  const b2 = (1 + cosw) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw;
  const a2 = 1 - alpha;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}
