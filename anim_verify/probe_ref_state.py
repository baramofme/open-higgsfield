#!/usr/bin/env python3
"""Probe HF live (:9222) — capture content area DOM in both tab states.
Pattern: browser-level WS from /json/version → create target → attach → navigate.
No localStorage.clear on HF side (shared :9222 profile protection per parent warning)."""
import asyncio, json, time, urllib.request, os, sys
import websockets

HF_EP = "http://127.0.0.1:9222"
HF_URL = "https://higgsfield.ai/ko/ai/video?model=minimax_h3"
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

JS_PROBE = r"""
(() => {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
    .filter(t => ['레퍼런스','프레임'].includes((t.textContent||'').trim()));
  if (!tabs.length) return JSON.stringify({ready: document.readyState, tabs: 0});
  const list = tabs[0].closest('[role="tablist"]');
  const root = list.parentElement;
  const content = root.nextElementSibling;
  const dump = (el, depth) => {
    if (!el) return null;
    const kids = Array.from(el.children).map(c => ({
      tag: c.tagName, cls: String(c.className||'').slice(0,120),
      attrs: Object.fromEntries(Array.from(c.attributes).map(a => [a.name, a.value.slice(0,60)])),
      txt: (c.textContent||'').trim().replace(/\s+/g,' ').slice(0,60) }));
    return { tag: el.tagName, cls: String(el.className||'').slice(0,120),
      attrs: Object.fromEntries(Array.from(el.attributes).map(a=>[a.name,a.value.slice(0,60)])),
      txt: (el.textContent||'').trim().replace(/\s+/g,' ').slice(0,120), kids };
  };
  return JSON.stringify({ ready: document.readyState,
    sel: Object.fromEntries(tabs.map(t=>[t.textContent.trim(), t.getAttribute('aria-selected')])),
    content: dump(content, 1) });
})()
"""

# Detailed dump of content inner structure (depth 4)
JS_DEEP = r"""
(() => {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
    .filter(t => ['레퍼런스','프레임'].includes((t.textContent||'').trim()));
  if (!tabs.length) return JSON.stringify({ready: document.readyState, tabs: 0});
  const list = tabs[0].closest('[role="tablist"]');
  const root = list.parentElement;
  const content = root.nextElementSibling;
  const dump = (el, depth) => {
    if (!el) return null;
    const kids = [];
    for (const c of el.children) {
      if (depth >= 3) {
        kids.push({tag: c.tagName, cls: String(c.className||'').slice(0,100),
          txt: (c.textContent||'').trim().replace(/\s+/g,' ').slice(0,60)});
      } else {
        const d = dump(c, depth+1);
        if (d) kids.push(d);
      }
    }
    return { tag: el.tagName, cls: String(el.className||'').slice(0,120),
      attrs: Object.fromEntries(Array.from(el.attributes).map(a=>[a.name,a.value.slice(0,60)])),
      txt: (el.textContent||'').trim().replace(/\s+/g,' ').slice(0,150), kids };
  };
  // also get prompt placeholder text
  const pbox = document.querySelector('[data-prompt-field]');
  const ph = document.querySelector('[data-prompt-placeholder]');
  const ed = document.querySelector('[contenteditable]');
  return JSON.stringify({
    ready: document.readyState,
    sel: Object.fromEntries(tabs.map(t=>[t.textContent.trim(), t.getAttribute('aria-selected')])),
    content: dump(content, 0),
    placeholder: ph ? ph.textContent.trim().replace(/\s+/g,' ') : null,
    edPlaceholder: ed ? ed.getAttribute('aria-placeholder') : null,
  });
})()
"""

async def main():
    ver = json.loads(urllib.request.urlopen(HF_EP + "/json/version", timeout=10).read())
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        tgt = t["targetId"]
        sid = (await send(ws, "Target.attachToTarget", {"targetId": tgt, "flatten": True}))["sessionId"]
        await send(ws, "Page.enable", {}, sid)
        await send(ws, "Runtime.enable", {}, sid)
        await send(ws, "Emulation.setDeviceMetricsOverride",
                   {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, sid)
        await send(ws, "Page.navigate", {"url": HF_URL}, sid)
        await asyncio.sleep(3.0)
        # wait for tabs
        for _ in range(40):
            r = await send(ws, "Runtime.evaluate", {"expression": JS_PROBE, "returnByValue": True}, sid)
            v = json.loads(r["result"]["value"])
            if v.get("tabs") != 0: break
            await asyncio.sleep(0.5)

        # Frame state (default = 프레임)
        r = await send(ws, "Runtime.evaluate", {"expression": JS_DEEP, "returnByValue": True}, sid)
        frame_state = json.loads(r["result"]["value"])
        print("=== FRAME STATE ===", file=sys.stderr)
        print(json.dumps(frame_state, indent=1, ensure_ascii=False)[:4000])

        # Click 레퍼런스 tab via coordinates (recalculated fresh)
        rectjs = r"""(() => {const ts=Array.from(document.querySelectorAll('[role="tab"]'))
          .filter(x=>['레퍼런스','프레임'].includes((x.textContent||'').trim()));
          const tb=ts.find(x=>x.textContent.trim()==='레퍼런스');const b=tb.getBoundingClientRect();
          return JSON.stringify({x:b.x+b.width/2,y:b.y+b.height/2});})()"""
        c = json.loads((await send(ws, "Runtime.evaluate", {"expression": rectjs, "returnByValue": True}, sid))["result"]["value"])
        await send(ws, "Input.dispatchMouseEvent", {"type": "mousePressed", "x": c["x"], "y": c["y"], "button": "left", "clickCount": 1}, sid)
        await send(ws, "Input.dispatchMouseEvent", {"type": "mouseReleased", "x": c["x"], "y": c["y"], "button": "left", "clickCount": 1}, sid)
        await asyncio.sleep(1.5)

        # Reference state
        r = await send(ws, "Runtime.evaluate", {"expression": JS_DEEP, "returnByValue": True}, sid)
        ref_state = json.loads(r["result"]["value"])
        print("\n=== REFERENCE STATE ===", file=sys.stderr)
        print(json.dumps(ref_state, indent=1, ensure_ascii=False)[:4000])

        out = {"frame": frame_state, "reference": ref_state}
        outpath = os.path.join(os.path.dirname(__file__), "hf_ref_probe.json")
        with open(outpath, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
        print(f"\nSaved to {outpath}", file=sys.stderr)

        # Close target
        await send(ws, "Target.closeTarget", {"targetId": tgt})

if __name__ == "__main__":
    import sys
    asyncio.run(main())
