#!/usr/bin/env python3
"""t_f3de705e 4차 교정 v2 — 들여쓰기 독립 정규식 패치, 각 치환 카운트 검증."""
import re, sys

P = "src/openhiggsfield/image-surface.css"
src = open(P, encoding="utf-8").read()
report = []

def sub(pattern, repl, expect=1, flags=0):
    global src
    hits = len(re.findall(pattern, src, flags))
    if hits != expect:
        print(f"REGEX MISS ({hits} vs {expect}): {pattern[:80]}")
        sys.exit(1)
    src = re.sub(pattern, repl, src, flags=flags)
    report.append(pattern[:60])

def block_add(block_re, addition, expect=1):
    """블록 종료 } 직전에 추가선을 삽입(들여쓰기는 블록 첫 속성 라인을 승계)."""
    global src
    m = re.search(block_re, src)
    if not m:
        print(f"BLOCK MISS: {block_re[:80]}"); sys.exit(1)
    body = m.group(1)
    ind = re.search(r"\n([ \t]*)\S", body)
    pad = ind.group(1) if ind else "  "
    new_block = body.rstrip() + "\n" + pad + addition + "\n}"
    src = src[:m.start()] + new_block + src[m.end():]
    report.append("add→" + block_re[:60])

# A. ratio/quality 전용 무보더(HF #227/#232 borderWidth 없음; 그 외 칩·modelbtn은 HF 1px 실재)
block_add(r"(\.ohf-img-chip--ratio\s*\{[^}]*?)\}",
          "border-width: 0; /* HF #227/#232 = 무보더(HF도 그 외 칩은 borderWidth:1px 실재) */")

# B. 카드 보더 4px(HF img w_css=136 = 144 − 4; --ohf-spacing-md는 8px 오매핑 — 디스크 원문은 white-30)
sub(r"border:\s*var\(--ohf-spacing-md\)\s+solid\s+var\(--tile-img-white-30\)\s*;",
    "border: var(--ohf-spacing-xs) solid var(--tile-img-white-30); /* HF 보더 4px → img 136px */")

# C. HF literal 9999px 토큰 신설 + 미정의(--ohf-radius-pill-px) 참조 4건 치환
sub(r"(--tile-img-radius-infinite\s*:\s*calc\(infinity \* 1px\)\s*;)",
    r"\1\n  --tile-img-radius-9999: 9999px; /* HF notice 계열 borderRadius 원문 = literal 9999px */")
sub(re.escape("var(--ohf-radius-pill-px)"), "var(--tile-img-radius-9999)", expect=4)

# D. dock radius 20px(HF #169 br=20px — form에만 적용되고 dock에 유실)
block_add(r"(\.ohf-img-dock\s*\{[^}]*?)\}",
          "border-radius: var(--ohf-radius-4xl); /* HF #169 dock br=20px(form과 동률) */")

# E. band padding 제거(HF #128 padding 없음 → 원문 정합 우선)
sub(r"(\.ohf-img-band\s*\{[^}]*?)\n[ \t]*padding-inline\s*:[^;]+;", r"\1")

# F. close 라인높이 = UA normal(HF #125 line-height 없음; 우리 24px 상속 제거 → 양쪽 필터 제외)
block_add(r"(\.ohf-img-notice-close\s*\{[^}]*?)\}",
          "line-height: normal; /* HF #125 = UA normal(수확 필터에서 양측 동일 제외) */")

open(P, "w", encoding="utf-8").write(src)
print(f"OK {len(report)} patches")
for r in report: print("  ·", r)
