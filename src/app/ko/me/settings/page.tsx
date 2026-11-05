import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { SettingsScreen } from "@/openhiggsfield/settings-screen";

import "@/openhiggsfield/tokens.css";
import "@/openhiggsfield/openhiggsfield.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ohf-inter",
  display: "swap",
});

/* HF 실측문서 제목은 "계정 설정 • Higgsfield" — OHF 템플릿은 "%s — OpenHiggsfield"
   를 쓴다(의도된 DOC-DIFF, 라우트별 문자열만 미러). */
export const metadata: Metadata = {
  title: "계정 설정",
  alternates: { canonical: "/ko/me/settings" },
};

export default function AccountSettingsPage() {
  return <SettingsScreen fontClassName={inter.variable} />;
}
