#!/usr/bin/env python3
"""t_594cd9af — HF live v3: 메트릭·키보드·외부클릭·모델 패널 disabled 상태.

모든 좌표는 매 상호작용 직전 새 스냅샷에서 재계산(전역 shift 대응·카드 고정 결정).
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

AJS = "['data-state','aria-expanded','aria-haspopup','aria-disabled','tabindex','aria-label','data-disabled','aria-pressed','data-active','data-value','aria-checked','role','aria-activedescendant','aria-valuenow','aria-valuemin','aria-valuemax','aria-valuetext','data-side','data-align','data-open','data-closed']"

BASE = """
  const rect = el => { const r = el.getBoundingClientRect();
    return {x:+r.x.toFixed(2), y:+r.y.toFixed(2), w:+r.width.toFixed(2), h:+r.height.toFixed(2)}; };
  const cs = el => { const s = getComputedStyle(el); return {
    color: s.color, backgroundColor: s.backgroundColor, borderRadius: s.borderRadius,
    boxShadow: s.boxShadow, opacity: s.opacity, transform: s.transform, cursor: s.cursor,
    fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight,
    transitionProperty: s.transitionProperty, transitionDuration: s.transitionDuration,
    transitionTimingFunction: s.transitionTimingFunction, display: s.display,
    position: s.position, padding: s.padding, gap: s.gap, flexDirection: s.flexDirection }; };
  const attrs = el => { const o = {};
    for (const a of %s) { const v = el.getAttribute(a); if (v !== null) o[a] = v; }
    return o; };
""" % AJS

TRIG = "(() => {" + BASE + r"""
  const ts = Array.from(document.querySelectorAll('[data-form-kit-setting-button],[data-model-select-trigger]'))
    .filter(b => (b.textContent||'').trim().length>1)
    .map(t => ({txt:(t.textContent||'').trim().replace(/\s+/g,' ').slice(0,40), attrs:attrs(t), cs:cs(t), rect:rect(t)}));
  return JSON.stringify({triggers: ts});
})()"""

MODEL = "(() => {" + BASE + r"""
  const d = document.querySelector('[role="dialog"][data-state="open"]');
  if (!d) return JSON.stringify({d:null});
  const cards = Array.from(d.querySelectorAll('button,[role="option"],[role="radio"],[data-disabled],[aria-disabled]'))
    .map(c => ({tag:c.tagName, txt:(c.textContent||'').trim().replace(/\s+/g,' ').slice(0,50),
      attrs:attrs(c), rect:rect(c), dis:c.getAttribute('aria-disabled'), ddis:c.getAttribute('data-disabled'),
      cursor:c.getAttribute('style')?null:getComputedStyle(c).cursor, cs:cs(c)}))
    .filter(c => c.rect.w>10);
  const resBadges = Array.from(d.querySelectorAll('*'))
    .filter(e => e.children.length===0 && /^(1080p|720p|4K|480p|2K)$/i.test((e.textContent||'').trim()))
    .map(e => ({txt:(e.textContent||'').trim(), tag:e.tagName, attrs:attrs(e), cs:cs(e), rect:rect(e)}));
  const dres = Array.from(d.querySelectorAll('*'))
    .filter(e => /1080p|720p/.test(e.textContent||'')).slice(0,30)
    .map(e => ({tag:e.tagName, txt:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,60), attrs:attrs(e), rect:rect(e)}));
  return JSON.stringify({d:{attrs:attrs(d), cs:cs(d), rect:rect(d), childN:d.querySelectorAll('*').length},
    cards:cards.slice(0,40), resBadges:resBadges.slice(0,40), dres:dres});
})()"""

DURMET = "(() => {" + BASE + r"""
  const d = document.querySelector('[role="dialog"][data-state="open"]');
  if (!d) return JSON.stringify({d:null});
  const grab = sel => { const e = d.querySelector(sel); return e ? {attrs:attrs(e), cs:cs(e), rect:rect(e)} : null; };
  const sps = Array.from(d.querySelectorAll('span')).map(s => ({txt:(s.textContent||'').trim().slice(0,16),
    cs:{fontSize:s.parentElement?getComputedStyle(s).fontSize:getComputedStyle(s).fontSize,
        lineHeight:getComputedStyle(s).lineHeight, fontWeight:getComputedStyle(s).fontWeight,
        color:getComputedStyle(s).color}, rect:rect(s)})).filter(s=>s.rect.w>0.5);
  const sl = d.querySelector('[role="slider"]');
  return JSON.stringify({d:{attrs:attrs(d), cs:cs(d), rect:rect(d)}, slider: sl?{attrs:attrs(sl), cs:cs(sl), rect:rect(sl)}:null, spans:sps});
})()"""

MENU = "(() => {" + BASE + r"""
  const ms = Array.from(document.querySelectorAll('[role="menu"][data-state="open"],[role="menu"]'))
    .filter(e => { const r=e.getBoundingClientRect(); return r.width>10&&r.height>10; });
  return JSON.stringify({menus: ms.map(m => ({attrs:attrs(m), cs:cs(m), rect:rect(m),
    items: Array.from(m.querySelectorAll('[role="menuitemcheckbox"],[role="menuitemradio"],[role="menuitem"]'))
      .map(i => ({txt:(i.textContent||'').trim().slice(0,20), attrs:attrs(i), cs:cs(i), rect:rect(i)}))}))});
})()"""

OPENCOUNT = "(() => JSON.stringify(document.querySelectorAll('[role=\"dialog\"][data-state=\"open\"],[role=\"menu\"][data-state=\"open\"]').length))()"

async def snap(ws, sid, js):
    r = await send(ws, "Runtime.evaluate", {"expression": js, "returnByValue": True}, sid)
    v = r["result"]["value"]
    return json.loads(v) if isinstance(v, str) else v

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

def find(ts, label):
    for t in ts:
        if t["attrs"].get("aria-label") == label:
            return t
    return None

async def main():
    ver = http_json(HF_EP, "/json/version")
    bws = ver["webSocketDebuggerUrl"]
    out = {"url": HF_URL}
    async with websockets.connect(bws, max_size=8_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        target = t["targetId"]
        a = await send(ws, "Target.attachToTarget", {"targetId": target, "flatten": True})
        sid = a["sessionId"]
        await send(ws, "Page.enable", {}, sid)
        await send(ws, "Runtime.enable", {}, sid)
        await send(ws, "Emulation.setDeviceMetricsOverride",
                   {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, sid)
        await send(ws, "Network.enable", {}, sid)
        await send(ws, "Network.setCacheDisabled", {"cacheDisabled": True}, sid)
        await send(ws, "Page.navigate", {"url": HF_URL}, sid)
        await asyncio.sleep(2.0)
        for _ in range(10):
            n = await snap(ws, sid, "(() => JSON.stringify(document.querySelectorAll('[role=\"dialog\"]').length))()")
            if n == 0: break
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.5)
        # 마운트 대기
        for _ in range(30):
            s = await snap(ws, sid, TRIG)
            m = await snap(ws, sid, "(() => (document.querySelector('[contenteditable=\"true\"]')?document.querySelectorAll('main *').length:0))()")
            if s["triggers"] and m > 150:
                await asyncio.sleep(1.0)
                break
            await asyncio.sleep(0.6)
        out["p0"] = s

        # ===== 모델 패널(fresh coords) =====
        mt = find(s["triggers"], "모델")
        x, y = center(mt["rect"])
        await click_at(ws, sid, x, y)
        await asyncio.sleep(1.2)
        out["model_open"] = await snap(ws, sid, MODEL)
        mo = out["model_open"]
        if mo["d"]:
            # 카드 disabled 3종: 상태 분포
            dis_states = {}
            for c in mo["cards"]:
                key2 = (c["dis"], c["ddis"])
                dis_states[key2] = dis_states.get(key2, 0) + 1
            out["model_card_disabled_dist"] = {str(k): v for k, v in dis_states.items()}
            # Escape 후 상태
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.8)
            out["model_after_esc"] = await snap(ws, sid, OPENCOUNT)
            # 다시 열고 바깥 클릭
            pre = await snap(ws, sid, TRIG)
            mm = find(pre["triggers"], "모델")
            x, y = center(mm["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(0.8)
            out["model_reopen"] = await snap(ws, sid, OPENCOUNT)
            await click_at(ws, sid, 900, 850)   # 폼 밖 빈 곳
            await asyncio.sleep(0.8)
            out["model_after_outside"] = await snap(ws, sid, OPENCOUNT)
        # ===== 길이 메트릭 + 키보드 =====
        pre = await snap(ws, sid, TRIG)
        dur = find(pre["triggers"], "길이")
        x, y = center(dur["rect"])
        await click_at(ws, sid, x, y)
        await asyncio.sleep(0.8)
        out["dur_metrics"] = await snap(ws, sid, DURMET)
        sl = (out["dur_metrics"] or {}).get("slider")
        if sl:
            # 슬라이더 포커스 후 키보드
            await click_at(ws, sid, center(sl["rect"])[0], center(sl["rect"])[1])
            await asyncio.sleep(0.5)
            await send(ws, "Runtime.evaluate", {"expression": "(()=>{const s=document.querySelector('[role=\"dialog\"][data-state=\"open\"] [role=\"slider\"]');if(s)s.focus();})()"}, sid)
            await asyncio.sleep(0.3)
            out["dur_focus_attrs"] = await snap(ws, sid, DURMET)
            before = out["dur_focus_attrs"]["slider"]["attrs"] if out["dur_focus_attrs"] else None
            for k, vk, tag in (("ArrowRight", 39, "ar"), ("ArrowLeft", 37, "al"), ("Home", 36, "home"), ("End", 35, "end")):
                await key(ws, sid, k, vk)
                await asyncio.sleep(0.5)
                st = await snap(ws, sid, DURMET)
                out["dur_key_" + tag] = {"slider": st["slider"], "trig": (await snap(ws, sid, TRIG))["triggers"]}
        # 값 클릭 위치 정밀(실측): x = track left + 60 지점 클릭 → 값?
        out["dur_click60"] = None
        dm = out["dur_metrics"]
        if dm and dm["slider"]:
            slr = dm["slider"]["rect"]
            # track은 slider rect 안 190..432; 60px 지점
            cx = slr["x"] + 16 + 60
            await click_at(ws, sid, cx, slr["y"] + slr["h"] / 2)
            await asyncio.sleep(0.6)
            out["dur_click60"] = {"trig": (await snap(ws, sid, TRIG))["triggers"], "panel": await snap(ws, sid, DURMET)}
        # 트리거 재클릭으로 닫힘 토글 여부
        pre = await snap(ws, sid, TRIG)
        dur = find(pre["triggers"], "길이")
        if dur:
            x, y = center(dur["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(0.6)
            out["dur_reclick_open"] = await snap(ws, sid, OPENCOUNT)
            # 재오픈 후 바깥 클릭
            await click_at(ws, sid, 900, 850)
            await asyncio.sleep(0.6)
            out["dur_after_outside"] = await snap(ws, sid, OPENCOUNT)
        else:
            out["dur_reclick_open"] = None
            out["dur_after_outside"] = None
        # ===== 비율 메뉴: 키보드 진입 + 메트릭 =====
        pre = await snap(ws, sid, TRIG)
        rat = find(pre["triggers"], "비율")
        if rat:
            await send(ws, "Runtime.evaluate", {"expression": "(()=>{const b=document.querySelectorAll('[data-form-kit-setting-button]');for(const x of b){if((x.getAttribute('aria-label')||'')==='비율'){x.focus();return}}})()"}, sid)
            await asyncio.sleep(0.3)
            await key(ws, sid, "Enter", 13)
            await asyncio.sleep(0.8)
            out["rat_kb_open"] = await snap(ws, sid, MENU)
            out["rat_kb_trig"] = await snap(ws, sid, TRIG)
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.5)
            out["rat_kb_after_esc"] = await snap(ws, sid, TRIG)
        await send(ws, "Target.closeTarget", {"targetId": target})
    outp = "/home/baramofme/open-higgsfield/.worktrees/t_594cd9af/anim_verify/hf_settings_probe3.json"
    with open(outp, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("WROTE", outp)

if __name__ == "__main__":
    asyncio.run(main())
