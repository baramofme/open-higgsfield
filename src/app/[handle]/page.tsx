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
  /* HF URL은 /@handle — Next 동적 세그먼트가 '@'를 포함해 전달된다.
     표시는 HF와 동일하도록 '@'를剥이고 조립(이름=맨 이름, 핸들행=@+맨 이름). */
  const bare = handle.startsWith("@") ? handle.slice(1) : handle;
  return {
    /* HF guest 실측 타이틀과 동자(레이아웃 접미사 없이 절대 지정). */
    title: { absolute: `Higgsfield의 @${bare}` },
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
