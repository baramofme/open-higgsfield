#!/usr/bin/env python3
"""OHF 페이지 실시간 probes — 칩 bg 의 실제 소스, 토큰 값, 캐스케이드 승자를 확인한다."""
import asyncio, json, urllib.request
import websockets

CDP_HTTP = "http://127.0.0.1:9360"
URL = "http://127.0.0.1:3014/"

EXPRS = {
    "modelbtn_bg": "getComputedStyle(document.querySelector('[data-ohf-image=\"modelbtn\"]')).backgroundColor",
    "token_05": "getComputedStyle(document.querySelector('.ohf-img-root')).getPropertyValue('--tile-img-white-05')",
    "inline_override": "(() => {const el=document.querySelector('[data-ohf-image=\"modelbtn\"]');el.style.backgroundColor='rgba(255,255,255,0.05)';const v=getComputedStyle(el).backgroundColor;el.style.backgroundColor='';return v})()",
    "btn_fontsize": "getComputedStyle(document.querySelector('[data-ohf-image=\"stepminus\"]')).fontSize",
    "editorp_present": "!!document.querySelector('[data-ohf-image=\"editorp\"]')",
    "editorp_rect": "(() => {const e=document.querySelector('[data-ohf-image=\"editorp\"]'); if(!e) return null; const r=e.getBoundingClientRect(); return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height})})()",
    "helpzone_rect": "(() => {const e=document.querySelector('[data-ohf-image=\"helpzone\"]'); if(!e) return 'NO-NODE'; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height,pos:cs.position,op:cs.opacity,disp:cs.display,vis:cs.visibility})})()",
    "chevghost": "(() => {const e=document.querySelector('[data-ohf-image=\"chevronGhost\"]'); if(!e) return 'NO-NODE'; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height,op:cs.opacity})})()",
    "root_mtop": "getComputedStyle(document.querySelector('.ohf-img-root')).marginTop",
    "topbar_h": "getComputedStyle(document.querySelector('.ohf-topbar')).height",
}

async def main():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=5) as r:
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
            await send("Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, session=sid)
            await send("Page.addScriptToEvaluateOnNewDocument", {"source": '(() => {try{localStorage.setItem("openhiggsfield.active.v2", JSON.stringify({state:{surface:"image",model:"soul-cinema",batch:1},version:0}))}catch(e){}})()'}, session=sid)
            await send("Page.navigate", {"url": URL}, session=sid)
            await asyncio.sleep(6)
            for name, expr in EXPRS.items():
                r = await send("Runtime.evaluate", {"expression": expr, "returnByValue": True}, session=sid)
                res = r.get("result", {}) if isinstance(r, dict) else {}
                ro = res.get("result", res)
                val = ro.get("value") if isinstance(ro, dict) else None
                print(f"{name}: {val}")
            await send("Target.closeTarget", {"targetId": tid})
        finally:
            rt.cancel()

asyncio.run(main())
