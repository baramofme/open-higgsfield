#!/usr/bin/env python3
"""Quick diagnostic: navigate OHF :3115 via :9335 and report what renders."""
import asyncio, json, urllib.request, sys
import websockets

OHF_EP = "http://127.0.0.1:9335"
OHF_URL = "http://127.0.0.1:3115/"
_msg = 0

async def send(ws, method, params=None, sid=None):
    global _msg
    _msg += 1; mid = _msg
    m = {"id": mid, "method": method, "params": params or {}}
    if sid: m["sessionId"] = sid
    await ws.send(json.dumps(m))
    while True:
        d = json.loads(await asyncio.wait_for(ws.recv(), timeout=30))
        if d.get("id") == mid:
            if "error" in d: raise RuntimeError(f"{method}->{d['error']}")
            return d.get("result", {})

JS = r"""(() => {
  const tabs = document.querySelectorAll('[role="tab"]');
  const segTabs = Array.from(tabs).filter(t => t.textContent.trim()==='레퍼런스'||t.textContent.trim()==='프레임');
  const anchors = document.querySelectorAll('[data-ohf-video]').length;
  const refUp = document.querySelector('.ohf-vid-ref-uploader');
  const n141 = document.querySelector('.ohf-vid-n141');
  const n142 = document.querySelector('.ohf-vid-n142');
  const n125 = document.querySelector('.ohf-vid-n125');
  return JSON.stringify({
    ready: document.readyState,
    tabCount: tabs.length,
    segTabNames: segTabs.map(t=>t.textContent.trim()),
    segTabRect: segTabs.map(t=>{const b=t.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)};}),
    anchors,
    refUpPresent: !!refUp,
    n141Rect: n141 ? (()=>{const b=n141.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)};})() : null,
    n142Present: !!n142,
    n125Rect: n125 ? (()=>{const b=n125.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)};})() : null,
    bodySnippet: document.body.innerText.slice(0,300),
  });
})()"""

async def main():
    ver = json.loads(urllib.request.urlopen(OHF_EP + "/json/version", timeout=10).read())
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        tgt = t["targetId"]
        sid = (await send(ws, "Target.attachToTarget", {"targetId": tgt, "flatten": True}))["sessionId"]
        await send(ws, "Page.enable", {}, sid)
        await send(ws, "Runtime.enable", {}, sid)
        await send(ws, "Emulation.setDeviceMetricsOverride",
                   {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, sid)
        # Clear localStorage and navigate
        await send(ws, "Runtime.evaluate", {"expression": "try{localStorage.clear()}catch(e){};try{sessionStorage.clear()}catch(e){}"}, sid)
        await send(ws, "Page.navigate", {"url": OHF_URL}, sid)
        await asyncio.sleep(4)
        # Wait for tabs
        for _ in range(30):
            r = await send(ws, "Runtime.evaluate", {"expression": "document.querySelectorAll('[role=\"tab\"]').length", "returnByValue": True}, sid)
            if r["result"]["value"] >= 2: break
            await asyncio.sleep(0.5)
        # Report
        r = await send(ws, "Runtime.evaluate", {"expression": JS, "returnByValue": True}, sid)
        print(json.dumps(json.loads(r["result"]["value"]), indent=1, ensure_ascii=False))
        await send(ws, "Target.closeTarget", {"targetId": tgt})

if __name__ == "__main__":
    asyncio.run(main())
