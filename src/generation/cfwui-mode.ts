/** When CFWUI_BASE_URL is set the studio runs against the local comfy-webui
 *  backend: unauthenticated LAN mode, so no API key cookie is required.
 *  Lives outside "use server" files — plain sync helper. */
export function isCfwuiMode(): boolean {
  return Boolean(process.env.CFWUI_BASE_URL);
}

/** Model ids that run on the local backend instead of the Higgsfield cloud.
 *  Dispatch is per-model: everything else keeps the cloud client even when
 *  CFWUI_BASE_URL is set. */
const LOCAL_MODEL_IDS = new Set([
  "krea-2-turbo",
  "ltx-2.5-local",
  "minimax-h3-local",
  "minimax-music-3-local",
]);

export function isLocalModel(modelId: string): boolean {
  return isCfwuiMode() && LOCAL_MODEL_IDS.has(modelId);
}

/** Task ids minted by comfy-webui carry a family prefix — `img_task` for the
 *  image module, `ltx2_5_task` and `h3_task` for the two video modules — and
 *  cloud request ids never do, so status fan-out routes on the id alone. */
export function isCfwuiTaskId(requestId: string): boolean {
  return (
    requestId.startsWith("img_task") ||
    requestId.startsWith("ltx2_5_task") ||
    requestId.startsWith("h3_task") ||
    /* A finished audio run carries its result inside an `audio:done:` request id
       minted at submit (no async task id exists for the audio endpoint), so the
       fan-out must route that family to the cfwui client too. */
    requestId.startsWith("audio:")
  );
}
