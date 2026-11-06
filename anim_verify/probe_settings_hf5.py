#!/usr/bin/env python3
"""t_594cd9af — HF live 심층 프로브 v5 (라이브 실측만).

확보 대상(CSS 실배선·게이트 판정 필요 literals):
 1) 비율 메뉴: popper wrapper inline/z, menu 전체 자식 트리(상단 밴드 정체 포함), 항목 타이포(fs/lh/fw)
 2) 품질(해상도) 트리거 클릭 → 메뉴 존재 여부(게스트 세션 resolution toggle 판정)
 3) 길이: slider 포커스 링 full boxShadow 문자열, 열림 래퍼 inline(fixed 좌표)
 4) final sweep 재확인(고급/네거티브/시드 부재 근거)
"""
import asyncio, json, time, urllib.request
import websockets

HF_EP = "http://127.0.0.1:9222"
HF_URL = "https://higgsfield.ai/ko/ai/video?model=minimax_h3"

_msg = 0

async def send(ws, method, params=None, session=None):
    global _msg
    _msg += 1
    mid = _msg
    m = {"id": mid, "method": method, "params": params or {}}
    if session:
        m["sessionId"] = session
    await ws.send(json.dumps(m))
    while True:
        raw = await asyncio.wait_for(ws.recv(), timeout=30)
        d = json.loads(raw)
        if d.get("id") == mid:
            if "error" in d:
                raise RuntimeError(f"{method} -> {d['error']}")
            return d.get("result", {})

def http_json(ep, path):
    with urllib.request.urlopen(ep + path, timeout=10) as r:
        return json.loads(r.read().decode())

RECT_CS = r"""
  const rect = el => { const r = el.getBoundingClientRect();
    return {x:+r.x.toFixed(2), y:+r.y.toFixed(2), w:+r.width.toFixed(2), h:+r.height.toFixed(2)}; };
  const cs = el => { const s = getComputedStyle(el); return {
    color: s.color, fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight,
    backgroundColor: s.backgroundColor, borderRadius: s.borderRadius, boxShadow: s.boxShadow,
    opacity: s.opacity, transform: s.transform, cursor: s.cursor, textAlign: s.textAlign,
    justifyContent: s.justifyContent, alignItems: s.alignItems, flexDirection: s.flexDirection,
    padding: s.padding, gap: s.gap, display: s.display, position: s.position, zIndex: s.zIndex,
    backdropFilter: s.backdropFilter }; };
  const attrs = el => { const o = {};
    for (const a of ['data-state','aria-expanded','aria-haspopup','aria-disabled','tabindex','aria-label','data-disabled','aria-checked','role','data-side','data-align','aria-orientation','aria-valuenow','aria-valuemin','aria-valuemax','aria-valuetext']) { const v = el.getAttribute(a); if (v !== null) o[a] = v; }
    return o; };
  const inline = el => el.getAttribute('style') || '';
"""

MENU_FULL_JS = "(() => {" + RECT_CS + r"""
  const pops = Array.from(document.querySelectorAll('[role="menu"],[data-state="open"][role="menu"]'))
    .filter(e => { const r=e.getBoundingClientRect(); return r.width>1&&r.height>1; });
  const out = pops.map(p => ({
    attrs: attrs(p), cs: cs(p), rect: rect(p), inline: inline(p),
    children: Array.from(p.children).map(c => ({tag:c.tagName, txt:(c.textContent||'').trim().replace(/\s+/g,' ').slice(0,40),
      attrs: attrs(c), cs: cs(c), rect: rect(c), inline: inline(c),
      kids: Array.from(c.children).map(k => ({tag:k.tagName, txt:(k.textContent||'').trim().slice(0,30), cs:cs(k), rect:rect(k)}))}))
  }));
  // popper wrapper: menu의 부모
  const wrap = pops.length ? pops[0].parentElement : null;
  return JSON.stringify({pops: out,
    wrap: wrap ? {tag: wrap.tagName, attrs: attrs(wrap), cs: cs(wrap), rect: rect(wrap), inline: inline(wrap)} : null});
})()"""

QUAL_CLICK_JS = "(() => {" + RECT_CS + r"""
  const t = Array.from(document.querySelectorAll('[data-form-kit-setting-button],[aria-haspopup]'))
    .filter(b => (b.getAttribute('aria-label')||'') === '품질');
  return JSON.stringify({qual: t.map(e => ({txt:(e.textContent||'').trim().replace(/\s+/g,' '), attrs:attrs(e), cs:cs(e), rect:rect(e)}))});
})()"""

SLIDER_FOCUS_JS = "(() => {" + RECT_CS + r"""
  const s = document.querySelector('[role="dialog"][data-state="open"] [role="slider"]');
  if (!s) return JSON.stringify({slider:null});
  return JSON.stringify({slider: {attrs: attrs(s), cs: cs(s), rect: rect(s), inline: inline(s), focus: document.activeElement === s}});
})()"""

async def click_at(ws, sid, x, y):
    await send(ws, "Input.dispatchMouseEvent",
               {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1}, sid)
    await send(ws, "Input.dispatchMouseEvent",
               {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1}, sid)

async def key(ws, sid, k, vk):
    await send(ws, "Input.dispatchKeyEvent",
               {"type": "keyDown", "key": k, "code": k, "windowsVirtualKeyCode": vk,
                "nativeVirtualKeyCode": vk}, sid)
    await send(ws, "Input.dispatchKeyEvent",
               {"type": "keyUp", "key": k, "code": k, "windowsVirtualKeyCode": vk,
                "nativeVirtualKeyCode": vk}, sid)

def center(rect):
    return rect["x"] + rect["w"] / 2.0, rect["y"] + rect["h"] / 2.0

async def snap(ws, sid, js):
    r = await send(ws, "Runtime.evaluate", {"expression": js, "returnByValue": True}, sid)
    if "exceptionDetails" in r:
        ed = r["exceptionDetails"]
        raise RuntimeError(f"JS exception: {ed.get('text')} | {json.dumps(ed.get('exception',{}))[:200]} | EXPR: {js[:120]}")
    res = r.get("result", {})
    if "value" not in res:
        return None
    v = res["value"]
    return json.loads(v) if isinstance(v, str) else v

async def main():
    ver = http_json(HF_EP, "/json/version")
    out = {"url": HF_URL}
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        target = t["targetId"]
        a = await send(ws, "Target.attachToTarget", {"targetId": target, "flatten": True})
        sid = a["sessionId"]
        await send(ws, "Page.enable", {}, sid)
        await send(ws, "Runtime.enable", {}, sid)
        await send(ws, "Emulation.setDeviceMetricsOverride",
                   {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, sid)
        await send(ws, "Page.navigate", {"url": HF_URL}, sid)
        await asyncio.sleep(2)
        for _ in range(6):
            c = await snap(ws, sid, """(()=>{const ds=document.querySelectorAll('[role="dialog"]');return ds.length})()""")
            if not c: break
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.4)
        # mount wait: 품질 트리거 존재
        q = {"qual": []}
        for _ in range(40):
            qq = await snap(ws, sid, QUAL_CLICK_JS)
            m = await snap(ws, sid, """document.querySelectorAll('main *').length""")
            if qq and qq.get("qual") and m and int(m) > 150:
                q = qq
                break
            await asyncio.sleep(0.5)
        out["qual_triggers"] = q

        # ===== 비율 메뉴 전체 =====
        rat = await snap(ws, sid, """(() => {
          const R = el => { const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}; };
          const t = Array.from(document.querySelectorAll('[aria-haspopup="menu"]'))
            .filter(b => (b.getAttribute('aria-label')||'') === '비율');
          return JSON.stringify(t.map(e => ({rect: R(e), txt:(e.textContent||'').trim(), attrs:{'aria-expanded':e.getAttribute('aria-expanded'), 'data-state': e.getAttribute('data-state')}})));})()""")

        if rat:
            x, y = center(rat[0]["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(1.0)
            out["ratio_full"] = await snap(ws, sid, MENU_FULL_JS)
            # 항목 타이포: 첫 항목 내부 텍스트 노드까지
            out["ratio_item_probe"] = await snap(ws, sid, """(() => {
              const it = document.querySelector('[role="menu"] [role="menuitemcheckbox"]');
              if (!it) return null;
              const rect = el => { const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}; };
              return JSON.stringify({outer:{rect:rect(it),cs:{fontSize:getComputedStyle(it).fontSize,lineHeight:getComputedStyle(it).lineHeight,fontWeight:getComputedStyle(it).fontWeight,padding:getComputedStyle(it).padding,gap:getComputedStyle(it).gap,justifyContent:getComputedStyle(it).justifyContent,alignItems:getComputedStyle(it).alignItems}},
                kids: Array.from(it.children).map(c => ({tag:c.tagName, txt:(c.textContent||'').trim(), rect: rect(c), cs:{fontSize:getComputedStyle(c).fontSize,lineHeight:getComputedStyle(c).lineHeight,fontWeight:getComputedStyle(c).fontWeight,color:getComputedStyle(c).color,backgroundColor:getComputedStyle(c).backgroundColor,borderRadius:getComputedStyle(c).borderRadius}}))});})()""")
            # 항목 '21:9' hover 상태 확인(포인터 올리고 bg 변화)
            rf = out.get("ratio_full") or {}
            items = (rf.get("pops") or [{}])[0].get("children") or []
            for it in items:
                if it["txt"] == "21:9":
                    x2, y2 = center(it["rect"])
                    await send(ws, "Input.dispatchMouseEvent",
                               {"type": "mouseMoved", "x": x2, "y": y2}, sid)
                    await asyncio.sleep(0.5)
                    out["hover_219"] = await snap(ws, sid, """(() => {
                      const els = Array.from(document.querySelectorAll('[role="menuitemcheckbox"]'));
                      return JSON.stringify(els.map(e => ({txt:(e.textContent||'').trim(), bg: getComputedStyle(e).backgroundColor, sh: getComputedStyle(e).boxShadow})));})()""")
                    break
            # Escape
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.5)
            out["ratio_after_esc"] = await snap(ws, sid, """document.querySelectorAll('[role="menu"][data-state="open"]').length""")

        # ===== 품질 클릭 =====
        if q["qual"]:
            x, y = center(q["qual"][0]["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(1.0)
            out["qual_after_click"] = await snap(ws, sid, """(() => {
              const pops = Array.from(document.querySelectorAll('[role="menu"],[role="listbox"],[role="dialog"][data-state="open"],[data-state="open"]'))
                .filter(e => { const r=e.getBoundingClientRect(); return r.width>1&&r.height>1; });
              return JSON.stringify(pops.map(p => ({role:p.getAttribute('role'), txt:(p.textContent||'').trim().replace(/\s+/g,' ').slice(0,120), n: p.querySelectorAll('*').length,
                items: Array.from(p.querySelectorAll('[role="menuitemradio"],[role="menuitemcheckbox"],[role="option"],button')).map(o => ({txt:(o.textContent||'').trim().replace(/\s+/g,' ').slice(0,30), attrs:{'aria-checked':o.getAttribute('aria-checked'),'aria-disabled':o.getAttribute('aria-disabled'),role:o.getAttribute('role'),tabindex:o.getAttribute('tabindex')}}))})));})()""")

            out["qual_trig_after"] = await snap(ws, sid, QUAL_CLICK_JS)
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.4)

        # ===== 길이 열림 + 포커스 링 =====
        dur = await snap(ws, sid, """(() => {
          const R = el => { const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}; };
          const t = Array.from(document.querySelectorAll('[aria-haspopup="dialog"]'))
            .filter(b => (b.getAttribute('aria-label')||'') === '길이');
          return JSON.stringify(t.map(e => ({rect: R(e), txt:(e.textContent||'').trim(), attrs:{'aria-expanded':e.getAttribute('aria-expanded'), 'data-state': e.getAttribute('data-state')}})));})()""")

        if dur:
            x, y = center(dur[0]["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(1.0)
            out["dur_open_wrap"] = await snap(ws, sid, """(() => {
              const R = el => { const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}; };
              const d = document.querySelector('[role="dialog"][data-state="open"]');
              if (!d) return null;
              const w = d.parentElement;
              return JSON.stringify({wrap:{tag:w.tagName,pos:getComputedStyle(w).position,z:getComputedStyle(w).zIndex,inline:w.getAttribute('style')||'',rect:R(w)}, drect:R(d)});})()""")

            # slider 클릭(60px 오프셋 재현 아님 — 그냥 중앙 클릭 후 링 확인)
            sl = await snap(ws, sid, SLIDER_FOCUS_JS)
            if sl and sl.get("slider"):
                x2, y2 = center(sl["slider"]["rect"])
                await click_at(ws, sid, x2, y2)
                await asyncio.sleep(0.6)
                out["dur_after_sliderclick"] = await snap(ws, sid, SLIDER_FOCUS_JS)
                await key(ws, sid, "ArrowRight", 39)
                await asyncio.sleep(0.5)
                out["dur_kb_focus"] = await snap(ws, sid, SLIDER_FOCUS_JS)
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.4)

        out["final_sweep"] = await snap(ws, sid, """(()=>{
          const t=document.body.innerText||'';
          const kw={};
          for(const k of ['고급','프롬프트 확장','번역','네거티브','시드','1080p','720p','해상도'])
            kw[k]=t.includes(k);
          return JSON.stringify(kw)})()""")
        await send(ws, "Target.closeTarget", {"targetId": target})
    with open("/home/baramofme/open-higgsfield/.worktrees/t_594cd9af/anim_verify/hf_settings_probe5.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("WROTE probe5")

if __name__ == "__main__":
    asyncio.run(main())
