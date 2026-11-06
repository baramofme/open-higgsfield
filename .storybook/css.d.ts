// Ambient declaration so the global side-effect CSS import in preview.ts
// (`import "../src/openhiggsfield/openhiggsfield.css"`) type-checks under
// `tsc -p`. Vite handles the CSS at build time; this covers the tsc gate only.
declare module "*.css";
