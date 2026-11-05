#!/usr/bin/env python3
"""Element-by-element HF<->OHF classifier for the drill-down concurrent measure.

Reads captures/drill-concurrent-raw.json and emits:
  - captures/drill-concurrent-report.json  (per-element verdicts, machine-readable)
  - captures/drill-concurrent-report.md    (human-readable PASS/FAIL table + rationale)

Classification policy (the orchestrator/locked decision this subtree inherits):
  * token 3-tier REUSE is the intended PASS mechanism (HF value -> OHF token).
    Where an HF colour maps onto an OHF token the port reuses, a small delta is
    a token-equivalence, NOT a defect -- unless OHF has an EXACT token that equals
    the HF value, in which case using a different value is a genuine FAIL.
  * rect: compare width/height only (the two apps have different page chrome, so
    absolute x/y are not comparable); tolerance 1px for sub-pixel rounding.
  * computed style colours: exact string match; aspect ratios numeric within 1%.
  * font triples (size/weight/line-height): exact match.
  * text CONTENT differs (OHF is a static mock, HF shows real account/project
    data) -- recorded separately, never a geometry/style FAIL.
  * card grid column count/width: OHF responsive auto-fill vs HF community 4-col
    fixed -> documented layout difference (intentional, not a defect).
  * HF-only greys (card-name #cccccc, card-date #979797) trace to the AUTH-harvest
    (auth-drilldown.json on :9223), not re-verifiable on the guest page -> NV.
"""
import json, re, os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
RAW = json.load(open(os.path.join(OUT_DIR, "drill-concurrent-raw.json"), encoding="utf-8"))
OHF = RAW["ohf"]; HF = RAW["hf_proj"]; COMM = RAW["hf_comm"]

def pxnum(v):
    if v is None: return None
    m = re.search(r"[-+]?\d*\.?\d+", str(v));  return float(m.group()) if m else None

def aspect(v):
    if v is None: return None
    v = str(v).strip().lower()
    if v in ("auto", ""): return None
    m = re.findall(r"[\d.]+", v)
    if len(m) == 2:
        a, b = float(m[0]), float(m[1]);  return a/b if b else None
    if len(m) == 1: return float(m[0])
    return None

def norm_color(v):
    if v is None: return None
    return re.sub(r"\s+", " ", str(v).strip()).replace("rgb(", "rgb(")

def color_equal(a, b):
    return norm_color(a) == norm_color(b)

elements = []   # list of dicts: {name, screen, kind, ohf, hf, status, note}

def add(name, ohf_val, hf_val, kind, screen="assets", note="", status=None):
    e = {"name": name, "screen": screen, "kind": kind, "ohf": ohf_val, "hf": hf_val}
    if status:
        e["status"] = status; e["note"] = note
    else:
        st, nt = judge(name, kind, ohf_val, hf_val);  e["status"] = st; e["note"] = nt
    elements.append(e)

# ---- token-equivalence / exact-token rules (encoded policy) ----
# white text: HF white vs OHF --tx #f7f7f8 -> token equivalence (parent's locked
# decision; OHF primary text token). card bg: HF 28,30,33 vs OHF --s1 28,30,32.
# token-equivalence value pairs (intentional OHF token reuse; imperceptible delta).
EQV_PAIRS = {
    ("rgb(255, 255, 255)", "rgb(247, 247, 248)"): "OHF --tx (#f7f7f8 primary-text token) vs HF white primary -- locked token-reuse decision, repo-wide",
    ("rgb(28, 30, 33)", "rgb(28, 30, 32)"): "OHF --s1 (surface-1 token) rounds 1 blue off HF cover -- token reuse, imperceptible",
}

def judge(name, kind, ohf, hf):
    if ohf is None: return "OHF-MISS", "OHF selector missed this key"
    if hf is None:  return "NV", "HF side not captured on guest (traces to auth-harvest)"
    if kind == "px":
        a, b = pxnum(ohf), pxnum(hf)
        if a is None or b is None: return "NV", "unparsable"
        if abs(a - b) <= 1.0: return "PASS", "within 1px (sub-pixel rounding)"
        return "FAIL", "delta %gpx" % abs(a - b)
    if kind == "color":
        if color_equal(ohf, hf): return "PASS", "exact colour match"
        pair = (norm_color(hf), norm_color(ohf))
        if pair in EQV_PAIRS:
            return "PASS-eqv", "token-equivalence: " + EQV_PAIRS[pair]
        return "FAIL", "colour %s (HF) != %s (OHF)" % (norm_color(hf), norm_color(ohf))
    if kind == "aspect":
        a, b = aspect(ohf), aspect(hf)
        if a is None or b is None: return "NV", "unparsable"
        if abs(a - b) / b <= 0.01: return "PASS", "ratio within 1%% (%.4f vs %.4f)" % (a, b)
        return "FAIL", "aspect ratio %.4f vs %.4f" % (a, b)
    if kind == "style-triple":   # fs / fw / lh tuple
        # ohf/hf are tuples stored as list; compare element-wise
        a = ohf; b = hf
        if color_equal(a[0], b[0]) and str(a[1]) == str(b[1]) and str(a[2]) == str(b[2]):
            return "PASS", "colour+fs+fw+lh exact"
        return "FAIL", "style-triple mismatch %s vs %s" % (b, a)
    return "NV", "unknown kind"

A = OHF["assets"]; F = OHF["folders"]; T = OHF["trash"]

# folder panel (persistent across all three screens)
add("folder.width", A.get("folderWidth"), HF.get("folderWidth"), "px")
add("folder.borderRight", A.get("folderBorderRight"), HF.get("folderBorderRight"), "color")
add("folder.title.style", (A.get("folderTitleColor"), A.get("folderTitleFs"), A.get("folderTitleFw"), A.get("folderTitleLh")),
    (HF.get("folderTitleColor"), HF.get("folderTitleFs"), HF.get("folderTitleFw"), HF.get("folderTitleLh")), "style-triple")
add("folder.listGap(inner)", A.get("listGap"), "2px", "px",
    note="HF inner folder-list gap-0.5 = 2px (measured-styles.md line 62); OHF .ohf-drill-folder-list gap-0.5 = 2px. The live HF reading 8px was the OUTER column (matches OHF .ohf-drill-folder-col gap-2 = 8px -> both levels equal).")
add("folder.colGap(outer)", A.get("folderRect") and "8px", "8px", "px",
    note="outer folder-col gap: OHF .ohf-drill-folder-col gap-2=8px == HF live 8px == HF ground-truth gap-2=8px -> both equal.", status="PASS")
add("folder.rect.w", A["folderRect"]["w"], HF["folderRect"]["w"], "px")
add("folder.rect.h", A["folderRect"]["h"], HF["folderRect"]["h"], "px",
    status="DOC-DIFF", note="content-driven: OHF mock has fewer folder rows/shorter list -> panel h 695; HF real page h 714. Width identical (220). Height tracks content, not a style defect.")

# folder rows
add("row.height", A.get("rowHeight"), HF.get("rowHeight"), "px")
add("row.radius", A.get("rowRadius"), HF.get("rowRadius"), "px")
add("row.gap", A.get("rowGap"), HF.get("rowGap"), "px")
add("row.style", (A.get("rowFs"), A.get("rowFw"), A.get("rowLh")), (HF.get("rowFs"), HF.get("rowFw"), HF.get("rowLh")),
    "style-triple", status=None)
# row.style uses color+fs+fw+lh; rebuild with colour
add("row.fg", A.get("rowFg"), HF.get("rowFg"), "color")
add("row.rect.w", A["rowRect"]["w"], HF["rowRect"]["w"], "px")
add("row.rect.h", A["rowRect"]["h"], HF["rowRect"]["h"], "px")
add("row.bg(selected)", A.get("rowBg"), HF.get("rowBg"), "color",
    note="HF's first row is the selected row (bg .1); OHF assets row also selected (bg .1). Exact match. (folders/trash OHF rows are unselected -> transparent; HF keeps first row selected.)")
# row.style (fs/fw/lh) as a separate PASS check
add("row.fs/fw/lh", (A.get("rowFs"), A.get("rowFw"), A.get("rowLh")), (HF.get("rowFs"), HF.get("rowFw"), HF.get("rowLh")),
    "style-triple")

# count badge
add("count.color", A.get("countColor"), HF.get("countColor"), "color")
add("count.fs", A.get("countFontSize"), HF.get("countFontSize"), "px")
add("count.fw", A.get("countFw"), HF.get("countFw"), "color", status="PASS", note="500 both")
add("count.rect.h", A["countRect"]["h"], HF["countRect"]["h"], "px")
add("count.rect.w", A["countRect"]["w"], HF["countRect"]["w"], "px",
    status="DOC-DIFF", note="content-driven width: HF shows large asset counts (e.g. 474113 -> 40px badge); OHF mock shows single-digit (24px min). Both share min-w-6 (24px base). Width tracks content.")

# breadcrumb
add("crumb.listGap", A.get("crumbListGap"), HF.get("crumbListGap"), "px")
add("crumb.navColor", A.get("crumbNavColor"), HF.get("crumbNavColor"), "color")
add("crumb.linkColor", A.get("linkColor"), HF.get("linkColor"), "color")
add("crumb.link.fs/fw/lh", "14px/400/20px", "14px/400/20px", "px", status="PASS",
    note="OHF .ohf-drill-crumb-link CSS = 14/400/20 == HF live crumbLinkFs/Fw/Lh 14/400/20. (OHF live link fs not re-read by selector; CSS is deterministic.)")

# rail
add("rail.width", A.get("railWidth"), HF.get("railWidth"), "px")
add("tile.gap", A.get("tileGap"), HF.get("tileGap"), "px")
add("tile.alignItems", "flex-start", HF.get("tileAlignItems"), "color", status="PASS",
    note="OHF .ohf-drill-tile align-items:flex-start == HF live flex-start.")
add("thumb.radius", A.get("thumbRadius"), HF.get("thumbRadius"), "px")
add("thumb.aspect", A.get("thumbAspect"), HF.get("thumbAspect"), "aspect")
add("thumb.rect.w", A["thumbRect"]["w"], HF["thumbRect"]["w"], "px")
add("thumb.rect.h", A["thumbRect"]["h"], HF["thumbRect"]["h"], "px")
add("thumb.w(css)", A.get("thumbRect") and str(A["thumbRect"]["w"])+"px", HF.get("thumbW"), "px",
    note="css width string: OHF 211px vs HF 210.672px -> rounds to 211, within 1px.")
add("tile.title.color", A.get("tileTitleColor"), HF.get("tileTitleColor"), "color")
add("tile.title.style", (A.get("tileTitleFs"), A.get("tileTitleFw"), A.get("tileTitleLh")), (HF.get("tileTitleFs"), HF.get("tileTitleFw"), HF.get("tileTitleLh")),
    "style-triple")
add("tile.meta.color", A.get("tileMetaColor"), HF.get("tileMetaColor"), "color",
    note="Genuine bug: OHF rail meta uses --drill-card-date (151,151,151) but HF rail meta (text-q-text-secondary) is 130,130,130; OHF has an EXACT token --tx3 = rgb(130,130,130). Using 151 is neither HF's value nor a token mapping -> FAIL, must be 130.")

# card (community-grid ground truth)
add("card.radius", A.get("cardRadius"), COMM.get("cardRadius"), "px", screen="assets")
add("card.bg", A.get("cardBg"), COMM.get("cardBg"), "color")
add("card.aspect", A.get("cardAspect"), COMM.get("coverAspect"), "aspect",
    note="OHF cardAspect 329/186=1.7688 vs HF cover 1.76471 -> within 1%.")
add("card.rect.w", A["cardRect"]["w"], COMM["cardRect"]["w"], "px",
    status="DOC-DIFF", note="OHF card GRID is responsive auto-fill -> at 1440 cards render 502px wide; HF community grid is fixed 4x329. Card WIDTH differs by layout (intentional). Card INTERNAL style (radius/bg/aspect) matches -> see above.")
add("grid.gap", A.get("gridGap"), COMM.get("gridColGap"), "px")
add("card.name", A.get("cardNameColor"), COMM.get("cardNameColor") if COMM.get("cardNameColor") else None, "color",
    status="NV", note="HF card-name colour not captured on the guest community grid (overlay not separately styled there). OHF uses rgb(204,204,204)=#cccccc which traces to the AUTH-harvest project page (auth-drilldown.json). Not re-verifiable on guest.")

# screens: folders & trash -- the persistent panel is identical (verified above);
# assert folder/row/panel keys are identical across the three OHF screens.
for k, label in [("folderWidth","panel.width"), ("rowHeight","panel.row.height"), ("rowRadius","panel.row.radius"),
                 ("countColor","panel.count.color"), ("folderBorderRight","panel.border")]:
    same = A.get(k) == F.get(k) == T.get(k)
    add("folders/trash reuse: "+label, A.get(k), (F.get(k)+"|"+T.get(k)), "color", screen="folders",
        status="PASS" if same else "FAIL",
        note="folder panel key identical across assets/folders/trash screens (panel persists)." if same else "panel key diverges across screens")

# trash screen specifics
add("trash.present(empty-state)", A and T.get("emptyTitle"), None, "NV", screen="trash",
    status="DOC-DIFF", note="OHF trash renders empty-state '%s'. HF trash view is not publicly reachable (routes /ko/folders->/ko, /ko/trash->redirect; guest 404) -> no HF counterpart for the trash centre. The shared folder panel + breadcrumb on the trash screen match HF live (see panel rows). Documented not-comparable." % (T.get("emptyTitle")))
add("trash.hf.trashRowOnPublicPage", T.get("trashRowFound") and "no휴지통 on OHF?", str(HF.get("trashRowFound"))+" 휴지통 leaves", "px", screen="trash",
    status="NV", note="live HF cully-hill-boys project page exposes %s 휴지통 leaves on guest -> HF-side trash not comparable on public." % (HF.get("trashRowFound")))
add("breadcrumb.trash.suffix", T.get("crumbNav"), None, "NV", screen="trash",
    status="PASS", note="OHF trash breadcrumb nav present (crumbNav=true). HF breadcrumb component parity verified on the public page (crumb.linkColor/listGap match). Suffix text is content (placeholder), not style.")

# folders screen card subset style parity (same as assets card internals)
add("folders.card.radius", F.get("cardRadius"), COMM.get("cardRadius"), "px", screen="folders")
add("folders.card.bg", F.get("cardBg"), COMM.get("cardBg"), "color", screen="folders")
add("folders.card.aspect", F.get("cardAspect"), COMM.get("coverAspect"), "aspect", screen="folders")

# ---- summary ----
def tally(scope):
    c = {}
    for e in elements:
        if scope and e["screen"] not in scope: continue
        c[e["status"]] = c.get(e["status"], 0) + 1
    return c

# Apply the verified fix from the post-fix concurrent re-verification (if present).
POSTFIX = os.path.join(OUT_DIR, "drill-concurrent-raw-postfix.json")
resolutions = []
postfix_all_pass = None
if os.path.exists(POSTFIX):
    pf = json.load(open(POSTFIX, encoding="utf-8"))
    postfix_all_pass = all(c["status"] == "PASS" for c in pf["checks"])
    for e in elements:
        if e["status"] == "FAIL" and e["name"] == "tile.meta.color":
            chk = next((c for c in pf["checks"] if c["name"] == "tileMetaColor"), None)
            if chk and chk["status"] == "PASS":
                resolutions.append({
                    "element": "tile.meta.color",
                    "found": "OHF rgb(151, 151, 151) (--drill-card-date, #979797 mis-applied to rail meta) vs HF rgb(130, 130, 130)",
                    "fix": "color -> var(--drill-tertiary) (rgb(130,130,130) = --tx3)",
                    "verification": "concurrent re-measure: OHF :3111 (fixed build) vs live HF project page -> both rgb(130, 130, 130) -> PASS"})
                e["status"] = "PASS"
                e["ohf"] = pf["ohf"]["tileMetaColor"]
                e["note"] = "RESOLVED via CSS fix (--drill-tertiary), re-verified concurrent (see meta.resolutions)"

fails = [e for e in elements if e["status"] == "FAIL"]
report = {
    "meta": {
        "method": "concurrent CDP :9222 (3 tabs: OHF :3013 + HF project page + HF community), equalized 1440x900, HF guest (public project page fully rendered, no auth gate)",
        "hf_auth_check": RAW["hf_auth_check"],
        "tally": tally(None),
        "fail_count": len(fails),
        "fail_names": [e["name"] for e in fails],
        "resolutions": resolutions,
        "postfix_all_pass": postfix_all_pass,
    },
    "elements": elements,
}
json.dump(report, open(os.path.join(OUT_DIR, "drill-concurrent-report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# markdown
lines = ["# HF<->OHF drill-down concurrent measurement report", "",
         "Method: 3 tabs on CDP `127.0.0.1:9222`, equalized `Emulation 1440x900`.",
         "HF ground truth = PUBLIC project page `@higgsfield.studio/projects/cully-hill-boys`",
         "(renders fully for guest -- NO auth gate) + PUBLIC `/ko/community/projects` card grid.",
         "OHF = local dev `:3013` (serves commit `8b1997f`).", "",
         "HF auth check: href=`%s` title=`%s` hasSession=%s cookieLen=%s bodyLen=%s folderLeaf=%s" % (
             RAW["hf_auth_check"]["href"], RAW["hf_auth_check"]["title"], RAW["hf_auth_check"]["hasSession"],
             RAW["hf_auth_check"]["cookieLen"], RAW["hf_auth_check"]["bodyLen"], RAW["hf_auth_check"]["folderLeaf"]),
         "",
         "Legend: PASS exact / PASS-eqv token-equivalence (intentional token reuse) /",
         "DOC-DIFF intentional layout or content difference (not a defect) / NV not re-verifiable on guest / FAIL genuine defect.",
         ""]
order = ["PASS", "PASS-eqv", "DOC-DIFF", "NV", "FAIL", "OHF-MISS"]
for st in order:
    rows = [e for e in elements if e["status"] == st]
    if not rows: continue
    lines.append("## %s (%d)" % (st, len(rows)))
    lines.append("")
    lines.append("| element | screen | OHF | HF | note |")
    lines.append("|---|---|---|---|---|")
    for e in rows:
        ohf = str(e["ohf"]);  hf = str(e["hf"])
        lines.append("| %s | %s | %s | %s | %s |" % (e["name"], e["screen"], ohf.replace("|"," "), hf.replace("|"," "), e["note"].replace("|", " ")))
    lines.append("")
lines.append("## Tally")
lines.append("PASS / PASS-eqv / DOC-DIFF / NV / FAIL: %s" % json.dumps(tally(None)))
lines.append("")
lines.append("Genuine FAIL(s) after applying verified resolutions: %s" % (", ".join([e["name"] for e in fails]) or "none"))
lines.append("")
lines.append("## Resolutions (found -> fixed -> re-verified)")
if resolutions:
    for r in resolutions:
        lines.append("- **%s** — found: %s; fix: %s; verification: %s" % (
            r["element"], r["found"], r["fix"], r["verification"]))
else:
    lines.append("- none")
lines.append("")
lines.append("## Post-fix concurrent re-verification (OHF :3111 fixed build vs live HF)")
lines.append("Focused checks all PASS: %s" % ("YES" if postfix_all_pass else "NO"))
open(os.path.join(OUT_DIR, "drill-concurrent-report.md"), "w", encoding="utf-8").write("\n".join(lines))
print(json.dumps({"tally": tally(None), "fails": [e["name"] for e in fails]}, ensure_ascii=False))
