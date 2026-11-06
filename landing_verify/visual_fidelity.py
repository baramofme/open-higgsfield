#!/usr/bin/env python3
"""Objective visual fidelity: OHF screenshot vs HF ground-truth screenshot (1440x900).

The two apps differ in page chrome (HF has a 45px promotion strip + nav -> content at
y=89; OHF's content sits 47px higher, shell_dy=-47). A naive full-image diff is dominated
by that vertical shift. Correct method: map OHF content down by 47 into HF's coordinate
frame, then measure the CONTENT band; the header band is reported separately as an
expected DOC-DIFF (different chrome), not a defect.
"""
import numpy as np
from PIL import Image
from collections import Counter

HF = Image.open("/home/baramofme/.hermes/kanban/attachments/t_a1c5ed28/hf_video_surface_1440x900.png").convert("RGB")
OH = Image.open("/home/baramofme/open-higgsfield/.worktrees/t_bb8f3edb/landing_verify/ohf_video_surface_ss.png").convert("RGB")
W, H = 1440, 900
hf = np.asarray(HF, dtype=np.int16)
oh = np.asarray(OH, dtype=np.int16)

# --- OHF validity (PIL real-image check, like parent) ---
lum = oh.astype(np.float64).mean(axis=2)
distinct = int(np.unique(np.round(lum, 1)).size)
light_pct = float((lum > 200).mean() * 100)
print(f"OHF validity: distinctLum={distinct} lightPct={round(light_pct,2)}")

SHELL_DY = -47  # OHF grid sits 47px higher than HF grid
# Build OHF image mapped into HF coordinates: OHF row y -> HF row y - SHELL_DY (y+47)
aligned = np.full_like(hf, 0)  # HF-shaped canvas
src_rows = list(range(0, H))
for y in src_rows:
    ty = y - SHELL_DY
    if 0 <= ty < H:
        aligned[ty] = oh[y]

# content band = HF content region; HF grid at y=89, height ~788 -> y in [89, 877]
y0, y1 = 89, min(H, 89 + 788)
content_hf = hf[y0:y1]
content_oh = aligned[y0:y1]
mad = float(np.abs(content_hf.astype(np.int16) - content_oh.astype(np.int16)).mean())
print(f"CONTENT MAD (aligned, y={y0}..{y1}) = {round(mad,3)}")

# per-band decomposition (bands of 90px) over content
print("per-band MAD:")
for by in range(y0, y1, 90):
    eh = min(by + 90, y1)
    b = float(np.abs(content_hf[by-y0:eh-y0] - content_oh[by-y0:eh-y0]).mean())
    print(f"   y {by:3d}..{eh:3d}: {round(b,3)}")

# header band (HF chrome vs OHF chrome) — expected DOC-DIFF
hdr = float(np.abs(hf[0:89].astype(np.int16) - oh[0:89].astype(np.int16)).mean())
print(f"HEADER band MAD (HF 0..89 vs OHF 0..89) = {round(hdr,3)}  [expected DOC-DIFF: different chrome]")
