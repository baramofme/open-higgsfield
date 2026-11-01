export const SOUL_ASPECT = ["9:16", "16:9", "4:3", "3:4", "1:1", "2:3", "3:2"] as const;

/** The image-form ratio menu exactly as the Higgsfield app renders it — the
 *  app's own order, Auto first. Every image-surface model shows this menu;
 *  the app offers the same list regardless of model, so matching the screen
 *  means matching this list, not each model's API enum. */
export const IMAGE_ASPECT = [
  "auto", "1:1", "16:9", "9:16", "4:5", "5:4", "3:2", "2:3", "21:9",
] as const;

export const SEEDANCE_ASPECT = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"] as const;