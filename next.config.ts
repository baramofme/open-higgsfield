import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the split-shell origin (:7860) and both IP/localhost forms so Next's
  // dev JS chunks + HMR are served instead of blocked. Without this the client
  // bundle never loads, hydration never happens, and every click is a no-op.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "http://127.0.0.1:3100",
    "http://localhost:3100",
    "http://127.0.0.1:7860",
    "http://localhost:7860",
  ],
  /* Next 16의 dev indicator가 화면 좌상단(20,20)에 "N Issues" 배지를 얹는다 —
     시네마 레일 최상단(뒤로 행 중심 99,31)과 그대로 겹쳐 실마우스 클릭이 배지로
     새나간다(HF 원본에는 없는 dev 전용 간섭). 레일·도크의 실클릭 수용 검수는
     이 배지가 없어야 성립하므로 indicator를 끈다. 프로덕션 빌드에는 영향 없음. */
  devIndicators: false,
  /* Outpaint ("확장 및 자르기" with AI로 채우기) re-sends the full-resolution
     source picture as a data URI through the submitOutpaint server action, and
     inpaint/reference runs do the same — a 1024² PNG is ~1.3 MB once base64'd,
     which Next's 1 MB server-action default silently rejects ("Body exceeded
     1 MB limit"), so the run never submits and never lands on the grid. Raise
     the ceiling so full-resolution images and reference frames get through. */
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
