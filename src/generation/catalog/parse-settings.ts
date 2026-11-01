import type { ModelEntry } from "./types";

/** Reads the stored selection for a model against the catalog as it stands.
 *  A stored value still outranks the field default — but when the catalog has
 *  moved on (a tier or an enum value the visitor picked no longer exists), the
 *  default stands in rather than the read throwing. The composer renders with
 *  this same read, so a stale pick would otherwise take the whole page down;
 *  falling back keeps the render alive and the run sendable, and the visitor
 *  simply sees the control back at its default. */
export function parseSettings(
  model: ModelEntry,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(model.settings)) {
    const value = raw[key];
    if (field.type === "enum") {
      const picked = typeof value === "string" ? value : field.default;
      out[key] = field.values.includes(picked) ? picked : field.default;
      continue;
    }
    if (field.type === "range") {
      const picked = typeof value === "number" ? value : field.default;
      if (picked < field.min || picked > field.max) {
        out[key] = field.default;
        continue;
      }
      out[key] = picked;
      continue;
    }
    out[key] = typeof value === "boolean" ? value : field.default;
  }
  return out;
}
