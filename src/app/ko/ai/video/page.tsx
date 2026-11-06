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
  alternates: { canonical: "/ko/ai/video" },
};

export default function VideoStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  const params = searchParams;

  return (
    <StudioRouteViewAsync
      fontClassName={inter.variable}
      initialSurface="video"
      initialModelPromise={params}
      defaultModel="genjutsu"
    />
  );
}

/** Server-side wrapper: awaits searchParams then renders the client view. */
async function StudioRouteViewAsync({
  fontClassName,
  initialSurface,
  initialModelPromise,
  defaultModel,
}: {
  fontClassName: string;
  initialSurface: "image" | "video" | "audio";
  initialModelPromise: Promise<{ model?: string }>;
  defaultModel?: string;
}) {
  const { model } = await initialModelPromise;
  return (
    <StudioRouteView
      fontClassName={fontClassName}
      initialSurface={initialSurface}
      initialModel={model ?? defaultModel}
    />
  );
}
