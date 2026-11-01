/**
 * Rewrite a comfy-webui (loopback) output URL into this app's same-origin image
 * proxy, so the editor can load it into a canvas without tripping Chrome's Private
 * Network Access preflight and without tainting the canvas.
 *
 * `http(s)://<host>/gradio_api/file=<abs path>` → `/api/ohf-image?file=<abs path>`
 * data: URLs and plain external URLs are returned unchanged.
 */
/* Media kinds that are NOT still images. The proxy exists to defeat Chrome's
   Private Network Access preflight and canvas taint for STILL IMAGES loaded into
   a <canvas>; video and audio never enter that canvas path, and the proxy's
   file whitelist (/api/ohf-image SAFE_NAME) rejects their extensions outright —
   so routing a video/audio url through the proxy returns HTTP 403 and the
   preview element shows a broken image. Those urls load fine as a plain
   (non-CORS, no-preflight) cross-origin load straight from the upstream, so we
   hand back the raw url unchanged for anything that isn't an image. */
const NON_IMAGE_EXT = /\.(mp4|webm|mov|mkv|m4v|avi|mp3|wav|flac|ogg|m4a)$/i;

export function toProxyImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  const marker = "/gradio_api/file=";
  const i = url.indexOf(marker);
  if (i < 0) return url;
  const path = url.slice(i + marker.length);
  if (!path.startsWith("/")) return url;
  /* Non-image media: skip the image proxy, return the upstream url so the
     <video>/<audio> loads directly (no 403, no PNA preflight for plain media). */
  if (NON_IMAGE_EXT.test(path)) return url;
  return `/api/ohf-image?file=${encodeURIComponent(path)}`;
}
