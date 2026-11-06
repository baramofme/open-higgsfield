#!/usr/bin/env python3
"""probe_settings_hf4.py — HF live 최종 GT: 트리거 내부 라벨/밸류, 비율 메뉴 항목 내부,
길이 다이얼 전체 자식 트리(inline style 포함), 스케일 라벨. 출력: hf_settings_probe4.json"""
import asyncio, json, urllib.request, websockets

HF_EP = "http://127.0.0.1:9222"
HF_URL = "https://higgsfield.ai/ko/ai/video?model=minimax_h3"
_msg = 0

async def send(ws, m, p=None, s=None):
    global _msg
    _msg += 1
    mid = _msg
    d = {"id": mid, "method": m, "params": p or {}}
    if s: d["sessionId"] = s
    await ws.send(json.dumps(d))
    while True:
        r = json.loads(await asyncio.wait_for(ws.recv(), timeout=30))
        if r.get("id") == mid:
            if "error" in r: raise RuntimeError(f"{m}->{r['error']}")
            return r.get("result", {})

KEYS = ["color","fontSize","lineHeight","fontWeight","backgroundColor","borderRadius","boxShadow",
        "opacity","display","position","padding","gap","flexDirection","justifyContent","alignItems",
        "width","height","textAlign","cursor","transitionProperty","transitionDuration","transitionTimingFunction",
        "zIndex","overflow","overflowClipMargin","backdropFilter"]

JS_INV = """(() => {
  const C = (el, ks) => { const s = getComputedStyle(el); const o = {}; for (const k of ks) o[k] = s[k]; return o; };
  const R = el => { const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}; };
  const KEYS = %s;
  const out = {};
  const trig = lab => Array.from(document.querySelectorAll('[data-form-kit-setting-button]')).find(b => b.getAttribute('aria-label') === lab);
  for (const lab of ['비율','길이','품질','모델']) {
    const t = trig(lab); if (!t) continue;
    out[lab] = { rect: R(t), cs: C(t, KEYS), attrs: { state: t.getAttribute('data-state'), expanded: t.getAttribute('aria-expanded'), haspopup: t.getAttribute('aria-haspopup'), ti: t.getAttribute('tabindex'), dis: t.getAttribute('disabled') },
      inner: Array.from(t.querySelectorAll('span')).map(sp => ({ txt:(sp.textContent||'').trim(), rect:R(sp), cs:C(sp, KEYS), inline:(sp.getAttribute('style')||'').slice(0,120) })) };
  }
  return JSON.stringify(out);
})()""" % json.dumps(KEYS)

JS_MENU = """(() => {
  const C = (el, ks) => { const s = getComputedStyle(el); const o = {}; for (const k of ks) o[k] = s[k]; return o; };
  const R = el => { const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}; };
  const KEYS = %s;
  const out = {};
  const rt = Array.from(document.querySelectorAll('[data-form-kit-setting-button]')).find(b => b.getAttribute('aria-label') === '비율');
  if (rt) rt.click();
  return JSON.stringify(out);
})()""" % json.dumps(KEYS)

READ_MENU = """(() => {
  const C = (el, ks) => { const s = getComputedStyle(el); const o = {}; for (const k of ks) o[k] = s[k]; return o; };
  const R = el => { const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}; };
  const KEYS = %s;
  const out = {};
  const m = document.querySelector('[role="menu"][data-state="open"]') || document.querySelector('[role="menu"]');
  if (m) {
    out.menu = { rect: R(m), cs: C(m, KEYS), attrs: { state: m.getAttribute('data-state'), ti: m.getAttribute('tabindex'), label: m.getAttribute('aria-label') }, inline: (m.getAttribute('style')||'').slice(0,120) };
    const wrap = m.parentElement;
    out.wrap = wrap ? { tag: wrap.tagName, pos: C(wrap, KEYS).position, z: C(wrap, KEYS).zIndex, inline: (wrap.getAttribute('style')||'').slice(0,120) } : null;
    out.items = Array.from(m.children).map(it => ({ tag: it.tagName, txt:(it.textContent||'').trim().replace(/\\s+/g,' '),
      attrs: { role: it.getAttribute('role'), checked: it.getAttribute('aria-checked'), ti: it.getAttribute('tabindex'), dis: it.getAttribute('aria-disabled') },
      rect: R(it), cs: C(it, KEYS), inline: (it.getAttribute('style')||'').slice(0,120),
      spans: Array.from(it.querySelectorAll('span')).map(sp => ({ txt:(sp.textContent||'').trim(), rect:R(sp), cs:C(sp, ['color','fontSize','lineHeight','fontWeight','display','flexDirection','justifyContent','alignItems','gap','width','height','textAlign','backgroundColor']), inline:(sp.getAttribute('style')||'').slice(0,120) })) }));
  }
  return JSON.stringify(out);
})()""" % json.dumps(KEYS)

JS_DUR = """(() => {
  const dt = Array.from(document.querySelectorAll('[data-form-kit-setting-button]')).find(b => b.getAttribute('aria-label') === '길이');
  if (dt) dt.click();
  return JSON.stringify({});
})()"""

READ_DUR = """(() => {
  const C = (el, ks) => { const s = getComputedStyle(el); const o = {}; for (const k of ks) o[k] = s[k]; return o; };
  const R = el => { const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}; };
  const KEYS = %s;
  const out = {};
  const d = document.querySelector('[role="dialog"][data-state="open"]');
  if (d) {
    out.dialog = { rect: R(d), cs: C(d, KEYS), attrs: { state: d.getAttribute('data-state'), ti: d.getAttribute('tabindex'), role: d.getAttribute('role'), side: d.getAttribute('data-side'), align: d.getAttribute('data-align') }, inline: (d.getAttribute('style')||'').slice(0,120) };
    const wrap = d.parentElement;
    out.wrap = wrap ? { tag: wrap.tagName, pos: C(wrap, KEYS).position, z: C(wrap, KEYS).zIndex, inline: (wrap.getAttribute('style')||'').slice(0,120) } : null;
    out.kids = Array.from(d.querySelectorAll('*')).slice(0, 30).map(k => ({ tag: k.tagName, txt:(k.textContent||'').trim().replace(/\\s+/g,' ').slice(0,20),
      rect: R(k), cs: C(k, KEYS), inline: (k.getAttribute('style')||'').slice(0,140),
      cls: (k.className||'').toString().slice(0,90),
      aria: { role: k.getAttribute('role'), now: k.getAttribute('aria-valuenow'), min: k.getAttribute('aria-valuemin'), max: k.getAttribute('aria-valuemax'), vt: k.getAttribute('aria-valuetext'), ti: k.getAttribute('tabindex'), ori: k.getAttribute('aria-orientation') } }));
  }
  return JSON.stringify(out);
})()""" % json.dumps(KEYS)

async def main():
    ver = json.loads(urllib.request.urlopen(HF_EP + "/json/version", timeout=10).read().decode())
    out = {"url": HF_URL}
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        a = await send(ws, "Target.attachToTarget", {"targetId": t["targetId"], "flatten": True})
        sid = a["sessionId"]
        await send(ws, "Page.enable", {}, sid)
        await send(ws, "Runtime.enable", {}, sid)
        await send(ws, "Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, sid)
        await send(ws, "Page.navigate", {"url": HF_URL}, sid)
        await asyncio.sleep(4)
        for _ in range(20):
            r = await send(ws, "Runtime.evaluate", {"expression": JS_INV, "returnByValue": True}, sid)
            v = json.loads(r["result"]["value"])
            if v.get("비율") and v.get("길이"): break
            await asyncio.sleep(1)
        out["inventory"] = v
        # 비율 메뉴
        await send(ws, "Runtime.evaluate", {"expression": JS_MENU, "returnByValue": True}, sid)
        await asyncio.sleep(0.8)
        r = await send(ws, "Runtime.evaluate", {"expression": READ_MENU, "returnByValue": True}, sid)
        out["ratio_menu"] = json.loads(r["result"]["value"])
        # 닫기(바깥 클릭) 후 길이 다이얼
        await send(ws, "Runtime.evaluate", {"expression": """(() => { const ev = new PointerEvent('pointerdown', {bubbles:true}); document.body.dispatchEvent(ev); return 1; })()""", "returnByValue": True}, sid)
        await asyncio.sleep(0.5)
        await send(ws, "Runtime.evaluate", {"expression": JS_DUR, "returnByValue": True}, sid)
        await asyncio.sleep(0.8)
        r = await send(ws, "Runtime.evaluate", {"expression": READ_DUR, "returnByValue": True}, sid)
        out["dur_dialog"] = json.loads(r["result"]["value"])
        await send(ws, "Target.closeTarget", {"targetId": t["targetId"]})
    json.dump(out, open("hf_settings_probe4.json", "w"), ensure_ascii=False, indent=1)
    inv = out["inventory"]
    for lab in ("비율", "길이"):
        d = inv.get(lab, {})
        print(lab, "rect", d.get("rect"), "attrs", d.get("attrs"))
        for sp in d.get("inner", [])[:4]:
            print("   span", repr(sp["txt"]), sp["rect"], sp["cs"]["color"], sp["cs"]["fontSize"], sp["cs"]["lineHeight"], sp["cs"]["fontWeight"], sp["inline"][:70])
    rm = out["ratio_menu"]
    print("MENU", rm.get("menu", {}).get("rect"), rm.get("wrap"))
    for it in rm.get("items", [])[:8]:
        print(" item", repr(it["txt"]), it["rect"], it["attrs"], it["cs"]["backgroundColor"], it["cs"]["borderRadius"], it["cs"]["padding"], "spans:", [(s["txt"], s["cs"]["color"], s["cs"]["fontSize"]) for s in it["spans"]][:4], it["inline"][:60])
    dd = out["dur_dialog"]
    print("DIALOG", dd.get("dialog", {}).get("rect"), dd.get("dialog", {}).get("attrs"), "z/cs:", dd["dialog"]["cs"]["zIndex"], dd["dialog"]["cs"]["backgroundColor"], dd["dialog"]["cs"]["transitionDuration"], dd.get("wrap"))
    for k in dd.get("kids", [])[:26]:
        print(k["tag"], repr(k["txt"][:16]), k["rect"], "| bg", k["cs"]["backgroundColor"][:22], "| rad", k["cs"]["borderRadius"], "| ovf", k["cs"]["overflow"], k["cs"].get("overflowClipMargin"), "| tr", k["cs"]["transitionDuration"], k["cs"]["transitionTimingFunction"][:26], "|", k["inline"][:80], "|", {kk:vv for kk,vv in k["aria"].items() if vv})
    print("saved hf_settings_probe4.json")

asyncio.run(main())
