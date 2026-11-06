#!/usr/bin/env python3
"""OHF render diagnosis — robust raw-result dump, no screenshot (cannot hang).

Seeds the video/minimax-h3 surface, navigates OHF, waits for load, then dumps
the RAW Runtime.evaluate shapes plus render-presence checks. Distinguishes a
CDP result-parse bug from an actual render failure.
"""
import asyncio, json, urllib.request, websockets, sys

CDP = "http://127.0.0.1:9361"
URL = "http://127.0.0.1:3015/"

SEED = r"""(() => {
  try {
    localStorage.setItem("openhiggsfield.active.v2", JSON.stringify({
      state: { surface: "video", model: "minimax-h3", batch: 1 },
      version: 0
    }));
  } catch (e) {}
})()"""

async def main():
    ws_url = json.load(urllib.request.urlopen(CDP + "/json/version", timeout=15))["webSocketDebuggerUrl"]
    async with websockets.connect(ws_url, max_size=None) as ws:
        mid = 0; pend = {}; events = {}
        async def send(method, params=None, session=None):
            nonlocal mid; mid += 1
            msg = {"id": mid, "method": method, "params": params or {}}
            if session: msg["sessionId"] = session
            await ws.send(json.dumps(msg))
            f = asyncio.get_event_loop().create_future(); pend[mid] = f
            return await asyncio.wait_for(f, timeout=30)
        async def rd():
            while True:
                try:
                    d = json.loads(await ws.recv())
                    if "id" in d and d["id"] in pend:
                        pend.pop(d["id"]).set_result(d.get("result", d.get("error")))
                    elif "method" in d:
                        events.setdefault(d["method"], []).append(d)
                except Exception:
                    break
        rt = asyncio.ensure_future(rd())
        try:
            tid = (await send("Target.createTarget", {"url": "about:blank"}))["targetId"]
            sid = (await send("Target.attachToTarget", {"targetId": tid, "flatten": True}))["sessionId"]
            for m in ("Runtime.enable", "Page.enable", "Network.enable"):
                await send(m, None, sid)
            await send("Network.setCacheDisabled", {"cacheDisabled": True}, sid)
            await send("Emulation.setDeviceMetricsOverride",
                       {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, sid)
            await send("Page.addScriptToEvaluateOnNewDocument", {"source": SEED}, sid)
            events.pop("Page.loadEventFired", None)
            await send("Page.navigate", {"url": URL}, sid)
            import time
            t0 = time.time()
            while not events.get("Page.loadEventFired"):
                if time.time() - t0 > 20: break
                await asyncio.sleep(0.2)
            await asyncio.sleep(4)
            exprs = [
                ("href", "document.location.href"),
                ("title", "document.title"),
                ("readyState", "document.readyState"),
                ("bodyLen", "document.body.innerHTML.length"),
                ("bodyText", "document.body.innerText.slice(0,120)"),
                ("anchors", "document.querySelectorAll('[data-ohf-video]').length"),
                ("grid102", "!!document.querySelector('[data-ohf-video=\"102\"]')"),
                ("plate103", "!!document.querySelector('[data-ohf-video=\"103\"]')"),
                ("feed221", "!!document.querySelector('[data-ohf-video=\"221\"]')"),
                ("vidRoot", "!!document.querySelector('.ohf-vid-root')"),
                ("activeLS", "localStorage.getItem('openhiggsfield.active.v2')"),
                ("styleSheets", "document.styleSheets.length"),
            ]
            for label, e in exprs:
                r = await send("Runtime.evaluate", {"expression": e, "returnByValue": True}, sid)
                # dump raw shape
                rr = r.get("result", r) if isinstance(r, dict) else r
                val = None
                if isinstance(rr, dict):
                    inner = rr.get("result", rr)
                    if isinstance(inner, dict):
                        val = inner.get("value", inner.get("description"))
                if isinstance(r, dict) and "exceptionDetails" in r:
                    val = "EXC:" + str(r["exceptionDetails"].get("text",""))
                print(f"{label}: {repr(val)[:160]}")
            await send("Target.closeTarget", {"targetId": tid})
        finally:
            rt.cancel()

asyncio.run(main())
