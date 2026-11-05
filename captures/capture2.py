#!/usr/bin/env python3
"""HF public-frame capture pass 2: navigate -> dismiss welcome/auth overlay
(real click on dismiss CTA -> Escape -> last-resort DOM removal) -> re-harvest
rect+computed styles + screenshots. Honest: records which removal method was
needed; never claims content that isn't in the DOM."""
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

  // candidate real project/list tiles: anchors or grid children with visible
  // non-modal styling (exclude the welcome dialog subtree entirely)
  const inDialog = (e) => !!(e.closest('[role=dialog]') || e.closest('[class*="fixed z-3"]'));
  const tileLike = all.filter(e => {
    if (inDialog(e)) return false;
    const r = e.getBoundingClientRect();
    if (r.width < 80 || r.height < 60 || r.width > 700) return false;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    const cls = typeof e.className === 'string' ? e.className : '';
    return /(?:^|[\\s_-])(card|tile|cell|item)(?:$|[\\s_-])/i.test(cls)
      || e.tagName === 'A' && r.width >= 100
      || !!e.getAttribute('data-testid') && /card|tile|cell|item|media/i.test(e.getAttribute('data-testid'));
  });
  const projEls = all.filter(e => !inDialog(e) && (
    /project|프로젝트/i.test(typeof e.className === 'string' ? e.className : '')
    || /project/i.test((e.getAttribute('data-testid') || ''))));
  const crumbs = all.filter(e => !inDialog(e)).filter(e =>
    /breadcrumb|crumb/i.test(typeof e.className === 'string' ? e.className : '')
    || (e.tagName === 'NAV' && /breadcrumb|path|경로/i.test(e.getAttribute('aria-label') || ''))
    || (e.tagName === 'OL' && e.children.length >= 2)
    || /[›»]/.test((e.textContent || '')) && e.children.length >= 1 && e.children.length <= 8 && (e.textContent || '').length < 200);
  const trashEls = all.filter(e => !inDialog(e) && (
    /trash|bin/i.test(typeof e.className === 'string' ? e.className : '')
    || /trash|휴지통/i.test((e.getAttribute('aria-label') || ''))
    || /trash|bin|deleted/i.test((e.getAttribute('data-testid') || ''))));
  const folderEls = all.filter(e => !inDialog(e) && (
    /folder|폴더/i.test(typeof e.className === 'string' ? e.className : '')
    || /folder/i.test((e.getAttribute('data-testid') || '') + (e.getAttribute('aria-label') || ''))));
  const folderLinks = [...document.querySelectorAll('a[href*="folders"]')].map(e => e.getAttribute('href'));
  const projLinks = [...document.querySelectorAll('a[href*="/project"]')].map(e => e.getAttribute('href'));

  const header = document.querySelector('header') || document.querySelector('[class*=header]') || document.querySelector('[class*=topbar]');
  const sidebar = document.querySelector('aside') || document.querySelector('[class*=sidebar]');
  const footer = document.querySelector('footer') || document.querySelector('[class*=footer]');
  const main = document.querySelector('main') || document.querySelector('[class*=main]');
  const dialog = document.querySelector('[role=dialog]');
  const emptyState = all.filter(e => !inDialog(e) && /아무것도|no items|비어|empty|가져온 항목이|휴지통이 비어|Trash is empty/i.test((e.textContent || '')) && (e.textContent || '').length < 300 && e.children.length <= 6);

  const cap = (arr, n) => uniq(arr).slice(0, n).map(info).filter(Boolean);
  const cookieNames = [...new Set(cookie)].sort();
  const authForm = document.querySelector('input[type=password],input[type=email]');

  return {
    href: location.href, title: document.title,
    cookieNames, cookieHasJwt: cookieNames.some(c => /jwt|session|clerk|__cf/s.test(c)),
    bodyLen: bodyTxt.length, bodyExcerpt: bodyTxt.slice(0, 1500),
    stillDialog: !!dialog, hasAuthForm: !!authForm, dialogInfo: info(dialog),
    viewport: {iw: innerWidth, ih: innerHeight},
    docScroll: {sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight},
    headerInfo: info(header), sidebarInfo: info(sidebar), footerInfo: info(footer), mainInfo: info(main),
    tileLike: cap(tileLike, 30), projEls: cap(projEls, 20), crumbs: cap(crumbs, 20),
    trashEls: cap(trashEls, 20), folderEls: cap(folderEls, 20), emptyState: cap(emptyState, 10),
    folderLinks: folderLinks.slice(0, 20), projLinks: projLinks.slice(0, 20),
    counts: {all: all.length, tileLike: uniq(tileLike).length, projEls: uniq(projEls).length,
             crumbs: uniq(crumbs).length, trashEls: uniq(trashEls).length, folderEls: uniq(folderEls).length},
  };
})()""".replace("%PROPS%", json.dumps(STYLE_PROPS))

FIND_DISMISS_JS = """(() => {
  const texts = ['둘러보기', '나중에', '나중에 하기', '닫기', 'Close', 'Skip', '건너뛰기'];
  const leaves = [...document.querySelectorAll('button,a,[role=button]')];
  for (const el of leaves) {
    const t = (el.textContent || '').trim();
    if (texts.includes(t)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return {text: t, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2)};
    }
  }
  const closeBtn = document.querySelector('[role=dialog] [aria-label*=close], [role=dialog] [aria-label*=닫기], [role=dialog] button[class*=close], [role=dialog] svg[class*=close]');
  if (closeBtn) { const r = closeBtn.getBoundingClientRect(); if (r.width > 0) return {text: 'x', x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2)}; }
  return null;
})()"""

REMOVE_OVERLAY_JS = """(() => {
  const removed = [];
  document.querySelectorAll('[role=dialog]').forEach(d => { removed.push(d.id || d.className.slice(0, 60)); d.remove(); });
  document.querySelectorAll('body > div, body > div > div').forEach(d => {
    const cs = getComputedStyle(d);
    const z = parseInt(cs.zIndex || '0', 10);
    if (cs.position === 'fixed' && z >= 2000 && cs.inset !== 'auto') { removed.push('fixed-z' + z + ':' + d.className.slice(0, 40)); d.remove(); }
  });
  document.body.removeAttribute('data-overlay-no-scrollbar');
  document.querySelectorAll('[data-aria-hidden=true][aria-hidden=true]').forEach(s => s.remove());
  return {removed, stillDialog: !!document.querySelector('[role=dialog]')};
})()"""


def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=5) as r:
        return json.load(r)["webSocketDebuggerUrl"]


async def shot(send, session, tries=3):
    for t in range(tries):
        try:
            return await send("Page.captureScreenshot", {"format": "png"},
                              session=session, timeout=45)
        except Exception as e:
            print("shot-viewport try %d: %r" % (t, e), file=sys.stderr)
            await asyncio.sleep(0.7)
    raise RuntimeError("viewport screenshot failed x3")


async def shot_full(send, session, tries=3):
    for t in range(tries):
        try:
            return await send("Page.captureScreenshot",
                              {"format": "png", "captureBeyondViewport": True},
                              session=session, timeout=45)
        except Exception as e:
            print("shot-full try %d: %r" % (t, e), file=sys.stderr)
            await asyncio.sleep(0.7)
    raise RuntimeError("full-page screenshot failed x3")


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
                    await asyncio.sleep(3.0)

                    async def ev(expr):
                        r = await send("Runtime.evaluate",
                                       {"expression": expr, "returnByValue": True,
                                        "awaitPromise": True}, session=session)
                        if "exceptionDetails" in r:
                            raise RuntimeError("JS exception: %s" % json.dumps(r["exceptionDetails"])[:400])
                        return r["result"].get("value")

                    pre = await ev(HARVEST_JS)
                    dismiss_path = "none"
                    removal = None
                    if pre.get("stillDialog") or pre.get("hasAuthForm"):
                        d = await ev(FIND_DISMISS_JS)
                        if d:
                            for typ in ("mousePressed", "mouseReleased"):
                                await send("Input.dispatchMouseEvent",
                                           {"type": typ, "x": d["x"], "y": d["y"],
                                            "button": "left", "clickCount": 1},
                                           session=session)
                            dismiss_path = "click:%s" % d["text"]
                            await asyncio.sleep(1.6)
                        post_dialog = await ev("!!document.querySelector('[role=dialog]')")
                        if post_dialog:
                            await send("Input.dispatchKeyEvent",
                                       {"type": "keyDown", "key": "Escape", "code": "Escape",
                                        "windowsVirtualKeyCode": 27, "nativeVirtualKeyCode": 27},
                                       session=session)
                            await send("Input.dispatchKeyEvent",
                                       {"type": "keyUp", "key": "Escape", "code": "Escape",
                                        "windowsVirtualKeyCode": 27, "nativeVirtualKeyCode": 27},
                                       session=session)
                            dismiss_path += "+escape"
                            await asyncio.sleep(1.2)
                            if await ev("!!document.querySelector('[role=dialog]')"):
                                removal = await ev(REMOVE_OVERLAY_JS)
                                dismiss_path += "+js-remove"
                        await asyncio.sleep(1.5)

                    post = await ev(HARVEST_JS)
                    outer = await ev("document.documentElement.outerHTML")
                    s1 = await shot(send, session)
                    s2 = await shot_full(send, session)
                    os.makedirs(OUT_DIR, exist_ok=True)
                    with open(os.path.join(OUT_DIR, slug + "-viewport.png"), "wb") as f:
                        f.write(base64.b64decode(s1["data"]))
                    with open(os.path.join(OUT_DIR, slug + "-full.png"), "wb") as f:
                        f.write(base64.b64decode(s2["data"]))
                    with open(os.path.join(OUT_DIR, slug + ".html"), "w", encoding="utf-8") as f:
                        f.write(outer if isinstance(outer, str) else "")
                    with open(os.path.join(OUT_DIR, slug + ".json"), "w", encoding="utf-8") as f:
                        json.dump({"url_requested": url, "attempt": attempt,
                                   "dismiss_path": dismiss_path, "removal": removal,
                                   "pre": pre, "post": post,
                                   "html_len": len(outer) if isinstance(outer, str) else None},
                                  f, ensure_ascii=False, indent=1)
                    await send("Target.closeTarget", {"targetId": target_id})
                    return {"ok": True, "slug": slug, "dismiss_path": dismiss_path,
                            "href": post.get("href"), "bodyLen": post.get("bodyLen"),
                            "stillDialog": post.get("stillDialog"),
                            "cookieHasJwt": post.get("cookieHasJwt"),
                            "counts": post.get("counts"),
                            "folderLinks": post.get("folderLinks"),
                            "projLinks": post.get("projLinks")}
                finally:
                    rt.cancel()
                    if target_id:
                        try:
                            await send("Target.closeTarget", {"targetId": target_id}, timeout=5)
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
