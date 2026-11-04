// Resolve hook for running the repo's real TS modules under plain Node ESM.
//  1. `next/headers` (a react-server-only export) is mapped to a local stub so
//     `src/generation/actions.ts` can be imported in a unit test.
//  2. The tsconfig `paths` alias `@/* -> ./src/*` (honoured by the Next bundler but
//     not by Node ESM) is rewritten to the real src/ file.
//  3. Extensionless imports — which the bundler resolves but Node ESM does not —
//     get the real file's extension back.
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const STUBS = {
  "next/headers": "./next-headers-stub.mjs",
};

const CANDIDATES = [".ts", ".tsx", ".mts", ".js", ".mjs", "/index.ts", "/index.tsx"];

/* tsconfig `paths`: "@/*" -> "./src/*". The src root is two levels up from this
   hook (tests/prompt-optimize/). */
const SRC_ROOT = new URL("../../src/", import.meta.url);

function aliasToAbsolute(specifier) {
  return decodeURIComponent(new URL("." + specifier.slice(1), SRC_ROOT).pathname);
}

/* Resolve an absolute filesystem path, re-adding a real extension when the
   specifier was written extensionless (Next does this; Node ESM does not). */
function resolveAbsolute(abs) {
  if (/\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(abs)) {
    return existsSync(abs) ? { url: pathToFileURL(abs).href, shortCircuit: true } : null;
  }
  for (const ext of CANDIDATES) {
    const candidate = abs + ext;
    if (existsSync(candidate)) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const stub = STUBS[specifier];
  if (stub) {
    return { url: new URL(stub, import.meta.url).href, shortCircuit: true };
  }

  // "@/*" alias -> absolute src/ path, then the extension-re-add path below.
  let abs = null;
  if (specifier.startsWith("@/")) {
    abs = aliasToAbsolute(specifier);
  } else if (specifier.startsWith("/") && !specifier.startsWith("file://")) {
    abs = decodeURIComponent(specifier);
  } else if (specifier.startsWith(".") && context.parentURL) {
    abs = decodeURIComponent(new URL(specifier, context.parentURL).pathname);
  }

  if (abs !== null) {
    const hit = resolveAbsolute(abs);
    if (hit) return hit;
  }
  return nextResolve(specifier, context);
}
