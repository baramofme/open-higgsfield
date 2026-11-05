import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { OpenHiggsfieldApp } from "@/openhiggsfield/openhiggsfield-app";

import "@/openhiggsfield/tokens.css";
import "@/openhiggsfield/openhiggsfield.css";
import "@/openhiggsfield/reference-film.css";

/* t_2afe2cd0 — HF public 프로필(/@handle)의 정적 미러 라우트.
   루트와 같은 폰트· 같은 앱; 본문을 ProfileScreen으로 대체한다.
   타이틀은 HF와 동자: "Higgsfield의 @<handle>"(guest 실측 타이틀 형식). */

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ohf-inter",
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `Higgsfield의 @${handle}`,
    /* HF의 description은 사용자별(자기소개 문구). guest 수확에선 소개가 빈
       문자열이었다 → 소개가 없는 계정의 빈 description을 미러한다. */
    description: "",
  };
}

export default async function ProfileRoute({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return <OpenHiggsfieldApp fontClassName={inter.variable} profileHandle={handle} />;
}
