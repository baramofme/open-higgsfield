// Boot file: registers the repo-resolve hook so the test file's static
// imports resolve the real .ts modules (and `next/headers` to a stub).
// Loaded via `node --import ./tests/prompt-optimize/boot.mjs`.
import { register } from "node:module";

register("./repo-resolve-hook.mjs", import.meta.url);
