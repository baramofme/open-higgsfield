#!/usr/bin/env python3
"""① OHF glow: computed translate + 매칭 규칙의 translate 선언 실재 여부
② HF: 한글 헤드라인의 실제 폰트 + document.lang + 캔버스 폰트 후보표"""
import asyncio, json, urllib.request
from contextlib import asynccontextmanager
import websockets

TEXT = "지금 제작을 시작해 보세요"
CANDS = ["sans-serif", "Noto Sans CJK KR", "Noto Sans KR", "Noto Sans CJK JP", "Noto Sans",
         "NanumGothic", "Malgun Gothic", "Apple SD Gothic Neo", "Pretendard", "Inter", "Space Grotesk"]

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

async def open_page(send, url, seed=None):
    tid = (await send("Target.createTarget", {"url": "about:blank"}))["targetId"]
    sid = (await send("Target.attachToTarget", {"targetId": tid, "flatten": True}))["sessionId"]
    for e in ("Runtime.enable", "Page.enable", "DOM.enable", "CSS.enable"):
        await send(e, session=sid)
    await send("Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, session=sid)
    if seed:
        await send("Page.addScriptToEvaluateOnNewDocument", {"source": seed}, session=sid)
    await send("Page.navigate", {"url": url}, session=sid)
    return tid, sid

SEED = '(() => {try{localStorage.setItem("openhiggsfield.active.v2", JSON.stringify({state:{surface:"image",model:"soul-cinema",batch:1},version:0}))}catch(e){}})()'

async def main():
    async with cdp(json.load(urllib.request.urlopen("http://127.0.0.1:9360/json/version"))["webSocketDebuggerUrl"]) as send:
        tid, sid = await open_page(send, "http://127.0.0.1:3014/", SEED)
        await asyncio.sleep(6)
        v = await send("Runtime.evaluate", {"expression":
            "(() => {const g=document.querySelector('.ohf-img-help-glow'); const cs=getComputedStyle(g);"
            "return JSON.stringify({lang:document.documentElement.lang, translate:cs.translate, transform:cs.transform.slice(0,30),"
            "x:g.getBoundingClientRect().x})})()", "returnByValue": True}, session=sid)
        print("OHF glow:", v.get("result", {}).get("value"))
        doc = await send("DOM.getDocument", {"depth": -1}, session=sid)
        q = await send("DOM.querySelectorAll", {"nodeId": doc["root"]["nodeId"], "selector": ".ohf-img-help-glow"}, session=sid)
        nid = q["nodeIds"][0]
        ms = await send("CSS.getMatchedStylesForNode", {"nodeId": nid}, session=sid)
        for mr in ms.get("matchedCSSRules", []):
            decls = [f"{d['name']}:{d['value']}" for d in mr["rule"].get("origin","") == "" and [] or
                     [d for d in mr["rule"].get("style", {}).get("cssProperties", []) if "translate" in d["name"] or d["name"]=="transform"]]
            if decls: print(f"  rule[{mr['rule'].get('selectorList',{}).get('selectors',[{}])[0].get('text','')[:40]}]:", "; ".join(decls))
        await send("Target.closeTarget", {"targetId": tid})

    async with cdp(json.load(urllib.request.urlopen("http://127.0.0.1:9222/json/version"))["webSocketDebuggerUrl"]) as send:
        tid, sid = await open_page(send, "https://higgsfield.ai/ko/ai/image?model=soul-cinematic")
        doc_root = None
        for _ in range(25):
            await asyncio.sleep(1)
            doc = await send("DOM.getDocument", {"depth": -1}, session=sid)
            doc_root = doc["root"]["nodeId"]
            q = await send("DOM.querySelectorAll", {"nodeId": doc_root, "selector": "main p"}, session=sid)
            hits = []
            for n in q["nodeIds"]:
                oh = await send("DOM.getOuterHTML", {"nodeId": n}, session=sid)
                if TEXT in oh.get("outerHTML", ""):
                    hits.append(n)
            if hits:
                lang = await send("Runtime.evaluate", {"expression": "document.documentElement.lang", "returnByValue": True}, session=sid)
                print("HF lang:", lang.get("result", {}).get("value"))
                for n in hits:
                    pf = await send("CSS.getPlatformFontsForNode", {"nodeId": n}, session=sid)
                    fs = "; ".join(f"{f['familyName']}({f['glyphCount']})" for f in pf.get("fonts", []))
                    print(f"HF p#{n} fonts: {fs}")
                break
        table = await send("Runtime.evaluate", {"expression":
            "(() => {const c=document.createElement('canvas'); const x=c.getContext('2d'); const out=[];"
            f"for(const fam of {json.dumps(CANDS)}) {{ x.font='36px \"'+fam+'\"'; x.letterSpacing='-0.56px';"
            " try{ out.push(fam+'='+x.measureText(TEXT).width.toFixed(3)) }catch(e){ out.push(fam+'=ERR') } }} return out.join(' | ') })()"
            .replace("TEXT", json.dumps(TEXT)), "returnByValue": True}, session=sid)
        print("HF canvas table:", table.get("result", {}).get("value"))
        await send("Target.closeTarget", {"targetId": tid})

asyncio.run(main())
