#!/usr/bin/env python3
"""OHF video surface 하베스트 — HF 하베스트(t_a1c5ed28)와 동일한 JS 를 쓴다.

동일 viewport(1440×900)·동일 스타일 키프레임·동일 워킹 순서로 OHF 렌더를 수확해
HF ground-truth와 앵커(data-ohf-video) 1:1 비교 가능한 형태로 산출한다.
형제 t_f3de705e 의 확립된 하네스 패턴을 그대로 따른다.
"""
import asyncio, json, sys, time, base64, urllib.request, pathlib, websockets

CDP_HTTP = "http://127.0.0.1:9361"
TARGET_URL = "http://127.0.0.1:3015/"
WIDTH, HEIGHT = 1440, 900
OUT_DIR = pathlib.Path("/home/baramofme/open-higgsfield/.worktrees/t_bb8f3edb/landing_verify")

# 비디오 surface + minimax-h3 모델로 부팅한다(useActive persist 시드).
SEED_JS = r"""(() => {
  try {
    localStorage.setItem("openhiggsfield.active.v2", JSON.stringify({
      state: { surface: "video", model: "minimax-h3", batch: 1 },
      version: 0
    }));
  } catch (e) {}
})()"""

HARVEST_JS = (OUT_DIR / "ohf_harvest.js").read_text(encoding="utf-8")

def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=5) as r:
        return json.load(r)["webSocketDebuggerUrl"]

async def main():
    ws_url = browser_ws()
    async with websockets.connect(ws_url, max_size=None) as ws:
        msg_id = 0; pending = {}; events = {}
        async def send(method, params=None, session=None):
            nonlocal msg_id; msg_id += 1
            m = {"id": msg_id, "method": method, "params": params or {}}
            if session: m["sessionId"] = session
            await ws.send(json.dumps(m))
            fut = asyncio.get_event_loop().create_future(); pending[msg_id] = fut
            return await asyncio.wait_for(fut, timeout=30)
        async def reader():
            while True:
                try:
                    d = json.loads(await ws.recv())
                    if "id" in d and d["id"] in pending:
                        pending.pop(d["id"]).set_result(d.get("result", d.get("error")))
                    elif "method" in d:
                        events.setdefault(d["method"], []).append(d)
                except Exception:
                    break
        async def ev(sid, expr):
            r = await send("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True}, session=sid)
            if isinstance(r, dict):
                ro = r.get("result", r); rem = ro.get("result", ro)
                if isinstance(rem, dict):
                    if "value" in rem: return rem["value"]
                    if "description" in rem: return rem["description"]
            if isinstance(r, dict):
                if "exceptionDetails" in r: print(f"JS err: {r['exceptionDetails'].get('text','')}", file=sys.stderr)
                if "code" in r: print(f"CDP err: {r}", file=sys.stderr)
            return None
        rt = asyncio.ensure_future(reader())
        try:
            tid = (await send("Target.createTarget", {"url": "about:blank"}))["targetId"]
            sid = (await send("Target.attachToTarget", {"targetId": tid, "flatten": True}))["sessionId"]
            await send("Runtime.enable", session=sid)
            await send("Page.enable", session=sid)
            await send("Network.enable", session=sid)
            await send("Network.setCacheDisabled", {"cacheDisabled": True}, session=sid)
            await send("Emulation.setDeviceMetricsOverride", {"width": WIDTH, "height": HEIGHT, "deviceScaleFactor": 1, "mobile": False}, session=sid)
            scr = await send("Page.addScriptToEvaluateOnNewDocument", {"source": SEED_JS}, session=sid)
            events.pop("Page.loadEventFired", None)
            await send("Page.navigate", {"url": TARGET_URL}, session=sid)
            t0 = time.time()
            while not events.get("Page.loadEventFired"):
                if time.time() - t0 > 25: break
                await asyncio.sleep(0.2)
            for attempt in range(40):
                raw = await ev(sid, HARVEST_JS)
                d = None
                if isinstance(raw, dict):          # returnByValue deserializes the IIFE object
                    d = raw
                elif isinstance(raw, str):          # tolerate a stringified variant too
                    try:
                        d = json.loads(raw)
                    except json.JSONDecodeError:
                        print(f"JSON parse err: {repr(raw[:200])}")
                if d is not None:
                    count = d.get("count", 0)      # harvest JS emits `count`, not visibleCount
                    ready = await ev(sid, "!!document.querySelector('[data-ohf-video=\"102\"]')")
                    plate = await ev(sid, "!!document.querySelector('[data-ohf-video=\"103\"]')")
                    feed = await ev(sid, "!!document.querySelector('[data-ohf-video=\"221\"]')")
                    print(f"attempt {attempt}: count={count}, grid={ready}, plate={plate}, feed={feed}")
                    if count > 50 and ready and plate and feed:
                        elements = d.get("elements", [])
                        href = await ev(sid, "document.location.href")
                        title = await ev(sid, "document.title")
                        scroll_w = await ev(sid, "document.documentElement.scrollWidth")
                        scroll_h = await ev(sid, "document.documentElement.scrollHeight")
                        result = {
                            "url_requested": TARGET_URL, "final_href": href, "title": title,
                            "viewport": {"width": WIDTH, "height": HEIGHT},
                            "page_scroll": {"scrollWidth": scroll_w, "scrollHeight": scroll_h},
                            "element_count": len(elements),
                            "elements": elements,
                        }
                        out_path = OUT_DIR / "ohf_video_surface_harvest.json"
                        with open(out_path, "w", encoding="utf-8") as f:
                            json.dump(result, f, ensure_ascii=False, indent=2)
                        print(f"Wrote {out_path} — {len(elements)} elements")
                        # screenshot AFTER JSON is on disk (skill lesson); best-effort, retry x3, non-fatal
                        ss_path = OUT_DIR / "ohf_video_surface_ss.png"
                        for s_attempt in range(3):
                            try:
                                ss = await send("Page.captureScreenshot", {"format": "png"}, session=sid)
                                ss_path.write_bytes(base64.b64decode(ss["data"]))
                                print(f"Screenshot: {ss_path} ({len(base64.b64decode(ss['data']))} bytes)")
                                break
                            except Exception as ex:
                                print(f"screenshot attempt {s_attempt} failed: {ex}")
                                await asyncio.sleep(2)
                        await send("Target.closeTarget", {"targetId": tid})
                        return
                await asyncio.sleep(1.5)
            print("No video surface after 40 attempts", file=sys.stderr)
            await send("Target.closeTarget", {"targetId": tid})
        finally:
            rt.cancel()

asyncio.run(main())
