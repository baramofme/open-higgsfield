#!/usr/bin/env python3
"""Ground-truth CDP capture for https://higgsfield.ai/ko/me/settings at 1440x900.

HARD RULES (from skills: hf-cdp-auth-probe, cdp-hf-measure, hf-public-frame-capture,
cdp-live-chrome-no-origin):
- MUST use the IPv6 endpoint http://[::1]:9222 (the authenticated operator chrome,
  pid 2104576). The IPv4 127.0.0.1:9222 is the legacy GUEST headless (pid 1915191)
  and would falsely read as 'not authenticated'. Hardcoding 127.0.0.1 is FORBIDDEN.
- Use async `websockets` (sends NO Origin header -> Chrome 153 accepts it even without
  --remote-allow-origins). websocket-client sends Origin -> 403.
- CDP command shape is {id, method, params[, sessionId]} ONLY.
- Runtime.evaluate value is DOUBLE-nested against the FULL message:
  resp["result"]["result"]["value"]. The send() here returns the FULL message dict so
  the path is written against `r`, not a pre-extracted `res` (avoiding the
  pre-extraction extra-hop trap that returns None for a perfect 1+1).
- Runtime.enable before first evaluate; verify 1+1==2 liveness.
- captureBeyondViewport:true returns a docScroll-sized png, not 1440x900.
- Screenshot AFTER harvest (captureScreenshot can trigger SPA state transition).
- NamedNodeMap: `for (const attr of el.attributes)` -- NOT destructuring.
- No fabrication: if the gate/endpoint proves guest, abort with error.

No inferred data is written. Every number in styles.json is a real measured value.
"""
import asyncio, json, sys, base64, urllib.request, time, os, datetime

import websockets

CDP_HTTP = "http://[::1]:9222"   # IPv6 only -- auth chrome. NEVER 127.0.0.1.
TARGET_URL = "https://higgsfield.ai/ko/me/settings"
VIEWPORT_W, VIEWPORT_H = 1440, 900
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ko-me-settings")

# Markers proving the AUTHENTICATED account screen rendered (real content, not sign-in).
AUTH_MARKERS = ["개인 프로필", "크레딧", "사용량", "구독", "워크스페이스", "계정 삭제"]


def browser_ws():
    # Re-derive the LIVE browser ws_url (gate.json's ws_url is a point-in-time snapshot).
    last_err = None
    for attempt in range(8):
        try:
            with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=6) as r:
                v = json.load(r)
                ua = v.get("User-Agent", "")
                # UA must be REAL Chrome, not HeadlessChrome, to prove we hit the auth chrome.
                if "Headless" in ua:
                    raise RuntimeError("IPv6 endpoint answered with HeadlessChrome UA -- guest?")
                return v["webSocketDebuggerUrl"], v.get("Browser"), ua
        except Exception as e:  # intermittent HTTP silence under SW churn -> retry
            last_err = e
            time.sleep(2)
    raise RuntimeError(f"/json/version unreachable after retries: {last_err!r}")


def unwrap(d, method):
    """Send returns the FULL CDP message. Unwrap it; raise on top-level error."""
    if "error" in d:
        raise RuntimeError(f"{method} CDP error: {json.dumps(d['error'])}")
    return d.get("result", {})


def eval_value(d):
    """Value for Runtime.evaluate(returnByValue) is at full-result.result.value."""
    return d.get("result", {}).get("result", {}).get("value")


async def main():
    ws_url, browser, ua = browser_ws()
    print("browser_ws:", ws_url, "| Browser:", browser, file=sys.stderr)

    msg_id = 0
    pending = {}
    events = {}

    async with websockets.connect(ws_url, max_size=None, open_timeout=60) as ws:

        async def send(method, params=None, session=None, timeout=40):
            """Return the FULL CDP reply message (so value paths are written against it)."""
            nonlocal msg_id
            msg_id += 1
            m = {"id": msg_id, "method": method}
            if params is not None:
                m["params"] = params
            if session:
                m["sessionId"] = session
            await ws.send(json.dumps(m))
            fut = asyncio.get_event_loop().create_future()
            pending[msg_id] = fut
            try:
                return await asyncio.wait_for(fut, timeout)
            except asyncio.TimeoutError:
                pending.pop(msg_id, None)
                raise RuntimeError(f"CDP reply timeout for {method}")

        async def reader():
            try:
                while True:
                    d = json.loads(await ws.recv())
                    if "id" in d and d["id"] in pending:
                        fut = pending.pop(d["id"])
                        if not fut.done():
                            fut.set_result(d)  # store FULL message, not pre-extracted result
                    elif "method" in d:
                        events.setdefault(d["method"], []).append(d)
            except Exception as e:
                print("reader ended:", repr(e), file=sys.stderr)

        rt = asyncio.ensure_future(reader())
        target_id = None
        try:
            # fresh tab -- authoritative session read (existing tabs prove nothing)
            res = unwrap(await send("Target.createTarget", {"url": "about:blank"}),
                         "Target.createTarget")
            target_id = res["targetId"]
            session = unwrap(await send("Target.attachToTarget",
                                        {"targetId": target_id, "flatten": True}),
                             "Target.attachToTarget")["sessionId"]

            # --- liveness gate: eval must return 2 before trusting anything ---
            await send("Runtime.enable", session=session)
            one = await send("Runtime.evaluate",
                             {"expression": "1+1", "returnByValue": True}, session=session)
            live = eval_value(one)
            if live != 2:
                raise RuntimeError(f"browser wedged: 1+1 -> {live!r} (raw={json.dumps(one)[:200]})")
            print("liveness 1+1 == 2", file=sys.stderr)

            # --- viewport override ---
            await send("Emulation.setDeviceMetricsOverride",
                       {"width": VIEWPORT_W, "height": VIEWPORT_H,
                        "deviceScaleFactor": 1, "mobile": False}, session=session)

            # --- navigate with cache disabled (chunk 304 trap), enable only R+Page up front ---
            await send("Page.enable", session=session)
            await send("Network.enable", session=session)
            await send("Network.setCacheDisabled", {"cacheDisabled": True}, session=session)
            await send("Page.navigate", {"url": TARGET_URL}, session=session)

            # bound loadEventFired poll (~25s)
            t0 = time.time()
            while not events.get("Page.loadEventFired"):
                if time.time() - t0 > 25:
                    print("loadEventFired not seen within 25s; proceeding", file=sys.stderr)
                    break
                await asyncio.sleep(0.2)
            await asyncio.sleep(3.0)  # let client-side redirect/render settle

            async def ev(expr):
                r = await send("Runtime.evaluate",
                               {"expression": expr, "returnByValue": True,
                                "awaitPromise": True}, session=session, timeout=60)
                res = unwrap(r, "Runtime.evaluate")
                if "exceptionDetails" in res:
                    raise RuntimeError("eval exception: " + json.dumps(res["exceptionDetails"]))
                return res.get("result", {}).get("value")

            # --- auth verdict: must be authenticated, else abort (no-fabrication) ---
            href = await ev("document.location.href")
            title = await ev("document.title")
            cookie = await ev("document.cookie")
            cookie_names = sorted(set(c.split("=")[0].strip()
                                      for c in cookie.split(";") if c.strip()))
            has_session = any(n.startswith("__session") for n in cookie_names)
            redirected = "auth/sign-in" in (href or "")
            markers = {mk: bool(await ev(
                "document.body ? document.body.innerText.indexOf(%s) >= 0 : false"
                % json.dumps(mk))) for mk in AUTH_MARKERS}

            print("final_href:", href, "| title:", title, file=sys.stderr)
            print("redirected_to_sign_in:", redirected, "| session_cookie:", has_session,
                  "| cookie_len:", len(cookie or ""), file=sys.stderr)

            if redirected or not has_session:
                raise RuntimeError(
                    "AUTH ABSENT -- refusing to fabricate. redirected=%s session=%s href=%s"
                    % (redirected, has_session, href))

            # --- SPA progressive render: poll until harvest is stable ---
            COUNT_EXPR = "document.querySelectorAll('*').length"
            prev_n, stable, settle = -1, 0, 0
            last_n = None
            for _ in range(30):
                last_n = await ev(COUNT_EXPR)
                if last_n is not None and last_n == prev_n:
                    stable += 1
                    if stable >= 3:
                        break
                else:
                    stable = 0
                prev_n = last_n if last_n is not None else prev_n
                await asyncio.sleep(1.0)
                settle += 1
            print(f"node_count stable={last_n} after {settle} polls", file=sys.stderr)

            # --- DOM harvest: pre-order walk, only visible non-zero-rect nodes ---
            HARVEST_JS = r"""
(() => {
  const MAX = 6000;
  const out = [];
  const sx = window.scrollX, sy = window.scrollY;
  const r0 = (v) => Math.round(v * 10) / 10;
  let nid = 0, truncated = false;
  const PROP = ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight',
    'letterSpacing','textAlign','textTransform','color','backgroundColor',
    'marginTop','marginRight','marginBottom','marginLeft',
    'paddingTop','paddingRight','paddingBottom','paddingLeft',
    'borderTopWidth','borderTopStyle','borderTopColor',
    'borderRightWidth','borderRightStyle','borderRightColor',
    'borderBottomWidth','borderBottomStyle','borderBottomColor',
    'borderLeftWidth','borderLeftStyle','borderLeftColor',
    'borderRadius','boxShadow','display','position','width','height',
    'opacity','visibility','zIndex','overflow','cursor','pointerEvents'];
  const ownText = (el) => {
    let t = '';
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { const s = n.nodeValue; if (s) t += s; }
    }
    return t.trim();
  };
  const walk = (el, parentId) => {
    if (truncated) return;
    if (!el || nid >= MAX) { truncated = (nid >= MAX); return; }
    const cs = window.getComputedStyle(el);
    const disp = cs.display;
    const vis = cs.visibility;
    const op = parseFloat(cs.opacity);
    const rect = el.getBoundingClientRect();
    // task visibility criteria: offsetWidth>0 AND display !== none (plus visible/opacity)
    const visible = el.offsetWidth > 0 && disp !== 'none' && vis !== 'hidden' &&
                    !(op === 0) && rect.width >= 0.5 && rect.height >= 0.5;
    let myId = -1;
    if (visible) {
      myId = nid++;
      const sty = {};
      for (const p of PROP) sty[p] = cs[p];   // camelCase access; NEVER getPropertyValue
      const attrs = {};
      for (const attr of el.attributes) {      // NamedNodeMap safe -- NOT destructuring
        let v = attr.value;
        if (v != null && v.length > 200) v = v.slice(0, 200) + '…[truncated]';
        attrs[attr.name] = v;
      }
      out.push({
        nid: myId, parentId: parentId,
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls: (typeof el.className === 'string' ? el.className : null),
        rect: { x: r0(rect.x), y: r0(rect.y), w: r0(rect.width), h: r0(rect.height) },
        doc:  { x: r0(rect.x + sx), y: r0(rect.y + sy) },
        offscreen: (rect.right < 0 || rect.bottom < 0 ||
                    rect.left > window.innerWidth || rect.top > window.innerHeight),
        sty: sty,
        txt: ownText(el),
        attrs: attrs
      });
    }
    for (const child of el.children) walk(child, (myId >= 0 ? myId : parentId));
  };
  if (document.body) walk(document.body, -1);
  return {
    elements: out,
    truncated: truncated,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    scrollX: sx, scrollY: sy,
    innerW: window.innerWidth, innerH: window.innerHeight,
    dpr: window.devicePixelRatio
  };
})()
"""
            harvest = await ev(HARVEST_JS)
            els = harvest["elements"]
            print(f"harvested {len(els)} visible nodes, truncated={harvest['truncated']}",
                  file=sys.stderr)

            # --- full-page screenshot AFTER harvest ---
            metrics = unwrap(await send("Page.getLayoutMetrics", session=session),
                             "Page.getLayoutMetrics")
            css = metrics.get("cssContentSize") or metrics.get("contentSize")
            sw = int(css["width"]); sh = int(css["height"])
            shot = unwrap(await send("Page.captureScreenshot",
                                     {"format": "png", "captureBeyondViewport": True},
                                     session=session, timeout=60), "Page.captureScreenshot")
            png_bytes = base64.b64decode(shot["data"])

            # --- write artifacts ---
            os.makedirs(OUT_DIR, exist_ok=True)
            png_path = os.path.join(OUT_DIR, "screenshot.png")
            with open(png_path, "wb") as f:
                f.write(png_bytes)

            captured_at = datetime.datetime.now().astimezone().isoformat()
            doc = {
                "meta": {
                    "url_requested": TARGET_URL,
                    "final_href": href,
                    "title": title,
                    "viewport_width": VIEWPORT_W,
                    "viewport_height": VIEWPORT_H,
                    "device_scale_factor": 1,
                    "doc_scroll_width": harvest["scrollWidth"],
                    "doc_scroll_height": harvest["scrollHeight"],
                    "screenshot_size": {"width": sw, "height": sh, "bytes": len(png_bytes)},
                    "element_count": len(els),
                    "truncated": harvest["truncated"],
                    "redirected_to_sign_in": redirected,
                    "session_cookie_visible": has_session,
                    "cookie_len": len(cookie or ""),
                    "auth_markers_present": {k: v for k, v in markers.items() if v},
                    "captured_at": captured_at,
                    "browser": browser,
                    "user_agent": ua,
                    "cdp_endpoint": CDP_HTTP,
                    "no_fabrication": True
                },
                "schema": {
                    "note": "Every value is a real CDP-measured number. rect is "
                            "viewport-relative getBoundingClientRect; doc adds scrollX/scrollY. "
                            "Comparators read e['sty'] (camelCase computed styles).",
                    "fields": ["nid", "parentId", "tag", "id", "cls",
                               "rect{x,y,w,h}", "doc{x,y}", "offscreen",
                               "sty{computed camelCase}", "txt", "attrs"]
                },
                "elements": els
            }
            json_path = os.path.join(OUT_DIR, "styles.json")
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(doc, f, ensure_ascii=False, indent=1)

            print("WROTE", png_path, len(png_bytes), "bytes", file=sys.stderr)
            print("WROTE", json_path, "elements:", len(els), file=sys.stderr)
            # machine-readable summary on stdout
            print(json.dumps({
                "status": "ok", "final_href": href, "title": title,
                "element_count": len(els), "truncated": harvest["truncated"],
                "screenshot": png_path, "styles": json_path,
                "screenshot_size": doc["meta"]["screenshot_size"],
                "auth_markers": doc["meta"]["auth_markers_present"],
                "session_cookie_visible": has_session, "cookie_len": len(cookie or ""),
            }, ensure_ascii=False))
        finally:
            rt.cancel()
            if target_id:
                try:
                    await send("Target.closeTarget", {"targetId": target_id}, timeout=15)
                except Exception as e:
                    print("closeTarget failed (non-fatal):", repr(e), file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(main())
