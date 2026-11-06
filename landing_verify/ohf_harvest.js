(() => {
  const MAX = 6000;
  const SK = [
    "display","position","top","right","bottom","left",
    "flexDirection","flexWrap","alignItems","alignContent","justifyContent",
    "flexGrow","flexShrink","flexBasis",
    "gap","rowGap","columnGap",
    "paddingTop","paddingRight","paddingBottom","paddingLeft",
    "marginTop","marginRight","marginBottom","marginLeft",
    "borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth",
    "borderTopStyle","borderRightStyle","borderBottomStyle","borderLeftStyle",
    "borderTopColor","borderRightColor","borderBottomColor","borderLeftColor",
    "borderRadius","borderTopLeftRadius","borderTopRightRadius",
    "borderBottomLeftRadius","borderBottomRightRadius",
    "backgroundColor","backgroundImage","backgroundSize","backgroundPosition","backgroundRepeat",
    "boxShadow","color",
    "fontSize","fontWeight","lineHeight","letterSpacing","fontFamily","fontStyle",
    "textAlign","textTransform","whiteSpace","wordSpacing","textIndent",
    "opacity","visibility","overflow","overflowX","overflowY","zIndex",
    "transform","transformOrigin","filter","backdropFilter",
    "cursor","pointerEvents","objectFit","objectPosition",
    "outline","outlineOffset","appearance","aspectRatio","mixBlendMode",
    "willChange","contain","userSelect","scrollbarWidth","verticalAlign",
    "isolation","clipPath","scrollBehavior"
  ];
  const cap = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n) : s; };
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    const offscreen = (r.right < 0) || (r.left > innerWidth) || (r.bottom < 0) || (r.top > innerHeight);
    return {
      x: Math.round(r.x * 10) / 10,
      y: Math.round(r.y * 10) / 10,
      w: Math.round(r.width * 10) / 10,
      h: Math.round(r.height * 10) / 10,
      offscreen: offscreen
    };
  };
  const ownText = (el) => {
    let t = "";
    for (const n of el.childNodes) { if (n.nodeType === 3) t += n.nodeValue; }
    return t.replace(/\s+/g, " ").trim().slice(0, 200);
  };
  const attrOf = (el) => {
    const a = {};
    let c = 0;
    for (const at of el.attributes) {
      if (c >= 32) { a.__truncated = true; break; }
      a[at.name] = cap(at.value, 300);
      c++;
    }
    return a;
  };
  const pseudoOf = (el, pe) => {
    const p = getComputedStyle(el, pe);
    return {
      content: cap(p.content, 80), position: p.position,
      top: p.top, right: p.right, bottom: p.bottom, left: p.left,
      width: p.width, height: p.height, margin: p.margin, padding: p.padding,
      borderRadius: p.borderRadius,
      backgroundColor: p.backgroundColor, backgroundImage: cap(p.backgroundImage, 100),
      boxShadow: cap(p.boxShadow, 120), opacity: p.opacity, zIndex: p.zIndex,
      border: p.border, color: p.color
    };
  };
  const nodes = [];
  let seq = 0;
  let truncated = false;
  const walk = (el, parentId, depth) => {
    if (truncated) return parentId;
    if (nodes.length >= MAX) { truncated = true; return parentId; }
    const r = el.getBoundingClientRect();
    let myId = parentId;
    if (r.width > 0 && r.height > 0) {
      const c = getComputedStyle(el);
      const st = {};
      for (const k of SK) { st[k] = cap(c[k], 160); }
      nodes.push({
        nid: seq, tag: el.tagName, parentId: parentId, depth: depth,
        id: el.id || "",
        cls: cap(el.getAttribute("class") || "", 220),
        attrs: attrOf(el),
        anchor: el.getAttribute("data-ohf-video") || "",
        txt: ownText(el),
        val: (typeof el.value === "string" && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) ? cap(el.value, 120) : null,
        ph: el.tagName === "INPUT" ? cap(el.getAttribute("placeholder") || "", 120) : null,
        rect: rectOf(el),
        sty: st,
        before: pseudoOf(el, "::before"),
        after: pseudoOf(el, "::after")
      });
      myId = seq; seq++;
    }
    const kids = el.children;
    for (let i = 0; i < kids.length; i++) { walk(kids[i], myId, depth + 1); }
    return myId;
  };
  walk(document.body, -1, 0);
  const htmlA = {};
  for (const at of document.documentElement.attributes) { htmlA[at.name] = cap(at.value, 200); }
  const csBody = getComputedStyle(document.body);
  return {
    href: location.href, title: document.title, readyState: document.readyState,
    lang: document.documentElement.lang || "", dir: document.documentElement.dir || "",
    innerW: innerWidth, innerH: innerHeight, scrollX: scrollX, scrollY: scrollY,
    dpr: devicePixelRatio,
    docScrollW: document.documentElement.scrollWidth, docScrollH: document.documentElement.scrollHeight,
    clientW: document.documentElement.clientWidth, clientH: document.documentElement.clientHeight,
    htmlAttrs: htmlA,
    body: {
      rect: rectOf(document.body),
      backgroundColor: csBody.backgroundColor, backgroundImage: cap(csBody.backgroundImage, 160),
      color: csBody.color, fontSize: csBody.fontSize, lineHeight: csBody.lineHeight,
      fontFamily: cap(csBody.fontFamily, 120), overflow: csBody.overflow
    },
    fonts: Array.from(document.fonts).map(f => ({ family: f.family, status: f.status })).slice(0, 30),
    styleSheets: document.styleSheets.length,
    count: nodes.length, truncated: truncated,
    elements: nodes
  };
})()
