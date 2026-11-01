import { NextRequest, NextResponse } from "next/server";

// Same-origin proxy for comfy-webui (loopback) output images.
//
// The editor loads images into a <canvas> with crossOrigin="anonymous" so it can
// call toDataURL() without tainting. From a page on localhost, a CORS-mode request
// to a loopback (private-network) resource triggers Chrome's Private Network Access
// preflight, which comfy-webui does not answer (no Access-Control-Allow-Private-Network)
// → the request is blocked (net::ERR_FAILED) and the image never appears.
//
// Serving the bytes from THIS origin (same-origin) sidesteps PNA entirely and keeps
// the canvas untainted. Only known output roots + safe image names are fetched, so
// this can't be used to reach arbitrary paths or hosts (no traversal, no SSRF).

const UPSTREAM = process.env.CFWUI_BASE_URL ?? "http://127.0.0.1:7861";

const ALLOWED_ROOTS = [
  "/mnt/nvmedata/comfy/output",
  "/mnt/ssd-work/data",
  "/mnt/hdd/ComfyUI_User",
  "/home/baramofme/ComfyUI-Shared/output",
  "/home/baramofme/comfy-webui/output",
];

const SAFE_NAME = /^[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/i;

export async function GET(request: NextRequest): Promise<Response> {
  const raw = request.nextUrl.searchParams.get("file");
  if (!raw) return NextResponse.json({ error: "missing file" }, { status: 400 });

  // searchParams.get() already percent-decodes, so `raw` is the absolute path.
  if (raw.includes("..") || !raw.startsWith("/")) return deny();
  const cut = raw.lastIndexOf("/");
  const dir = cut < 0 ? "" : raw.slice(0, cut);
  const name = cut < 0 ? raw : raw.slice(cut + 1);
  const withinRoot = ALLOWED_ROOTS.some((r) => dir === r || dir.startsWith(r + "/"));
  if (!withinRoot || !SAFE_NAME.test(name)) return deny();

  const upstream = `${UPSTREAM}/gradio_api/file=${raw}`;
  let res: Response;
  try {
    res = await fetch(upstream);
  } catch {
    return NextResponse.json({ error: "upstream unreachable" }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "upstream error", status: res.status }, { status: 502 });
  }
  const bytes = await res.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "content-type": res.headers.get("content-type") ?? "image/png",
      "cache-control": "public, max-age=86400",
    },
  });
}

function deny(): NextResponse {
  return NextResponse.json({ error: "forbidden path" }, { status: 403 });
}
