/**
 * run-changed.mts — the entrypoint that turns "what changed" into the subset of
 * integration specs to run, then runs them. Used by the PR CI workflow so a pull
 * request only pays for the menus it actually touched.
 *
 * Usage:
 *   node --experimental-strip-types ./tests/integration/run-changed.mts --base <sha>
 *
 *   --base <sha>   the diff base (the PR's target / merge-base). Diffed as
 *                  `<base>...HEAD`. When omitted or unresolvable the script falls
 *                  back to the full suite — never fewer tests than the change
 *                  warrants.
 *   --print-only   list the selected specs and exit without running them.
 *
 * The actual selection logic lives in change-detect.mts; this file only resolves
 * the diff and hands the chosen spec files to Playwright.
 */

import process from "node:process";
import { spawnSync } from "node:child_process";

import { selectSpecs, ALL_SPECS } from "./change-detect.mts";

function parseArgs(argv: string[]): { base?: string; printOnly: boolean } {
  let base: string | undefined;
  let printOnly = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base") base = argv[i + 1];
    else if (argv[i] === "--print-only") printOnly = true;
  }
  return { base, printOnly };
}

/** Read the changed file paths from git. Returns [] when the diff cannot be
 *  resolved (missing base, shallow clone), which selectSpecs treats as "run all". */
function changedFiles(base?: string): string[] {
  const args = base
    ? ["diff", "--name-only", `${base}...HEAD`]
    : ["diff", "--name-only", "HEAD"];
  const run = spawnSync("git", args, { encoding: "utf8" });
  if (run.status !== 0 || typeof run.stdout !== "string") return [];
  return run.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}

const { base, printOnly } = parseArgs(process.argv.slice(2));
const changed = changedFiles(base);
const specs = selectSpecs(changed);

console.info(`[run-changed] base=${base ?? "(none)"} changed=${changed.length} selected=${specs.length}`);
for (const spec of specs) console.info(`  → ${spec}`);

if (printOnly) {
  console.info(JSON.stringify({ changed, specs: specs === ALL_SPECS ? "all" : specs }));
  process.exit(0);
}

const playwrightArgs = ["playwright", "test", ...specs, "--config", "tests/integration/playwright.config.ts"];
const run = spawnSync("npx", playwrightArgs, { stdio: "inherit" });
process.exit(run.status ?? 1);
