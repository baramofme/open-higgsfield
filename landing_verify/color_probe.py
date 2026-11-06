#!/usr/bin/env python3
"""색상 직렬화 probes — HF computed 와 문자열 동일해지는 선언 형태를 찾는다."""
import asyncio, json, urllib.request
import websockets

CDP_HTTP = "http://127.0.0.1:9360"

CANDIDATES = {
    "mix4": "color-mix(in oklab, rgb(255 255 255) 4%, transparent)",
    "mix5": "color-mix(in oklab, rgb(255 255 255) 5%, transparent)",
    "mix10": "color-mix(in oklab, rgb(255 255 255) 10%, transparent)",
    "mix30": "color-mix(in oklab, rgb(255 255 255) 30%, transparent)",
    "mix12": "color-mix(in oklab, rgb(255 255 255) 12%, transparent)",
    "mix20w": "color-mix(in oklab, rgb(255 255 255) 20%, transparent)",
    "mix24lime": "color-mix(in oklab, rgb(209 254 23) 24%, transparent)",
    "rgba5": "rgba(255,255,255,0.05)",
    "oklab4": "oklab(0.999994 0.0000455678 0.0000200868 / 0.04)",
}

JS = "(() => {const d=document.createElement('div');document.body.appendChild(d);" + \
     ";".join(f"d.style.backgroundColor={json.dumps(v)};window.__p{k}=getComputedStyle(d).backgroundColor;" for k,v in CANDIDATES.items()) + \
     " ; return JSON.stringify({__p4:__p_mix}) })()"

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
            for k, v in CANDIDATES.items():
                expr = f"(() => {{const d=document.createElement('div');document.body.appendChild(d);d.style.backgroundColor={json.dumps(v)};const r=getComputedStyle(d).backgroundColor;d.remove();return r;}})()"
                r = await send("Runtime.evaluate", {"expression": expr, "returnByValue": True}, session=sid)
                res = r.get("result", {}) if isinstance(r, dict) else {}
                ro = res.get("result", res)
                val = ro.get("value") if isinstance(ro, dict) else None
                if val is None: val = f"RAW:{json.dumps(r)[:160]}"
                print(f"{k:10s} IN={v}\n           OUT={val}")
            await send("Target.closeTarget", {"targetId": tid})
        finally:
            rt.cancel()

asyncio.run(main())
