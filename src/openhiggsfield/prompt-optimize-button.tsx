"use client";

/* Prompt-optimization affordance for the dock composer. A small control that
   rewrites the caption through the local LLM (via the `optimizePromptDraft`
   server action) and writes the rewrite back into the same per-surface prompt
   store, so the writer sees it and submits normally. On failure the original
   caption stays and the reason is surfaced through the composer's error banner
   — the pipeline never breaks, matching the source node's passthrough-on-error
   behaviour.

   No new styling: the button reuses the existing `ohf-ctl` control-pill classes,
   so it picks up the dock's size laws for free (label hidden below 560, glyph
   alone) without a rule in the heavily-shared openhiggsfield.css. */

import { useState } from "react";

import type { Surface } from "@/generation/catalog";
import { optimizePromptDraft } from "@/generation/actions";
import { useAudioPrompt, useImagePrompt, useVideoPrompt } from "@/generation/stores/prompt";
import { LimeIcon } from "./cinema-icons";

function pickPromptStore(surface: Surface) {
  if (surface === "image") return useImagePrompt.getState();
  if (surface === "audio") return useAudioPrompt.getState();
  return useVideoPrompt.getState();
}

export function PromptOptimizeButton({
  surface,
  onError,
  disabled,
}: {
  surface: Surface;
  onError: (message: string | null) => void;
  disabled: boolean;
}) {
  /* A fresh snapshot of the caption store on each render keeps the button's
     enabled state honest (empty caption, nothing to rewrite). Subscribing the
     component to the store would re-render it on every keystroke for no gain —
     the handler reads the live value through getState() when pressed. */
  const text = pickPromptStore(surface).text;
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const current = pickPromptStore(surface).text;
    if (!current.trim()) return;
    setBusy(true);
    try {
      /* Pass the surface through so the server routes an image caption to the
         still-image optimizer; video/audio keep the video-optimised prompt. */
      const result = await optimizePromptDraft({ text: current, surface });
      if (result.error) {
        /* Failure: keep the writer's words, tell them why nothing changed. */
        onError(`Prompt optimization failed — kept original: ${result.error}`);
        return;
      }
      /* Success (or a cache hit): inject the rewrite before submit. */
      pickPromptStore(surface).setText(result.text);
    } catch (caught) {
      onError(
        `Prompt optimization failed — kept original: ${caught instanceof Error ? caught.message : String(caught)}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const empty = !text.trim();
  const blocked = busy || disabled || empty;

  return (
    <button
      type="button"
      className="ohf-ctl ohf-tip"
      data-tip="프롬프트 최적화"
      aria-label="프롬프트 최적화"
      disabled={blocked}
      onClick={run}
    >
      {busy ? <span className="ohf-spinner" aria-hidden /> : <LimeIcon />}
      <span className="ohf-ctl-name">{busy ? "최적화 중" : "최적화"}</span>
    </button>
  );
}
