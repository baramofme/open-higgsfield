import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the split-shell origin (:7860) and both IP/localhost forms so Next's
  // dev JS chunks + HMR are served instead of blocked. Without this the client
  // bundle never loads, hydration never happens, and every click is a no-op.
  // Next 16의 blockCrossSiteDEV는 **Origin 헤더의 호스트명만** allowedDevOrigins와
  // 비교한다(포트/스킴은 비교 대상이 아님 — csrf-protection.js의 hostname 문자열 일치).
  // 따라서 폰이 tailnet 매직DNS 이름(pg4-ubuntu)이나 테일넷 IP로 접근하면 발신 Origin의
  // host가 "pg4-ubuntu"/"100.72.155.4"가 되어 기본 허용목록(localhost 계열)에 못 붙고
  // 동적 import된 앱 청크가 403 "Unauthorized"으로 떨어진다 → 클라이언트 번들이 안 돌고
  // 하이드레이션이 안 되어 SSR 버튼 클릭이 전부 무반응. 맨 아래 4개가 이 케이스를 막는다.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "http://127.0.0.1:3100",
    "http://localhost:3100",
    "http://127.0.0.1:7860",
    "http://localhost:7860",
    // ── remote (phone / tailnet / LAN) origins — hostname만 매칭되므로 맨 이름으로 적는다
    "pg4-ubuntu",                 // magicDNS short name
    "pg4-ubuntu.codlet-macaroni.ts.net", // magicDNS FQDN
    "100.72.155.4",               // tailscale IPv4
    "192.168.45.82",              // LAN (wlp6s0) IPv4
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
