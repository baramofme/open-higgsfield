#!/usr/bin/env python3
"""HF video surface ground-truth → OHF 미러 생성기 (t_bb8f3edb).

원칙:
- 트리의 태그·순서·깊이·own-text·attrs 는 실측을 그대로 따른다(재해석 금지).
- 각 요소는 data-ohf-video="<HF nid>" 앵커를 가진다(비교는 1:1 nid 매핑).
- 클래스는 ohf-vid-n{nid} 로 기계 부여하고, CSS 는 실측 computed 로 생성한 뒤
  --ohf-*(동값) / --ctl-vid-*(성분 국유) 토큰으로 치환한다(규칙 안에 리터럴 금지).
- src/srcset 는 로컬 자산으로 다시 쓴다(HF 와 동바이트로 내려받은 public/ohf-video).
"""
import json, re, pathlib

ROOT = pathlib.Path("/home/baramofme/open-higgsfield/.worktrees/t_bb8f3edb")
GT = json.load(open("/home/baramofme/.hermes/kanban/attachments/t_a1c5ed28/hf_video_ground_truth.json", encoding="utf-8"))
ELS = GT["captures"]["preDismiss"]["elements"]
BY = {e["nid"]: e for e in ELS}
KIDS = {}
for e in ELS:
    KIDS.setdefault(e["parentId"], []).append(e["nid"])

PLATE, FEED = 103, 221
GRID = 102

LOCAL_SRC = {
    115: "/ohf-video/minimax-h3-demo.mp4",
    265: "/ohf-video/step-1-v2.webp",
    270: "/ohf-video/step-2.mp4",
    275: "/ohf-video/step-3.mp4",
    283: "/ohf-video/academy/learning-ugc-creature.webp",
    286: "/ohf-video/academy/learning-ugc-sneakers.webp",
    289: "/ohf-video/academy/learning-ugc-product.webp",
}

TAG_MAP = {
    "DIV": "div", "SPAN": "span", "P": "p", "BUTTON": "button", "FORM": "form",
    "FIGURE": "figure", "FIGCAPTION": "figcaption", "LABEL": "label", "INPUT": "input",
    "NAV": "nav", "HEADER": "header", "H1": "h1", "H2": "h2", "A": "a", "SECTION": "section",
    "ARTICLE": "article", "UL": "ul", "LI": "li", "SVG": "svg", "PATH": "path", "G": "g",
    "VIDEO": "video", "IMG": "img",
}
VOID = {"input", "img"}
LEAF_OK = {"path"}

KEEP_BOOL = {
    "type", "role", "tabindex", "aria-label", "aria-placeholder", "aria-hidden",
    "aria-selected", "aria-disabled", "aria-checked", "aria-pressed", "aria-haspopup",
    "aria-expanded", "aria-orientation", "aria-current", "aria-roledescription",
    "data-state", "data-disabled", "data-active", "data-orientation", "data-off",
    "data-prompt-card", "data-prompt-column", "data-prompt-field", "data-prompt-placeholder",
    "data-model-select-trigger", "data-form-kit-setting-button", "data-tour-anchor",
    "data-feed-filter-tooltip-header", "data-feed-filter-tooltip-anchor",
    "data-help-launcher-trigger", "data-ignore-marquee", "data-panel-toggle",
    "translate", "href", "alt", "loading", "decoding", "accept", "spellcheck",
    "contenteditable", "loop", "playsinline", "webkit-playsinline",
    "disablepictureinpicture", "preload", "autocapitalize", "autocomplete", "inputmode",
    # SVG presentation attrs — 실측 attrs 원문(재구성 금지)
    "width", "height", "viewBox", "fill", "xmlns", "stroke", "d",
    "fill-rule", "clip-rule", "stroke-width", "stroke-linecap", "stroke-linejoin",
    "x", "y", "cx", "cy", "r", "rx", "ry", "points", "opacity",
}
DROP = {
    "class", "style", "src", "srcset", "sizes", "aria-controls", "id",
    "data-layout-track", "data-activation-direction", "data-composite-item-active",
    "data-base-ui-tooltip-trigger", "data-lexical-editor", "data-nav-id", "data-nav-trigger",
    "aria-details", "aria-describedby", "aria-labelledby", "aria-keyshortcuts",
}
SVG_CAMEL = {
    "fill-rule": "fillRule", "clip-rule": "clipRule", "stroke-width": "strokeWidth",
    "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin",
    "stroke-dasharray": "strokeDasharray", "stroke-dashoffset": "strokeDashoffset",
}
HTML_CAMEL = {"tabindex": "tabIndex", "contenteditable": "contentEditable",
              "playsinline": "playsInline", "disablepictureinpicture": "disablePictureInPicture",
              "maxlength": "maxLength", "readonly": "readOnly"}

# 정적 이식에서 관성(inert)으로 두는 요소의 사유 문구. 실배선은 프롬프트 에디터와
# IntersectionObserver 재생, 그리고 제너레이트 submit 만이 실제 동작 경로다.
INERT = {
    106: "서피스 탭 비디오 만들기(탭 전환 착지 후속)",
    107: "서피스 탭 비디오 편집(탭 전환 착지 후속)",
    108: "서피스 탭 Motion Control(탭 전환 착지 후속)",
    114: "피겨 카드(모델 데모 변경 착지 후속)",
    122: "변경 배지(모델 변경 착지 후속)",
    128: "세그먼트 탭 레퍼런스(탭 전환 착지 후속)",
    134: "세그먼트 탭 프레임(탭 전환 착지 후속)",
    148: "시작 프레임 드롭존(첨부 착지 후속)",
    166: "종료 프레임 드롭존(HF 데이터 비활성·첨부 착지 후속)",
    187: "모델 트리거(모델 패널 착지 후속)",
    199: "길이 다이얼(설정 패널 착지 후속)",
    205: "품질 다이얼(설정 패널 착지 후속)",
    229: "피드 탭 기록(탭 전환 착지 후속)",
    235: "피드 탭 이용 방법(HF 기본 선택·실전환은 FeedHeader 가 보유)",
    244: "필터(피드 필터 착지 후속)",
    249: "보기(피드 보기 착지 후속)",
    279: "아카데미 초대(라우팅 착지 후속)",
    297: "도움말 런처(도움말 패널 착지 후속)",
}
INERT_TAGS = {"BUTTON", "A", "LABEL", "FIGURE", "DIV"}
# 재생 배선(video)은HF 원문 attr 에 없던 muted 를 추가한다(자동재생 정책 보증;
# 실측 rect/style 에 무영향). 사유를 주석으로 남긴다.
MUTED_ADD = {115, 270, 275}

def jsx_attrs(e, nid):
    out = []
    seen = set()
    raw = e.get("attrs") or {}
    for name, val in raw.items():
        if name in DROP:
            continue
        if name in KEEP_BOOL or name.startswith("aria-") or name.startswith("data-"):
            key = SVG_CAMEL.get(name, HTML_CAMEL.get(name, name))
            if key in seen:  # HF 원문이 같은 JSX 키를 두 번 준 경우 첫 값만 지킨다.
                continue
            seen.add(key)
            out.append((key, val))
    if nid in LOCAL_SRC:
        out.append(("src", LOCAL_SRC[nid]))
    if nid in MUTED_ADD:
        out.append(("muted", ""))
    # honest-inert: 이식된 정적 요소는 aria-disabled + data-off 로 잠근다.
    if nid in INERT and e["tag"] in INERT_TAGS:
        out.append(("aria-disabled", "true"))
        out.append(("data-off", INERT[nid]))
    return out

# React 타입이 boolean/number 를 요구하는 프롭. 원문 값은 유지하되 표기만 맞춘다.
BOOL_KEYS = {"loop", "muted", "playsInline", "disablePictureInPicture", "autoPlay",
             "controls", "defaultChecked", "open", "reversed", "allowFullScreen",
             "noModule", "async", "defer", "contentEditable", "spellCheck"}
NUMERIC_KEYS = {"tabIndex"}

def attr_str(k, v):
    if k in NUMERIC_KEYS and str(v).strip().lstrip("-").isdigit():
        return f'{k}={{{v}}}'
    if k in BOOL_KEYS and str(v) in ("", "true"):
        return k
    return f'{k}={json.dumps(v, ensure_ascii=False)}'

def esc(s):
    return s.replace("\\", "\\\\").replace("{", "\\u007b").replace("}", "\\u007d")

def inline_style(e):
    st = (e.get("attrs") or {}).get("style") or ""
    if not st:
        return None
    # CSS 커스텀 프로퍼티(--*)만 인라인으로 남긴다; 시각 값은 CSS 규칙으로 이동.
    props = [p.strip() for p in st.split(";") if p.strip()]
    keep = [p for p in props if p.startswith("--")]
    return "; ".join(keep) if keep else None

def emit(nid, depth, lines):
    e = BY[nid]
    tag = TAG_MAP.get(e["tag"], e["tag"].lower())
    cls = f"ohf-vid-n{nid}"
    ind = "  " * depth
    attrs = [f'className="{cls}"', f'data-ohf-video="{nid}"']
    for k, v in jsx_attrs(e, nid):
        attrs.append(attr_str(k, v))
    sty = inline_style(e)
    if sty:
        # 인라인 커스텀 프롭(--*)은 객체 리터럴로; React 는 이 키들을 그대로 DOM 에 싣는다.
        pairs = []
        for p in sty.split(";"):
            if ":" not in p:
                continue
            k, v = p.split(":", 1)
            pairs.append(f'"{k.strip()}": "{v.strip()}"')
        attrs.append("style={{ " + ", ".join(pairs) + " }}")
    txt = (e.get("txt") or "").strip()
    kids = [c for c in KIDS.get(nid, [])]
    if tag in VOID:
        lines.append(f"{ind}<{tag} {' '.join(attrs)} />")
    elif not kids and not txt:
        lines.append(f"{ind}<{tag} {' '.join(attrs)} />")
    else:
        lines.append(f"{ind}<{tag} {' '.join(attrs)}>")
        if txt:
            lines.append(f"{ind}  {esc(txt)}")
        for c in kids:
            emit(c, depth + 1, lines)
        lines.append(f"{ind}</{tag}>")

lines = []
emit(GRID, 0, lines)
tsx_body = "\n".join(lines)
path = ROOT / "landing_verify/surface_body.tsx"
path.write_text(tsx_body, encoding="utf-8")
n = sum(1 for l in lines if "data-ohf-video" in l)
print("tree lines:", len(lines), "anchored:", n)

# 비교 맵: 앵커(n{nid}) ↔ HF nid (전수)
mapping = {}
for l in lines:
    m = re.search(r'data-ohf-video="(\d+)"', l)
    if m:
        nid = int(m.group(1))
        mapping[f"n{nid}"] = nid
json.dump(mapping, open(ROOT / "landing_verify/anchor_map.json", "w", encoding="utf-8"), indent=1)
print("map size:", len(mapping))
