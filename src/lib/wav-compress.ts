/**
 * Pure-JS WAV preprocessor for the song-analysis route.
 *
 * Audio LLMs cap inline audio around ~20 MB base64. A 50 MB stereo 44.1 kHz
 * WAV is way past that. Rather than ship ffmpeg in a serverless bundle,
 * we read the PCM directly: take a representative window, downmix to mono,
 * downsample to 22.05 kHz, and re-emit a tiny 16-bit WAV.
 *
 * Supported input: 8/16/24/32-bit integer PCM and 32-bit float PCM
 * RIFF/WAVE files (i.e. anything Suno/Udio/most DAWs export).
 */

const TARGET_SAMPLE_RATE = 22050;
const WINDOW_SECONDS = 90;
const SKIP_INTRO_SECONDS = 20;

type WavInfo = {
  audioFormat: number; // 1 = PCM int, 3 = IEEE float
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
  dataOffset: number;
  dataLength: number;
};

function parseWavHeader(buf: Buffer): WavInfo {
  if (buf.length < 44) throw new Error("WAV too small to be valid");
  if (buf.toString("ascii", 0, 4) !== "RIFF") throw new Error("Not a RIFF file");
  if (buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("Not a WAVE file");

  let offset = 12;
  let fmt: WavInfo | null = null;
  let dataOffset = -1;
  let dataLength = -1;

  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const bodyStart = offset + 8;
    if (id === "fmt ") {
      if (size < 16) throw new Error("fmt chunk too small");
      fmt = {
        audioFormat: buf.readUInt16LE(bodyStart),
        numChannels: buf.readUInt16LE(bodyStart + 2),
        sampleRate: buf.readUInt32LE(bodyStart + 4),
        bitsPerSample: buf.readUInt16LE(bodyStart + 14),
        dataOffset: -1,
        dataLength: -1,
      };
    } else if (id === "data") {
      dataOffset = bodyStart;
      dataLength = size;
      break; // we have what we need
    }
    // Chunks are word-aligned; pad odd sizes by 1.
    offset = bodyStart + size + (size % 2);
  }

  if (!fmt) throw new Error("Missing fmt chunk");
  if (dataOffset < 0) throw new Error("Missing data chunk");
  fmt.dataOffset = dataOffset;
  fmt.dataLength = Math.min(dataLength, buf.length - dataOffset);
  return fmt;
}

/** Read one sample from PCM data and return it normalized to [-1, 1]. */
function readSample(
  buf: Buffer,
  byteOffset: number,
  bitsPerSample: number,
  audioFormat: number,
): number {
  if (audioFormat === 3) {
    if (bitsPerSample === 32) return buf.readFloatLE(byteOffset);
    if (bitsPerSample === 64) return buf.readDoubleLE(byteOffset);
    throw new Error(`Unsupported float bit depth: ${bitsPerSample}`);
  }
  // PCM int
  if (bitsPerSample === 8) {
    // 8-bit WAV is unsigned (0..255, midpoint 128).
    return (buf.readUInt8(byteOffset) - 128) / 128;
  }
  if (bitsPerSample === 16) {
    return buf.readInt16LE(byteOffset) / 32768;
  }
  if (bitsPerSample === 24) {
    const b0 = buf.readUInt8(byteOffset);
    const b1 = buf.readUInt8(byteOffset + 1);
    const b2 = buf.readInt8(byteOffset + 2);
    const v = (b2 << 16) | (b1 << 8) | b0;
    return v / 8388608;
  }
  if (bitsPerSample === 32) {
    return buf.readInt32LE(byteOffset) / 2147483648;
  }
  throw new Error(`Unsupported bit depth: ${bitsPerSample}`);
}

function buildPcmWav(samples16: Int16Array, sampleRate: number): Buffer {
  const dataBytes = samples16.byteLength;
  const out = Buffer.alloc(44 + dataBytes);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36 + dataBytes, 4);
  out.write("WAVE", 8, "ascii");
  out.write("fmt ", 12, "ascii");
  out.writeUInt32LE(16, 16); // fmt chunk size
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(1, 22); // mono
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(sampleRate * 2, 28); // byte rate (mono * 16-bit = 2 bytes/sample)
  out.writeUInt16LE(2, 32); // block align
  out.writeUInt16LE(16, 34); // bits per sample
  out.write("data", 36, "ascii");
  out.writeUInt32LE(dataBytes, 40);
  Buffer.from(
    samples16.buffer,
    samples16.byteOffset,
    samples16.byteLength,
  ).copy(out, 44);
  return out;
}

/**
 * Take a large WAV buffer and return a small mono 22050 Hz 16-bit WAV
 * containing a representative window of the song. Roughly 10-25x smaller
 * than the original.
 */
export function compressWavForAnalysis(input: Buffer): {
  wav: Buffer;
  durationSec: number;
  originalSampleRate: number;
  originalChannels: number;
} {
  const info = parseWavHeader(input);
  const bytesPerSample = info.bitsPerSample / 8;
  const frameBytes = bytesPerSample * info.numChannels;
  const totalFrames = Math.floor(info.dataLength / frameBytes);
  const totalDuration = totalFrames / info.sampleRate;

  // Pick window: start ~20s in (skip silence/intro) but not past 50% of song.
  const startSec = Math.min(SKIP_INTRO_SECONDS, totalDuration * 0.5);
  const windowSec = Math.min(WINDOW_SECONDS, Math.max(15, totalDuration - startSec));
  const startFrame = Math.floor(startSec * info.sampleRate);
  const endFrame = Math.min(
    totalFrames,
    startFrame + Math.floor(windowSec * info.sampleRate),
  );

  const ratio = info.sampleRate / TARGET_SAMPLE_RATE;
  const outFrames = Math.floor((endFrame - startFrame) / ratio);
  const out = new Int16Array(outFrames);

  for (let i = 0; i < outFrames; i++) {
    const srcFrame = startFrame + Math.floor(i * ratio);
    const byteOffset = info.dataOffset + srcFrame * frameBytes;
    // Downmix to mono by averaging channels.
    let sum = 0;
    for (let c = 0; c < info.numChannels; c++) {
      sum += readSample(
        input,
        byteOffset + c * bytesPerSample,
        info.bitsPerSample,
        info.audioFormat,
      );
    }
    const mono = sum / info.numChannels;
    // Clamp & convert to 16-bit signed.
    const clamped = Math.max(-1, Math.min(1, mono));
    out[i] = Math.round(clamped * 32767);
  }

  return {
    wav: buildPcmWav(out, TARGET_SAMPLE_RATE),
    durationSec: outFrames / TARGET_SAMPLE_RATE,
    originalSampleRate: info.sampleRate,
    originalChannels: info.numChannels,
  };
}
