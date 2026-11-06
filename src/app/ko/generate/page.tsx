import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { StudioRouteView } from "@/openhiggsfield/studio-route-view";

import "@/openhiggsfield/openhiggsfield.css";
import "@/openhiggsfield/reference-film.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ohf-inter",
  display: "swap",
});

export const metadata: Metadata = {
  alternates: { canonical: "/ko/generate" },
};

export default function CinemaStudioPage() {
  return (
    <StudioRouteView
      fontClassName={inter.variable}
      initialSurface="image"
      initialMode="cinema"
    />
  );
}
