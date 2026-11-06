#!/usr/bin/env python3
"""Probe HF live — get computed styles of the reference uploader card nodes.
The uploader appears when 레퍼런스 tab is selected. Uses same browser-level WS pattern
as parent scripts. Does NOT call localStorage.clear (shared profile protection)."""
import asyncio, json, urllib.request, os, sys
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

# Get computed styles for the reference uploader subtree
JS_STYLES = r"""
(() => {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
    .filter(t => ['레퍼런스','프레임'].includes((t.textContent||'').trim()));
  if (!tabs.length) return JSON.stringify({ready: document.readyState, tabs: 0});
  // Switch to reference first (if not already)
  const refTab = tabs.find(t => t.textContent.trim()==='레퍼런스');
  if (refTab.getAttribute('aria-selected') !== 'true') refTab.click();
  return JSON.stringify({clicked: true, sel: Object.fromEntries(tabs.map(t=>[t.textContent.trim(), t.getAttribute('aria-selected')]))});
})()
"""

JS_COLLECT = r"""
(() => {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
    .filter(t => ['레퍼런스','프레임'].includes((t.textContent||'').trim()));
  const list = tabs[0].closest('[role="tablist"]');
  const root = list.parentElement;
  const content = root.nextElementSibling;
  // The uploader is content's first child (in reference mode)
  const uploader = content.children[0];
  if (!uploader || !uploader.textContent.includes('레퍼런스')) return JSON.stringify({error:'uploader not found', contentKids: content.children.length});
  
  // Walk all elements in the uploader and get key computed styles + rect
  const collect = (el, label) => {
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      label,
      tag: el.tagName,
      cls: String(el.className||'').slice(0,120),
      rect: {x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height)},
      bg: cs.backgroundColor,
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
      br: cs.borderTopLeftRadius,
      pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' '),
      gap: cs.gap || cs.rowGap,
      fs: cs.fontSize,
      fw: cs.fontWeight,
      lh: cs.lineHeight,
      color: cs.color,
      display: cs.display,
      fd: cs.flexDirection,
      jc: cs.justifyContent,
      ai: cs.alignItems,
      selfStretch: cs.alignSelf,
      w: cs.width,
      h: cs.height,
      pos: cs.position,
      overflow: cs.overflow,
      transition: cs.transition.slice(0,80),
      radius: cs.borderRadius,
      bgImage: cs.backgroundImage.slice(0,100),
    };
  };
  
  const results = [];
  results.push(collect(uploader, 'uploaderOuter'));
  for (const kid of uploader.children) {
    results.push(collect(kid, 'kid_' + kid.tagName + '_' + String(kid.className||'').slice(0,30)));
    for (const grandkid of kid.children) {
      if (grandkid.tagName === 'SPAN' || grandkid.tagName === 'BUTTON') {
        results.push(collect(grandkid, 'gk_' + grandkid.tagName));
        for (const t of grandkid.children) {
          results.push(collect(t, 't_' + t.tagName + '_' + t.textContent.trim().slice(0,15)));
        }
      }
    }
  }
  // Also get prompt placeholder text
  const ph = document.querySelector('[data-prompt-placeholder]');
  const ed = document.querySelector('[contenteditable]');
  return JSON.stringify({
    nodes: results,
    phText: ph ? ph.textContent.trim().replace(/\s+/g,' ') : null,
    edAriaPh: ed ? ed.getAttribute('aria-placeholder') : null,
    contentRect: {x: Math.round(content.getBoundingClientRect().x), y: Math.round(content.getBoundingClientRect().y), w: Math.round(content.getBoundingClientRect().width), h: Math.round(content.getBoundingClientRect().height)},
    uploaderRect: {x: Math.round(uploader.getBoundingClientRect().x), y: Math.round(uploader.getBoundingClientRect().y), w: Math.round(uploader.getBoundingClientRect().width), h: Math.round(uploader.getBoundingClientRect().height)},
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
        # Wait for tabs
        for _ in range(40):
            r = await send(ws, "Runtime.evaluate", {"expression": "document.querySelectorAll('[role=\"tab\"]').length", "returnByValue": True}, sid)
            if r["result"]["value"] >= 2: break
            await asyncio.sleep(0.5)
        
        # Switch to 레퍼런스
        await send(ws, "Runtime.evaluate", {"expression": JS_STYLES, "returnByValue": True}, sid)
        await asyncio.sleep(1.5)
        
        # Collect computed styles
        r = await send(ws, "Runtime.evaluate", {"expression": JS_COLLECT, "returnByValue": True}, sid)
        data = json.loads(r["result"]["value"])
        
        outpath = os.path.join(os.path.dirname(__file__), "hf_uploader_styles.json")
        with open(outpath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        print(json.dumps(data, indent=1, ensure_ascii=False)[:6000])
        print(f"\nSaved to {outpath}", file=sys.stderr)
        
        # Restore to 프레임
        await send(ws, "Runtime.evaluate", {"expression": """(() => {
          const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
            .filter(t => ['레퍼런스','프레임'].includes((t.textContent||'').trim()));
          const ft = tabs.find(t => t.textContent.trim()==='프레임');
          if (ft) ft.click(); return 'done';
        })()""", "returnByValue": True}, sid)
        await send(ws, "Target.closeTarget", {"targetId": tgt})

if __name__ == "__main__":
    asyncio.run(main())
