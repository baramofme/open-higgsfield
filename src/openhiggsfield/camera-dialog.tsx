"use client";

/* The solo/video camera popup, rebuilt to sit pixel-for-pixel on the app's own
   dialog (measured live over CDP 2026-11-03). The old two-wheel sheet is gone.
   This is a viewport-centred fixed modal — the app's `fixed z-1000 … md:top-1/2
   md:left-1/2 -translate-1/2`, 800×504 on desktop — so it mounts in a portal to
   document.body, which keeps `position:fixed` anchored to the viewport even when
   a transformed ancestor would otherwise capture it. The composer's outside-press
   guard is taught to spare `.ohf-camdialog`, so a click inside the modal never
   dismisses it, while a click outside the composer or a re-press of the camera
   plate still folds it away.

   The face reads exactly as the app's: a header carrying "카메라" and the two
   instruments "모두 초기화" and "닫기"; a left-side menu of two vertical tabs
   (설정 · 무브먼트) on a 5%-white plate; and a content column that swaps between
   three bare drums (카메라·렌즈·조리개) on the 설정 tab and a scrollable grid of
   33 movement presets on the 무브먼트 tab. */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  APERTURES,
  APERTURE_ART,
  CAMERAS,
  CAMERA_AUTO_ART,
  CHOICE_ART,
  LENSES,
  useCamera,
} from "@/generation/stores/camera";
import { CameraWheel } from "./cinema-popover";
import { MOVEMENT_PRESETS, type MovementPreset } from "./movement-presets";
import { CamMoveIcon } from "./cinema-icons";
import { CloseIcon, SlidersIcon } from "./icons";

/* Every drum carries a cover scene, exactly as the app paints them. The camera
   and lens drums use the app's own cover art; the aperture drum now carries the
   app's own depth-of-field cover scenes (measured live over CDP 2026-11-04) keyed
   in APERTURE_ART — so its f-stop rows read as full-bleed photos behind the word,
   not a bare flat plate, and its Auto detent uses the aperture's own glyph. */
const CAMERA_ART: Partial<Record<string, string>> = {
  Modern: CHOICE_ART.Modern,
  "35mm Film": CHOICE_ART["35mm Film"],
  "8mm Film": CHOICE_ART["8mm Film"],
  "DV Camcorder": CHOICE_ART["DV Camcorder"],
  Auto: CAMERA_AUTO_ART,
};
const LENS_ART: Partial<Record<string, string>> = {
  "Vintage Anamorphic": CHOICE_ART["Vintage Anamorphic"],
  "Warm Vintage": CHOICE_ART["Warm Vintage"],
  "Halation Vintage": CHOICE_ART["Halation Vintage"],
  "Clean Sharp": CHOICE_ART["Clean Sharp"],
  Anamorphic: CHOICE_ART.Anamorphic,
  Auto: CHOICE_ART.Auto,
};

/* One preset: a square clip the app plays only while the pointer rests on it,
   behind a still poster the rest of the time. The clip is preload:none and loop;
   leaving rewinds it to the poster so a grid of 33 never streams all at once. */
function MovementCard({
  preset,
  onAdd,
}: {
  preset: MovementPreset;
  onAdd: (name: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  return (
    <button
      type="button"
      className="ohf-cam-movecard"
      aria-label={`프롬프트에 추가하기 ${preset.name}`}
      onClick={() => onAdd(preset.name)}
      onMouseEnter={() => {
        const v = video.current;
        if (!v) return;
        v.currentTime = 0;
        const p = v.play();
        if (p) p.catch(() => {});
      }}
      onMouseLeave={() => {
        const v = video.current;
        if (v) v.pause();
      }}
    >
      <span className="ohf-cam-movecard-tile">
        <video
          ref={video}
          className="ohf-cam-movecard-video"
          poster={preset.poster}
          src={preset.mp4}
          loop
          playsInline
          disablePictureInPicture
          preload="none"
        />
        <span className="ohf-cam-movecard-add">프롬프트에 추가하기</span>
      </span>
      <span className="ohf-cam-movecard-name">{preset.name}</span>
    </button>
  );
}

export function CameraDialog({
  onClose,
  onAddMovement,
  initialTab = "settings",
}: {
  onClose: () => void;
  onAddMovement: (name: string) => void;
  /** Which left tab the sheet opens on. The camera plate opens on 설정; the
   *  camera-movement instrument opens straight on 무브먼트, so the icon lands
   *  where the user meant to go (AC1). Each press remounts the sheet, so this
   *  seeds the tab on every fresh open. */
  initialTab?: "settings" | "movement";
}) {
  const { camera, lens, aperture, setCamera, setLens, setAperture, reset } = useCamera();
  const [tab, setTab] = useState<"settings" | "movement">(initialTab);
  /* HF's movement grid carries a 정렬 기준 control that opens a sort menu
     (measured live on higgsfield.ai, 2026-11-03): 기본값 keeps the authored
     order, 이름 (A–Z) reorders the preset tiles by name. Mirrors the lighting
     panel's sort — same two options, same popover. */
  const [sort, setSort] = useState<"default" | "az">("default");
  const [sortOpen, setSortOpen] = useState(false);

  const shownPresets =
    sort === "az"
      ? [...MOVEMENT_PRESETS].sort((a, b) => a.name.localeCompare(b.name))
      : MOVEMENT_PRESETS;

  /* Escape closes the modal, the way the app folds it. The composer's own
     Escape listener also fires; both settle the overlay, which is harmless. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="ohf-camdialog"
      role="dialog"
      aria-modal="true"
      aria-label="카메라 설정"
      /* A click that lands on the dialog's own padding (the centred frame, not
         a control) folds it — mirroring the app's tap-outside-to-close. */
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ohf-camdialog__panel">
        <header className="ohf-camdialog__head">
          <span className="ohf-camdialog__title">카메라</span>
          <button type="button" className="ohf-camdialog__reset" onClick={reset}>
            모두 초기화
          </button>
          <button
            type="button"
            className="ohf-icon-btn ohf-icon-btn--ghost ohf-camdialog__close"
            aria-label="닫기"
            onClick={onClose}
          >
            <CloseIcon size={14} />
          </button>
        </header>

        <div className="ohf-camdialog__body">
          <div className="ohf-camdialog__tabs" role="tablist" aria-orientation="vertical">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "settings"}
              className="ohf-cam-tab"
              onClick={() => setTab("settings")}
            >
              <SlidersIcon size={16} />
              <span>설정</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "movement"}
              className="ohf-cam-tab"
              onClick={() => setTab("movement")}
            >
              <CamMoveIcon width="16" height="16" />
              <span>무브먼트</span>
            </button>
          </div>

          <div className="ohf-camdialog__content">
            {tab === "settings" ? (
              <div className="ohf-camdialog__grid">
                <CameraWheel items={CAMERAS} value={camera} onChange={setCamera} label="카메라" art={CAMERA_ART} />
                <CameraWheel items={LENSES} value={lens} onChange={setLens} label="렌즈" art={LENS_ART} />
                <CameraWheel items={APERTURES} value={aperture} onChange={setAperture} label="조리개" art={APERTURE_ART} />
              </div>
            ) : (
              <div className="ohf-camdialog__move">
                <div className="ohf-camdialog__movehead">
                  <div className="ohf-camdialog__sortwrap">
                    <button
                      type="button"
                      className="ohf-camdialog__sort"
                      aria-label="정렬 기준"
                      aria-haspopup="menu"
                      aria-expanded={sortOpen}
                      onClick={() => setSortOpen((v) => !v)}
                    >
                      정렬 기준
                    </button>
                    {sortOpen && (
                      <div className="ohf-camdialog__sortmenu" role="menu" aria-label="정렬 기준">
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={sort === "default"}
                          data-active={sort === "default" || undefined}
                          className="ohf-camdialog__sopt"
                          onClick={() => { setSort("default"); setSortOpen(false); }}
                        >
                          기본값
                        </button>
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={sort === "az"}
                          data-active={sort === "az" || undefined}
                          className="ohf-camdialog__sopt"
                          onClick={() => { setSort("az"); setSortOpen(false); }}
                        >
                          이름 (A–Z)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ohf-camdialog__movescroll">
                  <div className="ohf-camdialog__movegrid">
                    {shownPresets.map((preset) => (
                      <MovementCard key={preset.name} preset={preset} onAdd={onAddMovement} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
