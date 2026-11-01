"use client";

import { useEffect, useState } from "react";
import { cachedWaveformForAsset, type WaveformOptions } from "@/lib/waveform";

/* --------------------------------------------------------------------------
   use-audio-waveform — one shared hook the tile (gallery) and the asset
   showcase (viewer) both use to show a generated waveform for an audio run.

   The point of putting it in one place is that the two surfaces must agree on
   what the waveform looks like and how the bytes are fetched; two sibling
   surfaces deciding that independently is how one ends up with a tile that
   looks nothing like the hero.

   Fetch path. The app's generated audio lives on the comfy-webui loopback host
   behind `…/gradio_api/file=<abs>`. A `<audio src>` plays that raw url fine —
   plain media needs no CORS. But `cachedWaveformForAsset` fetches the bytes via
   `fetch()` to read an ArrayBuffer, and a CORS-mode read across two loopback
   origins trips Chrome's Private Network Access preflight, which comfy-webui
   does not answer → the request dies (net::ERR_FAILED) and no waveform is ever
   built. The same-origin `/api/ohf-image` proxy is what defeats PNA for images;
   its whitelist already admits the audio extensions, so we route the audio url
   through it for the byte read. Playback itself stays on the raw url. Anything
   that is not a gradio file url (blob:, data:, a real external host) is fetched
   as-is — there is no PNA to defeat there.

   Failure path. If the bytes cannot be fetched or decoded the waveform stays
   null and both surfaces fall back to the plain player that already worked — a
   tile never trades a working audio bar for a broken image. The cache keys by
   asset id, so a second open is instant.
   -------------------------------------------------------------------------- */

/** Rewrite a comfy-webui (loopback) output url to this app's same-origin proxy
    so the waveform byte-read survives PNA. Non-gradio urls pass through — there
    is no preflight to defeat on a blob, a data url, or a public host. */
export function audioFetchUrl(url: string): string {
  const marker = "/gradio_api/file=";
  const i = url.indexOf(marker);
  if (i < 0) return url;
  const path = url.slice(i + marker.length);
  if (!path.startsWith("/")) return url;
  return `/api/ohf-image?file=${encodeURIComponent(path)}`;
}

/** Tile waveform — a 4:3 image that matches the card's own ratio, so it fills
    the tile whole without cropping any bars off the edge. Lime bars on the
    card's dark ground, kept translucent so they sit behind the player without
    shouting. Mirrored about the midline, so the loud parts reach toward the top
    and bottom and silence reads as a hairline through the centre. */
export const TILE_WAVEFORM: WaveformOptions = {
  bars: 200,
  width: 320,
  height: 240,
  color: "#d1fe17",
  background: null,
  floor: 0.06,
  gap: 0.28,
  opacity: 0.85,
  pad: 8,
};

/** Showcase hero — a large, crisp image above the playback controls. Full
    opacity and a brighter fill, since here the waveform is the subject. */
export const SHOWCASE_WAVEFORM: WaveformOptions = {
  bars: 200,
  width: 720,
  height: 220,
  color: "#ddfe51",
  background: null,
  floor: 0.06,
  gap: 0.3,
  opacity: 1,
  pad: 12,
};

/** Resolve the cached waveform image for an audio run, or null when there is
    nothing to draw (not audio, no url, or the bytes failed to load). Pass a
    `kind` the caller already knows so non-audio runs never pay a fetch. */
export function useAudioWaveform(
  assetId: string | undefined,
  url: string | undefined,
  isAudio: boolean,
  options: WaveformOptions = TILE_WAVEFORM,
): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!isAudio || !assetId || !url) {
      setSrc(null);
      return;
    }
    let alive = true;
    void cachedWaveformForAsset(
      { id: assetId, url: audioFetchUrl(url) },
      options,
    ).then(
      (value) => {
        if (alive) setSrc(value);
      },
      () => {
        /* The bytes could not be fetched or decoded. Leave the image unset; the
           plain player the run already had keeps working. */
      },
    );
    return () => {
      alive = false;
    };
    // `options` is a module constant reference (TILE_/SHOWCASE_), stable by
    // construction; spreading it into deps would re-fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudio, assetId, url]);

  return src;
}
