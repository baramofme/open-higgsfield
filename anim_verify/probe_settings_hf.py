#!/usr/bin/env python3
"""t_594cd9af — HF live(:9222) 설정 컨트롤 ground-truth 프로브.

카드 고정 결정: select 옵션 리스트·값 범위 ground-truth 는 라이브에서 펼침 후
실측으로만 확보(임의 리스트 금지). 모든 판정 근거는 라이브 DOM 실측만.

단독 HF 흐름(측정 chrome :9335 미사용 — OHF 는 제 워크트리 dev 로 추후 검증):
  p0: 마운트 후 설정 영역 컨트롤 인벤토리(트리거 attr·rect·computed) +
      advanced/prompt-extend/translate/negative/seed 계열 텍스트 존재 탐사
  p1: 모델 트리거 클릭 → 펼침(오픈 패널/popover 렌더·옵션 리스트·value)
  p2: 옵션 선택 → 값 반영·패널 닫힘 여부
  p3: 재오픈 → Escape 로 닫힘
  p4: 길이(시간) 트리거 클릭 → 펼침 → 선택 → 닫힘
  p5: 품질(해상도) 트리거 클릭 → 펼침 → 선택 → 닫힘
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

INV_JS = r"""
(() => {
  const rect = el => { const r = el.getBoundingClientRect();
    return {x:+r.x.toFixed(2), y:+r.y.toFixed(2), w:+r.width.toFixed(2), h:+r.height.toFixed(2)}; };
  const cs = el => { const s = getComputedStyle(el); return {
    color: s.color, backgroundColor: s.backgroundColor, borderRadius: s.borderRadius,
    boxShadow: s.boxShadow, transitionProperty: s.transitionProperty,
    transitionDuration: s.transitionDuration, transitionTimingFunction: s.transitionTimingFunction,
    transform: s.transform, display: s.display }; };
  const attrs = el => { const o = {};
    for (const a of ['data-state','aria-expanded','aria-haspopup','aria-disabled','tabindex','aria-label','data-disabled','aria-pressed','data-active','data-value','aria-checked','role']) {
      const v = el.getAttribute(a); if (v !== null) o[a] = v; }
    return o; };
  // 설정 영역 트리거 인벤토리: 폼 안의 haspopup/state/expanded 버튼 + 모델 트리거
  const trig = Array.from(document.querySelectorAll('button, [role="combobox"], [role="button"]'))
    .filter(b => b.hasAttribute('aria-haspopup') || b.hasAttribute('data-state') || b.hasAttribute('aria-expanded') || b.hasAttribute('data-model-select-trigger'));
  const inv = trig.map(t => ({ txt:(t.textContent||'').trim().replace(/\s+/g,' ').slice(0,40),
    tag:t.tagName, attrs: attrs(t), cs: cs(t), rect: rect(t) }));
  // 토글/체크 계열
  const tg = Array.from(document.querySelectorAll('[role="switch"],[role="checkbox"],input[type="checkbox"],[aria-pressed]'))
    .map(t => ({ txt:(t.closest('label')||t).textContent.trim().replace(/\s+/g,' ').slice(0,30),
    tag:t.tagName, role:t.getAttribute('role'), attrs: attrs(t), cs: cs(t), rect: rect(t) }));
  // 관심 텍스트 존재 탐사(라이브 실재 여부만)
  const bodyTxt = document.body.innerText || '';
  const probe = {};
  for (const kw of ['고급','프롬프트 확장','번역','네거티브','시드','1080p','720p','2K','4K','해상도','길이','품질','비율','모델']) {
    probe[kw] = { present: bodyTxt.includes(kw), count: (bodyTxt.match(new RegExp(kw,'g'))||[]).length };
  }
  const mainN = document.querySelectorAll('main *').length;
  const editor = !!document.querySelector('[contenteditable="true"]');
  return JSON.stringify({ ready: document.readyState, mainN, editor, triggers: inv, toggles: tg, kw: probe });
})()
"""

OPEN_JS = r"""
(() => {
  const rect = el => { const r = el.getBoundingClientRect();
    return {x:+r.x.toFixed(2), y:+r.y.toFixed(2), w:+r.width.toFixed(2), h:+r.height.toFixed(2)}; };
  const cs = el => { const s = getComputedStyle(el); return {
    color: s.color, backgroundColor: s.backgroundColor, borderRadius: s.borderRadius,
    boxShadow: s.boxShadow, opacity: s.opacity, transform: s.transform, display: s.display,
    position: s.position, transitionProperty: s.transitionProperty,
    transitionDuration: s.transitionDuration }; };
  const attrs = el => { const o = {};
    for (const a of ['data-state','aria-expanded','aria-haspopup','aria-disabled','tabindex','aria-label','data-disabled','aria-pressed','data-active','data-value','aria-checked','role']) {
      const v = el.getAttribute(a); if (v !== null) o[a] = v; }
    return o; };
  // 펼침 직후: 폼 밖(또 폼 안)의 새 노드 — popover/dialog/menu/listbox 탐색
  const pop = Array.from(document.querySelectorAll('[data-state="open"],[role="dialog"],[role="menu"],[role="listbox"],[popover]'))
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
  const pops = pop.map(p => ({ role: p.getAttribute('role'), attrs: attrs(p), cs: cs(p), rect: rect(p),
    n: p.querySelectorAll('*').length,
    opts: Array.from(p.querySelectorAll('[role="option"],[role="menuitemradio"],[role="menuitem"],[role="radio"],button'))
      .slice(0,30).map(o => ({ txt:(o.textContent||'').trim().replace(/\s+/g,' ').slice(0,50),
        role:o.getAttribute('role'), attrs: attrs(o), cs: cs(o), rect: rect(o) })) }));
  // 트리거 상태 재실측(클릭 후 attr 변화)
  const trig = Array.from(document.querySelectorAll('[data-model-select-trigger],[data-form-kit-setting-button],[aria-haspopup]'))
    .filter(b => (b.textContent||'').trim())
    .map(t => ({ txt:(t.textContent||'').trim().replace(/\s+/g,' ').slice(0,40),
      attrs: attrs(t), cs: cs(t), rect: rect(t) }));
  return JSON.stringify({ pops: pops, triggers: trig, focusText: document.activeElement ? (document.activeElement.textContent||'').trim().slice(0,20) : null,
    dialogN: document.querySelectorAll('[role="dialog"]').length });
})()
"""

async def wait_mount(ws, sid, secs=30):
    t0 = time.time()
    while time.time() - t0 < secs:
        r = await send(ws, "Runtime.evaluate", {"expression": INV_JS, "returnByValue": True}, sid)
        v = json.loads(r["result"]["value"])
        if v["editor"] and v["mainN"] > 150:
            await asyncio.sleep(0.8)
            return v
        await asyncio.sleep(0.5)
    raise RuntimeError("create surface never mounted")

async def snap(ws, sid, js):
    r = await send(ws, "Runtime.evaluate", {"expression": js, "returnByValue": True}, sid)
    return json.loads(r["result"]["value"])

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
        await asyncio.sleep(1.5)
        # 첫 방문 welcome dialog 가 있으면 제거(하네스 선례)
        for _ in range(10):
            d = await snap(ws, sid, r"""(()=>JSON.stringify({dlg:document.querySelectorAll('[role="dialog"]').length,
              btn:(Array.from(document.querySelectorAll('[role="dialog"] button')).map(b=>(b.textContent||'').trim()).join('|')).slice(0,120)}))()""")
            if d["dlg"] == 0: break
            # 닫기 버튼 실측 후 클릭(임의 아님)
            c = await snap(ws, sid, r"""(()=>{const b=Array.from(document.querySelectorAll('[role="dialog"] button'))
              .map(b=>{const r=b.getBoundingClientRect();return{txt:(b.textContent||'').trim(),x:r.x+r.width/2,y:r.y+r.height/2}});return JSON.stringify(b)})()""")
            print("DIALOG BTNS:", json.dumps(c, ensure_ascii=False))
            if c:
                await click_at(ws, sid, c[0]["x"], c[0]["y"])
                await asyncio.sleep(0.6)
            else:
                await key(ws, sid, "Escape", 27)
                await asyncio.sleep(0.6)
        p0 = await wait_mount(ws, sid)
        out["p0_inventory"] = p0
        print("MAIN_N:", p0["mainN"], "TRIGS:", len(p0["triggers"]), "TOGGLES:", len(p0["toggles"]))
        print("KW:", json.dumps(p0["kw"], ensure_ascii=False))

        # ---- p1 모델 트리거 ----
        mt = [t for t in p0["triggers"] if t["attrs"].get("data-model-select-trigger") == "true" or t["attrs"].get("aria-label") == "모델"]
        if mt:
            x, y = center(mt[0]["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(1.2)
            out["p1_model_open"] = await snap(ws, sid, OPEN_JS)
            # p2: 첫 번째 유효 옵션 클릭(라이브 실측 옵션만 — 리스트 원문은 p1 의 pops)
            pops = out["p1_model_open"]["pops"]
            opt = None
            for p in pops:
                for o in p["opts"]:
                    if o["role"] in ("option", "menuitemradio", "radio") and o["rect"]["w"] > 1:
                        opt = o; break
                if opt: break
            if opt:
                print("MODEL OPT:", json.dumps({k: opt[k] for k in ("txt","role","attrs")}, ensure_ascii=False))
                ox, oy = center(opt["rect"])
                await click_at(ws, sid, ox, oy)
                await asyncio.sleep(1.2)
                out["p2_model_select"] = await snap(ws, sid, OPEN_JS)
            # p3: 재오픈 후 Escape
            x, y = center(mt[0]["rect"])
            # 재클릭 좌표는 새 스냅샷에서 재계산(전역 shift 대비)
            pre = await snap(ws, sid, OPEN_JS)
            mm = [t for t in pre["triggers"] if t["attrs"].get("data-model-select-trigger") == "true" or t["attrs"].get("aria-label") == "모델"]
            if mm:
                x, y = center(mm[0]["rect"])
                await click_at(ws, sid, x, y)
                await asyncio.sleep(0.8)
                out["p3a_reopen"] = await snap(ws, sid, OPEN_JS)
                await key(ws, sid, "Escape", 27)
                await asyncio.sleep(0.8)
                out["p3b_after_esc"] = await snap(ws, sid, OPEN_JS)
        # ---- p4 길이 트리거 ----
        dur = [t for t in (await snap(ws, sid, OPEN_JS))["triggers"] if t["attrs"].get("aria-label") == "길이"]
        if dur:
            x, y = center(dur[0]["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(1.2)
            out["p4_dur_open"] = await snap(ws, sid, OPEN_JS)
            opt = None
            for p in out["p4_dur_open"]["pops"]:
                for o in p["opts"]:
                    if o["rect"]["w"] > 1 and o["txt"]:
                        opt = o; break
                if opt: break
            if opt:
                ox, oy = center(opt["rect"])
                await click_at(ws, sid, ox, oy)
                await asyncio.sleep(1.0)
                out["p5_dur_select"] = await snap(ws, sid, OPEN_JS)
        # ---- p5b 품질 트리거 ----
        qual = [t for t in (await snap(ws, sid, OPEN_JS))["triggers"] if t["attrs"].get("aria-label") == "품질"]
        if qual:
            x, y = center(qual[0]["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(1.2)
            out["p6_qual_open"] = await snap(ws, sid, OPEN_JS)
            opt = None
            for p in out["p6_qual_open"]["pops"]:
                for o in p["opts"]:
                    if o["rect"]["w"] > 1 and o["txt"]:
                        opt = o; break
                if opt: break
            if opt:
                ox, oy = center(opt["rect"])
                await click_at(ws, sid, ox, oy)
                await asyncio.sleep(1.0)
                out["p7_qual_select"] = await snap(ws, sid, OPEN_JS)
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.6)
            out["p8_qual_esc"] = await snap(ws, sid, OPEN_JS)
        await send(ws, "Target.closeTarget", {"targetId": target})
    outp = "/home/baramofme/open-higgsfield/.worktrees/t_594cd9af/anim_verify/hf_settings_probe.json"
    with open(outp, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("WROTE", outp)

if __name__ == "__main__":
    asyncio.run(main())
