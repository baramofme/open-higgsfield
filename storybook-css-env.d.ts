// Ambient module declaration so the side-effect CSS import in
// .storybook/preview.ts type-checks under `tsc -p` (the repo's real gate).
// Next only declares `*.module.css`; a plain `.css` import needs this.
declare module "*.css";
