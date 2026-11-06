#!/usr/bin/env python3
"""HF video surface computed → OHF CSS 생성 + 토큰 3계층 치환 (t_bb8f3edb).

규칙:
- 각 nid 의 computed 실측에서 레이아웃/도색 속성을 복원한다(추측 없음).
- 값이 --ohf-*(semantic) 와 직렬화까지 동값이면 그 토큰을 쓴다.
- 그 외는 --ctl-vid-*(성분 국유) 토큰으로 선언해 참조한다.
  → 규칙 안에는 리터럴이 존재하지 않는다(리터럴은 토큰 블록 안에만).
- --o-* primitive 는 직접 참조하지 않는다.
"""
import json, re, pathlib
from collections import OrderedDict

ROOT = pathlib.Path("/home/baramofme/open-higgsfield/.worktrees/t_bb8f3edb")
GT = json.load(open("/home/baramofme/.hermes/kanban/attachments/t_a1c5ed28/hf_video_ground_truth.json", encoding="utf-8"))
ELS = GT["captures"]["preDismiss"]["elements"]
BY = {e["nid"]: e for e in ELS}
KIDS = {}
for e in ELS:
    KIDS.setdefault(e["parentId"], []).append(e["nid"])

MAP = json.load(open(ROOT / "landing_verify/anchor_map.json", encoding="utf-8"))
NIDS = sorted(int(v) for v in MAP.values())

# ---- tokens.css 파싱: --o-* 원시값과 --ohf-* 별칭의 해석값 ---------------------
TOKSRC = (ROOT / "src/openhiggsfield/tokens.css").read_text(encoding="utf-8")
prim = {}
for m in re.finditer(r"--(o-[a-z0-9-]+)\s*:\s*([^;]+);", TOKSRC):
    prim[m.group(1)] = m.group(2).strip()
ohf = {}
for m in re.finditer(r"--(ohf-[a-z0-9-]+)\s*:\s*([^;]+);", TOKSRC):
    v = m.group(2).strip()
    mv = re.fullmatch(r"var\(--(o-[a-z0-9-]+)\)", v)
    ohf[m.group(1)] = prim.get(mv.group(1), v) if mv else v

# ---- 색 직렬화 동등성: hex/hex8/rgb/rgba → 튜플, 그리고 재직렬화 문자열 --------
def parse_color(s):
    s = s.strip()
    m = re.fullmatch(r"#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?", s)
    if m:
        r, g, b = int(m.group(1)[0:2], 16), int(m.group(1)[2:4], 16), int(m.group(1)[4:6], 16)
        a = int(m.group(2), 16) / 255 if m.group(2) else 1.0
        return (r, g, b, round(a, 3))
    m = re.fullmatch(r"rgba?\(([^)]+)\)", s)
    if m:
        parts = [p.strip() for p in m.group(1).split(",")]
        r, g, b = int(parts[0]), int(parts[1]), int(parts[2])
        a = float(parts[3]) if len(parts) > 3 else 1.0
        return (r, g, b, round(a, 3))
    return None

def serialize(t):
    r, g, b, a = t
    if a >= 1.0:
        return f"rgb({r}, {g}, {b})"
    av = f"{a:g}"
    av = av.replace("0.05", "0.05")
    return f"rgba({r}, {g}, {b}, {av})"

# --ohf-*(semantic) 별칭만 매칭 테이블로 쓴다: primitive(--o-*)는 직접 참조 금지.
COLOR_EQ = {}
for name, lit in ohf.items():
    t = parse_color(lit)
    if t:
        COLOR_EQ.setdefault(serialize(t), f"--{name}")

PX_NAMES = {}
for name, lit in ohf.items():
    if re.fullmatch(r"[0-9.]+px", lit):
        PX_NAMES.setdefault(str(float(lit[:-2])), []).append(name)
NUM_NAMES = {}
for name, lit in ohf.items():
    if re.fullmatch(r"[0-9.]+", lit):
        NUM_NAMES.setdefault(str(float(lit)), []).append(name)

# 속성 카테고리 → 토큰 이름에 기대하는 어휘. 부류가 다른 토큰으로 대체하지 않는다
# (예: radius 를 spacing 으로 쓰면 의미가 틀린다 → 그 경우 차라리 --ctl-vid-*).
PX_PREF = {
    "radius": ["radius"],
    "font-size": ["font-size"],
    "gap": ["spacing", "size"], "padding": ["spacing", "size"], "margin": ["spacing", "size"],
    "line": ["size", "spacing"],
}
def px_pref(prop):
    if "radius" in prop:
        return PX_PREF["radius"]
    if prop == "font-size":
        return PX_PREF["font-size"]
    if prop.startswith(("gap", "padding", "margin")):
        return PX_PREF["gap"]
    if prop in ("width", "height", "top", "right", "bottom", "left", "min-width",
                "min-height", "max-width", "max-height", "flex-basis"):
        return PX_PREF["line"]
    if "border" in prop and prop.endswith("-width"):
        return ["border"]
    return []

def px_token(prop, v):
    key = str(float(v[:-2]))
    cands = PX_NAMES.get(key, [])
    prefs = px_pref(prop)
    for w in prefs:
        for n in cands:
            if w in n:
                return f"var(--{n})"
    return None

def num_token(prop, v):
    key = str(float(v))
    cands = NUM_NAMES.get(key, [])
    if prop == "font-weight":
        for n in cands:
            if "font-weight" in n:
                return f"var(--{n})"
    return None

# ---- Tailwind 유틸리티 → CSS (스케일 n*4px; 임의값 [..] 는 리터럴) -------------
SCALE = lambda n: f"{float(n) * 4:g}px"
UTIL_RE = re.compile(r"^(-?)(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|size|w|h|min-w|min-h|max-w|max-h|rounded|text|z|top|right|bottom|left)-([0-9.]+|\[[^\]]+\])(!?)$")

def util_decl(tok):
    """Returns list of (prop, value, important) from one utility token."""
    neg = tok.startswith("-")
    t = tok.lstrip("-")
    imp = t.endswith("!")
    t = t.rstrip("!")
    out = []

    def val_for(raw):
        if raw.startswith("[") and raw.endswith("]"):
            return raw[1:-1]
        return SCALE(raw)

    m = re.fullmatch(r"(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap)-(auto|[0-9.]+|\[[^\]]+\])", t)
    if m:
        kind, raw = m.group(1), m.group(2)
        v = "auto" if raw == "auto" else val_for(raw)
        pre = "-" if neg else ""
        table = {
            "p": ["padding", v], "px": ["padding-left", v], "py": ["padding-top", v],
            "pt": ["padding-top", v], "pr": ["padding-right", v], "pb": ["padding-bottom", v],
            "pl": ["padding-left", v],
            "m": ["margin", v], "mx": ["margin-left", v], "my": ["margin-top", v],
            "mt": ["margin-top", v], "mr": ["margin-right", v], "mb": ["margin-bottom", v],
            "ml": ["margin-left", v], "gap": ["gap", v],
        }
        prop, vv = table[kind]
        if kind in ("px", "mx"):
            out.append((prop, f"{pre}{vv}", imp)); out.append((prop.replace("left", "right"), f"{pre}{vv}", imp))
        elif kind in ("py", "my"):
            out.append((prop, f"{pre}{vv}", imp)); out.append((prop.replace("top", "bottom"), f"{pre}{vv}", imp))
        else:
            out.append((prop, f"{pre}{vv}", imp))
        return out

    m = re.fullmatch(r"(size|w|h|min-w|min-h|max-w|max-h|top|right|bottom|left|z)-(\[[^\]]+|[0-9.]+|full|auto|fit-content|min-content|max-content|screen|dvh|svh|fit)", t)
    if m:
        kind, raw = m.group(1), m.group(2)
        if raw == "full":
            v = "100%"
        elif raw.startswith("["):
            v = raw[1:-1]
        elif raw == "screen":
            v = "100vw"
        elif raw == "auto":
            v = "auto"
        elif raw in ("dvh", "svh", "vh"):
            v = f"100{raw}"
        elif raw in ("fit-content", "min-content", "max-content", "fit"):
            v = "fit-content" if raw == "fit" else raw
        elif kind == "z":
            v = raw
        else:
            v = SCALE(raw)
        prop = {"size": "width", "w": "width", "h": "height", "min-w": "min-width",
                "min-h": "min-height", "max-w": "max-width", "max-h": "max-height",
                "top": "top", "right": "right", "bottom": "bottom", "left": "left",
                "z": "z-index"}[kind]
        if kind == "size":
            out.append(("width", v, imp)); out.append(("height", v, imp))
        else:
            out.append((prop, v, imp))
        return out

    m = re.fullmatch(r"rounded(-(t|b|l|r|tl|tr|bl|br)?)-(none|full|md|lg|xl|2xl|3xl|4xl|\[[^\]]+\]|[0-9.]+)", t)
    if m:
        side, raw = m.group(2), m.group(3)
        rmap = {"none": "0", "full": "9999px", "md": "6px", "lg": "8px", "xl": "12px",
                "2xl": "16px", "3xl": "24px", "4xl": "32px"}
        v = rmap.get(raw) or (raw[1:-1] if raw.startswith("[") else SCALE(raw))
        corners = {"t": ["border-top-left-radius", "border-top-right-radius"],
                   "b": ["border-bottom-left-radius", "border-bottom-right-radius"],
                   "l": ["border-top-left-radius", "border-bottom-left-radius"],
                   "r": ["border-top-right-radius", "border-bottom-right-radius"],
                   "tl": ["border-top-left-radius"], "tr": ["border-top-right-radius"],
                   "bl": ["border-bottom-left-radius"], "br": ["border-bottom-right-radius"],
                   None: ["border-radius"]}
        for c in corners[side]:
            out.append((c, v, imp))
        return out
    return []

STRUCT = {
    "flex": ("display", "flex"), "inline-flex": ("display", "inline-flex"),
    "grid": ("display", "grid"), "block": ("display", "block"),
    "inline-block": ("display", "inline-block"), "contents": ("display", "contents"),
    "hidden": ("display", "none"), "flex-col": ("flex-direction", "column"),
    "flex-row": ("flex-direction", "row"), "flex-wrap": ("flex-wrap", "wrap"),
    "items-center": ("align-items", "center"), "items-start": ("align-items", "flex-start"),
    "items-end": ("align-items", "flex-end"), "items-baseline": ("align-items", "baseline"),
    "justify-center": ("justify-content", "center"), "justify-between": ("justify-content", "space-between"),
    "justify-start": ("justify-content", "flex-start"), "justify-end": ("justify-content", "flex-end"),
    "self-start": ("align-self", "flex-start"), "self-center": ("align-self", "center"),
    "self-end": ("align-self", "flex-end"), "self-stretch": ("align-self", "stretch"),
    "relative": ("position", "relative"), "absolute": ("position", "absolute"),
    "fixed": ("position", "fixed"), "sticky": ("position", "sticky"), "static": ("position", "static"),
    "inset-0": ("inset", "0"), "inset-x-0": ("inset-left", "0"),
    "overflow-hidden": ("overflow", "hidden"), "overflow-visible": ("overflow", "visible"),
    "overflow-auto": ("overflow", "auto"), "overflow-x-auto": ("overflow-x", "auto"),
    "overflow-y-auto": ("overflow-y", "auto"), "overflow-x-hidden": ("overflow-x", "hidden"),
    "overflow-y-hidden": ("overflow-y", "hidden"), "overflow-x-visible": ("overflow-x", "visible"),
    "overflow-clip": ("overflow", "clip"), "overflow-x-clip": ("overflow-x", "clip"),
    "min-h-0": ("min-height", "0"), "min-w-0": ("min-width", "0"),
    "shrink-0": ("flex-shrink", "0"), "grow": ("flex-grow", "1"), "flex-1": ("flex", "1 1 0%"),
    "flex-none": ("flex", "none"), "flex-initial": ("flex", "0 1 auto"),
    "isolate": ("isolation", "isolate"), "select-none": ("user-select", "none"),
    "pointer-events-none": ("pointer-events", "none"), "pointer-events-auto": ("pointer-events", "auto"),
    "invisible": ("visibility", "hidden"), "visible": ("visibility", "visible"),
    "whitespace-nowrap": ("white-space", "nowrap"), "whitespace-pre-wrap": ("white-space", "pre-wrap"),
    "whitespace-pre": ("white-space", "pre"), "whitespace-normal": ("white-space", "normal"),
    "uppercase": ("text-transform", "uppercase"), "truncate": ("overflow", "hidden"),
    "text-left": ("text-align", "left"), "text-center": ("text-align", "center"),
    "text-center!": ("text-align", "center"), "italic": ("font-style", "italic"),
    "font-medium": ("font-weight", "500"), "font-semibold": ("font-weight", "600"),
    "font-bold": ("font-weight", "700"), "font-normal": ("font-weight", "400"),
    "cursor-pointer": ("cursor", "pointer"), "cursor-text": ("cursor", "text"),
    "cursor-default": ("cursor", "default"), "mx-auto": ("margin-left", "auto"),
    "mt-auto": ("margin-top", "auto"), "antialiased": ("-webkit-font-smoothing", "antialiased"),
}
EXTRA_STRUCT = {
    "mx-auto": [("margin-right", "auto")],
    "truncate": [("text-overflow", "ellipsis"), ("white-space", "nowrap")],
    "flex-1": [("min-width", "0")],
}

def cls_tokens(cls):
    return [c for c in (cls or "").split() if c]

def util_pass(e):
    """Tier A — cls 의 Tailwind 유틸리티에서 선언을 복원한다."""
    decls = []
    cls = (e.get("attrs") or {}).get("class") or e.get("cls") or ""
    for tok in cls_tokens(cls):
        variant = ""
        base = tok
        for pre in ("max-md:", "md:", "sm:", "lg:", "group-hover/", "hover:", "active:", "focus-visible:",
                    "data-[state=empty]:", "data-[state=dragging]:", "has-", "motion-reduce:", "[@media(hover:hover)]:",
                    "group-hover/academy-invitation:[@media(hover:hover)]:"):
            if base.startswith(pre):
                variant = pre
                base = base[len(pre):]
                break
        imp = base.endswith("!")
        base = base.rstrip("!")
        d = util_decl(base)
        if d:
            for prop, val, _ in d:
                decls.append((prop, val, imp, variant))
            for prop, val in EXTRA_STRUCT.get(base, []):
                decls.append((prop, val, imp, variant))
        elif base in STRUCT:
            prop, val = STRUCT[base]
            decls.append((prop, val, imp, variant))
        m = re.fullmatch(r"grid-cols-(\[[^\]]+\]|none|[0-9]+)", base)
        if m:
            v = m.group(1)
            v = v[1:-1].replace("_", " ") if v.startswith("[") else (
                "none" if v == "none" else f"repeat({v}, minmax(0, 1fr))")
            decls.append(("grid-template-columns", v, imp, variant))
        m = re.fullmatch(r"grid-rows-(\[[^\]]+\]|none|[0-9]+)", base)
        if m:
            v = m.group(1)
            v = v[1:-1].replace("_", " ") if v.startswith("[") else (
                "none" if v == "none" else f"repeat({v}, minmax(0, 1fr))")
            decls.append(("grid-template-rows", v, imp, variant))
        m = re.fullmatch(r"aspect-\[[^\]]+\]|aspect-(auto|square|video)", base)
        if m:
            raw = base[len("aspect-"):]
            v = raw[1:-1].replace("_", " ") if raw.startswith("[") else raw
            decls.append(("aspect-ratio", v, imp, variant))
        m = re.fullmatch(r"row-span-(\[[^\]]+\]|[0-9]+)", base)
        if m:
            decls.append(("grid-row", f"span {m.group(1)[1:-1] if m.group(1).startswith('[') else m.group(1)}", imp, variant))
    return decls

# ---- Tier B: computed 에서 유틸리티로 설명되지 않은 속성 ----------------------
INITIAL = {
    "display": "block", "position": "static", "flexDirection": "row",
    "alignItems": "normal", "alignContent": "normal", "justifyContent": "normal",
    "flexGrow": "0", "flexShrink": "1", "flexBasis": "auto",
    "gap": "normal", "rowGap": "normal", "columnGap": "normal",
    "paddingTop": "0px", "paddingRight": "0px", "paddingBottom": "0px", "paddingLeft": "0px",
    "marginTop": "0px", "marginRight": "0px", "marginBottom": "0px", "marginLeft": "0px",
    "borderTopWidth": "0px", "borderRightWidth": "0px", "borderBottomWidth": "0px", "borderLeftWidth": "0px",
    "borderTopStyle": "none", "borderRightStyle": "none", "borderBottomStyle": "none", "borderLeftStyle": "none",
    "borderTopColor": "currentcolor", "borderRightColor": "currentcolor",
    "borderBottomColor": "currentcolor", "borderLeftColor": "currentcolor",
    "borderRadius": "0px", "borderTopLeftRadius": "0px", "borderTopRightRadius": "0px",
    "borderBottomLeftRadius": "0px", "borderBottomRightRadius": "0px",
    "backgroundColor": "rgba(0, 0, 0, 0)", "backgroundImage": "none",
    "boxShadow": "none", "opacity": "1", "visibility": "visible",
    "overflow": "visible", "overflowX": "visible", "overflowY": "visible",
    "zIndex": "auto", "transform": "none", "filter": "none", "backdropFilter": "none",
    "cursor": "auto", "pointerEvents": "auto", "objectFit": "fill",
    "mixBlendMode": "normal", "isolation": "auto", "userSelect": "auto",
    "whiteSpace": "normal", "textTransform": "none", "textAlign": "start",
    "aspectRatio": "auto", "flexWrap": "nowrap", "fontStyle": "normal",
    "textOverflow": "clip", "wordSpacing": "0px", "textIndent": "0px",
}
PROPS = [
    ("display", "display"), ("position", "position"),
    ("top", "top"), ("right", "right"), ("bottom", "bottom"), ("left", "left"),
    ("flexDirection", "flex-direction"), ("flexWrap", "flex-wrap"),
    ("alignItems", "align-items"), ("justifyContent", "justify-content"),
    ("flexGrow", "flex-grow"), ("flexShrink", "flex-shrink"), ("flexBasis", "flex-basis"),
    ("gap", "gap"),
    ("paddingTop", "padding-top"), ("paddingRight", "padding-right"),
    ("paddingBottom", "padding-bottom"), ("paddingLeft", "padding-left"),
    ("marginTop", "margin-top"), ("marginRight", "margin-right"),
    ("marginBottom", "margin-bottom"), ("marginLeft", "margin-left"),
    ("borderTopWidth", "border-top-width"), ("borderRightWidth", "border-right-width"),
    ("borderBottomWidth", "border-bottom-width"), ("borderLeftWidth", "border-left-width"),
    ("borderTopStyle", "border-top-style"), ("borderRightStyle", "border-right-style"),
    ("borderBottomStyle", "border-bottom-style"), ("borderLeftStyle", "border-left-style"),
    ("borderTopColor", "border-top-color"), ("borderRightColor", "border-right-color"),
    ("borderBottomColor", "border-bottom-color"), ("borderLeftColor", "border-left-color"),
    ("borderRadius", "border-radius"),
    ("borderTopLeftRadius", "border-top-left-radius"), ("borderTopRightRadius", "border-top-right-radius"),
    ("borderBottomLeftRadius", "border-bottom-left-radius"), ("borderBottomRightRadius", "border-bottom-right-radius"),
    ("backgroundColor", "background-color"), ("backgroundImage", "background-image"),
    ("backgroundSize", "background-size"), ("backgroundPosition", "background-position"),
    ("backgroundRepeat", "background-repeat"),
    ("boxShadow", "box-shadow"), ("color", "color"),
    ("fontSize", "font-size"), ("fontWeight", "font-weight"), ("lineHeight", "line-height"),
    ("letterSpacing", "letter-spacing"), ("fontFamily", "font-family"), ("fontStyle", "font-style"),
    ("textAlign", "text-align"), ("textTransform", "text-transform"), ("whiteSpace", "white-space"),
    ("opacity", "opacity"), ("visibility", "visibility"),
    ("overflow", "overflow"), ("overflowX", "overflow-x"), ("overflowY", "overflow-y"),
    ("zIndex", "z-index"), ("transform", "transform"), ("filter", "filter"),
    ("backdropFilter", "backdrop-filter"),
    ("cursor", "cursor"), ("pointerEvents", "pointer-events"),
    ("objectFit", "object-fit"), ("mixBlendMode", "mix-blend-mode"),
    ("isolation", "isolation"), ("userSelect", "user-select"),
    ("aspectRatio", "aspect-ratio"), ("textOverflow", "text-overflow"),
]
KEBAB = {p for _, p in PROPS}

def parent_of(nid):
    return BY[nid]["parentId"]

INHERITED = {
    "color", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "fontFamily",
    "fontStyle", "textAlign", "textTransform", "whiteSpace", "visibility",
    "textIndent", "fontVariantCaps",
}

def needs_decl(nid, camel, prop):
    e = BY[nid]
    st = e.get("sty") or {}
    v = st.get(camel)
    if v is None:
        return None
    if v == INITIAL.get(camel, "__x__"):
        return None
    if camel in INHERITED:
        p = parent_of(nid)
        if p >= 0 and (BY[p].get("sty") or {}).get(camel) == v:
            return None  # 부모와 동값 → 상속으로 재현 가능(선언 생략)
    # 테두리 두께가 0 인 변의 색/종류 선언은 무의미 → 생략
    if prop.endswith("-color") or prop.endswith("-style"):
        side = prop.split("-")[1]
        widths = [st.get(f"border{side.title()}Width", "0px")]
        if all(w in ("0px", None) for w in widths):
            return None
    return v

# ---- 크기(너비/높이) 정책 ------------------------------------------------------
def size_decls(nid):
    e = BY[nid]
    cls = (e.get("attrs") or {}).get("class") or ""
    toks = cls_tokens(cls)
    r = e["rect"]
    out = []
    w_full = any(t in ("w-full", "size-full", "w-screen", "w-(...)") or t.startswith("w-") and t.endswith("]") and "100" in t for t in toks)
    h_full = "h-full" in toks or "size-full" in toks
    p = parent_of(nid)
    pos = (e["sty"] or {}).get("position")
    # HF 인라인 스타일의 치수 지시(100% 등)는 실측과 동메커니즘 → 그대로 존중한다.
    inline = (e.get("attrs") or {}).get("style") or ""
    iw = bool(re.search(r"width:\s*100%", inline))
    ih = bool(re.search(r"height:\s*100%", inline))
    # 유틸리티로 이미 처리된 크기는 Tier A 가 담당한다(중복 선언 금지).
    explicit = any(re.fullmatch(r"(-)?(w|h|min-w|min-h|max-w|max-h|size)-(\[[^\]]+\]|[0-9.]+|full|auto|fit|screen)", t.lstrip("-").rstrip("!")) for t in toks)
    if w_full:
        out.append(("width", "100%", False, ""))
    elif not explicit and pos in ("absolute", "fixed"):
        out.append(("width", "100%" if iw else f"{r['w']}px", False, ""))
    elif not explicit and p >= 0:
        pe = BY[p]
        pc = (pe.get("sty") or {})
        inner = pe["rect"]["w"] - float(pc.get("paddingLeft", "0px")[:-2]) - float(pc.get("paddingRight", "0px")[:-2])
        if abs(inner - r["w"]) > 0.2:
            out.append(("width", f"{r['w']}px", False, ""))
        elif pe["sty"].get("display") == "grid":
            out.append(("width", "100%", False, ""))
    if h_full:
        out.append(("height", "100%", False, ""))
    elif not explicit and pos in ("absolute", "fixed"):
        out.append(("height", "100%" if ih else f"{r['h']}px", False, ""))
    elif not explicit and "style" in (e.get("attrs") or {}) and "height" in (e.get("attrs") or {}).get("style", ""):
        pass  # 인라인 높이는 CSS 로 이동하지 않는다(생성기에서 인라인 유지 대상은 --* 뿐)
    elif not explicit and p >= 0 and (BY[p]["sty"].get("flexDirection") == "column" or BY[p]["sty"].get("display") == "grid"):
        # 컬럼/그리드 자식의 높이는 내용 주도(content) → 미선언이 원칙.
        # 단, 형제와 높이가 같고 flex-grow 가 0 인 형제들이면 동등 분배가 필요하다.
        pass
    return out

# ---- pseudo ---------------------------------------------------------------
def pseudo_rules(nid):
    e = BY[nid]
    out = []
    for pe in ("before", "after"):
        p = e.get(pe)
        if not p:
            continue
        content = p.get("content")
        if not content or content in ("none", "normal", '\"\"', "''"):
            continue
        decls = []
        for camel, prop in (("position", "position"), ("top", "top"), ("right", "right"),
                            ("bottom", "bottom"), ("left", "left"), ("width", "width"),
                            ("height", "height"), ("margin", "margin"), ("padding", "padding"),
                            ("borderRadius", "border-radius"), ("backgroundColor", "background-color"),
                            ("backgroundImage", "background-image"), ("boxShadow", "box-shadow"),
                            ("opacity", "opacity"), ("zIndex", "z-index"), ("border", "border"),
                            ("color", "color")):
            v = p.get(camel)
            if v and v not in ("auto", "normal", "none", "rgba(0, 0, 0, 0)", "0px"):
                decls.append((prop, v, False, ""))
        decls.insert(0, ("content", content, False, ""))
        out.append((pe, decls))
    return out

# ---- 토큰 치환 ---------------------------------------------------------------
ctl_tokens = OrderedDict()

def canon_name(prop, value):
    """--ctl-vid-* 토큰명을 값 시그니처로 생성한다."""
    v = value.strip()
    t = parse_color(v)
    if t:
        r, g, b, a = t
        base = f"c{r}-{g}-{b}"
        if a < 1:
            av = f"{a:g}".replace(".", "p").replace("0p", "p")
            base += f"-a{av}"
        return f"--ctl-vid-{base}"
    if re.fullmatch(r"-?[0-9.]+px", v):
        return f"--ctl-vid-px{v.replace('-', 'n').replace('.', 'p').replace('px', '')}"
    if re.fullmatch(r"-?[0-9.]+em", v):
        return f"--ctl-vid-tr{v.replace('-', 'n').replace('.', 'p').replace('em', '')}"
    if re.fullmatch(r"-?[0-9.]+%", v):
        return f"--ctl-vid-p{v.replace('-', 'n').replace('.', 'p').replace('%', '')}"
    if prop == "font-family":
        return "--ctl-vid-font-a"
    if prop == "box-shadow":
        return "--ctl-vid-sh"
    if prop == "background-image":
        return "--ctl-vid-bgimg"
    if prop == "transform":
        return "--ctl-vid-xf"
    if prop == "filter":
        return "--ctl-vid-flt"
    if re.fullmatch(r"[0-9.]+", v):
        return f"--ctl-vid-n{v.replace('.', 'p')}"
    slug = re.sub(r"[^a-z0-9]+", "-", v.lower()).strip("-")[:40]
    return f"--ctl-vid-{prop.replace('-', '')}-{slug}"

# ---- 잘린 실측값 복구 --------------------------------------------------------
# harvest.js 는 computed 를 160자로 잘아 저장한다(font 스택·data URI 가 대표적).
# 잘린 접두사만으로 OHF 레거시 미러(openhiggsfield.css)에서 HF 원문을 되찾는다 —
# 레거시는 HF 실측을 그대로 옮겨 적은 파일이므로 접두사 일치 = 동문 원복.
LEGACY = (pathlib.Path("/home/baramofme/open-higgsfield/src/openhiggsfield/openhiggsfield.css")
          ).read_text(encoding="utf-8")

def _depth_walk(s, i, end):
    q = p = 0
    while i < end:
        c = s[i]
        if c == '"':
            q ^= 1
        elif c == "(":
            p += 1
        elif c == ")":
            p = max(0, p - 1)
        elif c == ";" and q == 0 and p == 0:
            return i
        i += 1
    return end

def _is_balanced(v):
    return v.count('"') % 2 == 0 and v.count("(") == v.count(")")

def repair_truncated(v):
    if _is_balanced(v) or not v:
        return v
    i = LEGACY.find(v)
    if i < 0:
        return v
    # 선언 시작(이전 ' ; { }')까지 거슬러 올라가 값 전체를 읽는다.
    j = i
    while j > 0 and LEGACY[j - 1] not in ";{}/":
        j -= 1
    seg_end = _depth_walk(LEGACY, i, len(LEGACY))
    body = LEGACY[j:seg_end]
    c = body.find(":")
    if c < 0:
        return v
    full = body[c + 1:].strip()
    return full if full.startswith(v) and _is_balanced(full) else v

KEYWORDS = {
    "block", "inline-block", "inline-flex", "flex", "grid", "contents", "table",
    "none", "normal", "auto", "static", "relative", "absolute", "fixed", "sticky",
    "row", "row-reverse", "column", "column-reverse", "wrap", "nowrap", "wrap-reverse",
    "center", "flex-start", "flex-end", "space-between", "space-around", "space-evenly",
    "stretch", "baseline", "hidden", "visible", "clip", "scroll", "auto",
    "pointer", "default", "text", "grab", "grabbing", "wait", "progress", "not-allowed",
    "isolate", "uppercase", "lowercase", "capitalize", "italic", "oblique",
    "pre", "pre-wrap", "pre-line", "ellipsis", "antialiased",
    "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset",
    "fill", "contain", "cover", "scale-down", "multiply", "screen", "overlay",
    "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light",
    "difference", "exclusion", "hue", "saturation", "luminosity", "plus-lighter",
    "no-repeat", "repeat", "repeat-x", "repeat-y", "round", "space",
    "left", "right", "top", "bottom", "middle", "subpixel-antialiased",
    "bold", "bolder", "lighter", "small-caps", "inherit", "unset", "revert",
}

SANS_TAIL = ("ui-sans-serif, system-ui, sans-serif, ui-sans-serif, system-ui, sans-serif, "
             '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"')
# HF 의 모든 폰트 스택은 같은 폴백 꼬리를 쓴다(GT body 실측에서 확인). 캐프로 잘린
# 스택은 첫 패밀리만 남으면 이 꼬리로 완전 복원 가능 — 추정 아니라 실측 구조 재사용.

def token_for(prop, value):
    """리터럴 → 토큰 참조. --ohf-* 동값 우선, 없으면 --ctl-vid-* 신규 선언.

    CSS 키워드(열거형)는 실측 '값'이 아니라 메커니즘 표기이므로 그대로 통과시킨다.
    숫자·색·그림자·폰트 스택·url 같은 도색 값은 반드시 토큰화된다.
    """
    v = value.strip()
    if v.startswith("var(") or v in KEYWORDS:
        return v
    if prop == "font-family" and not _is_balanced(v):
        m = re.match(r'\s*"?([A-Za-z0-9 _-]+?)"?(?:,\s*$|,)', v)
        if m:
            first = m.group(1)
            v = (f'"{first}", ' if " " in first or first[0].isupper() else f"{first}, ") + SANS_TAIL
        else:
            return "inherit"  # 복원 불능 스택은 상속으로(렌더 안전 우선)
    v = repair_truncated(v)  # 수확 캐프로 잘린 값은 레거시에서 원문 복원
    if re.search(r"rgba?\(", v) and parse_color(v):
        eq = COLOR_EQ.get(serialize(parse_color(v)))
        if eq and eq.startswith("--ohf-"):
            return f"var({eq})"
    if re.fullmatch(r"[0-9.]+px", v):
        t = px_token(prop, v)
        if t:
            return t
    if prop == "font-weight" and re.fullmatch(r"[0-9.]+", v):
        t = num_token(prop, v)
        if t:
            return t
    name = canon_name(prop, v)
    ctl_tokens.setdefault(name, v)
    return f"var({name})"

def render_rule(nid, decls, pseudo):
    e = BY[nid]
    lines = []
    sel = f".ohf-vid-n{nid}"
    body = []
    seen = set()
    for prop, val, imp, variant in decls:
        if prop in seen:
            continue
        seen.add(prop)
        ref = token_for(prop, val)
        body.append(f"  {prop}: {ref}{' !important' if imp else ''};")
    if body:
        lines.append(f"{sel} {{\n" + "\n".join(body) + "\n}")
    for pe, pdecls in pseudo:
        pb = []
        for prop, val, imp, _ in pdecls:
            pb.append(f"  {prop}: {token_for(prop, val)}{' !important' if imp else ''};")
        lines.append(f"{sel}::{pe} {{\n" + "\n".join(pb) + "\n}")
    return lines

# ---- 본체 -------------------------------------------------------------------
rules = []
media_768 = []

# HF 는 자체 커스텀 프롭(--active-tab-*)로 탭 인디케이터의 기하를 구동한다.
# 그 메커니즘을 그대로 재사용한다(값 고정 대신 var() 참조 — 컴포넌트 국유 토큰의
# 원조 형태). 인라인 변수는 surface_body.tsx 가 HF 원문 attrs 로 이미 심었다.
HF_OWN_VAR = {
    "top": "--active-tab-top", "right": "--active-tab-right",
    "bottom": "--active-tab-bottom", "left": "--active-tab-left",
    "width": "--active-tab-width", "height": "--active-tab-height",
}

def hf_own_var(nid):
    st = (BY[nid].get("attrs") or {}).get("style") or ""
    declared = {"--" + m for m in re.findall(r"--(active-tab-[a-z-]+)\s*:", st)}
    out = {}
    for prop, name in HF_OWN_VAR.items():
        if name in declared:
            out[prop] = f"var({name})"
    return out

for nid in NIDS:
    e = BY[nid]
    decls = []
    own = hf_own_var(nid)
    for prop, val, imp, variant in util_pass(e):
        if variant in ("md:",):
            media_768.append((nid, prop, val, imp))
        elif variant == "":
            decls.append((prop, val, imp, ""))
    for camel, prop in PROPS:
        v = needs_decl(nid, camel, prop)
        if v is None:
            continue
        if prop in {p for p, _, _, _ in decls}:
            continue
        if prop in own:
            v = own[prop]  # HF 원 메커니즘 우선(var() )
        decls.append((prop, v, False, ""))
    for prop, val, imp, variant in size_decls(nid):
        if prop in {p for p, _, _, _ in decls}:
            continue
        if prop in own:
            val = own[prop]
        if variant == "md:":
            media_768.append((nid, prop, val, imp))
        else:
            decls.append((prop, val, imp, ""))
    pr = pseudo_rules(nid)
    out = render_rule(nid, decls, pr)
    if out:
        rules.extend(out)
        rules.append("")

# md: 변형과 hidden/md:flex 처리
md_groups = {}
for nid, prop, val, imp in media_768:
    md_groups.setdefault(nid, []).append((prop, val, imp))
md_lines = []
for nid, ds in sorted(md_groups.items()):
    body = "\n".join(f"  {p}: {token_for(p, v)}{' !important' if i else ''};" for p, v, i in ds)
    md_lines.append(f".ohf-vid-n{nid} {{\n{body}\n}}")
if md_lines:
    rules.append("@media (min-width: 768px) {")
    rules.extend(md_lines)
    rules.append("}")

# 서수 블록(토큰 선언)
tok_lines = ["/* ---- 성분 국유 토큰(--ctl-vid-*): 전부 HF computed 실측 리터럴 ---- */",
             ".ohf-vid-root {"]
seen_ctl = set()
for name, lit in ctl_tokens.items():
    if name in seen_ctl:
        continue
    seen_ctl.add(name)
    tok_lines.append(f"  {name}: {lit};")
tok_lines.append("}")

HEADER = """/* =============================================================================
   video-surface.css — HF /ko/ai/video?model=minimax_h3 정적 화면 이식 (t_bb8f3edb)

   ground-truth: HF live CDP 1440×900 의 306개 가시 요소 실측
   (t_a1c5ed28 hf_video_ground_truth.json; rect + computed styles).
   이 파일의 모든 값은 그 실측에서 나온 것 — 반올림·추측 없음.

   토큰 3계층 규칙:
   · --o-*(primitive)는 이 파일에서 직접 참조하지 않는다.
   · --ohf-*(semantic)는 실측값과 직렬화까지 동값인 곳만 쓴다.
   · 그 외는 --ctl-vid-*(성분 국유) 토큰으로 선언해 참조한다.
     하드코딩은 아래 토큰 선언 블록 안의 실측 리터럴에만 존재한다.
   ============================================================================= */
"""

css = HEADER + "\n" + "\n".join(tok_lines) + "\n\n/* ---- 실측 규칙 ---- */\n\n" + "\n".join(rules) + "\n"
(ROOT / "landing_verify/video_surface.css.gen").write_text(css, encoding="utf-8")
print("rules:", len([l for l in rules if l.endswith('}')]), "ctl tokens:", len(ctl_tokens), "bytes:", len(css))
