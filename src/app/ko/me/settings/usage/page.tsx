import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { UsageScreen } from "@/openhiggsfield/usage-screen";

import "@/openhiggsfield/tokens.css";
import "@/openhiggsfield/openhiggsfield.css";
/* 이식 전용 Tier-3 로컬 토큰 파일 — 형제 핫스팟(openhiggsfield.css 꼬리)을
   건드리지 않고 라우트에서 직접 import한다. */
import "@/openhiggsfield/settings-usage.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ohf-inter",
  display: "swap",
});

/* HF 실측문서 제목은 "사용량 • Higgsfield" — OHF 템플릿은 "%s — OpenHiggsfield"
   를 쓴다(의도된 DOC-DIFF, 라우트별 문자열만 미러). */
export const metadata: Metadata = {
  title: "사용량",
  alternates: { canonical: "/ko/me/settings/usage" },
};

export default function UsagePage() {
  return <UsageScreen fontClassName={inter.variable} />;
}
