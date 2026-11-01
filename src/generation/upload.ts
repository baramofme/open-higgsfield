/**
 * Self-hosted media intake: files become base64 data URIs instead of Vercel
 * Blob URLs. comfy-webui's semantic API accepts data URIs directly
 * (_parse_image_param), so no upload service or public URL is needed.
 */
export async function uploadMedia(file: File): Promise<{ url: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Chunked binary string: one huge String.fromCharCode args list can throw
  // on range limits for large files.
  let binary = "";
  const CHUNK = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  const base64 = btoa(binary);
  const mime = file.type || "application/octet-stream";
  return { url: `data:${mime};base64,${base64}` };
}
