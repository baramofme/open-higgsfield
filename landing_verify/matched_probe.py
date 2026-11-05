#!/usr/bin/env python3
"""CDP CSS.getMatchedStylesForNode — 칩 배경의 실제 승리 규칙을 찾는다."""
import asyncio, json, urllib.request
import websockets

async def main():
    with urllib.request.urlopen("http://127.0.0.1:9360/json/version", timeout=5) as r:
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
                    if "id" in d and d["id"] in pending: pending.pop(d["id"]).set_result(d.get("result", d.get("error")))
                except: break
        rt = asyncio.ensure_future(reader())
        try:
            tid = (await send("Target.createTarget", {"url": "about:blank"}))["targetId"]
            sid = (await send("Target.attachToTarget", {"targetId": tid, "flatten": True}))["sessionId"]
            for m in ("DOM.enable","CSS.enable","Runtime.enable","Page.enable"):
                await send(m, session=sid)
            await send("Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, session=sid)
            await send("Page.addScriptToEvaluateOnNewDocument", {"source": '(() => {try{localStorage.setItem("openhiggsfield.active.v2", JSON.stringify({state:{surface:"image",model:"soul-cinema",batch:1},version:0}))}catch(e){}})()'}, session=sid)
            await send("Page.navigate", {"url": "http://127.0.0.1:3014/"}, session=sid)
            await asyncio.sleep(6)
            doc = await send("DOM.getDocument", {"depth": -1}, session=sid)
            root = doc["root"]["nodeId"]
            for sel in ('[data-ohf-image="modelbtn"]', '.ohf-img-charbadge'):
                q = await send("DOM.querySelector", {"nodeId": root, "selector": sel}, session=sid)
                node = q["nodeId"]
                if not node:
                    print(sel, "NO-NODE"); continue
                ms = await send("CSS.getMatchedStylesForNode", {"nodeId": node}, session=sid)
                print("### ", sel)
                for blk in ms.get("matchedCSS", []):
                    rule = blk.get("rule", {})
                    selr = rule.get("selectorList", {}).get("text", "?")
                    origin = rule.get("origin", "")
                    for prop in rule.get("style", {}).get("cssProperties", []):
                        if prop.get("name") in ("background-color","background-image","box-shadow") and not prop.get("disabled", False):
                            print(f"   [{origin}] {selr} :: {prop['name']} = {prop.get('value','')[:120]}")
            await send("Target.closeTarget", {"targetId": tid})
        finally:
            rt.cancel()

asyncio.run(main())
