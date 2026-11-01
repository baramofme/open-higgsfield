/**
 * Rewrite a comfy-webui (loopback) output URL into this app's same-origin image
 * proxy, so the editor can load it into a canvas without tripping Chrome's Private
 * Network Access preflight and without tainting the canvas.
 *
 * `http(s)://<host>/gradio_api/file=<abs path>` → `/api/ohf-image?file=<abs path>`
 * data: URLs and plain external URLs are returned unchanged.
 */
export function toProxyImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  const marker = "/gradio_api/file=";
  const i = url.indexOf(marker);
  if (i < 0) return url;
  const path = url.slice(i + marker.length);
  if (!path.startsWith("/")) return url;
  return `/api/ohf-image?file=${encodeURIComponent(path)}`;
}
