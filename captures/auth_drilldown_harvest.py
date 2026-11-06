#!/usr/bin/env python3
"""Auth drill-down harvest on the authenticated HF project-3 page via CDP :9223.
Captures breadcrumb (nav[aria-label=탐색 경로]), the inline folder panel
(폴더·모든 에셋·ACT folders·휴지통), the project header, the asset grid, the
right rail, trash inline row, plus auth markers (cookie __session / title) so
the values trace to a real measured capture. Screenshots viewport + full."""
import asyncio, base64, json, os, sys, urllib.request
import websockets

URL = "https://higgsfield.ai/ko/generate/@exploringdonut1792/project-3"
CDP_HTTP = "http://127.0.0.1:9223"
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
      data: Object.fromEntries([...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])),
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

  // breadcrumb: nav[aria-label=탐색 경로]
  const crumbs = [...document.querySelectorAll('nav[aria-label]')].filter(n => /경로|breadcrumb/i.test(n.getAttribute('aria-label') || ''));
  const crumbRoot = crumbs.find(visible) || crumbs[0] || null;

  // folder panel: text leaf '폴더'
  const leaves = [...document.querySelectorAll('div,span,h2,h3,p,button,a')].filter(e =>
    e.children.length === 0 && (e.textContent || '').trim() === '폴더' && visible(e));
  let folderRoot = null;
  if (leaves.length) {
    let e = leaves[0];
    for (let i = 0; i < 8 && e.parentElement; i++) {
      e = e.parentElement;
      if (e.querySelectorAll('button').length >= 2 && /폴더|ACT|에셋|휴지통/i.test(e.textContent || '')) { folderRoot = e; break; }
    }
    folderRoot = folderRoot || leaves[0].parentElement;
  }

  // trash inline row: text leaf '휴지통'
  const trashLeaves = [...document.querySelectorAll('div,span,p,button,a')].filter(e =>
    visible(e) && (e.textContent || '').trim().replace(/\\s*\\d+$/, '').trim() === '휴지통');
  const trashRow = trashLeaves.map(t => { let p=t; for (let i=0;i<6&&p.parentElement;i++){p=p.parentElement; if(p.querySelectorAll('button').length>=1 && /휴지통/.test(p.textContent||'') && p.getBoundingClientRect().height<=60) return p;} return t.parentElement; });

  // project header / title: look for project name on left + cluster
  const header = document.querySelector('header') || document.querySelector('[class*="area-[header"]');
  const sidebar = document.querySelector('aside') || document.querySelector('[class*=sidebar]');
  const main = document.querySelector('[class*="area-[main"]') || document.querySelector('main');

  // project list rail (right): anchors group tiles
  const tiles = [...document.querySelectorAll('a.group')].filter(a => {
    const r = a.getBoundingClientRect(); return r.width > 150 && r.height > 60;
  });
  let rail = null;
  if (tiles.length) {
    let p = tiles[0].parentElement;
    for (let i = 0; i < 4 && p && p.querySelectorAll('a.group').length < tiles.length; i++) p = p.parentElement;
    rail = p;
  }

  // asset grid: container with many img/tile descendants
  let assetGrid = null;
  const imgTiles = [...document.querySelectorAll('img,article,[class*=tile],[class*=card]')].filter(e=>visible(e) && e.getBoundingClientRect().width>100 && e.getBoundingClientRect().height>60);
  if (imgTiles.length) { let p = imgTiles[0].parentElement; for (let i=0;i<5&&p&&p.children.length<Math.min(8,imgTiles.length);i++) p=p.parentElement; assetGrid=p; }

  return {
    href: location.href, title: document.title,
    cookieLen: document.cookie.length, hasSession: /__session/.test(document.cookie),
    ua: navigator.userAgent,
    viewport: {iw: innerWidth, ih: innerHeight},
    docScroll: {sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight},
    scrollY: scrollY,
    bodyLen: (document.body.innerText||'').replace(/\\s+/g,' ').trim().length,
    bodyMarkers: (document.body.innerText||'').replace(/\\s+/g,' ').trim().slice(0,900),
    crumb: crumbRoot ? {outerHTML: html(crumbRoot, 40000), self: info(crumbRoot, 7)} : null,
    folder: folderRoot ? {outerHTML: html(folderRoot, 140000), self: info(folderRoot, 7)} : null,
    trash: trashRow.length ? trashRow.slice(0,4).map(t => ({outerHTML: html(t, 4000), self: info(t, 6)})) : null,
    rail: rail ? {outerHTML: html(rail, 160000), self: info(rail, 2),
                  tileCount: tiles.length, tiles: tiles.slice(0,4).map(t => info(t, 6)),
                  tileClasses: [...new Set(tiles.map(t => t.className))].slice(0, 4)} : null,
    assetGrid: assetGrid ? {outerHTML: html(assetGrid, 80000), self: info(assetGrid, 2), tileCount: imgTiles.length} : null,
    shell: {header: info(header, 2), sidebar: info(sidebar, 3), main: info(main, 2)},
    theme: {htmlDataTheme: document.documentElement.getAttribute('data-theme'),
            colorScheme: getComputedStyle(document.documentElement).colorScheme,
            bodyBg: getComputedStyle(document.body).backgroundColor},
    counts: {projCells: document.querySelectorAll('[class*=project-card]').length,
             crumbs: crumbs.length, trashish: [...document.querySelectorAll('*')].filter(e=>e.children.length===0&&/휴지통/.test(e.textContent||'')).length,
             folderEls: document.querySelectorAll('[aria-label*=폴더]').length},
  };
})()""".replace("%PROPS%", json.dumps(STYLE_PROPS))


def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=8) as r:
        return json.load(r)["webSocketDebuggerUrl"]


async def run():
    ws_url = browser_ws()
    async with websockets.connect(ws_url, max_size=None, open_timeout=30) as ws:
        msg_id = 0
        pending = {}
        events = {}

        async def send(method, params=None, session=None, timeout=25):
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
            await send("Network.enable", session=session)
            await send("Network.setCacheDisabled", {"cacheDisabled": True}, session=session)
            events.pop("Page.loadEventFired", None)
            await send("Page.navigate", {"url": URL}, session=session)
            waited = 0.0
            while not events.get("Page.loadEventFired"):
                await asyncio.sleep(0.2)
                waited += 0.2
                if waited > 30:
                    break
            await asyncio.sleep(4.0)

            async def ev(expr):
                r = await send("Runtime.evaluate",
                               {"expression": expr, "returnByValue": True, "awaitPromise": True},
                               session=session)
                if "exceptionDetails" in r:
                    raise RuntimeError("JS exception: %s" % json.dumps(r["exceptionDetails"])[:400])
                return r["result"].get("value")

            # dismiss a welcome/auth modal if it covers the page (real users rarely get it)
            if await ev("!!document.querySelector('[role=dialog]')"):
                print("dialog present; clicking close button", file=sys.stderr)
                await ev("(()=>{const b=document.querySelector('[role=dialog] button[aria-label*=close], [role=dialog] button[data-dismiss], [role=dialog] [class*=close]'); if(b){b.click(); return 'clicked';} const x=[...document.querySelectorAll('[role=dialog] svg')].map(s=>s.closest('button')).filter(Boolean); if(x.length){x[0].click(); return 'clicked-x';} return 'no-btn';})()")
                await asyncio.sleep(1.2)

            region = await ev(REGION_JS)
            s1 = await send("Page.captureScreenshot", {"format": "png"}, session=session, timeout=45)
            s2 = await send("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True},
                            session=session, timeout=45)
            os.makedirs(OUT_DIR, exist_ok=True)
            with open(os.path.join(OUT_DIR, "auth-drilldown-viewport.png"), "wb") as f:
                f.write(base64.b64decode(s1["data"]))
            with open(os.path.join(OUT_DIR, "auth-drilldown-full.png"), "wb") as f:
                f.write(base64.b64decode(s2["data"]))
            with open(os.path.join(OUT_DIR, "auth-drilldown.json"), "w", encoding="utf-8") as f:
                json.dump(region, f, ensure_ascii=False, indent=1)
            print(json.dumps({"ok": True, "href": region.get("href"), "title": region.get("title"),
                              "hasSession": region.get("hasSession"), "cookieLen": region.get("cookieLen"),
                              "crumb": bool(region.get("crumb")), "folder": bool(region.get("folder")),
                              "trash": bool(region.get("trash")),
                              "railTiles": (region.get("rail") or {}).get("tileCount"),
                              "assetGrid": bool(region.get("assetGrid")),
                              "bodyLen": region.get("bodyLen"),
                              "counts": region.get("counts")}, ensure_ascii=False))
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
