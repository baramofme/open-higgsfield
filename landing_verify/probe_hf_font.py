#!/usr/bin/env python3
"""HF(:9222)에서 한글 헤드라인이 실렌더한 폰트만 한 줄로 답한다."""
import asyncio, json, urllib.request
import websockets

async def main():
    with urllib.request.urlopen("http://127.0.0.1:9222/json/version", timeout=5) as r:
        ws_url = json.load(r)["webSocketDebuggerUrl"]
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
            tid = (await send("Target.createTarget", {"url": "about:blank"}))["targetId"]
            sid = (await send("Target.attachToTarget", {"targetId": tid, "flatten": True}))["sessionId"]
            for e in ("Runtime.enable","Page.enable","DOM.enable","CSS.enable"):
                await send(e, session=sid)
            await send("Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, session=sid)
            await send("Page.navigate", {"url":"https://higgsfield.ai/ko/ai/image?model=soul-cinematic"}, session=sid)
            await asyncio.sleep(8)
            doc = await send("DOM.getDocument", {"depth": -1}, session=sid)
            root = doc["root"]["nodeId"]
            nid = 0
            for _ in range(20):
                q = await send("DOM.querySelector", {"nodeId": root,
                     "selector": "main p:nth-of-type(1)"}, session=sid)
                # 한글 헤드라인 노드를 textContent로 찾은 뒤 requestNode로 nodeId 변환
                ev = await send("Runtime.evaluate", {"expression":
                    "(() => {[...document.querySelectorAll('main p')].find(p=>p.textContent.includes('Higgsfield Soul Cinema'))})()",
                    "objectGroup": "probe"}, session=sid)
                ro = ev.get("result", {})
                if ro.get("objectId"):
                    rn = await send("DOM.requestNode", {"objectId": ro["objectId"]}, session=sid)
                    nid = rn.get("nodeId", 0)
                    if nid: break
                await asyncio.sleep(1)
            pf = await send("CSS.getPlatformFontsForNode", {"nodeId": nid}, session=sid) if nid else {}
            line1 = "; ".join(f"{f['familyName']}({f['glyphCount']})" for f in pf.get("fonts", []))
            print("HF headline fonts:", line1)
            fr = await send("Runtime.evaluate", {"expression":
                "(() => {const p=[...document.querySelectorAll('main p')].find(p=>p.textContent.includes('Higgsfield Soul Cinema'));"
                "if(!p) return 'NO'; const cs=getComputedStyle(p); const r=p.getBoundingClientRect();"
                "return JSON.stringify({w:r.width, ff:cs.fontFamily.slice(0,40)})})()", "returnByValue": True}, session=sid)
            print("HF headline p:", fr.get("result", {}).get("value"))
            ld = await send("Runtime.evaluate", {"expression":
                "(() => JSON.stringify([...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family)))()", "returnByValue": True}, session=sid)
            print("HF loaded families:", ld.get("result", {}).get("value"))
            await send("Target.closeTarget", {"targetId": tid})
        finally:
            rt.cancel()

asyncio.run(main())
