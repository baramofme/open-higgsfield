#!/usr/bin/env python3
"""세 라인의 max-content 폭 실측 — HF 래퍼 496.047의 결정자를 특정."""
import asyncio, json, urllib.request
from contextlib import asynccontextmanager
import websockets

FN = """() => {
  const out = {};
  const ps = [...document.querySelectorAll('main p')];
  const pick = (t) => ps.find(p => p.textContent.includes(t));
  for (const [k, t] of Object.entries({line1:'시작해 보세요', line2:'Higgsfield Soul Cinema', desc:'살라나요'})) {
    const el = pick(t);
    if (!el) { out[k] = 'MISS'; continue; }
    out[k + '_fill'] = +el.getBoundingClientRect().width.toFixed(3);
    const prev = el.style.width;
    el.style.width = 'max-content';
    out[k + '_mc'] = +el.getBoundingClientRect().width.toFixed(3);
    el.style.width = prev;
  }
  const wrap = document.querySelector('main p') ? [...document.querySelectorAll('main div')].find(d => d.getBoundingClientRect().width > 480 && d.getBoundingClientRect().width < 500 && d.getBoundingClientRect().y > 380 && d.getBoundingClientRect().y < 420) : null;
  out.wrap = wrap ? +wrap.getBoundingClientRect().width.toFixed(3) : 'MISS';
  return JSON.stringify(out);
}"""

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
        try: yield send
        finally: rt.cancel()

async def page(send, url, seed=None):
    tid = (await send("Target.createTarget", {"url":"about:blank"}))["targetId"]
    sid = (await send("Target.attachToTarget", {"targetId":tid,"flatten":True}))["sessionId"]
    for e in ("Runtime.enable","Page.enable"): await send(e, session=sid)
    await send("Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, session=sid)
    if seed: await send("Page.addScriptToEvaluateOnNewDocument", {"source":seed}, session=sid)
    await send("Page.navigate", {"url":url}, session=sid)
    await asyncio.sleep(7)
    ev = await send("Runtime.callFunctionOn", {"functionDeclaration": FN, "objectId": None,
        "expression": None}, session=sid) if False else await send("Runtime.evaluate",
        {"expression": "(" + FN + ")()", "returnByValue": True}, session=sid)
    return ev.get("result", {}).get("value"), tid

SEED = '(() => {try{localStorage.setItem("openhiggsfield.active.v2", JSON.stringify({state:{surface:"image",model:"soul-cinema",batch:1},version:0}))}catch(e){}})()'

async def main():
    async with cdp(json.load(urllib.request.urlopen("http://127.0.0.1:9222/json/version"))["webSocketDebuggerUrl"]) as send:
        v, tid = await page(send, "https://higgsfield.ai/ko/ai/image?model=soul-cinematic")
        print("HF:", v); await send("Target.closeTarget", {"targetId": tid})
    async with cdp(json.load(urllib.request.urlopen("http://127.0.0.1:9360/json/version"))["webSocketDebuggerUrl"]) as send:
        v, tid = await page(send, "http://127.0.0.1:3014/", SEED)
        print("OHF:", v); await send("Target.closeTarget", {"targetId": tid})

asyncio.run(main())
