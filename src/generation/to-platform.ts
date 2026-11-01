import { getModel } from "./catalog";
import type { GenerationPlane, PlatformPaths } from "./catalog/types";

type Mapped = { path: string; body: Record<string, unknown> };
type Mapper = (plane: GenerationPlane) => Mapped;

const MAP: Record<string, Mapper> = {
  "soul": (plane) => mapSoul(plane, "higgsfield-ai/soul"),
  "soul-cinema": (plane) => mapSoul(plane, "higgsfield-ai/soul/cinema"),
  "soul-2": (plane) => mapSoul(plane, "higgsfield-ai/soul/v2/standard"),
  "gpt-image-2": (plane) => mapMarketingStudio(plane, "marketing-studio/image"),
  "gpt-image-2.5-flare": (plane) => mapMarketingStudio(plane, "marketing-studio/image/flare"),
  "gpt-image-2.5-sunburst": (plane) => mapMarketingStudio(plane, "marketing-studio/image/sunburst"),
  "kling-3-turbo": mapKlingTurbo,
  "kling-3-std": (plane) => mapKling3(plane, "kling-video/v3.0/std"),
  "kling-3-pro": (plane) => mapKling3(plane, "kling-video/v3.0/pro"),
  "kling-3-4k": (plane) => mapKling3(plane, "kling-video/v3.0/4k"),
  "kling-3-motion-std": (plane) => mapKlingMotion(plane, "kling-video/v3/motion-control/std"),
  "kling-3-motion-pro": (plane) => mapKlingMotion(plane, "kling-video/v3/motion-control/pro"),
  "seedance-2": (plane) => mapSeedance(plane, "bytedance/seedance-2.0"),
  "seedance-2-fast": (plane) => mapSeedance(plane, "bytedance/seedance-2.0/fast"),
  "seedance-2-mini": (plane) => mapSeedance(plane, "bytedance/seedance-2.0/mini"),
  "seedance-2.5": (plane) => mapSeedance(plane, "bytedance/seedance-2.5"),
  "seedance-2.5-edit": (plane) => mapSeedanceSource(plane, "bytedance/seedance-2.5/video-edit", false),
  "seedance-2.5-extend": (plane) => mapSeedanceSource(plane, "bytedance/seedance-2.5/video-extend", true),
  "krea-2-turbo": mapKrea2Cfwui,
  "ltx-2.5-local": mapVideoCfwui,
  "minimax-h3-local": mapVideoCfwui,
};

export function toPlatform(plane: GenerationPlane): Mapped {
  const model = getModel(plane.model);
  const map = MAP[model.id] ?? (model.paths ? (next) => mapByPaths(next, model.paths!) : undefined);
  if (!map) throw new Error(`No platform map for ${plane.model}`);
  return map(plane);
}

function urls(plane: GenerationPlane, role: "start" | "end" | "reference" | "video" | "audio") {
  return (plane.media[role] ?? []).map((item) => item.url);
}

function mapSoul(plane: GenerationPlane, path: string): Mapped {
  return {
    path,
    body: {
      prompt: plane.prompt.text,
      batch_size: Number(plane.settings.batchSize),
      resolution: plane.settings.resolution,
      // Auto means the server picks; it is not a value in this API's enum.
      ...(plane.settings.aspectRatio && plane.settings.aspectRatio !== "auto"
        ? { aspect_ratio: plane.settings.aspectRatio }
        : {}),
      // The rail no longer carries the control; omit so the server default rules.
      ...(plane.settings.enhancePrompt !== undefined
        ? { enhance_prompt: plane.settings.enhancePrompt }
        : {}),
    },
  };
}

/** Marketing Studio Image family (the classic app's "GPT Image" tiers).
 *  Verified schemas: quality/resolution/aspect enums, enhance_prompt,
 *  image_urls for edits (max 2 on the base endpoint, 16 on Flare/Sunburst).
 *  batch_size is not part of this API — the app fans out client-side; a batch
 *  >1 here still submits one request. */
function mapMarketingStudio(plane: GenerationPlane, path: string): Mapped {
  const refs = urls(plane, "reference");
  return {
    path,
    body: {
      prompt: plane.prompt.text,
      quality: plane.settings.quality,
      resolution: plane.settings.resolution,
      aspect_ratio: plane.settings.aspectRatio,
      // The rail no longer carries the control; omit so the server default rules.
      ...(plane.settings.enhancePrompt !== undefined
        ? { enhance_prompt: plane.settings.enhancePrompt }
        : {}),
      ...(refs.length ? { image_urls: refs } : {}),
    },
  };
}

function mapKlingTurbo(plane: GenerationPlane): Mapped {
  const start = urls(plane, "start")[0];
  return {
    path: start
      ? "kling-video/v3.0-turbo/image-to-video"
      : "kling-video/v3.0-turbo/text-to-video",
    body: {
      prompt: plane.prompt.text,
      duration: plane.settings.duration,
      resolution: plane.settings.resolution,
      ...(start ? { image_url: start } : { aspect_ratio: plane.settings.aspectRatio }),
    },
  };
}

function mapKling3(plane: GenerationPlane, prefix: string): Mapped {
  const start = urls(plane, "start")[0];
  const end = urls(plane, "end")[0];
  const body: Record<string, unknown> = {
    prompt: plane.prompt.text,
    sound: plane.settings.sound ? "on" : "off",
    duration: plane.settings.duration,
    cfg_scale: plane.settings.cfgScale,
    multi_shots: plane.settings.multiShots,
  };
  if (start) {
    body.image_url = start;
    if (end) body.last_image_url = end;
    return { path: `${prefix}/image-to-video`, body };
  }
  body.aspect_ratio = plane.settings.aspectRatio;
  return { path: `${prefix}/text-to-video`, body };
}

function mapKlingMotion(plane: GenerationPlane, path: string): Mapped {
  const start = urls(plane, "start")[0];
  const video = urls(plane, "video")[0];
  return {
    path,
    body: {
      prompt: plane.prompt.text,
      ...(start ? { image_url: start } : {}),
      ...(video ? { video_url: video } : {}),
      keep_original_sound: plane.settings.keepOriginalSound ? "yes" : "no",
      character_orientation: plane.settings.characterOrientation,
    },
  };
}

function mapByPaths(plane: GenerationPlane, spec: PlatformPaths): Mapped {
  const start = urls(plane, "start")[0];
  const end = urls(plane, "end")[0];
  const refs = urls(plane, "reference");
  const videos = urls(plane, "video");
  const body: Record<string, unknown> = {
    prompt: plane.prompt.text,
    ...(plane.settings.aspectRatio ? { aspect_ratio: plane.settings.aspectRatio } : {}),
    ...(plane.settings.resolution ? { resolution: plane.settings.resolution } : {}),
    ...(typeof plane.settings.duration === "number" ? { duration: plane.settings.duration } : {}),
  };
  if (spec.firstLast && (start || end)) {
    return {
      path: spec.firstLast,
      body: {
        ...body,
        ...(start ? { first_frame_url: start } : {}),
        ...(end ? { last_frame_url: end } : {}),
      },
    };
  }
  if (spec.image && start) {
    return {
      path: spec.image,
      body: { ...body, image_url: start, ...(end ? { last_image_url: end } : {}) },
    };
  }
  if (spec.reference && (refs.length || videos.length)) {
    return {
      path: spec.reference,
      body: {
        ...body,
        ...(refs.length ? { image_urls: refs } : {}),
        ...(videos.length ? { video_urls: videos } : {}),
      },
    };
  }
  if (spec.text) {
    return {
      path: spec.text,
      body: refs.length ? { ...body, image_urls: refs } : body,
    };
  }
  if (spec.image) return { path: spec.image, body };
  if (spec.reference) return { path: spec.reference, body };
  if (spec.firstLast) return { path: spec.firstLast, body };
  throw new Error("Model has no platform path");
}

function seedanceBody(plane: GenerationPlane, withDuration: boolean) {
  return {
    prompt: plane.prompt.text,
    resolution: plane.settings.resolution,
    generate_audio: plane.settings.generateAudio,
    ...(withDuration ? { duration: plane.settings.duration } : {}),
    ...(plane.settings.outputFormat ? { output_format: plane.settings.outputFormat } : {}),
    ...(plane.settings.bitrateMode ? { bitrate_mode: plane.settings.bitrateMode } : {}),
  };
}

function mapSeedance(plane: GenerationPlane, prefix: string): Mapped {
  const start = urls(plane, "start")[0];
  const end = urls(plane, "end")[0];
  const refs = urls(plane, "reference");
  const videos = urls(plane, "video");
  const audios = urls(plane, "audio");
  const shared = seedanceBody(plane, true);
  if (start) {
    return {
      path: `${prefix}/image-to-video`,
      body: { ...shared, image_url: start, ...(end ? { end_image_url: end } : {}) },
    };
  }
  if (refs.length || videos.length || audios.length) {
    return {
      path: `${prefix}/reference-to-video`,
      body: {
        ...shared,
        aspect_ratio: plane.settings.aspectRatio,
        ...(refs.length ? { image_urls: refs } : {}),
        ...(videos.length ? { video_urls: videos } : {}),
        ...(audios.length ? { audio_urls: audios } : {}),
      },
    };
  }
  return {
    path: `${prefix}/text-to-video`,
    body: { ...shared, aspect_ratio: plane.settings.aspectRatio },
  };
}

function mapSeedanceSource(plane: GenerationPlane, path: string, withDuration: boolean): Mapped {
  const [video, ...extraVideos] = urls(plane, "video");
  const refs = urls(plane, "reference");
  const audios = urls(plane, "audio");
  return {
    path,
    body: {
      ...seedanceBody(plane, withDuration),
      ...(video ? { video_url: video } : {}),
      ...(refs.length ? { image_urls: refs } : {}),
      ...(extraVideos.length ? { video_urls: extraVideos } : {}),
      ...(audios.length ? { audio_urls: audios } : {}),
    },
  };
}

/** Pixel canvas per (resolution tier × aspect) for comfy-webui width/height.
 *  All multiples of 16 so the VAE latent divides cleanly. */
const KREA2_CANVAS: Record<string, Record<string, readonly [number, number]>> = {
  "1k": {
    auto: [1024, 1024],
    "1:1": [1024, 1024],
    "4:3": [1152, 864],
    "3:4": [864, 1152],
    "16:9": [1344, 768],
    "9:16": [768, 1344],
    "4:5": [832, 1040],
    "5:4": [1040, 832],
    "3:2": [1536, 1024],
    "2:3": [1024, 1536],
    "21:9": [1568, 672],
  },
  "2k": {
    auto: [2048, 2048],
    "1:1": [2048, 2048],
    "4:3": [2304, 1728],
    "3:4": [1728, 2304],
    "16:9": [2688, 1536],
    "9:16": [1536, 2688],
    "4:5": [1664, 2080],
    "5:4": [2080, 1664],
    "3:2": [3072, 2048],
    "2:3": [2048, 3072],
    "21:9": [3136, 1344],
  },
};

/** Local cfwui semantic-API map: plane -> ImageGen_run_imagegen json_params.
 *  The reference role feeds krea2_style_reference injectors (cap 3, matched to
 *  krea2_style_reference max_count). Media URLs may be data URIs: cfwui's
 *  _parse_image_param accepts them natively. */
function mapKrea2Cfwui(plane: GenerationPlane): Mapped {
  /* The quality chip imposes its ladder when the visitor has not moved the
     underlying numbers: an untouched run takes whatever the tier says,
     and auto (which says nothing) leaves the server fill standing. */
  const qualityField = getModel(plane.model).settings.quality;
  const ladder =
    qualityField?.type === "enum"
      ? qualityField.presets?.[String(plane.settings.quality ?? qualityField.default)]
      : undefined;
  const resolution = String(plane.settings.resolution ?? "1k");
  const aspect = String(plane.settings.aspectRatio ?? "1:1");
  const canvas = KREA2_CANVAS[resolution] ?? KREA2_CANVAS["1k"];
  const [width, height] = canvas[aspect] ?? canvas["1:1"];
  const batch = Number(plane.settings.batchSize ?? 1);
  const chain = urls(plane, "reference")
    .slice(0, 3)
    .map((image) => ({ injector_type: "krea2_style_reference", image }));
  const initImage = urls(plane, "start")[0];
  const denoise = Number(plane.settings.denoise);
  const steps = Number(plane.settings.steps);
  const cfg = Number(plane.settings.cfg);
  const sampler = typeof plane.settings.sampler === "string" ? plane.settings.sampler : "euler";
  const scheduler = typeof plane.settings.scheduler === "string" ? plane.settings.scheduler : "simple";
  return {
    path: "ImageGen_run_imagegen",
    body: {
      /* An inpaint plane carries a painted alpha mask inside its start image;
         the backend's inpaint task repaints the transparent region and takes no
         canvas size, so width/height drop out of that body alone. */
      task_type:
        plane.inpaint && initImage ? "inpaint" : initImage ? "img2img" : "txt2img",
      model: "Krea-2-Turbo",
      prompt: plane.prompt.text,
      ...(plane.inpaint && initImage ? {} : { width, height }),
      batch_size: Number.isFinite(batch) && batch > 0 ? batch : 1,
      async_execution: true,
      /* Explicit inference overrides. Untouched values equal the server's
         model_defaults.yaml mirror, so passthrough changes nothing until the
         visitor actually moves a control. */
      steps: Number.isFinite(steps) ? steps : (ladder?.steps as number | undefined) ?? 8,
      cfg: Number.isFinite(cfg) ? cfg : (ladder?.cfg as number | undefined) ?? 1.0,
      sampler,
      scheduler,
      ...(initImage
        ? { image: initImage, denoise: Number.isFinite(denoise) ? denoise : 0.75 }
        : {}),
      ...(chain.length ? { chain } : {}),
      /* Cinema's camera and lens travel verbatim on cinematic runs: the
         backend has no known key for them, so the body carries them as opaque
         extras until a run proves whether cfwui tolerates or ignores them. */
      ...(plane.studio === "cinema"
        ? {
            camera: String(plane.settings.camera ?? ""),
            lens: String(plane.settings.lens ?? ""),
          }
        : {}),
    },
  };
}

/* Local video mapping for the two comfy-webui modules. A plane that carries a
   start image becomes image-to-video; without one it is plain text-to-video.
   H3 wants explicit pixel dimensions, so the resolution tier and the aspect
   resolve to a concrete canvas; LTX-2.5 instead takes the tier as a preset and
   a spelled-out aspect string. The format and audio chips travel as
   output_format / generate_audio — the two modules read them into the graph
   (the container reaches SaveVideo, and a false audio chip leaves the audio
   decoder out of the workflow, which is what makes the file silent).
   Both run asynchronously so the caller can poll for the finished file. */
const H3_CANVAS: Record<string, Record<string, readonly [number, number]>> = {
  "544p": { "16:9": [960, 544], "9:16": [544, 960], "1:1": [736, 736] },
  "768p": { "16:9": [1344, 768], "9:16": [768, 1344], "1:1": [1024, 1024] },
  "1080p": { "16:9": [1920, 1088], "9:16": [1088, 1920], "1:1": [1440, 1440] },
};
const LTX_ASPECT: Record<string, string> = {
  "16:9": "16:9 (Widescreen)",
  "9:16": "9:16 (Vertical)",
  "1:1": "1:1 (Square)",
};

/** The chip reads as a tier; anything outside the catalog's enum falls back so
    a stored stale value cannot strand the run on a tier the backend lacks. */
function resolutionTier(value: unknown): string {
  const tier = String(value ?? "768p");
  return tier === "544p" || tier === "1080p" ? tier : "768p";
}

function mapVideoCfwui(plane: GenerationPlane): Mapped {
  const model = getModel(plane.model);
  const start = urls(plane, "start")[0];
  const prompt = plane.prompt.text;
  const duration = Number(plane.settings.duration) || 5;
  const aspect = String(plane.settings.aspectRatio ?? "16:9");
  const tier = resolutionTier(plane.settings.resolution);
  const outputFormat = ["mp4", "webm", "mkv"].includes(String(plane.settings.outputFormat))
    ? String(plane.settings.outputFormat)
    : "mp4";
  const generateAudio = plane.settings.generateAudio !== false;
  const chips = { output_format: outputFormat, generate_audio: generateAudio };
  if (model.id === "minimax-h3-local") {
    const canvas = H3_CANVAS[tier] ?? H3_CANVAS["768p"];
    const [width, height] = canvas[aspect] ?? canvas["16:9"];
    return {
      path: "VideoGen_H3_run",
      body: {
        task_type: start ? "i2va" : "t2va",
        prompt,
        width,
        height,
        duration,
        steps: 4,
        loras: "minimax_h3_DMAD_4step_full_lora_avg_rank_39_bf16.safetensors",
        cfg: 6.0,
        flow_shift: 3.0,
        seed: -1,
        async_execution: true,
        ...chips,
        ...(start ? { first_frame_image: start } : {}),
      },
    };
  }
  return {
    path: "VideoGen_LTX_2_5_run",
    body: {
      task_type: start ? "i2va" : "t2va",
      prompt,
      resolution: tier,
      aspect_ratio: LTX_ASPECT[aspect] ?? "16:9 (Widescreen)",
      duration,
      fps: "24fps",
      seed: -1,
      async_execution: true,
      ...chips,
      ...(start ? { start_image: start } : {}),
    },
  };
}
