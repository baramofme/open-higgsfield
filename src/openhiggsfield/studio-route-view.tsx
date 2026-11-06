"use client";

import { useEffect } from "react";

import { useActive } from "@/generation/stores/active";
import { getModel } from "@/generation/catalog";
import { useStudio, type StudioMode } from "./studio-mode";
import { OpenHiggsfieldApp } from "./openhiggsfield-app";

/**
 * Shared client wrapper for the locale-prefixed studio routes.
 * On mount, syncs the active/studio stores to the values the URL implies,
 * so navigating via the topbar menu lands on the correct surface/mode.
 */
export function StudioRouteView({
  fontClassName = "",
  initialSurface,
  initialModel,
  initialMode,
}: {
  fontClassName?: string;
  initialSurface: "image" | "video" | "audio";
  initialModel?: string;
  initialMode?: StudioMode;
}) {
  const setModel = useActive((s) => s.setModel);

  useEffect(() => {
    // Apply the surface from the route.
    const active = useActive.getState();
    if (active.surface !== initialSurface) {
      useActive.setState({ surface: initialSurface });
    }

    // Apply the model if it exists in the catalog.
    if (initialModel) {
      try {
        // Normalize underscore-separated ids to the catalog's hyphen form.
        const normalized = initialModel.replace(/_/g, "-");
        const model = getModel(normalized);
        if (active.model !== model.id) {
          setModel(model.id);
        }
      } catch {
        // Model id from URL not found in catalog — fall through silently.
      }
    }

    // Apply the studio mode (cinema/general).
    if (initialMode) {
      const studio = useStudio.getState();
      if (studio.mode !== initialMode) {
        useStudio.setState({ mode: initialMode });
      }
    }
  }, [initialSurface, initialModel, initialMode, setModel]);

  return <OpenHiggsfieldApp fontClassName={fontClassName} />;
}
