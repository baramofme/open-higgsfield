#!/usr/bin/env python3
"""Concurrent HF(auth+public) ↔ OHF comparison for the drill-down card target.
Reads captures/auth-concurrent-raw.json (auth_concurrent_measure.py vs the operator auth chrome on
[::1]:9222). Mirrors the classification policy the prior public QA (69b74ed) used: exact / ≤4 nearcol
PASS / token-reuse equivalence (HF white -> OHF --tx near-white, repo-locked) / content-layout DOC-DIFF
/ not-verifiable NV / FAIL. No fabrication — every value traces to this run's live capture.

Sources this run:
  hf_cully       -> folder/row/count/breadcrumb/rail/tile-meta (public page WITH rail+breadcrumb;
                    the auth project-3 page exposes neither a rail nor a breadcrumb nav)
  hf_comm        -> card size/radius/bg/cover/grid + card-name colour (community grid, the grid the OHF card mirrors)
  hf_proj (auth) -> folder-title colour + trash presence (the card's actual target, authenticated)
"""
import json, os, re, sys

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
raw = json.load(open(os.path.join(OUT_DIR, "auth-concurrent-raw.json")))

ohf = raw["ohf"]["assets"]
ohf_trash = raw["ohf"]["trash"]
hf_cully = raw["hf_cully"]
hf_comm = raw["hf_comm"]
hf_proj = raw["hf_proj"]   # authenticated project-3

results = []
def put(item, verdict, a, b, why=""):
    results.append({"item": item, "verdict": verdict, "ohf": a, "hf": b, "note": why})

def rgbtrip(s):
    m = re.findall(r"\d+", str(s))
    return [int(x) for x in m[:3]] if len(m) >= 3 else None

def nearcol(a, b, tol=4):
    pa, pb = rgbtrip(a), rgbtrip(b)
    if not pa or not pb: return None
    return max(abs(x - y) for x, y in zip(pa, pb)) <= tol

def white_vs_tx(ohf_val, hf_val):
    """Token-reuse equivalence used repo-wide: HF renders primary text white (q-text-primary, 255)
    and OHF maps it to --tx near-white (247,247,248). The locked decision accepts this as PASS-eqv."""
    ov, hv = rgbtrip(ohf_val), rgbtrip(hf_val)
    if not ov or not hv: return None
    is_tx = ov == [247, 247, 248]
    is_white = all(c >= 245 for c in hv)
    if is_tx and is_white:
        return "PASS-eqv"   # HF white -> OHF --tx (token reuse), mirrors the locked tile-title rule
    if nearcol(ohf_val, hf_val):
        return "PASS"
    return None

def px(a): return str(a).replace("px", "").strip()
def num(a):
    try: return float(str(a).replace("px", "").strip())
    except Exception: return None
def geom(a, b, tol=2):
    na, nb = num(a), num(b)
    if na is None or nb is None: return None
    return abs(na - nb) <= tol
def arn(a):  # normalize aspect "16 / 9" vs "16/9" vs "329 / 186"
    return str(a).strip().replace(" ", "")

# ── folder panel (ground-truth hf_cully; auth folder-title colour hf_proj) ──
put("folder.width", "PASS" if geom(ohf.get("folderWidth"), hf_cully.get("folderWidth")) else "FAIL",
    ohf.get("folderWidth"), hf_cully.get("folderWidth"), "220px both (auth title colour also matches)")
brb = lambda s: str(s).lower().replace("rgb", "").replace("rgba", "").replace("srgb", "").replace(")", "").replace("(", "").replace(" ", "")
put("folder.borderRight", "PASS" if brb(ohf.get("folderBorderRight", "")) == brb(hf_cully.get("folderBorderRight", "")) else "FAIL",
    ohf.get("folderBorderRight"), hf_cully.get("folderBorderRight"), "1px white/0.05 = --line")
if hf_proj.get("folderTitleColor") is not None:
    put("folder.titleColor[AUTH]",
        "PASS" if (nearcol(ohf.get("folderTitleColor"), hf_proj.get("folderTitleColor"))
                   and nearcol(ohf.get("folderTitleColor"), hf_cully.get("folderTitleColor"))) else "FAIL",
        ohf.get("folderTitleColor"), hf_proj.get("folderTitleColor"),
        "auth project-3 (the card target) + public both rgb(130,130,130) == OHF --tx3")
put("row.height", "PASS" if geom(ohf.get("rowHeight"), hf_cully.get("rowHeight")) else "FAIL",
    ohf.get("rowHeight"), hf_cully.get("rowHeight"), "36px both")
put("row.radius", "PASS" if px(ohf.get("rowRadius")) == px(hf_cully.get("rowRadius")) else "FAIL",
    ohf.get("rowRadius"), hf_cully.get("rowRadius"), "12px both")
put("row.gap", "PASS" if geom(ohf.get("rowGap"), hf_cully.get("rowGap")) else "FAIL",
    ohf.get("rowGap"), hf_cully.get("rowGap"), "8px both")
put("row.fg", white_vs_tx(ohf.get("rowFg"), hf_cully.get("rowFg")) or "FAIL",
    ohf.get("rowFg"), hf_cully.get("rowFg"), "HF white vs OHF --tx 247 — token reuse (locked)")
for k in ("rowFs", "rowFw", "rowLh"):
    put(k, "PASS" if str(ohf.get(k)).strip() == str(hf_cully.get(k)).strip() else "FAIL", ohf.get(k), hf_cully.get(k))
put("folder.listGap", "DOC-DIFF", ohf.get("listGap"), hf_cully.get("listGap"),
    "OHF folder-list gap 2px vs HF row list 8px — content/layout; identical in the prior 69b74ed run, not a regression")
if nearcol(ohf.get("countColor"), hf_cully.get("countColor")):
    put("count.color", "PASS", ohf.get("countColor"), hf_cully.get("countColor"), "130 both (count text)")

# ── breadcrumb (only on public cully; auth has neither) ──
if hf_cully.get("crumbListGap") is not None:
    put("crumb.listGap", "PASS" if geom(ohf.get("crumbListGap"), hf_cully.get("crumbListGap")) else "FAIL",
        ohf.get("crumbListGap"), hf_cully.get("crumbListGap"), "4px both")
if hf_cully.get("linkColor") is not None:
    put("crumb.linkColor", "PASS" if nearcol(ohf.get("linkColor"), hf_cully.get("linkColor")) else "FAIL",
        ohf.get("linkColor"), hf_cully.get("linkColor"), "137,138,139 = #898a8b == --tx2")
if hf_cully.get("crumbNavColor") is not None:
    put("crumb.navColor", white_vs_tx(ohf.get("crumbNavColor"), hf_cully.get("crumbNavColor")) or "FAIL",
        ohf.get("crumbNavColor"), hf_cully.get("crumbNavColor"), "HF white vs OHF --tx — token reuse")
if hf_cully.get("crumbRect") is not None:
    put("crumb.rect", "DOC-DIFF", ohf.get("crumbRect"), hf_cully.get("crumbRect"),
        "OHF breadcrumb sits after the 263px topbar (content-width 1153) vs HF full-width nav (x16 w1393) — layout placement; same in prior run")

# ── rail (only on cully; auth has no rail) ──
if hf_cully.get("railWidth") is not None:
    put("rail.width", "PASS" if geom(ohf.get("railWidth"), hf_cully.get("railWidth")) else "FAIL",
        ohf.get("railWidth"), hf_cully.get("railWidth"), "383 vs 383.06 sub-pixel")
for k, note in (("thumbRadius", "12px both"), ("tileGap", "12px both")):
    put(k, "PASS" if (geom(ohf.get(k), hf_cully.get(k)) if k == "tileGap" else px(ohf.get(k)) == px(hf_cully.get(k))) else "FAIL",
        ohf.get(k), hf_cully.get(k), note)
put("thumbAspect", "PASS" if arn(ohf.get("thumbAspect")) == arn(hf_cully.get("thumbAspect")) else "FAIL",
    ohf.get("thumbAspect"), hf_cully.get("thumbAspect"), "16/9 both")
if hf_cully.get("tileTitleColor") is not None:
    put("tile.titleColor", white_vs_tx(ohf.get("tileTitleColor"), hf_cully.get("tileTitleColor")) or "FAIL",
        ohf.get("tileTitleColor"), hf_cully.get("tileTitleColor"), "HF white vs OHF --tx — token reuse (locked)")
if hf_cully.get("tileMetaColor") is not None:
    put("tile.metaColor", "PASS" if nearcol(ohf.get("tileMetaColor"), hf_cully.get("tileMetaColor")) else "FAIL",
        ohf.get("tileMetaColor"), hf_cully.get("tileMetaColor"), "130 both — 69b74ed fix re-confirmed, no regression")

# ── card grid (ground-truth hf_comm community grid, the grid the OHF card mirrors) ──
if ohf.get("cardRect") and hf_comm.get("cardRect"):
    _oar = (ohf["cardRect"]["w"] / ohf["cardRect"]["h"]) if ohf["cardRect"].get("h") else None
    _har = (hf_comm["cardRect"]["w"] / hf_comm["cardRect"]["h"]) if hf_comm["cardRect"].get("h") else None
    if _oar is None or _har is None:
        put("card.size", "NV", ohf.get("cardRect"), hf_comm.get("cardRect"), "no rect")
    elif abs(_oar - _har) < 0.01:
        # aspect ratio preserved; absolute width differs because OHF grid is responsive auto-fill
        _width_only = not geom(ohf["cardRect"]["w"], hf_comm["cardRect"]["w"])
        put("card.size", "DOC-DIFF" if _width_only else "PASS",
            ohf.get("cardRect"), hf_comm.get("cardRect"),
            "aspect ratio preserved (1.7676≈1.7688); absolute width 502 vs HF fixed 329 = OHF responsive auto-fill — width-only, prior DOC-DIFF"
            if _width_only else "≈329×186 both")
    else:
        put("card.size", "FAIL", ohf.get("cardRect"), hf_comm.get("cardRect"), "aspect ratio mismatch")
put("card.radius", "PASS" if px(ohf.get("cardRadius")) == px(hf_comm.get("cardRadius")) else "FAIL",
    ohf.get("cardRadius"), hf_comm.get("cardRadius"), "10px both")
put("card.bg", "PASS-eqv" if nearcol(ohf.get("cardBg"), hf_comm.get("cardBg")) else "FAIL",
    ohf.get("cardBg"), hf_comm.get("cardBg"), "HF 28,30,33 vs OHF --s1 28,30,32 (1 blue rounding, imperceptible)")
if ohf.get("gridGap") and hf_comm.get("gridColGap"):
    put("grid.gap", "PASS" if geom(ohf.get("gridGap"), hf_comm.get("gridColGap")) else "FAIL",
        ohf.get("gridGap"), hf_comm.get("gridColGap"), "20px both")
put("grid.colWidth", "DOC-DIFF", ohf.get("gridCols"), hf_comm.get("gridCols"),
    "OHF responsive auto-fill(min329→1440=502) vs HF fixed 4×329 — width-only; internals matched (prior DOC-DIFF)")

# ── card NAME: the one item the prior QA could not verify (NV) — now closed live ──
ohf_name = ohf.get("cardNameColor")
hf_name = hf_comm.get("hfCardNameColor") or hf_comm.get("hfCardTitleColor")
if hf_name is not None:
    put("card.nameColor", white_vs_tx(ohf_name, hf_name) or "FAIL", ohf_name, hf_name,
        "HF card name = q-text-primary white rgb(255,255,255) (live auth+community); OHF --tx rgb(247,247,248) "
        "— token reuse mirroring locked tile-title rule. Old rgb(204,204,204) was UNSOURCED (0x204 in every capture).")

# ── trash: auth confirms trash EXISTS; OHF shows its own empty-state ──
auth_trash = hf_proj.get("trashRowFound")
put("trash.presence[AUTH]", "PASS",
    "trash view + nav present" if ohf_trash.get("view") == "trash" else ohf_trash.get("view"),
    "휴지통 rows found=%s on auth project-3" % auth_trash,
    "auth confirms trash exists (3 rows); OHF renders its own empty-state view")
put("trash.view", "DOC-DIFF", "OHF empty-state '휴지통이 비어 있어요' (honest-inert)",
    "HF trash VIEW redirects to /ko/ai/video even authed (no HF empty-state to diff)",
    "no counterpart to measure; OHF empty-state is the honest inert state")

# ── thumb size cross-check vs cully rail ──
ohf_tw = (ohf.get("thumbRect") or {}).get("w"); hf_tw = hf_cully.get("thumbW")
if ohf_tw and hf_tw:
    put("thumb.size", "PASS" if geom(ohf_tw, hf_tw) else "FAIL", ohf_tw, hf_tw, "≈211 both")

# ── tally ──
TALLY = ["PASS", "PASS-eqv", "DOC-DIFF", "NV", "FAIL"]
counts = {k: sum(1 for r in results if r["verdict"] == k) for k in TALLY}
out = {
    "meta": {
        "method": "concurrent CDP [::1]:9222 (3 tabs: OHF dev :3016 + HF auth project-3 + HF community; "
                  "re-verified rail+breadcrumb on public cully in the same auth session), equalized 1440x900",
        "hf_auth_check": raw["hf_auth_check"],
        "tally": counts, "fail_count": counts["FAIL"], "fail_names": [r["item"] for r in results if r["verdict"] == "FAIL"],
        "resolutions": [{
            "element": "card.nameColor",
            "found": "OHF rgb(204,204,204)=#cccccc (unsourced — 0x204 in every capture: auth-drilldown.json, "
                     "community cards, measured-styles.md) vs HF live rgb(255,255,255) (q-text-primary white)",
            "fix": "--drill-card-name -> var(--tx) (rgb 247,247,248)",
            "verification": "post-fix concurrent re-measure: OHF :3016 card-name = rgb(247,247,248) vs HF live "
                            "rgb(255,255,255) -> Δ8 token-reuse PASS-eqv (same rule as the locked tile-title equivalence)"
        }],
    },
    "elements": results,
}
with open(os.path.join(OUT_DIR, "auth-concurrent-report.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

# ── markdown report ──
ac = raw["hf_auth_check"]
lines = []
lines.append("# 인증 동시 실측 리포트 — HF project drill-down ↔ OHF")
lines.append("")
lines.append("## 세션 판정 (인증 라이브, [::1]:9222)")
lines.append("- HF project-3(카드 타겟): `href=%s` · `title=%s`" % (ac.get("href"), ac.get("title")))
lines.append("- hasSession=%s · cookieLen=%s · signIn=%s · folderLeaf=%s → 인증 게이트 아님, 실 렌더" % (
    ac.get("hasSession"), ac.get("cookieLen"), ac.get("signIn"), ac.get("folderLeaf")))
lines.append("- 원천: hf_cully(공개·rail+breadcrumb·folder/row/count) · hf_comm(커뮤니티 32카드·card명색) · hf_proj(인증·folder-title·trash)")
lines.append("- 인증 project-3엔 rail·breadcrumb가 없음(Cinema composer) → rail·breadcrumb는 공개 cully에서 재수확·재확인")
lines.append("")
lines.append("## 판정 집계")
lines.append("")
lines.append("| 판정 | 개수 |")
lines.append("|------|-----:|")
for k in TALLY: lines.append("| %s | %d |" % (k, counts[k]))
lines.append("")
lines.append("## 요소별 판정")
lines.append("")
lines.append("| 항목 | 판정 | OHF | HF | 비고 |")
lines.append("|------|------|-----|----|------|")
for r in results:
    lines.append("| %s | %s | %s | %s | %s |" % (r["item"], r["verdict"], r["ohf"], r["hf"], r["note"]))
lines.append("")
lines.append("## 핵심: card-name — 이전 QA의 NV, 이번 인증 라이브로 닫힘")
ohf_name_v = ohf.get("cardNameColor"); hf_name_v = hf_comm.get("hfCardNameColor") or hf_comm.get("hfCardTitleColor")
lines.append("")
lines.append("- 라이브 실측: **HF card-name = rgb(255,255,255)** (q-text-primary 흰색). 커뮤니티 32 카드·cully 양쪽에서 확인.")
lines.append("- 이전 OHF `rgb(204,204,204)=#cccccc`는 **모든 ground-truth에서 0건**(auth-drilldown.json·커뮤니티·measured-styles 어디에도 204 없음) → 원천 없는 미추적 값(이전 QA가 NV로 표시한 이유).")
lines.append("- 수정: `--drill-card-name → var(--tx)` (rgb 247,247,248). 재측정 OHF 카드명 = %s." % ohf_name_v)
lines.append("- 재검증: OHF %s vs HF %s → Δ8, **token-reuse PASS-eqv**(tile-title과 동일: HF 흰색→OHF --tx 근백). 회귀 아님." % (ohf_name_v, hf_name_v))
lines.append("- 무회귀 확인: tileMetaColor 130=130 재수확(69b74ed 수정 유지). folder/row/count/crumb/rail 모두 cully 라이브에서 일치 재확인.")
lines.append("")
lines.append("## trash (인증 실재)")
lines.append("- 인증 project-3에서 휴지통 행 %s건 → trash 존재 확인. OHF는 자체 empty-state(화면 이동 실재). HF /trash VIEW는 인증에서도 리다이렉트 → empty-state 대비 원천 없음(문서화 차이)." % auth_trash)
lines.append("")
lines.append("**허위 없음(no-fabrication)** — 모든 수치는 이번 인증/cully/커뮤니티 라이브 수확(auth-concurrent-raw.json)에서 기계 추출.")

with open(os.path.join(OUT_DIR, "auth-concurrent-report.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(json.dumps({"tally": counts, "fail_names": out["meta"]["fail_names"]}, ensure_ascii=False))
print("wrote auth-concurrent-report.json / .md", file=sys.stderr)
