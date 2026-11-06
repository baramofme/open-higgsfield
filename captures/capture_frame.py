#!/usr/bin/env python3
"""HF public-frame ground-truth capture via CDP :9222.

Per URL: fresh target -> attach -> liveness -> emulate 1440x900 -> navigate ->
wait load + settle -> auth harvest -> screenshot (viewport + beyond) ->
DOM/region rect+computed-style harvest. Honest guest check; never fabricate.
"""
import asyncio, base64, json, os, sys, urllib.request
import websockets

CDP_HTTP = "http://127.0.0.1:9222"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

STYLE_PROPS = [
    "color", "backgroundColor", "backgroundImage", "backgroundClip",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "borderTopColor", "borderRadius", "paddingTop", "paddingRight", "paddingBottom",
    "paddingLeft", "marginTop", "marginLeft", "fontSize", "fontWeight",
    "lineHeight", "letterSpacing", "textAlign", "boxShadow", "display",
    "gridTemplateColumns", "gap", "rowGap", "columnGap", "overflow", "opacity",
    "visibility", "position", "zIndex", "backdropFilter", "filter", "transform",
    "width", "height", "cursor", "transition",
]

# NOTE: JS selectors single-quoted; built from triple-quoted template per
# oh-live-cdp-workflow-shots (hand-typed-quote breakage lesson).
HARVEST_JS = """(() => {
  const props = %PROPS%;
  const info = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const st = {};
    for (const p of props) st[p] = cs[p] || '';
    return {
      tag: el.tagName.toLowerCase(),
      cls: (el.className && typeof el.className === 'string') ? el.className : '',
      id: el.id || '',
      aria: el.getAttribute('aria-label'),
      role: el.getAttribute('role'),
      testid: el.getAttribute('data-testid') || el.getAttribute('data-qa') || '',
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 160),
      rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
      styles: st,
    };
  };
  const uniq = (arr) => {
    const seen = new Set(); const out = [];
    for (const el of arr) { if (!seen.has(el) && el instanceof Element) { seen.add(el); out.push(el); } }
    return out;
  };
  const all = [...document.querySelectorAll('*')];
  const byClass = (re) => all.filter(e => typeof e.className === 'string' && re.test(e.className));
  const byTestid = (re) => all.filter(e => {
    const t = (e.getAttribute('data-testid') || '') + ' ' + (e.getAttribute('data-qa') || '');
    return re.test(t);
  });

  const cookie = document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(Boolean);
  const bodyTxt = document.body ? document.body.innerText : '';

  // auth gate signals
  const authMarkers = {
    signin_title: /로그인|sign in|sign in to|계정/i.test(document.title) || /내 계정에 로그인/.test(bodyTxt.slice(0, 400)),
    signin_cta: /(?:로그인|Sign in|Continue with|Google|Apple|Email).*?(?:로그인|Sign in)/s.test(bodyTxt.slice(0, 800)),
    url_signin: location.href.includes('auth/sign-in'),
  };
  const contentMarkers = {
    project_word: /project|프로젝트/i.test(bodyTxt),
    folder_word: /folder|폴더/i.test(bodyTxt),
    trash_word: /trash|휴지통|삭제된/i.test(bodyTxt),
    breadcrumb_char: /[›»]/.test(bodyTxt),
    empty_state: /아무것도|no (items|generations|projects)|비어|empty/i.test(bodyTxt),
  };

  const cells = byClass(/(?:^|[\\s_-])(card|tile|cell)(?:$|[\\s_-])/i).concat(byTestid(/card|tile|cell|project|item/i));
  const projCells = byClass(/project/i).concat(byTestid(/project/i));
  const crumbs = byClass(/breadcrumb|crumb/i)
    .concat(all.filter(e => e.tagName === 'NAV' && /breadcrumb/i.test(e.getAttribute('aria-label') || '')))
    .concat(all.filter(e => /[›»]/.test((e.textContent || '')) && e.children.length >= 1 && e.children.length <= 8 && (e.textContent || '').length < 200));
  const trashish = byClass(/trash|bin/i).concat(byTestid(/trash|bin|deleted/i));
  const header = document.querySelector('header') || document.querySelector('[class*=header]') || document.querySelector('[class*=topbar]') || document.querySelector('[class*=navbar]');
  const footer = document.querySelector('footer') || document.querySelector('[class*=footer]');

  const cap = (arr, n) => uniq(arr).slice(0, n).map(info).filter(Boolean);
  const modal = document.querySelector('[role=dialog]') || document.querySelector('[class*=modal]') || document.querySelector('[class*=overlay]');
  const authForm = document.querySelector('input[type=password],input[type=email]');

  return {
    href: location.href,
    title: document.title,
    cookieNames: [...new Set(cookie)].sort(),
    bodyLen: bodyTxt.length,
    bodyExcerpt: bodyTxt.slice(0, 900),
    authMarkers, contentMarkers,
    hasModal: !!modal, hasAuthForm: !!authForm,
    modalInfo: info(modal),
    viewport: {iw: innerWidth, ih: innerHeight, dpr: devicePixelRatio},
    docScroll: {sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight},
    headerInfo: info(header), footerInfo: info(footer),
    cells: cap(cells, 40), projCells: cap(projCells, 30),
    crumbs: cap(crumbs, 30), trashish: cap(trashish, 30),
    counts: {all: all.length, cells: uniq(cells).length, projCells: uniq(projCells).length, crumbs: uniq(crumbs).length, trashish: uniq(trashish).length},
  };
})()""".replace("%PROPS%", json.dumps(STYLE_PROPS))


def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=5) as r:
        return json.load(r)["webSocketDebuggerUrl"]


async def capture(url, slug, attempts=3):
    ws_url = browser_ws()
    last_err = None
    for attempt in range(attempts):
        try:
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
                        raise RuntimeError("CDP send %s timed out after %ss" % (method, timeout))

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
                    live = (await send("Runtime.evaluate",
                                       {"expression": "1+1", "returnByValue": True},
                                       session=session))["result"]["value"]
                    if live != 2:
                        raise RuntimeError("browser wedge? 1+1 -> %r" % (live,))
                    await send("Emulation.setDeviceMetricsOverride",
                               {"width": 1440, "height": 900, "deviceScaleFactor": 1,
                                "mobile": False}, session=session)
                    await send("Page.enable", session=session)
                    events.pop("Page.loadEventFired", None)
                    await send("Page.navigate", {"url": url}, session=session)
                    waited = 0.0
                    while not events.get("Page.loadEventFired"):
                        await asyncio.sleep(0.2)
                        waited += 0.2
                        if waited > 25:
                            break
                    await asyncio.sleep(2.5)
                    # extra settle for client-side render/redirect
                    await asyncio.sleep(2.0)

                    async def ev(expr):
                        r = await send("Runtime.evaluate",
                                       {"expression": expr, "returnByValue": True,
                                        "awaitPromise": True}, session=session)
                        if "exceptionDetails" in r:
                            raise RuntimeError("JS exception: %s" % json.dumps(r["exceptionDetails"])[:400])
                        return r["result"].get("value")

                    harvest = await ev(HARVEST_JS)
                    outer = await ev("document.documentElement.outerHTML")
                    shot_view = await send("Page.captureScreenshot",
                                           {"format": "png"}, session=session)
                    shot_full = await send("Page.captureScreenshot",
                                           {"format": "png", "captureBeyondViewport": True},
                                           session=session)
                    os.makedirs(OUT_DIR, exist_ok=True)
                    with open(os.path.join(OUT_DIR, slug + "-viewport.png"), "wb") as f:
                        f.write(base64.b64decode(shot_view["data"]))
                    with open(os.path.join(OUT_DIR, slug + "-full.png"), "wb") as f:
                        f.write(base64.b64decode(shot_full["data"]))
                    html_path = os.path.join(OUT_DIR, slug + ".html")
                    with open(html_path, "w", encoding="utf-8") as f:
                        f.write(outer if isinstance(outer, str) else "")
                    with open(os.path.join(OUT_DIR, slug + ".json"), "w", encoding="utf-8") as f:
                        json.dump({"url_requested": url, "attempt": attempt,
                                   "harvest": harvest,
                                   "html_len": len(outer) if isinstance(outer, str) else None},
                                  f, ensure_ascii=False, indent=1)
                    await send("Target.closeTarget", {"targetId": target_id})
                    return {"ok": True, "slug": slug, "attempt": attempt,
                            "href": harvest.get("href"),
                            "bodyLen": harvest.get("bodyLen"),
                            "authMarkers": harvest.get("authMarkers"),
                            "contentMarkers": harvest.get("contentMarkers"),
                            "counts": harvest.get("counts"),
                            "hasModal": harvest.get("hasModal")}
                finally:
                    rt.cancel()
                    if target_id:
                        try:
                            await send("Target.closeTarget", {"targetId": target_id})
                        except Exception:
                            pass
        except Exception as e:
            last_err = e
            print("attempt %d failed for %s: %r" % (attempt, url, e), file=sys.stderr)
            await asyncio.sleep(1.0)
    return {"ok": False, "slug": slug, "error": repr(last_err)}


async def main():
    jobs = []
    for arg in sys.argv[1:]:
        url, _, slug = arg.partition("=")
        if not slug:
            slug = url.split("//", 1)[-1].replace("/", "_")[:60]
        jobs.append((url, slug))
    out = []
    for url, slug in jobs:
        out.append(await capture(url, slug))
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    asyncio.run(main())
