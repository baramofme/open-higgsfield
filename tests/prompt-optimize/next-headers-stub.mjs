// Stub for `next/headers`. The action under test never calls cookies(), so
// only import-time resolution matters; throwing here proves an accidental call.
export async function cookies() {
  throw new Error("cookies() is not available outside a Next request");
}
export async function headers() {
  throw new Error("headers() is not available outside a Next request");
}
