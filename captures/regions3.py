#!/usr/bin/env python3
"""Region harvest pass 3: project list cards (article.community-project-card)
container + internals + all rects, on /ko/community and /ko/community/projects."""
import asyncio, base64, json, os, sys, urllib.request
import websockets

CDP_HTTP = "http://127.0.0.1:9222"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

STYLE_PROPS = [
    "color", "backgroundColor", "backgroundImage", "backgroundClip",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "borderTopColor", "borderBottomColor", "borderRadius", "paddingTop", "paddingRight",
    "paddingBottom", "paddingLeft", "marginTop", "marginRight", "marginBottom",
    "marginLeft", "fontSize", "fontWeight", "fontFamily", "lineHeight",
    "letterSpacing", "textAlign", "textTransform", "whiteSpace",
    "boxShadow", "display", "gridTemplateColumns", "flexDirection", "alignItems",
    "justifyContent", "gap", "rowGap", "columnGap", "overflow", "objectFit",
    "opacity", "visibility", "position", "zIndex", "backdropFilter", "filter",
    "transform", "width", "height", "maxWidth", "cursor", "transition", "appearance",
    "aspectRatio", "borderTopLeftRadius", "borderBottomRightRadius",
]

JS = """(() => {
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
  const cards = [...document.querySelectorAll('article.community-project-card')].filter(a => {
    const r = a.getBoundingClientRect();
    return r.width > 50 && r.height > 50;
  });
  let container = null;
  if (cards.length) {
    let p = cards[0].parentElement;
    for (let i = 0; i < 5 && p && p.querySelectorAll('article.community-project-card').length < cards.length; i++) p = p.parentElement;
    container = p;
  }
  // section heading above the grid, if any
  let heading = null;
  if (container) {
    let sec = container.closest('section') || container.parentElement;
    if (sec) {
      const h = [...sec.querySelectorAll('h1,h2,h3')].find(e => e.getBoundingClientRect().width > 0);
      if (h) heading = info(h, 2);
    }
  }
  return {
    href: location.href, title: document.title,
    docScroll: {sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight},
    cardCount: cards.length,
    container: container ? {outerHTML: html(container, 200000), self: info(container, 2)} : null,
    cards: cards.slice(0, 3).map(c => info(c, 8)),
    cardClasses: [...new Set(cards.map(c => c.className))].slice(0, 5),
    cardRects: cards.slice(0, 80).map(c => { const r = c.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top)}; }),
    heading: heading,
  };
})()""".replace("%PROPS%", json.dumps(STYLE_PROPS))


def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=5) as r:
        return json.load(r)["webSocketDebuggerUrl"]


async def harvest(url, slug):
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
            await send("Page.navigate", {"url": url}, session=session)
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

            data = await ev(JS)
            s1 = await send("Page.captureScreenshot", {"format": "png"}, session=session, timeout=45)
            s2 = await send("Page.captureScreenshot",
                            {"format": "png", "captureBeyondViewport": True},
                            session=session, timeout=45)
            with open(os.path.join(OUT_DIR, slug + "-viewport.png"), "wb") as f:
                f.write(base64.b64decode(s1["data"]))
            with open(os.path.join(OUT_DIR, slug + "-full.png"), "wb") as f:
                f.write(base64.b64decode(s2["data"]))
            with open(os.path.join(OUT_DIR, slug + ".json"), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=1)
            return {"ok": True, "slug": slug, "href": data.get("href"),
                    "cardCount": data.get("cardCount")}
        finally:
            rt.cancel()
            if target_id:
                try:
                    await send("Target.closeTarget", {"targetId": target_id}, timeout=5)
                except Exception:
                    pass


async def main():
    out = [
        await harvest("https://higgsfield.ai/ko/community", "community-cards"),
        await harvest("https://higgsfield.ai/ko/community/projects", "community-projects"),
    ]
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    asyncio.run(main())
