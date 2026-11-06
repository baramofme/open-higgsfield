#!/usr/bin/env python3
"""Ground-truth harvest for https://higgsfield.ai/ko/me/settings/usage @1440x900.

Drives the OPERATOR'S authenticated chrome via IPv6 [::1]:9222 ONLY
(the legacy headless guest still owns IPv4 127.0.0.1:9222 — hardcoding it
would silently capture the sign-in page). Gate: gate.json chrome_available=true.

Real measurement only — if the page redirects to sign-in at capture time the
script aborts with a nonzero exit and writes NO fabricated file.
Outputs (per task body):
  ground-truth/ko-me-settings-usage/screenshot.png   (full-page)
  ground-truth/ko-me-settings-usage/styles.json      (flat visible-element walk)
plus ground-truth/ko-me-settings-usage/viewport.png as an on-the-fold reference.
"""
import asyncio, base64, json, os, sys, time, urllib.request, pathlib
import websockets

CDP_HTTP = "http://[::1]:9222"          # IPv6 = authenticated chrome. NEVER 127.0.0.1:9222.
TARGET_URL = "https://higgsfield.ai/ko/me/settings/usage"
WIDTH, HEIGHT = 1440, 900
ROOT = pathlib.Path("/home/baramofme/open-higgsfield/.worktrees/t_c7aae7bd")
OUT_DIR = ROOT / "ground-truth" / "ko-me-settings-usage"

# Korean markers the real usage screen must show (gate.json body_excerpt_signals).
USAGE_MARKERS = ["총 비용", "사용한 크레딧", "총 생성 수"]

HARVEST_JS = r"""(() => {
    function isVisible(el) {
        try {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            if (parseFloat(cs.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        } catch (e) { return false; }
    }
    const STYLE_KEYS = [
        "color","backgroundColor","borderRadius","fontSize","fontWeight",
        "fontFamily","lineHeight","letterSpacing","textAlign","textDecoration",
        "display","position","overflow","opacity","visibility",
        "padding","margin","borderWidth","borderColor","borderStyle",
        "width","height","maxWidth","minWidth","maxHeight","minHeight",
        "flexDirection","justifyContent","alignItems","flexWrap","flexGrow",
        "gap","gridTemplateColumns","gridTemplateRows",
        "boxShadow","textShadow","cursor",
        "backgroundImage","backgroundSize","backgroundRepeat","backgroundPosition",
        "zIndex","transform",
        "borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius",
        "fontStyle","verticalAlign","wordBreak","textOverflow","userSelect",
        "appearance","outlineColor","outlineStyle","outlineWidth","caretColor",
        "accentColor","scrollBehavior","touchAction","pointerEvents","isolation",
        "mixBlendMode","clipPath","float","clear","listStyleType","objectPosition"
    ];
    function elPath(el) {
        let s = el.tagName.toLowerCase();
        if (el.id) s += '#' + el.id;
        if (el.className && typeof el.className === 'string') {
            const cls = el.className.trim().split(/\s+/).filter(c => !c.startsWith('data-'));
            if (cls.length) s += '.' + cls.slice(0, 10).join('.');
        }
        return s;
    }
    function directText(el) {
        let t = '';
        for (const n of el.childNodes) {
            if (n.nodeType === Node.TEXT_NODE) t += n.textContent;
        }
        return t.trim().slice(0, 120);
    }
    function attrs(el) {
        const a = {};
        for (const attr of el.attributes) {
            if (attr.name === 'class' || attr.name === 'style' || attr.name === 'id') continue;
            a[attr.name] = attr.value;
        }
        return a;
    }
    function depth(el) {
        let d = 0, p = el;
        while (p && p !== document.body) { d++; p = p.parentElement; }
        return d;
    }
    const out = [];
    const all = document.querySelectorAll('body *');
    let visibleCount = 0;
    for (const el of all) {
        if (!isVisible(el)) continue;
        visibleCount++;
        try {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            const styles = {};
            for (const k of STYLE_KEYS) {
                const v = cs[k];
                if (!v) continue;
                if (v === 'none' || v === 'normal' || v === 'auto') continue;
                if (v === 'rgba(0, 0, 0, 0)' || v === '0px') continue;
                styles[k] = v;
            }
            out.push({
                selector: elPath(el),
                tag: el.tagName.toLowerCase(),
                id: el.id || null,
                classes: (el.className && typeof el.className === 'string')
                    ? el.className.trim().split(/\s+/) : [],
                rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
                text: directText(el),
                attrs: attrs(el),
                styles: styles,
                depth: depth(el)
            });
        } catch (e) {}
    }
    return JSON.stringify({visibleCount, elementCount: out.length, total: all.length, elements: out});
})()"""


def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=8) as r:
        d = json.load(r)
    # Guard: the guest profile reports UA HeadlessChrome — refuse to capture there.
    ua = d.get("User-Agent", "")
    if "HeadlessChrome" in ua:
        raise SystemExit("REFUSING capture: /json/version UA is %r -> that is the GUEST "
                         "(IPv4 bind). The authenticated chrome must answer on [::1]:9222." % ua)
    return d["webSocketDebuggerUrl"]


async def run_once(attempt):
    ws_url = browser_ws()
    print(f"[attempt {attempt}] browser ws: {ws_url}", file=sys.stderr)
    async with websockets.connect(ws_url, max_size=None, open_timeout=30) as ws:
        msg_id = 0
        pending = {}
        events = {}

        async def send(method, params=None, session=None, timeout=30):
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
        tid = None
        try:
            tid = (await send("Target.createTarget", {"url": "about:blank"}))["targetId"]
            sid = (await send("Target.attachToTarget",
                              {"targetId": tid, "flatten": True}))["sessionId"]
            await send("Runtime.enable", session=sid)
            live = (await send("Runtime.evaluate",
                               {"expression": "1+1", "returnByValue": True}, session=sid)
                    )["result"]["value"]
            assert live == 2, "browser wedged (1+1 != 2)"
            await send("Emulation.setDeviceMetricsOverride",
                       {"width": WIDTH, "height": HEIGHT, "deviceScaleFactor": 1,
                        "mobile": False}, session=sid)
            await send("Page.enable", session=sid)
            await send("Network.enable", session=sid)
            await send("Network.setCacheDisabled", {"cacheDisabled": True}, session=sid)
            events.pop("Page.loadEventFired", None)
            await send("Page.navigate", {"url": TARGET_URL}, session=sid)
            t0 = time.time()
            while not events.get("Page.loadEventFired"):
                if time.time() - t0 > 30:
                    break
                await asyncio.sleep(0.2)
            # Let the SPA settle (client redirect + render).
            await asyncio.sleep(3.0)

            async def ev(expr):
                r = await send("Runtime.evaluate",
                               {"expression": expr, "returnByValue": True,
                                "awaitPromise": True}, session=sid)
                if "exceptionDetails" in r:
                    raise RuntimeError("JS exception: %s" % json.dumps(r["exceptionDetails"])[:300])
                return r["result"].get("value")

            # Dismiss a modal overlay if present (it would pollute the ground-truth).
            if await ev("!!document.querySelector('[role=dialog]')"):
                print("dialog present; dismissing", file=sys.stderr)
                await ev("(()=>{const b=document.querySelector('[role=dialog] button[aria-label*=close], [role=dialog] button[data-dismiss], [role=dialog] [class*=close]'); if(b){b.click(); return 'clicked';} const x=[...document.querySelectorAll('[role=dialog] svg')].map(s=>s.closest('button')).filter(Boolean); if(x.length){x[0].click(); return 'clicked-x';} return 'no-btn';})()")
                await asyncio.sleep(1.2)

            # Poll until the REAL usage screen is rendered (never accept sign-in).
            href = await ev("document.location.href")
            if "auth/sign-in" in (href or ""):
                await send("Target.closeTarget", {"targetId": tid})
                print(json.dumps({"ok": False, "reason": "sign-in redirect at capture time",
                                  "final_href": href}, ensure_ascii=False))
                return None  # caller: block, no fabrication

            cookie_early = await ev("document.cookie")
            sess_early = "__session" in (cookie_early or "")
            best = None
            for attempt_i in range(30):
                raw = await ev(HARVEST_JS)
                if isinstance(raw, str):
                    d = json.loads(raw)
                    vc = d.get("visibleCount", 0)
                    ec = d.get("elementCount", 0)
                    txt = await ev("(document.body.innerText||'')")
                    hits = [mk for mk in USAGE_MARKERS if mk in (txt or "")]
                    print("  poll %d: visible=%d elements=%d markerHits=%d sessionCookie=%s"
                          % (attempt_i, vc, ec, len(hits), sess_early), file=sys.stderr)
                    if vc >= 40 and len(hits) >= 2:
                        best = d  # real usage screen rendered
                        break
                await asyncio.sleep(1.0)
            if best is None:
                await send("Target.closeTarget", {"targetId": tid})
                print(json.dumps({"ok": False, "reason": "usage markers never rendered",
                                  "final_href": href}, ensure_ascii=False))
                return None

            # Scroll the whole page so lazy rows render, then back to the top
            # (full-page screenshot is taken from the top like a human landing).
            await ev("(()=>{const H=innerHeight; let y=0; return new Promise(res=>{"
                     "const step=()=>{window.scrollTo(0,y); y+=H;"
                     "setTimeout(()=>{ if(y<document.documentElement.scrollHeight) step(); else "
                     "setTimeout(()=>{window.scrollTo(0,0); setTimeout(res,600);},400); },160);};"
                     "step();});})()")

            # Final harvest after the scroll pass.
            raw = await ev(HARVEST_JS)
            final = json.loads(raw)
            if final.get("elementCount", 0) < best.get("elementCount", 0):
                final = best  # scroll pass lost content; keep the fuller one

            href = await ev("document.location.href")
            title = await ev("document.title")
            cookie = await ev("document.cookie")
            body_len = await ev("document.body ? document.body.innerText.length : -1")
            body_excerpt = await ev("(document.body.innerText||'').replace(/\\s+/g,' ').trim().slice(0,1200)")
            ua = await ev("navigator.userAgent")
            lm = await send("Page.getLayoutMetrics", session=sid)
            css = lm.get("cssContentSize") or lm.get("contentSize")
            scroll_w, scroll_h = await ev("document.documentElement.scrollWidth"), \
                                 await ev("document.documentElement.scrollHeight")

            # ---- screenshots (retry each; fresh-target capture can flake) ----
            shot = None
            for ss_try in range(3):
                try:
                    clip = {"x": 0, "y": 0,
                            "width": round(css["width"], 2),
                            "height": round(min(css["height"], 16384), 2),
                            "scale": 1}
                    if css["height"] > 16384:
                        print(f"NOTE: content height {css['height']} clamped to 16384", file=sys.stderr)
                    s = await send("Page.captureScreenshot",
                                   {"format": "png", "clip": clip,
                                    "captureBeyondViewport": True},
                                   session=sid, timeout=60)
                    shot = base64.b64decode(s["data"])
                    break
                except Exception as e:
                    print(f"fullpage shot try {ss_try}: {e!r}", file=sys.stderr)
                    await asyncio.sleep(1.5)
            view = None
            for v_try in range(3):
                try:
                    s = await send("Page.captureScreenshot", {"format": "png"},
                                   session=sid, timeout=45)
                    view = base64.b64decode(s["data"])
                    break
                except Exception as e:
                    print(f"viewport shot try {v_try}: {e!r}", file=sys.stderr)
                    await asyncio.sleep(1.5)

            await send("Target.closeTarget", {"targetId": tid})
            tid = None

            if not shot or not view:
                print(json.dumps({"ok": False, "reason": "screenshot capture failed",
                                  "shot": bool(shot), "view": bool(view)},
                                 ensure_ascii=False))
                return None

            OUT_DIR.mkdir(parents=True, exist_ok=True)
            (OUT_DIR / "screenshot.png").write_bytes(shot)
            (OUT_DIR / "viewport.png").write_bytes(view)

            cookie_names = sorted(set(c.split("=")[0].strip()
                                      for c in (cookie or "").split(";") if c.strip()))
            result = {
                "url_requested": TARGET_URL,
                "final_href": href,
                "title": title,
                "is_auth_gated": "auth/sign-in" in (href or ""),
                "cdp_endpoint": CDP_HTTP,
                "ws_url": ws_url,
                "ua": ua,
                "cookie_names": cookie_names,
                "session_cookie_visible": any(n.startswith("__session") for n in cookie_names),
                "cookie_len": len(cookie or ""),
                "body_len": body_len,
                "viewport": {"width": WIDTH, "height": HEIGHT},
                "page_scroll": {"scrollWidth": scroll_w, "scrollHeight": scroll_h},
                "content_size": {"width": css["width"], "height": css["height"]},
                "visible_count_at_harvest": final.get("visibleCount"),
                "element_count": len(final.get("elements", [])),
                "elements": final.get("elements", []),
                "body_excerpt": body_excerpt,
                "auth_verdict": {
                    "redirected_to_sign_in": "auth/sign-in" in (href or ""),
                    "session_cookie_visible": any(n.startswith("__session") for n in cookie_names),
                    "usage_markers_present": {mk: (mk in (body_excerpt or "")) for mk in USAGE_MARKERS},
                },
                "captured_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "screenshot_fullpage_bytes": len(shot),
                "screenshot_viewport_bytes": len(view),
            }
            with open(OUT_DIR / "styles.json", "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(json.dumps({"ok": True,
                              "final_href": href, "title": title,
                              "element_count": result["element_count"],
                              "visible_count": result["visible_count_at_harvest"],
                              "session_cookie_visible": result["session_cookie_visible"],
                              "shot_bytes": len(shot), "view_bytes": len(view),
                              "styles_json_bytes": len(json.dumps(result))},
                             ensure_ascii=False))
            return result
        finally:
            rt.cancel()
            if tid:
                try:
                    await send("Target.closeTarget", {"targetId": tid}, timeout=5)
                except Exception:
                    pass


async def main():
    for attempt in range(3):
        try:
            res = await run_once(attempt)
        except Exception as e:
            print(f"[attempt {attempt}] error: {e!r}", file=sys.stderr)
            res = None
        if res:
            return 0
        await asyncio.sleep(2.0)
    print("ALL ATTEMPTS FAILED", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
