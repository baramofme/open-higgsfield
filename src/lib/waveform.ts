/* Waveform image generator — a reusable utility that turns any audio asset into
   a static image (SVG, or PNG in the browser) suitable for use as a tile
   background or icon.

   The whole point of this module is that the rendering half is pure: peaks →
   SVG string needs no DOM, no canvas, no AudioContext, so the same code runs on
   the server, in a worker, and in the browser, and the result is a plain string
   that caches right next to the asset's metadata. The decoding half is the part
   that touches the environment; it resolves an AudioBuffer to mono PCM samples
   using whichever decoder is available, and falls back to a built-in pure-TS
   WAV parser when there is no AudioContext (server and tests) so the pipeline is
   still exercisable headless.

   Pipeline: source → decode → downmix mono → peak-pick at a fixed bar count →
   render an SVG path of mirrored bars → encode as a data-URL. */

import type { Kv } from "@/openhiggsfield/idb";
import { defaultKv } from "@/openhiggsfield/idb";

/* ------------------------------------------------------------------ types --- */

/** Where the audio is coming from. A URL is fetched; the rest are read locally.
    `string` covers both http(s) and `blob:` object URLs. */
export type AudioSource = string | ArrayBuffer | ArrayBufferView | Blob;

/** Mono PCM samples plus the rate they were captured at — the shape every
    downstream stage works on, decoupled from how it was decoded. */
export type MonoAudio = {
  samples: Float32Array;
  sampleRate: number;
  /** Seconds, derived from samples / sampleRate. */
  durationSec: number;
};

export type WaveformMode = "peak" | "rms";

export type WaveformOptions = {
  /** Number of bars across the image. Defaults to 200. The bar count is the
      image's horizontal resolution — longer tracks just get a wider analysis
      window per bar, they never get more bars, so cost stays flat. */
  bars?: number;
  /** How a bar's height is measured. "peak" takes the loudest sample in the
      window (punchy, standard); "rms" takes the power (smoother, good for a
      soft background texture). Defaults to "peak". */
  mode?: WaveformMode;
  /** SVG canvas width in user units. Defaults to 200, one per bar. */
  width?: number;
  /** SVG canvas height in user units. Defaults to `bars`, so a tall thumbnail
      reads as tall bars. */
  height?: number;
  /** Bar fill colour. Defaults to a muted blue-grey that sits well behind text. */
  color?: string;
  /** Background colour, or null for transparent so the image layers over any
      card. Defaults to transparent. */
  background?: string | null;
  /** Minimum bar height as a fraction of the half-height, so a silent stretch
      still shows a hairline instead of collapsing to nothing. Defaults to 0.06. */
  floor?: number;
  /** Fraction of each bar's cell left empty as a gap between neighbours.
      Defaults to 0.3. */
  gap?: number;
  /** Whole-image opacity, handy when the waveform is a subtle backdrop rather
      than a foreground icon. Defaults to 1. */
  opacity?: number;
  /** Vertical padding inside the canvas so the loudest bar doesn't kiss the
      edges. Defaults to 4. */
  pad?: number;
};

const DEFAULTS = {
  bars: 200,
  mode: "peak" as WaveformMode,
  width: 200,
  height: 200,
  color: "#3a5a78",
  background: null as string | null,
  floor: 0.06,
  gap: 0.3,
  opacity: 1,
  pad: 4,
};

/* -------------------------------------------------------- amplitude peaks --- */

/** Reduce an AudioBuffer's channels to a single mono Float32Array by averaging.
    Accepts a bare mono Float32Array (returned as-is), an array of per-channel
    arrays, or an AudioBuffer-shaped object (numberOfChannels + getChannelData).
    Mono passes through untouched. */
export function toMono(
  source:
    | Float32Array
    | Float32Array[]
    | { numberOfChannels: number; length: number; getChannelData: (c: number) => Float32Array },
): Float32Array {
  if (source instanceof Float32Array) return source; // already mono
  if (Array.isArray(source)) {
    if (source.length === 1) return source[0]!;
    return averageChannels(source);
  }
  if (source.numberOfChannels === 1) return source.getChannelData(0);
  const channels: Float32Array[] = [];
  for (let c = 0; c < source.numberOfChannels; c++) channels.push(source.getChannelData(c));
  return averageChannels(channels);
}

function averageChannels(channels: Float32Array[]): Float32Array {
  const length = channels.reduce((longest, ch) => Math.max(longest, ch.length), 0);
  const out = new Float32Array(length);
  // Sum every channel into `out`, then divide by the channel count. Reading a
  // shorter channel past its length yields undefined, so guard the index.
  for (let i = 0; i < length; i++) {
    let sum = 0;
    let count = 0;
    for (const ch of channels) {
      if (i < ch.length) {
        sum += ch[i]!;
        count++;
      }
    }
    out[i] = count > 0 ? sum / count : 0;
  }
  return out;
}

/** Peak-pick (or rms) a mono signal into `bars` normalised 0..1 amplitudes.
    One linear pass over the samples — O(n) — so a five-minute track costs no
    more per bar than a one-second clip. */
export function computePeaks(samples: Float32Array, bars: number, mode: WaveformMode = "peak"): number[] {
  const count = Math.max(1, Math.floor(bars));
  const result = new Array<number>(count);
  const n = samples.length;
  if (n === 0) {
    result.fill(0);
    return result;
  }
  // Analysis window per bar. At least 1 sample; never let the last bars fall
  // off the end by making the window cover the array evenly.
  const windowSize = Math.max(1, Math.floor(n / count));

  // First pass: raw bar energy + track the global max for normalisation.
  let globalMax = 0;
  for (let b = 0; b < count; b++) {
    // Centre the window within its bar's slice so bars align with the audio
    // rather than drifting; the first bar starts at 0, the last ends at n.
    const start = Math.min(n - 1, Math.round((b * n) / count));
    const end = b === count - 1 ? n : Math.min(n, start + windowSize);
    let energy = 0;
    if (mode === "rms") {
      let sumSq = 0;
      for (let i = start; i < end; i++) {
        const s = samples[i]!;
        sumSq += s * s;
      }
      energy = end > start ? Math.sqrt(sumSq / (end - start)) : 0;
    } else {
      for (let i = start; i < end; i++) {
        const abs = Math.abs(samples[i]!);
        if (abs > energy) energy = abs;
      }
    }
    result[b] = energy;
    if (energy > globalMax) globalMax = energy;
  }

  // Normalise so the loudest bar reaches full height. A totally silent signal
  // leaves globalMax at 0 — leave every bar at 0 rather than divide by zero.
  if (globalMax > 0) {
    for (let b = 0; b < count; b++) result[b] = result[b]! / globalMax;
  }
  return result;
}

/* ----------------------------------------------------------- render to SVG --- */

/** Turn peaks into an SVG string of mirrored vertical bars. Pure — no canvas,
    no DOM — so it runs anywhere and the output is a cacheable string. The
    string is valid standalone SVG (with xmlns) and also safe to inline. */
export function renderWaveformSvg(peaks: number[], options: WaveformOptions = {}): string {
  const opts = { ...DEFAULTS, ...options };
  const bars = peaks.length;
  // Fall back to the option's bar count when peaks came in empty.
  const count = bars > 0 ? bars : opts.bars;
  const width = opts.width ?? opts.bars;
  const height = opts.height ?? opts.bars;
  const pad = Math.max(0, Math.min(opts.pad, height / 2));
  const midline = height / 2;
  const halfMax = Math.max(1, midline - pad);

  const cell = width / count;
  const barWidth = Math.max(0.5, cell * (1 - opts.gap));

  const rects: string[] = [];
  for (let b = 0; b < bars; b++) {
    const peak = Math.max(opts.floor, Math.min(1, peaks[b]!));
    const barHalf = peak * halfMax;
    const x = b * cell + (cell - barWidth) / 2;
    const y = midline - barHalf;
    const h = barHalf * 2;
    rects.push(
      `<rect x="${round(x)}" y="${round(y)}" width="${round(barWidth)}" height="${round(h)}" rx="${round(Math.min(barWidth / 2, 1))}"/>`,
    );
  }

  const bg = opts.background ? `<rect width="100%" height="100%" fill="${escapeAttr(opts.background)}"/>` : "";
  const opacity = opts.opacity !== 1 ? ` opacity="${round(opts.opacity)}"` : "";
  const body = rects.join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(width)} ${round(height)}" ` +
    `preserveAspectRatio="none" shape-rendering="crispEdges">` +
    bg +
    `<g fill="${escapeAttr(opts.color)}"${opacity}>${body}</g>` +
    `</svg>`
  );
}

/** Round to 3 decimals — enough precision for pixel geometry, short enough to
    keep the encoded SVG small. */
function round(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

/** Minimal attribute escaping: quotes and ampersands. Colours reaching here are
    user-supplied CSS values, not markup, so this is a safety net. */
function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------- data-URL ------ */

/** Encode an SVG string as a `data:image/svg+xml` URL. Percent-encodes the few
    characters that break a CSS `url("...")` value (`# < > "`) rather than
    base64-ing the whole thing, which keeps the string short and debuggable and
    lets it drop straight into a `background-image`. */
export function svgToDataUrl(svg: string): string {
  const encoded = svg
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/"/g, "%22");
  return `data:image/svg+xml,${encoded}`;
}

/* -------------------------------------------------------------- decoding ----- */

/** Resolve any AudioSource to raw bytes. Fetches URLs, reads Blob/File and
    buffer-likes without touching the network. */
export async function readAudioBytes(source: AudioSource): Promise<ArrayBuffer> {
  if (typeof source === "string") {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`audio fetch failed: ${response.status} ${response.url}`);
    return await response.arrayBuffer();
  }
  if (source instanceof ArrayBuffer) return source;
  if (isBlob(source)) return await source.arrayBuffer();
  // ArrayBufferView (Uint8Array, etc.) — copy its covered range into a fresh
  // ArrayBuffer. Slicing through a Uint8Array guarantees a plain ArrayBuffer
  // rather than a SharedArrayBuffer, which the return type does not allow.
  return new Uint8Array(source.buffer, source.byteOffset, source.byteLength).slice().buffer;
}

/** Type guard that keeps the Blob branch narrowable: once a Blob has been ruled
    out the leftover is an ArrayBufferView, which carries `buffer`/`byteOffset`.
    Guards the runtime too, since some environments lack a global Blob. */
function isBlob(value: ArrayBufferView | Blob): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

/** Decode raw audio bytes to mono PCM. Uses the browser's AudioContext when one
    exists (covers mp3/ogg/aac/m4a/etc.), otherwise falls back to the built-in
    pure-TS WAV parser so the path still works headless. Throws if neither can
    read the bytes. */
export async function decodeToMono(bytes: ArrayBuffer): Promise<MonoAudio> {
  // WAV is cheap to parse and needs no AudioContext, so try it first: generated
  // audio in this app is often WAV, and headless tests run this branch.
  const wav = parseWav(bytes);
  if (wav) return wav;

  if (typeof AudioContext !== "undefined" || typeof (globalThis as { webkitAudioContext?: unknown }).webkitAudioContext !== "undefined") {
    const Ctor = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext });
    const AudioCtor = Ctor.AudioContext ?? Ctor.webkitAudioContext;
    if (AudioCtor) {
      // A plain AudioContext decodes any compressed format (mp3/ogg/aac/m4a).
      // decodeAudioData runs whether or not the context has been resumed, so a
      // suspended context still decodes a long track without grabbing the
      // audio device. The buffer we hand over is a copy so the context can own
      // its bytes.
      const ctx = new AudioCtor();
      try {
        const buffer = await ctx.decodeAudioData(bytes.slice(0));
        const samples = toMono(buffer);
        return { samples, sampleRate: buffer.sampleRate, durationSec: buffer.duration };
      } finally {
        void ctx.close();
      }
    }
  }

  throw new Error(
    "audio decode failed: no AudioContext available and the bytes are not a parsable WAV " +
      "(compressed formats need the browser's Web Audio decoder)",
  );
}

/* A tiny synchronous WAV reader. Covers PCM (16-bit int) and IEEE float (32-
   bit), mono and stereo, which is all this app generates locally and enough to
   exercise the render pipeline without an AudioContext. Returns null for
   anything it cannot read (a mp3, say) so the caller can try another decoder. */
export function parseWav(bytes: ArrayBuffer): MonoAudio | null {
  const view = new DataView(bytes);
  const MIN = 12;
  if (bytes.byteLength < MIN) return null;
  if (str(view, 0) !== "RIFF" || str(view, 8) !== "WAVE") return null;

  // Walk the chunk list looking for "fmt " and "data".
  let pos = 12;
  let format = -1; // 1 = PCM int, 3 = IEEE float
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let dataOffset = -1;
  let dataLength = 0;

  while (pos + 8 <= bytes.byteLength) {
    const id = str(view, pos);
    const size = view.getUint32(pos + 4, true);
    const body = pos + 8;
    if (id === "fmt ") {
      if (body + 16 > bytes.byteLength) return null;
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      // byteRate at body+8; blockAlign at body+12; bits at body+14.
      bits = view.getUint16(body + 14, true);
    } else if (id === "data") {
      dataOffset = body;
      dataLength = Math.min(size, bytes.byteLength - body);
    }
    // Chunks are word-aligned; advance past the body plus its padding byte.
    pos = body + size + (size % 2);
    if (dataOffset >= 0 && format > 0 && pos >= bytes.byteLength) break;
  }

  if (dataOffset < 0 || channels <= 0 || sampleRate <= 0 || bits <= 0) return null;
  if (format !== 1 && format !== 3) return null; // only int PCM and float PCM

  const blockAlign = (bits / 8) * channels;
  if (blockAlign <= 0 || dataLength < blockAlign) return null;
  const frameCount = Math.floor(dataLength / blockAlign);
  if (frameCount <= 0) return null;

  // Read interleaved samples and downmix to mono as we go — one pass, no
  // intermediate per-channel arrays.
  const mono = new Float32Array(frameCount);
  const bytesPerSample = bits / 8;
  for (let f = 0; f < frameCount; f++) {
    const frameStart = dataOffset + f * blockAlign;
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      const sampleStart = frameStart + c * bytesPerSample;
      if (sampleStart + bytesPerSample > bytes.byteLength) break;
      sum += readSample(view, sampleStart, format, bits);
    }
    mono[f] = sum / channels;
  }
  return { samples: mono, sampleRate, durationSec: frameCount / sampleRate };
}

function readSample(view: DataView, offset: number, format: number, bits: number): number {
  if (format === 3) {
    // IEEE float: 32-bit (f32) or 64-bit (f64).
    if (bits === 32) return view.getFloat32(offset, true);
    if (bits === 64) return view.getFloat64(offset, true);
    return 0;
  }
  // Integer PCM. Normalise to -1..1 by the signed range for the bit depth.
  if (bits === 16) return view.getInt16(offset, true) / 32768;
  if (bits === 8) return (view.getUint8(offset) - 128) / 128; // unsigned 8-bit
  if (bits === 24) {
    const b0 = view.getUint8(offset);
    const b1 = view.getUint8(offset + 1);
    const b2 = view.getUint8(offset + 2);
    let value = (b2 << 16) | (b1 << 8) | b0;
    if (value & 0x800000) value -= 0x1000000; // sign-extend
    return value / 8388608;
  }
  if (bits === 32) return view.getInt32(offset, true) / 2147483648;
  return 0;
}

function str(view: DataView, offset: number): string {
  return String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
}

/* ------------------------------------------------------- one-call helpers --- */

/** Full pipeline from any AudioSource to a plain SVG string. Decodes, downmixes,
    picks peaks, renders. This is the entry point most callers want. */
export async function waveformSvg(source: AudioSource, options: WaveformOptions = {}): Promise<string> {
  const bytes = await readAudioBytes(source);
  const audio = await decodeToMono(bytes);
  const bars = options.bars ?? DEFAULTS.bars;
  const peaks = computePeaks(audio.samples, bars, options.mode ?? DEFAULTS.mode);
  return renderWaveformSvg(peaks, { bars, ...options });
}

/** Same as `waveformSvg` but encoded as a data-URL, ready for CSS or an <img>. */
export async function waveformDataUrl(source: AudioSource, options: WaveformOptions = {}): Promise<string> {
  return svgToDataUrl(await waveformSvg(source, options));
}

/** PNG export. Browser-only: it needs an OffscreenCanvas (or a 2D canvas), so
    on the server this throws — use the SVG path there. Renders the same bars
    onto a canvas and hands back a Blob. */
export async function waveformPng(source: AudioSource, options: WaveformOptions = {}): Promise<Blob> {
  const bytes = await readAudioBytes(source);
  const audio = await decodeToMono(bytes);
  const bars = options.bars ?? DEFAULTS.bars;
  const peaks = computePeaks(audio.samples, bars, options.mode ?? DEFAULTS.mode);
  return renderPeaksToPng(peaks, options);
}

async function renderPeaksToPng(peaks: number[], options: WaveformOptions): Promise<Blob> {
  const opts = { ...DEFAULTS, ...options };
  const width = Math.max(1, Math.round(opts.width ?? opts.bars));
  const height = Math.max(1, Math.round(opts.height ?? opts.bars));
  const canvas: OffscreenCanvas | HTMLCanvasElement | null = createCanvas(width, height);
  if (!canvas) throw new Error("waveformPng needs a canvas, and none is available in this environment");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error("failed to acquire a 2d canvas context");

  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
  }
  const bars = peaks.length;
  const cell = width / bars;
  const barWidth = Math.max(1, cell * (1 - opts.gap));
  const midline = height / 2;
  const halfMax = Math.max(1, midline - opts.pad);
  ctx.fillStyle = opts.color;
  ctx.globalAlpha = opts.opacity;
  for (let b = 0; b < bars; b++) {
    const peak = Math.max(opts.floor, Math.min(1, peaks[b]!));
    const barHalf = peak * halfMax;
    const x = b * cell + (cell - barWidth) / 2;
    ctx.fillRect(x, midline - barHalf, barWidth, barHalf * 2);
  }

  if (canvas instanceof OffscreenCanvas) return canvas.convertToBlob({ type: "image/png" });
  return await new Promise<Blob>((resolve, reject) =>
    (canvas as HTMLCanvasElement).toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas toBlob returned null"))), "image/png"),
  );
}

function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement | null {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  if (typeof document !== "undefined") {
    const el = document.createElement("canvas");
    el.width = width;
    el.height = height;
    return el;
  }
  return null;
}

/* --------------------------------------------------------------- caching ----- */

/* Cache key namespace. A waveform lives next to its asset, keyed by the asset's
   own id so the image survives as long as the asset does. */
const CACHE_PREFIX = "waveform.v1:";

/** Compute a waveform once and cache it in a Kv store keyed by `assetId`, so a
    tile or popover can fetch it without re-decoding the audio every render. If
    a cached value exists it is returned as-is; otherwise the SVG is generated,
    stored, and returned. Returns a data-URL by default since that is what a CSS
    background consumes. */
export async function cachedWaveformForAsset(
  asset: { id: string; url: string },
  options: WaveformOptions & { kv?: Kv; asDataUrl?: boolean } = {},
): Promise<string> {
  const kv = options.kv ?? defaultKv();
  const key = CACHE_PREFIX + asset.id;
  const hit = await kv.get<string>(key);
  if (hit) return hit;
  const svg = await waveformSvg(asset.url, options);
  const value = options.asDataUrl === false ? svg : svgToDataUrl(svg);
  await kv.set(key, value);
  return value;
}

/** Drop the cached waveform for an asset (e.g. when the asset is deleted). */
export async function invalidateWaveform(assetId: string, kv: Kv = defaultKv()): Promise<void> {
  await kv.set(CACHE_PREFIX + assetId, null);
}
