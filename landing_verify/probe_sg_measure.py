#!/usr/bin/env python3
"""양측 Chrome에서 '700 36px Space Grotesk'(ls -0.56, uppercase) 라측 실측 비교."""
import asyncio, json, urllib.request
from contextlib import asynccontextmanager
import websockets

@asynccontextmanager
async def cdp(ws_url):
    async with websockets.connect(ws_url, max_size=None) as ws:
        msg_id = 0; pending = {}
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
                except: break
        rt = asyncio.ensure_future(reader())
        try:
            yield send
        finally:
            rt.cancel()

EXPR = """(() => {
  const c=document.createElement('canvas'); const x=c.getContext('2d');
  const out={};
  const T='HIGGSFIELD SOUL CINEMA';
  for (const spec of ['700 36px "Space Grotesk"','36px "Space Grotesk"','700 36px sans-serif']) {
    x.font = spec; x.letterSpacing = '-0.56px';
    out[spec] = +x.measureText(T).width.toFixed(3);
  }
  out.srcs = [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+'@'+f.weight+':'+(f.src||'').slice(-60)).join(' | ');
  return JSON.stringify(out);
})()"""

async def page(send, url, seed=None):
    tid = (await send("Target.createTarget", {"url": "about:blank"}))["targetId"]
    sid = (await send("Target.attachToTarget", {"targetId": tid, "flatten": True}))["sessionId"]
    for e in ("Runtime.enable", "Page.enable"):
        await send(e, session=sid)
    await send("Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, session=sid)
    if seed:
        await send("Page.addScriptToEvaluateOnNewDocument", {"source": seed}, session=sid)
    await send("Page.navigate", {"url": url}, session=sid)
    await asyncio.sleep(7)
    ev = await send("Runtime.evaluate", {"expression": EXPR, "returnByValue": True}, session=sid)
    return ev.get("result", {}).get("value"), tid

SEED = '(() => {try{localStorage.setItem("openhiggsfield.active.v2", JSON.stringify({state:{surface:"image",model:"soul-cinema",batch:1},version:0}))}catch(e){}})()'

async def main():
    async with cdp(json.load(urllib.request.urlopen("http://127.0.0.1:9360/json/version"))["webSocketDebuggerUrl"]) as send:
        v, tid = await page(send, "http://127.0.0.1:3014/", SEED)
        print("OHF:", v)
        await send("Target.closeTarget", {"targetId": tid})
    async with cdp(json.load(urllib.request.urlopen("http://127.0.0.1:9222/json/version"))["webSocketDebuggerUrl"]) as send:
        v, tid = await page(send, "https://higgsfield.ai/ko/ai/image?model=soul-cinematic")
        print("HF:", v)
        await send("Target.closeTarget", {"targetId": tid})

asyncio.run(main())
