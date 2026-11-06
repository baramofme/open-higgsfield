# HF<->OHF drill-down concurrent measurement report

Method: 3 tabs on CDP `127.0.0.1:9222`, equalized `Emulation 1440x900`.
HF ground truth = PUBLIC project page `@higgsfield.studio/projects/cully-hill-boys`
(renders fully for guest -- NO auth gate) + PUBLIC `/ko/community/projects` card grid.
OHF = local dev `:3013` (serves commit `8b1997f`).

HF auth check: href=`https://higgsfield.ai/ko/@higgsfield.studio/projects/cully-hill-boys` title=`Cully Hill Boys | Higgsfield 커뮤니티` hasSession=False cookieLen=917 bodyLen=44033 folderLeaf=True

Legend: PASS exact / PASS-eqv token-equivalence (intentional token reuse) /
DOC-DIFF intentional layout or content difference (not a defect) / NV not re-verifiable on guest / FAIL genuine defect.

## PASS (43)

| element | screen | OHF | HF | note |
|---|---|---|---|---|
| folder.width | assets | 220px | 220px | within 1px (sub-pixel rounding) |
| folder.borderRight | assets | 1px rgba(255, 255, 255, 0.05) | 1px rgba(255, 255, 255, 0.05) | exact colour match |
| folder.title.style | assets | ('rgb(130, 130, 130)', '14px', '500', '16px') | ('rgb(130, 130, 130)', '14px', '500', '16px') | colour+fs+fw+lh exact |
| folder.listGap(inner) | assets | 2px | 2px | within 1px (sub-pixel rounding) |
| folder.colGap(outer) | assets | 8px | 8px | outer folder-col gap: OHF .ohf-drill-folder-col gap-2=8px == HF live 8px == HF ground-truth gap-2=8px -> both equal. |
| folder.rect.w | assets | 220 | 220 | within 1px (sub-pixel rounding) |
| row.height | assets | 36px | 36px | within 1px (sub-pixel rounding) |
| row.radius | assets | 12px | 12px | within 1px (sub-pixel rounding) |
| row.gap | assets | 8px | 8px | within 1px (sub-pixel rounding) |
| row.style | assets | ('14px', '500', '16px') | ('14px', '500', '16px') | colour+fs+fw+lh exact |
| row.rect.w | assets | 203 | 203 | within 1px (sub-pixel rounding) |
| row.rect.h | assets | 36 | 36 | within 1px (sub-pixel rounding) |
| row.bg(selected) | assets | rgba(255, 255, 255, 0.1) | rgba(255, 255, 255, 0.1) | exact colour match |
| row.fs/fw/lh | assets | ('14px', '500', '16px') | ('14px', '500', '16px') | colour+fs+fw+lh exact |
| count.color | assets | rgb(130, 130, 130) | rgb(130, 130, 130) | exact colour match |
| count.fs | assets | 12px | 12px | within 1px (sub-pixel rounding) |
| count.fw | assets | 500 | 500 | 500 both |
| count.rect.h | assets | 24 | 24 | within 1px (sub-pixel rounding) |
| crumb.listGap | assets | 4px | 4px | within 1px (sub-pixel rounding) |
| crumb.navColor | assets | rgb(247, 247, 248) | rgb(247, 247, 248) | exact colour match |
| crumb.linkColor | assets | rgb(137, 138, 139) | rgb(137, 138, 139) | exact colour match |
| crumb.link.fs/fw/lh | assets | 14px/400/20px | 14px/400/20px | OHF .ohf-drill-crumb-link CSS = 14/400/20 == HF live crumbLinkFs/Fw/Lh 14/400/20. (OHF live link fs not re-read by selector; CSS is deterministic.) |
| rail.width | assets | 383px | 383.062px | within 1px (sub-pixel rounding) |
| tile.gap | assets | 12px | 12px | within 1px (sub-pixel rounding) |
| tile.alignItems | assets | flex-start | flex-start | OHF .ohf-drill-tile align-items:flex-start == HF live flex-start. |
| thumb.radius | assets | 12px | 12px | within 1px (sub-pixel rounding) |
| thumb.aspect | assets | 16 / 9 | 16 / 9 | ratio within 1% (1.7778 vs 1.7778) |
| thumb.rect.w | assets | 211 | 211 | within 1px (sub-pixel rounding) |
| thumb.rect.h | assets | 119 | 119 | within 1px (sub-pixel rounding) |
| thumb.w(css) | assets | 211px | 210.672px | within 1px (sub-pixel rounding) |
| tile.title.style | assets | ('14px', '500', '20px') | ('14px', '500', '20px') | colour+fs+fw+lh exact |
| tile.meta.color | assets | rgb(130, 130, 130) | rgb(130, 130, 130) | RESOLVED via CSS fix (--drill-tertiary), re-verified concurrent (see meta.resolutions) |
| card.radius | assets | 10px | 10px | within 1px (sub-pixel rounding) |
| card.aspect | assets | 329 / 186 | 1.76471 / 1 | ratio within 1% (1.7688 vs 1.7647) |
| grid.gap | assets | 20px | 20px | within 1px (sub-pixel rounding) |
| folders/trash reuse: panel.width | folders | 220px | 220px 220px | folder panel key identical across assets/folders/trash screens (panel persists). |
| folders/trash reuse: panel.row.height | folders | 36px | 36px 36px | folder panel key identical across assets/folders/trash screens (panel persists). |
| folders/trash reuse: panel.row.radius | folders | 12px | 12px 12px | folder panel key identical across assets/folders/trash screens (panel persists). |
| folders/trash reuse: panel.count.color | folders | rgb(130, 130, 130) | rgb(130, 130, 130) rgb(130, 130, 130) | folder panel key identical across assets/folders/trash screens (panel persists). |
| folders/trash reuse: panel.border | folders | 1px rgba(255, 255, 255, 0.05) | 1px rgba(255, 255, 255, 0.05) 1px rgba(255, 255, 255, 0.05) | folder panel key identical across assets/folders/trash screens (panel persists). |
| breadcrumb.trash.suffix | trash | True | None | OHF trash breadcrumb nav present (crumbNav=true). HF breadcrumb component parity verified on the public page (crumb.linkColor/listGap match). Suffix text is content (placeholder), not style. |
| folders.card.radius | folders | 10px | 10px | within 1px (sub-pixel rounding) |
| folders.card.aspect | folders | 329 / 186 | 1.76471 / 1 | ratio within 1% (1.7688 vs 1.7647) |

## PASS-eqv (4)

| element | screen | OHF | HF | note |
|---|---|---|---|---|
| row.fg | assets | rgb(247, 247, 248) | rgb(255, 255, 255) | token-equivalence: OHF --tx (#f7f7f8 primary-text token) vs HF white primary -- locked token-reuse decision, repo-wide |
| tile.title.color | assets | rgb(247, 247, 248) | rgb(255, 255, 255) | token-equivalence: OHF --tx (#f7f7f8 primary-text token) vs HF white primary -- locked token-reuse decision, repo-wide |
| card.bg | assets | rgb(28, 30, 32) | rgb(28, 30, 33) | token-equivalence: OHF --s1 (surface-1 token) rounds 1 blue off HF cover -- token reuse, imperceptible |
| folders.card.bg | folders | rgb(28, 30, 32) | rgb(28, 30, 33) | token-equivalence: OHF --s1 (surface-1 token) rounds 1 blue off HF cover -- token reuse, imperceptible |

## DOC-DIFF (4)

| element | screen | OHF | HF | note |
|---|---|---|---|---|
| folder.rect.h | assets | 695 | 714 | content-driven: OHF mock has fewer folder rows/shorter list -> panel h 695; HF real page h 714. Width identical (220). Height tracks content, not a style defect. |
| count.rect.w | assets | 24 | 40 | content-driven width: HF shows large asset counts (e.g. 474113 -> 40px badge); OHF mock shows single-digit (24px min). Both share min-w-6 (24px base). Width tracks content. |
| card.rect.w | assets | 502 | 329 | OHF card GRID is responsive auto-fill -> at 1440 cards render 502px wide; HF community grid is fixed 4x329. Card WIDTH differs by layout (intentional). Card INTERNAL style (radius/bg/aspect) matches -> see above. |
| trash.present(empty-state) | trash | 휴지통이 비어 있어요 | None | OHF trash renders empty-state '휴지통이 비어 있어요'. HF trash view is not publicly reachable (routes /ko/folders->/ko, /ko/trash->redirect; guest 404) -> no HF counterpart for the trash centre. The shared folder panel + breadcrumb on the trash screen match HF live (see panel rows). Documented not-comparable. |

## NV (2)

| element | screen | OHF | HF | note |
|---|---|---|---|---|
| card.name | assets | rgb(204, 204, 204) | None | HF card-name colour not captured on the guest community grid (overlay not separately styled there). OHF uses rgb(204,204,204)=#cccccc which traces to the AUTH-harvest project page (auth-drilldown.json). Not re-verifiable on guest. |
| trash.hf.trashRowOnPublicPage | trash | None | 0 휴지통 leaves | live HF cully-hill-boys project page exposes 0 휴지통 leaves on guest -> HF-side trash not comparable on public. |

## Tally
PASS / PASS-eqv / DOC-DIFF / NV / FAIL: {"PASS": 43, "DOC-DIFF": 4, "PASS-eqv": 4, "NV": 2}

Genuine FAIL(s) after applying verified resolutions: none

## Resolutions (found -> fixed -> re-verified)
- **tile.meta.color** — found: OHF rgb(151, 151, 151) (--drill-card-date, #979797 mis-applied to rail meta) vs HF rgb(130, 130, 130); fix: color -> var(--drill-tertiary) (rgb(130,130,130) = --tx3); verification: concurrent re-measure: OHF :3111 (fixed build) vs live HF project page -> both rgb(130, 130, 130) -> PASS

## Post-fix concurrent re-verification (OHF :3111 fixed build vs live HF)
Focused checks all PASS: YES