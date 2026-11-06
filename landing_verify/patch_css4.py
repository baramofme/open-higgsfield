#!/usr/bin/env python3
"""t_f3de705e 4차 교정 — HF ground-truth 원문 근거 CSS 패치(각 앵커 카운트 검증)."""
import sys

P = "src/openhiggsfield/image-surface.css"
src = open(P, encoding="utf-8").read()
edits = []

def rep(old, new, n=1):
    global src
    c = src.count(old)
    if c != n:
        print(f"ANCHOR MISS ({c} vs {n}): {old[:80]!r}")
        sys.exit(1)
    src = src.replace(old, new)
    edits.append(old[:60])

# A. ratio/quality 칩만 border 0(HF #227/#232 borderWidth 없음; 그 외 칩은 HF도 1px 실재)
rep("    color: var(--tile-img-ratiobtn-color);\n    min-width: var(--tile-img-ratiobtn-min);\n  }",
    "    color: var(--tile-img-ratiobtn-color);\n    min-width: var(--tile-img-ratiobtn-min);\n    /* HF #227/#232 = borderWidth 없음(무보더).\n       그 외 칩·modelbtn은 HF 원문 borderWidth:1px → 공통 규칙 유지. */\n    border-width: 0;\n  }")

# B. 카드 보더 4px(HF img w_css=136 = 144 − 4; --ohf-spacing-md는 8px → --ohf-spacing-xs 4px)
rep("    border: var(--ohf-spacing-md) solid var(--tile-img-card-border);",
    "    /* HF 실측 img w_css=136px = 144 − border 4 → 보더는 --ohf-spacing-xs(4px).\n       (--ohf-spacing-md는 8px → img 128px로 축소되어 카드 rect 24건 불일치의 원인) */\n    border: var(--ohf-spacing-xs) solid var(--tile-img-card-border);")

# C. 칩·notice radius: HF literal 9999px(우리가 참조한 --ohf-radius-pill-px는 미정의 → 0px로 소멸)
rep("  --tile-img-radius-infinite: calc(infinity * 1px);",
    "  --tile-img-radius-infinite: calc(infinity * 1px);\n  /* HF notice/noticeicon/noticecta/noticeclose의 borderRadius는 literal 9999px.\n     (--ohf-radius-pill은 999px, --ohf-radius-pill-px는 존재하지 않는 참조였다) */\n  --tile-img-radius-9999: 9999px;")
rep("var(--ohf-radius-pill-px)", "var(--tile-img-radius-9999)", 4)

# D. dock radius 20px(HF #169 br=20px; form만 20px이고 dock에 유실)
rep("  .ohf-img-dock {\n    position: relative;\n    z-index: var(--ctl-img-z-dock);\n    width: 100%;\n    max-width: 100%;",
    "  .ohf-img-dock {\n    position: relative;\n    z-index: var(--ctl-img-z-dock);\n    width: 100%;\n    max-width: 100%;\n    /* HF #169 dock borderRadius=20px(form과 동률) */\n    border-radius: var(--ohf-radius-4xl);")

# E. band padding 제거(HF #128 padding 없음; 우리 0 16px가 자식 좌표에 유입되지 않아도 HF 원문 정합优先)
rep("    padding-inline: var(--ohf-spacing-3xl);\n  }\n\n  .ohf-img-band-ghost {",
    "    /* HF #128 band = padding 없음(UA 0px가 수확 필터에서 제외된 값).\n       16px 패딩은 absolute inset의 containing box만 동일하게 유지하므로 제거. */\n    padding-inline: var(--ohf-spacing-none);\n  }\n\n  .ohf-img-band-ghost {")

# F. close 라인높이: HF 버튼 #125 line-height 없음 = UA normal(필터 제외). 우리 24px 상속 제거.
rep("    padding: var(--ctl-img-notice-close-pad);\n    color: var(--ctl-img-notice-close-color);\n    border-radius: var(--tile-img-radius-9999);\n  }",
    "    padding: var(--ctl-img-notice-close-pad);\n    color: var(--ctl-img-notice-close-color);\n    border-radius: var(--tile-img-radius-9999);\n    /* HF #125 = line-height 없음(UA normal 상속). 루트 24px 상속을 끊어\n       'normal'로 되돌리면 양쪽 수확 필터가 동일하게 제외 → 정합. */\n    line-height: normal;\n  }")

open(P, "w", encoding="utf-8").write(src)
print(f"OK {len(edits)} edits applied")
