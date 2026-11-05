#!/usr/bin/env python3
"""앵커 1:1 비교 — OHF 하베스트 vs HF ground-truth (t_bb8f3edb).

비교 단위: data-ohf-video="<HF nid>" 로 표식된 요소 하나 ↔ GT 의 그 nid 요소.
- rect: 0.1px 실측 → ±1.0px 허용(서브픽셀 라운딩 차이).
- 스타일: SK 키별 문자열 정합. 색 직렬화(oklab vs rgb)는 튜플 동값이면 통과로 둔다.
- own-text: 공백 정규화 후 정합.
정렬: 그리드 루트(102)의 오프셋을 상쇄한다(OHF 셸의 내비 높이 차이는 별도 보고).
"""
import json, re, pathlib, sys
ROOT = pathlib.Path("/home/baramofme/open-higgsfield/.worktrees/t_bb8f3edb")
GT = json.load(open("/home/baramofme/.hermes/kanban/attachments/t_a1c5ed28/hf_video_ground_truth.json", encoding="utf-8"))
GTE = {e["nid"]: e for e in GT["captures"]["preDismiss"]["elements"]}
OHF = json.load(open(ROOT / "landing_verify/ohf_video_surface_harvest.json", encoding="utf-8"))
MAP = json.load(open(ROOT / "landing_verify/anchor_map.json", encoding="utf-8"))
NIDS = sorted(int(v) for v in MAP.values())

by_anchor = {}
for e in OHF["elements"]:
    a = (e.get("attrs") or {}).get("data-ohf-video") or e.get("anchor") or ""
    if a.isdigit():
        by_anchor.setdefault(int(a), e)

def parse_color(s):
    s = (s or "").strip()
    m = re.fullmatch(r"rgb\(([^)]+)\)", s) or re.fullmatch(r"rgba\(([^)]+)\)", s)
    if m:
        p = [x.strip() for x in m.group(1).split(",")]
        try:
            r, g, b = int(p[0]), int(p[1]), int(p[2])
            a = float(p[3]) if len(p) > 3 else 1.0
            return (r, g, b, round(a, 3))
        except ValueError:
            return None
    if s.startswith("oklab") or s.startswith("oklch") or s.startswith("color("):
        return "NONRGB"
    return None

COLOR_KEYS = {"color", "backgroundColor", "borderTopColor", "borderRightColor",
              "borderBottomColor", "borderLeftColor"}

def style_issue(k, gv, ov):
    """두 computed 문자열을 비교해 (kind, detail) 또는 None 를 반환한다."""
    if gv == ov:
        return None
    if k in COLOR_KEYS:
        gt, ot = parse_color(gv), parse_color(ov)
        if gt and ot and gt == ot:
            return None  # 직렬화만 다른 동값 색
        if gt == "NONRGB" or ot == "NONRGB":
            return ("color-serialization", f"{gv[:60]} vs {ov[:60]}")
        return ("color", f"{gv} vs {ov}")
    if k == "boxShadow":
        # 각 레이어의 색 튜플을 비교(순서·오프셋은 문자열 정합으로 본다)
        gl = re.findall(r"rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|oklab\([^)]*\)", gv or "")
        ol = re.findall(r"rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|oklab\([^)]*\)", ov or "")
        gtup = [parse_color(x) for x in gl]
        otup = [parse_color(x) for x in ol]
        if len(gtup) == len(otup):
            pairs = []
            for a, b in zip(gtup, otup):
                if a == b:
                    continue
                if a == "NONRGB" or b == "NONRGB":
                    pairs.append("serial")
                    continue
                pairs.append(f"{a} vs {b}")
            if not pairs:
                return ("shadow-geometry", f"{gv[:70]} vs {ov[:70]}")
            return ("shadow-color", "; ".join(pairs))
        return ("shadow", f"{gv[:70]} vs {ov[:70]}")
    return ("style", f"{k}: {gv} vs {ov}")

DEFAULTISH = {"", "none", "normal", "auto", "rgba(0, 0, 0, 0)", "0px", "visible",
              "static", "1", "start", "baseline", "flex-start", "nowrap"}

issues = []
shell_dx = shell_dy = 0
missing = []
extra = []

root_gt, root_ohf = GTE.get(102), by_anchor.get(102)
if root_gt and root_ohf:
    shell_dx = root_ohf["rect"]["x"] - root_gt["rect"]["x"]
    shell_dy = root_ohf["rect"]["y"] - root_gt["rect"]["y"]

for nid in NIDS:
    gt, ohf = GTE.get(nid), by_anchor.get(nid)
    if gt is None:
        missing.append(nid); continue
    if ohf is None:
        extra.append(("no-anchor", nid)); continue
    gr, orr = gt["rect"], ohf["rect"]
    ox, oy = orr["x"] - shell_dx, orr["y"] - shell_dy
    for axis, g, o in (("x", gr["x"], ox), ("y", gr["y"], oy), ("w", gr["w"], orr["w"]), ("h", gr["h"], orr["h"])):
        if abs(g - o) > 1.0:
            issues.append((nid, "rect", f"{axis}: {g} vs {round(o,1)}"))
    gtxt = re.sub(r"\s+", " ", gt.get("txt") or "").strip()
    otxt = re.sub(r"\s+", " ", ohf.get("txt") or "").strip()
    if gtxt != otxt:
        issues.append((nid, "text", f"{gtxt[:50]!r} vs {otxt[:50]!r}"))
    gst, ost = gt.get("sty") or {}, ohf.get("sty") or {}  # OHF harvest emits styles under `sty` too
    for k in sorted(set(gst) | set(ost)):
        gv, ov = gst.get(k, ""), ost.get(k, "")
        if gv == ov:
            continue
        if gv in DEFAULTISH and ov in DEFAULTISH:
            continue  # 양쪽 다 초기값 영역 → 실질 동등
        r = style_issue(k, gv, ov)
        if r:
            issues.append((nid, r[0], r[1]))

from collections import Counter, defaultdict
print(f"anchors compared: {len(NIDS)} | issues: {len(issues)}")
print("shell offset (OHF grid vs HF grid):", shell_dx, shell_dy)
print("missing in GT:", missing, "| anchored but absent in OHF:", [n for _, n in extra][:12])
by_kind = Counter(k for _, k, _ in issues)
print("kinds:", dict(by_kind))
per = defaultdict(list)
for nid, kind, det in issues:
    per[nid].append((kind, det))
order = sorted(per, key=lambda n: -len(per[n]))
out = []
for nid in order[:40]:
    g = GTE[nid]
    out.append(f"--- #{nid} <{g['tag']}> {(g.get('attrs') or {}).get('class','')[:70]} rect {g['rect']['x']},{g['rect']['y']} {g['rect']['w']}x{g['rect']['h']}")
    for kind, det in per[nid][:8]:
        out.append(f"    [{kind}] {det}")
(ROOT / "landing_verify/compare_report.txt").write_text("\n".join(out), encoding="utf-8")
json.dump({"issues": [[n, k, d] for n, k, d in issues]}, open(ROOT / "landing_verify/compare_issues.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\n".join(out[:26]))
