export type Surface = "image" | "video";
export type MediaRole = "start" | "end" | "reference" | "video" | "audio";

export type MediaItem = {
  id: string;
  url: string;
  role: MediaRole;
};

export type SettingField =
  | {
      type: "enum";
      values: readonly string[];
      default: string;
      advanced?: boolean;
      /* Choosing one of these values can sweep a bundle of other settings with
         it — the preset map runs from chosen value to the patch it imposes.
         Krea's quality tiers use this to carry steps/cfg, the pair the local
         backend actually runs on. */
      presets?: Record<string, Record<string, string | number>>;
    }
  | { type: "range"; min: number; max: number; default: number; step?: number; advanced?: boolean }
  | { type: "boolean"; default: boolean; advanced?: boolean };

export type PlatformPaths = {
  text?: string;
  image?: string;
  firstLast?: string;
  reference?: string;
};

export type ModelEntry = {
  id: string;
  surface: Surface;
  label: string;
  roles: Partial<Record<MediaRole, number>>;
  settings: Record<string, SettingField>;
  /** Submit paths when the shared mapper is enough. Soul, Kling 3, and Seedance keep custom maps. */
  paths?: PlatformPaths;
};

export type GenerationPlane = {
  model: string;
  prompt: { text: string };
  media: Partial<Record<MediaRole, MediaItem[]>>;
  settings: Record<string, unknown>;
  /** Which topbar surface produced the plane; absent reads as "general". */
  studio?: "general" | "cinema";
  /** Carries the run down the backend's `inpaint` task: the start image already
      holds a painted alpha mask, so the mapper must ask for localized repaint. */
  inpaint?: boolean;
};
