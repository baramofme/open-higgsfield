#!/usr/bin/env python3
"""HF ground-truth를 MAP 앵커별로 테이블로 뽑는다 — CSS 수정의 단일 원천."""
import json, sys
sys.path.insert(0, ".")
from compare_image import MAP

gt = json.load(open("/home/baramofme/open-higgsfield/.worktrees/t_38d43cc9/landing_verify/hf_image_surface_ground_truth.json", encoding="utf-8"))
els = gt["elements"]
KEYS = ["fontSize","lineHeight","fontWeight","fontFamily","letterSpacing","color",
        "backgroundColor","backgroundImage","borderRadius","border","boxShadow",
        "padding","margin","gap","display","flexDirection","alignItems","justifyContent",
        "position","overflow","opacity","zIndex","textTransform","textAlign","transform","filter","rotate"]

out = []
for anchor, idx in MAP.items():
    e = els[idx]
    r = e["rect"]
    out.append(f"### {anchor} #{idx} rect x={r['x']:.0f} y={r['y']:.0f} w={r['w']:.0f} h={r['h']:.0f}")
    st = e["styles"]
    for k in KEYS:
        v = st.get(k)
        if v not in (None, "", "none", "auto") or k in ("position",):
            out.append(f"  {k} = {v}")
    out.append("")
open("hf_anchor_table.txt", "w").write("\n".join(out))
print("anchors:", len(MAP))
