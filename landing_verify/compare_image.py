#!/usr/bin/env python3
"""OHF↔HF 이미지 surface 앵커 비교 — HF ground-truth 인덱스와 OHF data-ohf-image를 1:1 대응.

출력: issues 리스트(rect/style/text/MISS), 요약 카운트.
"""
import json, pathlib

BASE = pathlib.Path("/home/baramofme/open-higgsfield/.worktrees/t_f3de705e/landing_verify")
HF = json.load(open("/home/baramofme/open-higgsfield/.worktrees/t_38d43cc9/landing_verify/hf_image_surface_ground_truth.json", encoding="utf-8"))
OHF = json.load(open(BASE / "ohf_image_surface_harvest.json", encoding="utf-8"))

# 앵커명 → HF 요소 인덱스 (tsx 주석의 #N 기준)
MAP = {
    "topline": 101,
    "stage": 113, "scroller": 114, "hero": 115,
    "noticebar": 116, "noticeicon": 117, "noticebook": 118,
    "noticetext": 120, "noticeline1": 121, "noticeline2": 122,
    "noticeactions": 123, "noticecta": 124, "noticeclose": 125,
    "band": 128, "bandGhost": 129, "bandSolid": 146,
    "ghost.slot1": 130, "ghost.card1rot": 131, "ghost.card1": 132, "ghost.card1img": 133,
    "ghost.slot2": 134, "ghost.card2rot": 135, "ghost.card2": 136, "ghost.card2img": 137,
    "ghost.slot3": 138, "ghost.card3rot": 139, "ghost.card3": 140, "ghost.card3img": 141,
    "ghost.slot4": 142, "ghost.card4rot": 143, "ghost.card4": 144, "ghost.card4img": 145,
    "solid.slot1": 147, "solid.card1rot": 148, "solid.card1": 149, "solid.card1img": 150,
    "solid.slot2": 151, "solid.card2rot": 152, "solid.card2": 153, "solid.card2img": 154,
    "solid.slot3": 155, "solid.card3rot": 156, "solid.card3": 157, "solid.card3img": 158,
    "solid.slot4": 159, "solid.card4rot": 160, "solid.card4": 161, "solid.card4img": 162,
    "herotext": 163, "herotextHead": 164, "headline": 165, "headline1": 166, "headline2": 167,
    "herodesc": 168,
    "dock": 169, "form": 170, "fieldset": 171, "col": 172, "promptrow": 173, "prompt": 174,
    "editor": 175, "editorp": 176, "placeholder": 177, "controls": 178, "assets": 179,
    "assetsbtn": 180,
    "modelwrap": 183, "modelfieldset": 184, "modellabel": 185, "modelbtn": 186,
    "modelinner": 187, "modellead": 188, "modelicon": 189, "modelname": 192,
    "setwrap": 195, "chevronGhost": 196, "trackscroll": 198, "track": 199, "trackInner": 200,
    "camera": 201, "camicon": 202, "camiconinner": 203, "cambox": 204, "camscale": 205,
    "cambadge": 206, "caminset": 207, "camin2": 208, "camphoto": 209, "camglow": 210,
    "camsheen": 211, "camring": 212, "camlabel": 213,
    "ctgroup": 214, "ct": 215, "ctinner": 216, "ctbtn": 217, "cticon": 218, "cticoninner": 219,
    "ctlabel": 225, "ctnew": 226,
    "ratio": 227, "ratioicon": 228, "ratiolabel": 231,
    "quality": 232, "qualicon": 233, "quallabel": 236,
    "elements": 237, "stepperouter": 240, "stepper": 241, "stepminus": 242,
    "stepnum": 245, "steptotal": 246, "stepplus": 247, "chevronRight": 250,
    "aside": 253, "charwrap": 254, "charbox": 255, "charfig": 256, "charwash": 257,
    "charlabel": 258, "charbadge": 259, "charbadgegrid": 260, "charbadgeinner": 261,
    "generate": 264, "genhairline": 265, "genglow": 266, "gencontent": 267, "genlabel": 268,
    "gentext": 269, "gencost": 270, "costnum": 273,
    "helpzone": 274, "help": 275, "helptab": 276, "helptrigger": 277, "helpicon": 278,
    "helpring": 282, "helpglowwrap": 283, "helpglowpad": 284, "helpglow": 285,
}

# 텍스트 정합 대상(비어있지 않은 HF directText)
TEXT_KEYS = ["noticeline1", "noticeline2", "noticecta", "headline1", "headline2", "herodesc",
             "placeholder", "modelname", "camlabel", "ctlabel", "ctnew", "ratiolabel",
             "quallabel", "elements", "stepnum", "steptotal", "charlabel", "gentext", "costnum"]

STYLE_KEYS = ["color", "backgroundColor", "borderRadius", "fontSize", "fontWeight",
              "lineHeight", "letterSpacing", "padding", "boxShadow", "textAlign",
              "textTransform", "fontFamily", "opacity", "gap", "display", "flexDirection"]

by_anchor = {}
for e in OHF["elements"]:
    a = e["attrs"].get("data-ohf-image")
    if a:
        by_anchor[a] = e

hf_els = HF["elements"]
issues = []
checked = 0

for anchor, idx in MAP.items():
    hf = hf_els[idx]
    ohf = by_anchor.get(anchor)
    if ohf is None:
        issues.append({"anchor": anchor, "hf": idx, "kind": "MISS", "detail": "OHF 요소 없음"})
        continue
    checked += 1
    hr, orr = hf["rect"], ohf["rect"]
    for k in ("x", "y", "w", "h"):
        if abs(hr[k] - orr[k]) > 1:
            issues.append({"anchor": anchor, "hf": idx, "kind": "rect",
                           "detail": f"{k}: HF={hr[k]} OHF={orr[k]} (Δ={orr[k]-hr[k]})"})
    if anchor in TEXT_KEYS:
        ht = (hf["text"] or "").strip()
        ot = (ohf["text"] or "").strip()
        if ht != ot:
            issues.append({"anchor": anchor, "hf": idx, "kind": "text",
                           "detail": f"HF={ht!r} OHF={ot!r}"})
    hs, os_ = hf["styles"], ohf["styles"]
    for k in STYLE_KEYS:
        hv, ov = hs.get(k), os_.get(k)
        if hv is None and ov is None:
            continue
        if hv is None and ov is not None:
            # HF가 필터링한 값(0px/rgba0)은 OHF도 같은 이유로 빠졌을 수 있으나
            # 오차 범위로만 판단 → OHF가 걸린 값이 HF와 무관하면 보고
            issues.append({"anchor": anchor, "hf": idx, "kind": "style",
                           "detail": f"{k}: HF 없음(필터) OHF={ov}"})
        elif hv is not None and ov is None:
            issues.append({"anchor": anchor, "hf": idx, "kind": "style",
                           "detail": f"{k}: HF={hv} OHF 없음"})
        elif hv != ov:
            issues.append({"anchor": anchor, "hf": idx, "kind": "style",
                           "detail": f"{k}: HF={hv} OHF={ov}"})

print(f"matched anchors: {checked}/{len(MAP)}")
from collections import Counter
c = Counter(i["kind"] for i in issues)
print("issue kinds:", dict(c))
print("TOTAL_ISSUES:", len(issues))
for i in issues:
    print(f"[{i['kind']}] {i['anchor']} (HF#{i['hf']}) {i['detail']}")

with open(BASE / "ohf_hf_image_compare.json", "w", encoding="utf-8") as f:
    json.dump({"checked": checked, "total": len(MAP), "issues": issues}, f, ensure_ascii=False, indent=2)
