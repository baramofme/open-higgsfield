#!/usr/bin/env python3
"""t_9f4571a7: 통합 base 트리(OHF dev :3100)에서 combined dispatch가
image·video surface를 각각 렌더하는지 CDP로 실측한다. fabrication 금지 —
모든 판정은 라이브 DOM 실측만 사용한다.
전략: fresh chrome 프로파일의 persist 기본값 surface="video" → 로드 시 VideoSurface가
기본 렌더됨(클릭 불필요). 그 후 localStorage 재수화로 surface="image"로 결정적 전환.
"""
import asyncio, json, time, urllib.request
import websockets

CDP = "http://127.0.0.1:9351"
OHF = "http://127.0.0.1:3100/"
KEY = "openhiggsfield.active.v2"

_msg = 0
async def send(ws, method, params=None, session=None):
    global _msg
    _msg += 1
    mid = _msg
    m = {"id": mid, "method": method, "params": params or {}}
    if session: m["sessionId"] = session
    await ws.send(json.dumps(m))
    # read until our id arrives
    while True:
        raw = await asyncio.wait_for(ws.recv(), timeout=30)
        d = json.loads(raw)
        if d.get("id") == mid:
            if "error" in d:
                raise RuntimeError(f"{method} -> {d['error']}")
            return d.get("result", {})
        # else: event, ignore

def http_json(path):
    with urllib.request.urlopen(CDP + path, timeout=10) as r:
        return json.loads(r.read().decode())

PROBE_JS = r"""
(() => {
  const q = (s) => document.querySelectorAll(s).length;
  const videoRoot = !!document.querySelector('section.ohf-vid-root');
  const imgRoot = !!document.querySelector('[data-ohf-image="root"], [class*="ohf-img-root"], [class*="ohf-ig-root"]');
  return JSON.stringify({
    readyState: document.readyState,
    videoRoot: videoRoot,
    vidCount: q('[data-ohf-video]'),
    imgRoot: imgRoot,
    imgCount: q('[data-ohf-image]'),
    heroText: (document.querySelector('[class*="ohf-img"]') ?
              (document.querySelector('[class*="ohf-img"]').textContent||'').slice(0,80) : ''),
    title: document.title
  });
})()
"""

async def wait_ready(ws, session, want="complete", secs=12):
    t0 = time.time()
    while time.time() - t0 < secs:
        r = await send(ws, "Runtime.evaluate",
                       {"expression": "document.readyState", "returnByValue": True}, session)
        if r.get("result", {}).get("value") == want:
            await asyncio.sleep(1.0)  # settle after React mount
            return True
        await asyncio.sleep(0.4)
    return False

async def probe(ws, session):
    r = await send(ws, "Runtime.evaluate",
                   {"expression": PROBE_JS, "returnByValue": True}, session)
    return json.loads(r["result"]["value"])

async def main():
    # wait for chrome to be reachable
    for _ in range(20):
        try:
            ver = http_json("/json/version"); break
        except Exception:
            await asyncio.sleep(0.5)
    else:
        raise RuntimeError("chrome :9351 never came up")
    bws = ver["webSocketDebuggerUrl"]
    async with websockets.connect(bws, max_size=8_000_000) as ws:
        # create target about:blank
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        target = t["targetId"]
        a = await send(ws, "Target.attachToTarget", {"targetId": target, "flatten": True})
        sid = a["sessionId"]
        await send(ws, "Page.enable", {}, sid)
        await send(ws, "Runtime.enable", {}, sid)
        await send(ws, "Emulation.setDeviceMetricsOverride",
                   {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, sid)
        # clear any persisted state to guarantee fresh default
        await send(ws, "Page.navigate", {"url": OHF}, sid)
        await asyncio.sleep(0.6)
        await send(ws, "Runtime.evaluate",
                   {"expression": f"try{{localStorage.removeItem('{KEY}')}}catch(e){{}}"}, sid)
        await send(ws, "Page.navigate", {"url": OHF}, sid)
        await wait_ready(ws, sid)
        v0 = await probe(ws, sid)
        print("PROBE V0 (default surface=video):", json.dumps(v0))

        # flip to image via localStorage rehydration + reload
        flip = ("try{localStorage.setItem('%s',JSON.stringify({state:{surface:'image',"
                "model:'soul-cinema',batch:1},version:0}))}catch(e){};location.reload();" % KEY)
        await send(ws, "Runtime.evaluate", {"expression": flip}, sid)
        await wait_ready(ws, sid)
        i0 = await probe(ws, sid)
        print("PROBE I0 (surface=image):", json.dumps(i0))

        # flip back to video to confirm reversibility / exclusivity
        back = ("try{localStorage.setItem('%s',JSON.stringify({state:{surface:'video',"
                "model:'seedance-2.5',batch:1},version:0}))}catch(e){};location.reload();" % KEY)
        await send(ws, "Runtime.evaluate", {"expression": back}, sid)
        await wait_ready(ws, sid)
        v1 = await probe(ws, sid)
        print("PROBE V1 (back to video):", json.dumps(v1))

        # verdict
        def render_kind(p):
            if p["videoRoot"] and p["vidCount"] > 50:
                return "VIDEO"
            if p["imgCount"] > 50:
                return "IMAGE"
            return "NONE/STUDIO"
        verdict = {
            "V0": render_kind(v0), "I0": render_kind(i0), "V1": render_kind(v1),
            "video_exclusive_when_image": (v0["imgCount"] == 0 and i0["videoRoot"] == False),
            "image_exclusive_when_video": (i0["videoRoot"] == False),
        }
        print("VERDICT:", json.dumps(verdict))
        # cleanup target
        try: await send(ws, "Target.closeTarget", {"targetId": target})
        except Exception: pass

asyncio.run(main())
