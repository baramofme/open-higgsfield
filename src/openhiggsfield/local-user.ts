/* The local identity that authors everything this studio makes. Higgsfield's
   asset showcase shows the creator's avatar and handle in its header; OH has no
   cloud account to read, so the person using the studio is the author, and this
   is their card. Kept as a plain constant so the showcase can mirror the source's
   header shape exactly without a network call. */

export const LOCAL_USER = {
  /** Display handle, shown under the avatar the way Higgsfield shows its own. */
  handle: "baram204",
  /** The caption Higgsfield prints beneath the handle: the asset's author. */
  role: "작성자",
  /** A monogram for the round avatar — OH stores no profile picture, so the
      first letter of the handle stands in, tinted with the studio's lime. */
  initial: "b",
} as const;
