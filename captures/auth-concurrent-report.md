# 인증 동시 실측 리포트 — HF project drill-down ↔ OHF

## 세션 판정 (인증 라이브, [::1]:9222)
- HF project-3(카드 타겟): `href=https://higgsfield.ai/ko/generate/@exploringdonut1792/project-3` · `title=Cinema Studio 4.0 · 모든 디테일을 직접 연출 | Higgsfield`
- hasSession=True · cookieLen=3510 · signIn=False · folderLeaf=True → 인증 게이트 아님, 실 렌더
- 원천: hf_cully(공개·rail+breadcrumb·folder/row/count) · hf_comm(커뮤니티 32카드·card명색) · hf_proj(인증·folder-title·trash)
- 인증 project-3엔 rail·breadcrumb가 없음(Cinema composer) → rail·breadcrumb는 공개 cully에서 재수확·재확인

## 판정 집계

| 판정 | 개수 |
|------|-----:|
| PASS | 21 |
| PASS-eqv | 5 |
| DOC-DIFF | 5 |
| NV | 0 |
| FAIL | 0 |

## 요소별 판정

| 항목 | 판정 | OHF | HF | 비고 |
|------|------|-----|----|------|
| folder.width | PASS | 220px | 220px | 220px both (auth title colour also matches) |
| folder.borderRight | PASS | 1px rgba(255, 255, 255, 0.05) | 1px rgba(255, 255, 255, 0.05) | 1px white/0.05 = --line |
| folder.titleColor[AUTH] | PASS | rgb(130, 130, 130) | rgb(130, 130, 130) | auth project-3 (the card target) + public both rgb(130,130,130) == OHF --tx3 |
| row.height | PASS | 36px | 36px | 36px both |
| row.radius | PASS | 12px | 12px | 12px both |
| row.gap | PASS | 8px | 8px | 8px both |
| row.fg | PASS-eqv | rgb(247, 247, 248) | rgb(255, 255, 255) | HF white vs OHF --tx 247 — token reuse (locked) |
| rowFs | PASS | 14px | 14px |  |
| rowFw | PASS | 500 | 500 |  |
| rowLh | PASS | 16px | 16px |  |
| folder.listGap | DOC-DIFF | 2px | 8px | OHF folder-list gap 2px vs HF row list 8px — content/layout; identical in the prior 69b74ed run, not a regression |
| count.color | PASS | rgb(130, 130, 130) | rgb(130, 130, 130) | 130 both (count text) |
| crumb.listGap | PASS | 4px | 4px | 4px both |
| crumb.linkColor | PASS | rgb(137, 138, 139) | rgb(137, 138, 139) | 137,138,139 = #898a8b == --tx2 |
| crumb.navColor | PASS-eqv | rgb(247, 247, 248) | rgb(247, 247, 248) | HF white vs OHF --tx — token reuse |
| crumb.rect | DOC-DIFF | {'x': 263, 'y': 16, 'w': 1153, 'h': 20} | {'x': 16, 'y': 62, 'w': 1393, 'h': 20} | OHF breadcrumb sits after the 263px topbar (content-width 1153) vs HF full-width nav (x16 w1393) — layout placement; same in prior run |
| rail.width | PASS | 383px | 383.062px | 383 vs 383.06 sub-pixel |
| thumbRadius | PASS | 12px | 12px | 12px both |
| tileGap | PASS | 12px | 12px | 12px both |
| thumbAspect | PASS | 16 / 9 | 16 / 9 | 16/9 both |
| tile.titleColor | PASS-eqv | rgb(247, 247, 248) | rgb(255, 255, 255) | HF white vs OHF --tx — token reuse (locked) |
| tile.metaColor | PASS | rgb(130, 130, 130) | rgb(130, 130, 130) | 130 both — 69b74ed fix re-confirmed, no regression |
| card.size | DOC-DIFF | {'x': 503, 'y': 56, 'w': 502, 'h': 284} | {'x': 32, 'y': 422, 'w': 329, 'h': 186} | aspect ratio preserved (1.7676≈1.7688); absolute width 502 vs HF fixed 329 = OHF responsive auto-fill — width-only, prior DOC-DIFF |
| card.radius | PASS | 10px | 10px | 10px both |
| card.bg | PASS-eqv | rgb(28, 30, 32) | rgb(28, 30, 33) | HF 28,30,33 vs OHF --s1 28,30,32 (1 blue rounding, imperceptible) |
| grid.gap | PASS | 20px | 20px | 20px both |
| grid.colWidth | DOC-DIFF | None | 329px 329px 329px 329px | OHF responsive auto-fill(min329→1440=502) vs HF fixed 4×329 — width-only; internals matched (prior DOC-DIFF) |
| card.nameColor | PASS-eqv | rgb(247, 247, 248) | rgb(255, 255, 255) | HF card name = q-text-primary white rgb(255,255,255) (live auth+community); OHF --tx rgb(247,247,248) — token reuse mirroring locked tile-title rule. Old rgb(204,204,204) was UNSOURCED (0x204 in every capture). |
| trash.presence[AUTH] | PASS | trash view + nav present | 휴지통 rows found=3 on auth project-3 | auth confirms trash exists (3 rows); OHF renders its own empty-state view |
| trash.view | DOC-DIFF | OHF empty-state '휴지통이 비어 있어요' (honest-inert) | HF trash VIEW redirects to /ko/ai/video even authed (no HF empty-state to diff) | no counterpart to measure; OHF empty-state is the honest inert state |
| thumb.size | PASS | 211 | 210.672px | ≈211 both |

## 핵심: card-name — 이전 QA의 NV, 이번 인증 라이브로 닫힘

- 라이브 실측: **HF card-name = rgb(255,255,255)** (q-text-primary 흰색). 커뮤니티 32 카드·cully 양쪽에서 확인.
- 이전 OHF `rgb(204,204,204)=#cccccc`는 **모든 ground-truth에서 0건**(auth-drilldown.json·커뮤니티·measured-styles 어디에도 204 없음) → 원천 없는 미추적 값(이전 QA가 NV로 표시한 이유).
- 수정: `--drill-card-name → var(--tx)` (rgb 247,247,248). 재측정 OHF 카드명 = rgb(247, 247, 248).
- 재검증: OHF rgb(247, 247, 248) vs HF rgb(255, 255, 255) → Δ8, **token-reuse PASS-eqv**(tile-title과 동일: HF 흰색→OHF --tx 근백). 회귀 아님.
- 무회귀 확인: tileMetaColor 130=130 재수확(69b74ed 수정 유지). folder/row/count/crumb/rail 모두 cully 라이브에서 일치 재확인.

## trash (인증 실재)
- 인증 project-3에서 휴지통 행 3건 → trash 존재 확인. OHF는 자체 empty-state(화면 이동 실재). HF /trash VIEW는 인증에서도 리다이렉트 → empty-state 대비 원천 없음(문서화 차이).

**허위 없음(no-fabrication)** — 모든 수치는 이번 인증/cully/커뮤니티 라이브 수확(auth-concurrent-raw.json)에서 기계 추출.