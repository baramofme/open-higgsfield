"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

import type { MediaItem, MediaRole, ModelEntry } from "@/generation/catalog";
import { useImageMedia, useVideoMedia } from "@/generation/stores/media";
import { uploadMedia } from "@/generation/upload";

import { ROLE_ACCEPT, ROLE_LABELS, ROLE_TAGS, rolesOf } from "./data";
import { AudioIcon, CloseIcon, VideoIcon } from "./icons";
import { toProxyMediaUrl } from "./image-proxy";
import { removeStripReference } from "./reference-removal";
import { kindOfFile, loadUploads, mergeUploads, rememberUpload, saveUploads, type UploadRecord } from "./uploads";
import { cachedWaveformForAsset } from "@/lib/waveform";
/* t_9ddf99e1: the tile's open seam. Anchored past the waveform import so it
   forms its own hunk, clear of the import cluster siblings are editing right now. */
import { useReferenceShowcase } from "./reference-showcase";

function useMedia(model: ModelEntry) {
  const imageMedia = useImageMedia();
  const videoMedia = useVideoMedia();
  return model.surface === "image" ? imageMedia : videoMedia;
}

export interface MediaTray {
  roles: MediaRole[];
  /** The current surface's attachments, so the picker can derive its own caps
      from the same list the strip below renders. */
  items: MediaItem[];
  /** Every file this browser has sent to Blob, newest first. */
  uploads: UploadRecord[];
  /** The URL of the last file uploaded from the picker. It goes onto the shelf
      and into the panel's selection, not onto the plane — the panel stages the
      whole set and one press applies it. */
  staged: string | null;
  uploading: boolean;
  allFull: boolean;
  /** Hidden file input; render it once inside the composer. */
  input: ReactNode;
  /** Set the role the next file takes, then open the OS picker. */
  begin: (role: MediaRole) => void;
  /** Make the role's inputs exactly these URLs — the picker hands back the set
      it edited, so one press both attaches and detaches. */
  apply: (role: MediaRole, urls: string[]) => void;
  /** Take a file off the shelf. The URL itself stays public — what disappears
      is the record, so the picker stops offering it. */
  forget: (url: string) => void;
  /** Attach media this app produced itself — a canvas PNG off the draw stage —
      without opening the OS picker. It takes the same upload path a picked file
      takes, so the drawing lands on the plane the same way an attachment does. */
  put: (role: MediaRole, blob: Blob, name: string) => Promise<string | null>;
}

export function useMediaTray(
  model: ModelEntry,
  onError: (message: string | null) => void,
): MediaTray {
  const media = useMedia(model);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [staged, setStaged] = useState<string | null>(null);
  const [uploadsLoaded, setUploadsLoaded] = useState(false);
  const roleRef = useRef<MediaRole>("reference");
  const inputRef = useRef<HTMLInputElement>(null);

  /* Read once, then write back on every change — the same order history takes,
     and for the same reason: writing before the read has landed would persist
     the empty initial value over the stored shelf. */
  useEffect(() => {
    let live = true;
    void loadUploads()
      .then((rows) => {
        if (!live) return;
        setUploads((current) => mergeUploads(rows, current));
        setUploadsLoaded(true);
      })
      .catch(() => {
        if (live) setUploadsLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (uploadsLoaded) void saveUploads(uploads);
  }, [uploadsLoaded, uploads]);

  const roles = rolesOf(model);
  const counts: Record<string, number> = {};
  for (const role of roles) {
    counts[role] = media.items.filter((item) => item.role === role).length;
  }
  const allFull = roles.length > 0 && roles.every((role) => counts[role]! >= (model.roles[role] ?? 0));

  async function onFile(file: File | undefined) {
    if (!file) return;
    onError(null);
    setUploading(true);
    try {
      const uploaded = await uploadMedia(file);
      /* The file outlives this run: it joins the shelf the picker offers, so a
         reference used once can be reached again without a second upload. */
      setStaged(uploaded.url);
      setUploads((prev) =>
        rememberUpload(prev, {
          id: crypto.randomUUID(),
          url: uploaded.url,
          kind: kindOfFile(file),
          name: file.name,
          createdAt: Date.now(),
        }),
      );
    } catch (caught) {
      onError(
        caught instanceof Error
          ? `Upload failed — ${caught.message}. Check the Blob store is configured, then retry.`
          : "Upload failed. Retry, or drop the file and generate from the prompt alone.",
      );
    } finally {
      setUploading(false);
    }
  }

  /* accept is set on the element rather than through state: the picker opens in
     the same tick as the choice, before React could re-render it. */
  function begin(role: MediaRole) {
    const element = inputRef.current;
    if (!element) return;
    roleRef.current = role;
    element.accept = ROLE_ACCEPT[role];
    element.click();
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        void onFile(file);
      }}
    />
  );

  /* A replace, not an append: the panel edits one role's whole set, so what it
     hands back decides both what arrives and what leaves. Rows whose URL
     survives keep their id, and with it their place in the strip. */
  function apply(role: MediaRole, urls: string[]) {
    const keep = new Set(urls);
    const held = new Set<string>();
    for (const item of media.items) {
      if (item.role !== role) continue;
      if (keep.has(item.url)) held.add(item.url);
      else media.remove(item.id);
    }
    for (const url of urls) {
      if (!held.has(url)) media.add({ id: crypto.randomUUID(), url, role });
    }
  }

  function forget(url: string) {
    setUploads((prev) => prev.filter((record) => record.url !== url));
  }

  /* A drawing the app made itself has no file to pick, so the picker is out of
     the loop: the blob is wrapped as a File and takes the identical upload
     path, then joins the store straight away — the strip renders it and the
     plane reads it without waiting for a press to apply a set. */
  async function put(role: MediaRole, blob: Blob, name: string): Promise<string | null> {
    onError(null);
    setUploading(true);
    try {
      const file = new File([blob], name, { type: blob.type || "image/png" });
      const uploaded = await uploadMedia(file);
      media.add({ id: crypto.randomUUID(), url: uploaded.url, role });
      return uploaded.url;
    } catch (caught) {
      onError(
        caught instanceof Error
          ? `Upload failed — ${caught.message}. Check the Blob store is configured, then retry.`
          : "Upload failed. Retry, or drop the file and generate from the prompt alone.",
      );
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { roles, items: media.items, uploads, staged, uploading, allFull, input, begin, apply, forget, put };
}

/* Pull the first decodable frame out of a video and hand it back as a JPEG data
   url small enough to sit behind a 56px tile. We seek a hair past zero rather
   than trusting a `#t` fragment: setting `currentTime` and waiting for `seeked`
   is what actually decodes a frame across browsers, and a frame decoded this way
   is same-origin-clean, so `toDataURL` won't taint on `blob:` uploads. Any
   failure — missing metadata, a cross-origin taint, a codec the browser refuses —
   collapses to null and the glyph stays. */
function firstFrameOfVideo(url: string, maxSide = 96): Promise<string | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };
    const grab = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return finish(null);
      const scale = Math.min(1, maxSide / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return finish(null);
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        finish(null); // a tainted canvas throws here
      }
    };
    video.addEventListener("loadeddata", () => {
      const t = video.duration > 0 ? Math.min(0.05, video.duration / 4) : 0.05;
      try {
        video.currentTime = t;
      } catch {
        grab();
      }
    });
    video.addEventListener("seeked", grab);
    video.addEventListener("error", () => finish(null));
    // A hung decode must never hang the strip open.
    setTimeout(() => finish(null), 5000);
    video.src = url;
    video.load();
  });
}

/** One tile in the contact sheet. A still image paints its own thumb; audio and
    video have nothing still to show, so we synthesise a background for them —
    the waveform for audio, the first frame for video. Both are async and both
    cost real work (decode the whole clip, seek a frame), so nothing is computed
    until the tile is on screen: the contact sheet must paint before a generation
    can, and decoding every attachment up front would jank the composer open. */
export function StripTile({ item }: { item: MediaItem }) {
  const isMedia = item.role === "audio" || item.role === "video";
  const [bg, setBg] = useState<string | null>(null);
  const tileRef = useRef<HTMLSpanElement>(null);

  /* The tile body is the showcase's open control. Clicking it raises this
     reference's scoped showcase — the same dialog a finished run or an element
     opens — while the × remove button beside it stays a separate action. The
     tile carries the click and the two keys a button answers to, so it is a
     real control in the strip, not dead chrome. */
  const openShowcase = () => useReferenceShowcase.getState().open(item);
  const openWithKey = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openShowcase();
    }
  };

  useEffect(() => {
    if (!isMedia) return;
    const el = tileRef.current;
    if (!el) return;
    let cancelled = false;

    async function generate() {
      try {
        /* Route both through the same-origin proxy. A raw gradio video has no
           CORS headers, so drawing its first frame taints the canvas and the
           thumbnail's toDataURL throws — the tile silently falls back to a glyph.
           A raw audio byte-read (`fetch` inside cachedWaveformForAsset) dies on
           Chrome's PNA preflight from a tailnet/LAN origin, and the waveform
           never gets built. Same-origin bytes defeat both. Blob/data urls pass
           through untouched — there is nothing to defeat there. */
        const proxied = toProxyMediaUrl(item.url);
        const image =
          item.role === "video"
            ? await firstFrameOfVideo(proxied)
            : await cachedWaveformForAsset({ id: item.id, url: proxied });
        if (!cancelled && image) setBg(image);
      } catch {
        /* A clip the browser can't decode, or a waveform that throws, just keeps
           the glyph. Nothing else about the tile changes. */
      }
    }

    if (typeof IntersectionObserver === "undefined") {
      void generate();
      return () => {
        cancelled = true;
      };
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          io.disconnect();
          void generate();
        }
      },
      { rootMargin: "160px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelled = true;
    };
  }, [isMedia, item.id, item.url]);

  if (!isMedia) {
    /* Blob-hosted user upload; next/image would proxy an arbitrary remote host
       for a 56px thumb. */
    return (
      <span
        className="ohf-strip-tile"
        role="button"
        tabIndex={0}
        onClick={openShowcase}
        onKeyDown={openWithKey}
        aria-label={`${ROLE_LABELS[item.role].toLowerCase()} 쇼케이스 열기`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ohf-strip-thumb"
          src={item.url}
          alt=""
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
        <span className="ohf-strip-tag">{ROLE_TAGS[item.role]}</span>
      </span>
    );
  }

  return (
    <span
      ref={tileRef}
      className="ohf-strip-tile"
      role="button"
      tabIndex={0}
      onClick={openShowcase}
      onKeyDown={openWithKey}
      aria-label={`${ROLE_LABELS[item.role].toLowerCase()} 쇼케이스 열기`}
      style={
        bg
          ? { backgroundImage: `url("${bg}")`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      {/* The glyph is the placeholder: it holds the tile until the image lands,
          then the real frame or waveform takes over and the mark steps aside. */}
      {!bg && (
        <span className="ohf-strip-glyph">
          {item.role === "audio" ? <AudioIcon size={20} /> : <VideoIcon size={20} />}
        </span>
      )}
      <span className="ohf-strip-tag">{ROLE_TAGS[item.role]}</span>
    </span>
  );
}

/** Attached inputs, above the prompt — the frames read before the words do. */
export function MediaStrip({ model }: { model: ModelEntry }) {
  const media = useMedia(model);
  const items = media.items.filter((item) => model.roles[item.role]);
  if (items.length === 0) return null;

  return (
    <ul className="ohf-strip">
      {items.map((item) => (
        <li key={item.id} className="ohf-strip-item">
          <StripTile item={item} />
          <button
            type="button"
            className="ohf-strip-remove"
            aria-label={`Remove ${ROLE_LABELS[item.role].toLowerCase()}`}
            onClick={() => removeStripReference(media, model, item)}
          >
            <CloseIcon size={10} />
          </button>
        </li>
      ))}
    </ul>
  );
}
