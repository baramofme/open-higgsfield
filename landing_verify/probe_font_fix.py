#!/usr/bin/env python3
"""OHF 라이브에서 헤드라인 폰트 폴백 실험 테이블."""
import asyncio, json, urllib.request
import websockets

async def main():
    ws_url = json.load(urllib.request.urlopen("http://127.0.0.1:9360/json/version"))["webSocketDebuggerUrl"]
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
            await send("Page.addScriptToEvaluateOnNewDocument", {"source":
                '(() => {try{localStorage.setItem("openhiggsfield.active.v2", JSON.stringify({state:{surface:"image",model:"soul-cinema",batch:1},version:0}))}catch(e){}})()'}, session=sid)
            await send("Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, session=sid)
            await send("Page.navigate", {"url": "http://127.0.0.1:3014/"}, session=sid)
            await asyncio.sleep(6)
            doc = await send("DOM.getDocument", {"depth": -1}, session=sid)
            q = await send("DOM.querySelector", {"nodeId": doc["root"]["nodeId"], "selector": "[data-ohf-image=headline]"}, session=sid)
            nid = q.get("nodeId", 0)
            pf = await send("CSS.getPlatformFontsForNode", {"nodeId": nid}, session=sid) if nid else {}
            print("fonts now:", "; ".join(f"{f['familyName']}({f['glyphCount']})" for f in pf.get("fonts", [])))
            v = await send("Runtime.evaluate", {"expression": """(() => {
              const el = document.querySelector('[data-ohf-image=headline]');
              const base = el.getBoundingClientRect().width;
              const orig = el.style.fontFamily;
              const tries = {
                'KR-first': '"Noto Sans CJK KR", "Space Grotesk", ui-sans-serif, system-ui',
                'KR-only': '"Noto Sans CJK KR"',
                'KR-bold': '"Noto Sans CJK KR"',
              };
              const out = {base};
              for (const [k, fam] of Object.entries(tries)) {
                el.style.fontFamily = fam;
                if (k === 'KR-bold') el.style.fontWeight = '700';
                out[k] = el.getBoundingClientRect().width;
              }
              el.style.fontFamily = orig; el.style.fontWeight = '';
              out.langProbe = document.querySelector('[data-ohf-image=root]').lang;
              out.wl = (document.documentElement.lang = 'ko', el.getBoundingClientRect().width);
              return JSON.stringify(out);
            })()""", "returnByValue": True}, session=sid)
            print("widths:", v.get("result", {}).get("value"))
            await send("Target.closeTarget", {"targetId": tid})
        finally:
            rt.cancel()

asyncio.run(main())
