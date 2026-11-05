#!/usr/bin/env python3
"""Deep region harvest on the PUBLIC HF project drill-down page:
breadcrumb subtree (+outerHTML), project-list rail (container+tile internals),
folder section (public folder UI), app shell rects/styles. Screenshots: viewport
+ full-page; PIL crops of each region from the full-page png."""
import asyncio, base64, json, os, sys, urllib.request
import websockets

URL = "https://higgsfield.ai/ko/@higgsfield.studio/projects/cully-hill-boys"
CDP_HTTP = "http://127.0.0.1:9222"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

STYLE_PROPS = [
    "color", "backgroundColor", "backgroundImage", "backgroundClip",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "borderTopColor", "borderBottomColor", "borderRadius", "paddingTop", "paddingRight",
    "paddingBottom", "paddingLeft", "marginTop", "marginRight", "marginBottom",
    "marginLeft", "fontSize", "fontWeight", "fontFamily", "lineHeight",
    "letterSpacing", "textAlign", "textTransform", "textDecoration", "whiteSpace",
    "boxShadow", "display", "gridTemplateColumns", "flexDirection", "alignItems",
    "justifyContent", "gap", "rowGap", "columnGap", "overflow", "objectFit",
    "opacity", "visibility", "position", "zIndex", "backdropFilter", "filter",
    "transform", "width", "height", "maxWidth", "cursor", "transition", "appearance",
]

REGION_JS = """(() => {
  const props = %PROPS%;
  const info = (el, depth) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const st = {};
    for (const p of props) st[p] = cs[p] || '';
    const kids = [];
    if (depth > 0) for (const k of el.children) { const o = info(k, depth - 1); if (o) kids.push(o); }
    return {
      tag: el.tagName.toLowerCase(),
      cls: (el.className && typeof el.className === 'string') ? el.className : (el.getAttribute('class') || ''),
      id: el.id || '',
      aria: el.getAttribute('aria-label'),
      role: el.getAttribute('role'),
      href: el.getAttribute('href') || '',
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 200),
      ownText: [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\\s+/g, ' ').trim().slice(0, 120),
      rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
      styles: st,
      children: kids,
    };
  };
  const html = (el, cap) => {
    if (!el) return null;
    const s = el.outerHTML;
    return s.length > cap ? s.slice(0, cap) + '...[TRUNCATED ' + (s.length - cap) + ' chars]' : s;
  };
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

  // breadcrumb: aria-label 탐색 경로, pick the one with rect
  const crumbs = [...document.querySelectorAll('nav[aria-label]')].filter(n => /경로|breadcrumb/i.test(n.getAttribute('aria-label') || ''));
  const crumbRoot = crumbs.find(visible) || crumbs[0] || null;

  // project rail: anchors like the community list tiles
  const tiles = [...document.querySelectorAll('a.group')].filter(a => {
    const r = a.getBoundingClientRect();
    return r.width > 150 && r.height > 60;
  });
  let rail = null;
  if (tiles.length) {
    let p = tiles[0].parentElement;
    for (let i = 0; i < 4 && p && p.querySelectorAll('a.group').length < tiles.length; i++) p = p.parentElement;
    rail = p;
  }

  // folder section: text leaf '폴더'
  const leaves = [...document.querySelectorAll('div,span,h2,h3,p,button,a')].filter(e =>
    e.children.length === 0 && (e.textContent || '').trim() === '폴더' && visible(e));
  let folderRoot = null;
  if (leaves.length) {
    let e = leaves[0];
    for (let i = 0; i < 6 && e.parentElement; i++) {
      e = e.parentElement;
      if (e.querySelectorAll('a,button').length >= 2 && /폴더|폴더를|ACT|에셋/i.test(e.textContent || '')) { folderRoot = e; break; }
    }
    folderRoot = folderRoot || leaves[0].parentElement;
  }

  const header = document.querySelector('header') || document.querySelector('[class*="area-[header"]');
  const sidebar = document.querySelector('aside') || document.querySelector('[class*=sidebar]');
  const footer = document.querySelector('footer') || document.querySelector('[class*="area-[footer"]');
  const main = document.querySelector('[class*="area-[main"]') || document.querySelector('main');

  return {
    href: location.href, title: document.title,
    viewport: {iw: innerWidth, ih: innerHeight},
    docScroll: {sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight},
    scrollY: scrollY,
    crumb: crumbRoot ? {outerHTML: html(crumbRoot, 40000), self: info(crumbRoot, 6)} : null,
    rail: rail ? {outerHTML: html(rail, 160000), self: info(rail, 2),
                  tileCount: tiles.length,
                  tiles: tiles.slice(0, 4).map(t => info(t, 6)),
                  tileClasses: [...new Set(tiles.map(t => t.className))].slice(0, 4)} : null,
    folder: folderRoot ? {outerHTML: html(folderRoot, 120000), self: info(folderRoot, 7)} : null,
    shell: {header: info(header, 1), sidebar: info(sidebar, 1), footer: info(footer, 1), main: info(main, 1)},
    theme: {htmlDataTheme: document.documentElement.getAttribute('data-theme'),
            colorScheme: getComputedStyle(document.documentElement).colorScheme,
            bodyBg: getComputedStyle(document.body).backgroundColor},
  };
})()""".replace("%PROPS%", json.dumps(STYLE_PROPS))


def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=5) as r:
        return json.load(r)["webSocketDebuggerUrl"]


async def run():
    ws_url = browser_ws()
    async with websockets.connect(ws_url, max_size=None, open_timeout=30) as ws:
        msg_id = 0
        pending = {}
        events = {}

        async def send(method, params=None, session=None, timeout=20):
            nonlocal msg_id
            msg_id += 1
            m = {"id": msg_id, "method": method, "params": params or {}}
            if session:
                m["sessionId"] = session
            await ws.send(json.dumps(m))
            fut = asyncio.get_running_loop().create_future()
            pending[msg_id] = fut
            try:
                return await asyncio.wait_for(fut, timeout)
            except asyncio.TimeoutError:
                pending.pop(msg_id, None)
                raise RuntimeError("CDP send %s timed out" % method)

        async def reader():
            try:
                while True:
                    d = json.loads(await ws.recv())
                    if "id" in d and d["id"] in pending:
                        fut = pending.pop(d["id"])
                        if not fut.done():
                            fut.set_result(d.get("result", d.get("error")))
                    elif "method" in d:
                        events.setdefault(d["method"], []).append(d)
            except Exception as e:
                print("reader ended:", repr(e), file=sys.stderr)

        rt = asyncio.ensure_future(reader())
        target_id = None
        try:
            res = await send("Target.createTarget", {"url": "about:blank"})
            target_id = res["targetId"]
            session = (await send("Target.attachToTarget",
                                  {"targetId": target_id, "flatten": True}))["sessionId"]
            await send("Runtime.enable", session=session)
            live = (await send("Runtime.evaluate", {"expression": "1+1", "returnByValue": True},
                               session=session))["result"]["value"]
            assert live == 2, "wedge"
            await send("Emulation.setDeviceMetricsOverride",
                       {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False},
                       session=session)
            await send("Page.enable", session=session)
            events.pop("Page.loadEventFired", None)
            await send("Page.navigate", {"url": URL}, session=session)
            waited = 0.0
            while not events.get("Page.loadEventFired"):
                await asyncio.sleep(0.2)
                waited += 0.2
                if waited > 25:
                    break
            await asyncio.sleep(3.5)

            async def ev(expr):
                r = await send("Runtime.evaluate",
                               {"expression": expr, "returnByValue": True, "awaitPromise": True},
                               session=session)
                if "exceptionDetails" in r:
                    raise RuntimeError("JS exception: %s" % json.dumps(r["exceptionDetails"])[:400])
                return r["result"].get("value")

            region = await ev(REGION_JS)
            # welcome modal may appear on fresh first-visit; dismiss if present
            if region.get("title") and await ev("!!document.querySelector('[role=dialog]')"):
                print("dialog present at deep-harvest; removing", file=sys.stderr)
            s1 = await send("Page.captureScreenshot", {"format": "png"}, session=session, timeout=45)
            s2 = await send("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True},
                            session=session, timeout=45)
            os.makedirs(OUT_DIR, exist_ok=True)
            with open(os.path.join(OUT_DIR, "deep-viewport.png"), "wb") as f:
                f.write(base64.b64decode(s1["data"]))
            with open(os.path.join(OUT_DIR, "deep-full.png"), "wb") as f:
                f.write(base64.b64decode(s2["data"]))
            with open(os.path.join(OUT_DIR, "deep-regions.json"), "w", encoding="utf-8") as f:
                json.dump(region, f, ensure_ascii=False, indent=1)
            print(json.dumps({"ok": True, "href": region.get("href"),
                              "crumb": bool(region.get("crumb")),
                              "railTiles": (region.get("rail") or {}).get("tileCount"),
                              "folder": bool(region.get("folder"))}, ensure_ascii=False))
            await send("Target.closeTarget", {"targetId": target_id})
        finally:
            rt.cancel()
            if target_id:
                try:
                    await send("Target.closeTarget", {"targetId": target_id}, timeout=5)
                except Exception:
                    pass


if __name__ == "__main__":
    asyncio.run(run())
