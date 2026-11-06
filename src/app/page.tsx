import type { Metadata } from "next";
import localFont from "next/font/local";

import { OpenHiggsfieldApp } from "@/openhiggsfield/openhiggsfield-app";

import "@/openhiggsfield/openhiggsfield.css";
import "@/openhiggsfield/reference-film.css";

/* HF self-hosts this exact file (assets.higgsfield.ai/tanstack/fonts/inter/
   inter-latin-100-900.woff2 — byte-for-byte with public/fonts/inter-latin-100-900.woff2).
   Using localFont rather than next/font/google so OHF paints HF's metrics — the
   Google-served variant renders wider (operator ruling: 도색 폰트 = 복제 대상). */
const inter = localFont({
  src: "../../public/fonts/inter-latin-100-900.woff2",
  variable: "--font-ohf-inter",
  display: "swap",
});

/* Title, description and the Open Graph block all come from the root, which
   already describes this surface. Only the canonical link is route-specific. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function OpenHiggsfieldPage() {
  return <OpenHiggsfieldApp fontClassName={inter.variable} />;
}
