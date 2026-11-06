#!/usr/bin/env python3
"""헤드라인 노드가 실제로 렌더한 폰트를 양측(HF:9222, OHF:9360)에서 확인한다.
CSS.getPlatformFontsForNode — 스택 문자열이 아니라 실글리프 폰트를 답한다."""
import asyncio, json, urllib.request
import websockets

CASES = [
    ("HF", "http://127.0.0.1:9222", "https://higgsfield.ai/ko/ai/image?model=soul-cinematic"),
    ("OHF", "http://127.0.0.1:9360", "http://127.0.0.1:3014/"),
]

EXPR_FONTS = "(() => { try { return JSON.stringify(document.fonts.entries ? [...document.fonts].map(f=>f.family+' '+f.status) : []) } catch(e){ return 'ERR:'+e.message } })()"

async def probe(label, http, url):
    with urllib.request.urlopen(http + "/json/version", timeout=5) as r:
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
            await send("Runtime.enable", session=sid)
            await send("Page.enable", session=sid)
            await send("DOM.enable", session=sid)
            await send("CSS.enable", session=sid)
            await send("Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, session=sid)
            if label == "OHF":
                await send("Page.addScriptToEvaluateOnNewDocument", {"source": '(() => {try{localStorage.setItem("openhiggsfield.active.v2", JSON.stringify({state:{surface:"image",model:"soul-cinema",batch:1},version:0}))}catch(e){}})()'}, session=sid)
            await send("Page.navigate", {"url": url}, session=sid)
            await asyncio.sleep(7)
            # document root → 노드 검색
            doc = await send("DOM.getDocument", {"depth": -1}, session=sid)
            root = doc["root"]["nodeId"]
            for sel, name in (('div', None),):
                pass
            q = await send("DOM.querySelector", {"nodeId": root, "selector": "[data-ohf-image='headline']" if label=="OHF" else "main p"}, session=sid)
            nid = q.get("nodeId", 0)
            print(f"[{label}] headline nodeId={nid}")
            if nid:
                pf = await send("CSS.getPlatformFontsForNode", {"nodeId": nid}, session=sid)
                print(f"[{label}] platformFonts(headline)={json.dumps(pf, ensure_ascii=False)[:600]}")
                # rect 실측
            ev = await send("Runtime.evaluate", {"expression":
                "(() => {const el=document.querySelector('[data-ohf-image=\"headline\"]')||[...document.querySelectorAll('main p')].find(p=>p.textContent.includes('Higgsfield Soul Cinema'));"
                "if(!el) return 'NO'; const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);"
                "return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height})})()", "returnByValue": True}, session=sid)
            res = ev.get("result", {}) if isinstance(ev, dict) else {}
            ro = res.get("result", res); val = ro.get("value") if isinstance(ro, dict) else None
            print(f"[{label}] headline rect={val}")
            fr = await send("Runtime.evaluate", {"expression": EXPR_FONTS, "returnByValue": True}, session=sid)
            res = fr.get("result", {}) if isinstance(fr, dict) else {}
            ro = res.get("result", res); val = ro.get("value") if isinstance(ro, dict) else None
            print(f"[{label}] document.fonts={val}")
            await send("Target.closeTarget", {"targetId": tid})
        finally:
            rt.cancel()

async def main():
    for label, http, url in CASES:
        try:
            await probe(label, http, url)
        except Exception as e:
            print(f"[{label}] probe failed: {e}")

asyncio.run(main())
