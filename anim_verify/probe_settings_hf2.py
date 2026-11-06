#!/usr/bin/env python3
"""t_594cd9af — HF live 심층 프로브 v2 (라이브 실측만, fabrication 금지).

확보 대상:
 1) 모델 트리거 토글 기계: open→닫힘(재클릭 toggle)·Escape·카드 선택 시
    value 반영(트리거 텍스트)·패널 닫힘·카드 내부 resolution badge·disabled 상태
 2) 길이 다이얼: 펼침 구조(슬라이더/틱), 값 선택 반영, 닫힘(Escape/outside)
 3) 비율 메뉴: 옵션 리스트(라이브 실측만)·선택 반영·닫힘
 4) resolution/advanced/negative/seed/translate sweep: 펼침 후 텍스트 재탐사
    (auth-gate 판정 근거)
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

def attr_js():
    attrs = ['data-state','aria-expanded','aria-haspopup','aria-disabled','tabindex','aria-label',
             'data-disabled','aria-pressed','data-active','data-value','aria-checked','role',
             'data-model-select-trigger','data-form-kit-setting-button','data-render','data-orientation']
    return attrs

RECT_CS = r"""
  const rect = el => { const r = el.getBoundingClientRect();
    return {x:+r.x.toFixed(2), y:+r.y.toFixed(2), w:+r.width.toFixed(2), h:+r.height.toFixed(2)}; };
  const cs = el => { const s = getComputedStyle(el); return {
    color: s.color, backgroundColor: s.backgroundColor, borderRadius: s.borderRadius,
    boxShadow: s.boxShadow, opacity: s.opacity, transform: s.transform, cursor: s.cursor,
    pointerEvents: s.pointerEvents, transitionProperty: s.transitionProperty,
    transitionDuration: s.transitionDuration, transitionTimingFunction: s.transitionTimingFunction,
    display: s.display, position: s.position }; };
  const attrs = el => { const o = {};
    for (const a of %s) { const v = el.getAttribute(a); if (v !== null) o[a] = v; }
    return o; };
""" % ("[" + ", ".join("'%s'" % a for a in attr_js()) + "]")

MODEL_PANEL_JS = "(() => {" + RECT_CS + r"""

  const dlg = document.querySelector('[role="dialog"][data-state="open"]');
  if (!dlg) return JSON.stringify({dlg:null});
  // 카드(모델 항목) 수확: dialog 안의 clickable 카드성 노드
  const cards = Array.from(dlg.querySelectorAll('button,[role="option"],[role="radio"],[role="menuitemradio"],a,[data-disabled]'))
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 20; });
  const inner = Array.from(dlg.querySelectorAll('*')).map(e => (e.textContent||'').trim()).filter(t => t.length > 2 && t.length < 80);
  const uniq = [...new Set(inner)];
  const badges = Array.from(dlg.querySelectorAll('span,p,div'))
    .filter(e => { const t=(e.textContent||'').trim(); return /^(1080p|720p|4K|480p|2K|1080p\/720p|상단)$/i.test(t) && e.children.length===0; })
    .map(e => ({txt:(e.textContent||'').trim(), tag:e.tagName, attrs:attrs(e), cs:cs(e), rect:rect(e)}));
  return JSON.stringify({
    dlg: {role:dlg.getAttribute('role'), attrs:attrs(dlg), cs:cs(dlg), rect:rect(dlg),
          childN: dlg.querySelectorAll('*').length},
    cards: cards.slice(0,40).map(c => ({tag:c.tagName, txt:(c.textContent||'').trim().replace(/\s+/g,' ').slice(0,60),
      attrs:attrs(c), cs:cs(c), rect:rect(c)})),
    badges: badges.slice(0,40),
    dlgText: uniq.slice(0,80)
  });
})()"""

DUR_PANEL_JS = "(() => {" + RECT_CS + r"""

  const d = document.querySelector('[role="dialog"][data-state="open"]');
  if (!d) return JSON.stringify({d:null});
  const kids = Array.from(d.querySelectorAll('*')).map(e => ({tag:e.tagName,
    txt:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,50), attrs:attrs(e), cs:cs(e), rect:rect(e)}))
    .filter(k => k.rect.w > 0.5);
  const inputs = Array.from(d.querySelectorAll('input,[role="slider"],input[type="range"],[aria-valuenow]'))
    .map(e => ({tag:e.tagName, type:e.getAttribute('type'), attrs:attrs(e),
      val:e.value, min:e.min, max:e.max, step:e.step, cs:cs(e), rect:rect(e)}));
  return JSON.stringify({d:{attrs:attrs(d), cs:cs(d), rect:rect(d)}, kids:kids.slice(0,30), inputs:inputs});
})()"""

MENU_JS = "(() => {" + RECT_CS + r"""

  const pops = Array.from(document.querySelectorAll('[role="menu"],[role="listbox"],[data-state="open"][role="dialog"],[data-state="open"][role="menu"],[data-side],[data-align]'))
    .filter(e => { const r=e.getBoundingClientRect(); return r.width>1&&r.height>1; });
  const popsOut = pops.map(p => ({role:p.getAttribute('role'), attrs:attrs(p), cs:cs(p), rect:rect(p),
    items: Array.from(p.querySelectorAll('[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"],[role="option"],button'))
      .slice(0,30).map(o => ({tag:o.tagName, txt:(o.textContent||'').trim().replace(/\s+/g,' ').slice(0,40),
        attrs:attrs(o), cs:cs(o), rect:rect(o)}))}));
  return JSON.stringify({pops: popsOut});
})()"""

BTN_STATE_JS = "(() => {" + RECT_CS + r"""

  const ts = Array.from(document.querySelectorAll('[data-form-kit-setting-button],[data-model-select-trigger],[aria-haspopup]'))
    .filter(b => (b.textContent||'').trim().length>1)
    .map(t => ({txt:(t.textContent||'').trim().replace(/\s+/g,' ').slice(0,40), attrs:attrs(t), cs:cs(t), rect:rect(t)}));
  return JSON.stringify({triggers: ts});
})()"""

async def wait_mount(ws, sid, secs=30):
    t0 = time.time()
    while time.time() - t0 < secs:
        r = await send(ws, "Runtime.evaluate", {"expression": BTN_STATE_JS, "returnByValue": True}, sid)
        v = json.loads(r["result"]["value"])
        m = await send(ws, "Runtime.evaluate", {"expression": "!!document.querySelector('[contenteditable=\"true\"]') && document.querySelectorAll('main *').length", "returnByValue": True}, sid)
        if v["triggers"] and m["result"]["value"] and int(m["result"]["value"]) > 150:
            await asyncio.sleep(0.8)
            return v
        await asyncio.sleep(0.5)
    raise RuntimeError("create surface never mounted")

async def snap(ws, sid, js):
    r = await send(ws, "Runtime.evaluate", {"expression": js, "returnByValue": True}, sid)
    v = r["result"]["value"]
    if isinstance(v, str):
        return json.loads(v)
    return v

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

async def dismiss_dialogs(ws, sid):
    for _ in range(6):
        c = await snap(ws, sid, r"""(()=>{const ds=document.querySelectorAll('[role="dialog"]');return JSON.stringify(ds.length)})()""")
        if c == 0: return
        await key(ws, sid, "Escape", 27)
        await asyncio.sleep(0.5)

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
        await dismiss_dialogs(ws, sid)
        p0 = await wait_mount(ws, sid)
        out["p0"] = p0

        # ===== 모델 트리거 토글 =====
        mt = [t for t in p0["triggers"] if t["attrs"].get("data-model-select-trigger") == "true"]
        if not mt: mt = [t for t in p0["triggers"] if t["attrs"].get("aria-label") == "모델"]
        x, y = center(mt[0]["rect"])
        await click_at(ws, sid, x, y)
        await asyncio.sleep(1.0)
        out["m_open"] = await snap(ws, sid, MODEL_PANEL_JS)
        out["m_open_triggers"] = await snap(ws, sid, BTN_STATE_JS)
        # 카드 선택(라이브 리스트 첫 유효 카드 — 현재와 다른 모델)
        cards = out["m_open"].get("cards") or []
        card = None
        for c in cards:
            if c["rect"]["w"] > 40 and not c["attrs"].get("data-disabled") and c["attrs"].get("aria-disabled") != "true":
                if c["txt"] and "MiniMax" not in c["txt"] and "Higgsfield 검색" not in c["txt"]:
                    card = c; break
        if card:
            print("CARD PICK:", card["txt"][:60], card["tag"])
            cx, cy = center(card["rect"])
            await click_at(ws, sid, cx, cy)
            await asyncio.sleep(1.2)
            out["m_after_card"] = await snap(ws, sid, MODEL_PANEL_JS)
            out["m_after_card_triggers"] = await snap(ws, sid, BTN_STATE_JS)
        else:
            out["m_after_card"] = None; print("NO CARD PICK (cards:", len(cards), ")")
        # 토글 닫힘: 재클릭(열려 있으면) 또는 Escape(열려 있으면)
        op = await snap(ws, sid, r"""(()=>{const d=document.querySelector('[role="dialog"][data-state="open"]');return d?1:0})()""")
        out["open_after_card"] = op
        if op:
            pre = await snap(ws, sid, BTN_STATE_JS)
            mm = [t for t in pre["triggers"] if t["attrs"].get("data-model-select-trigger") == "true"] or [t for t in pre["triggers"] if t["attrs"].get("aria-label") == "모델"]
            x, y = center(mm[0]["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(0.8)
            out["m_reclick"] = await snap(ws, sid, r"""(()=>JSON.stringify(document.querySelectorAll('[role="dialog"][data-state="open"]').length))()""")
            # 다시 열고 Escape 테스트
            await click_at(ws, sid, x, y)
            await asyncio.sleep(0.8)
            out["m_reopen2"] = await snap(ws, sid, MODEL_PANEL_JS)
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.8)
            out["m_after_esc2"] = await snap(ws, sid, r"""(()=>JSON.stringify(document.querySelectorAll('[role="dialog"][data-state="open"]').length))()""")

        # ===== 길이 =====
        dur = [t for t in (await snap(ws, sid, BTN_STATE_JS))["triggers"] if t["attrs"].get("aria-label") == "길이"]
        x, y = center(dur[0]["rect"])
        await click_at(ws, sid, x, y)
        await asyncio.sleep(1.0)
        out["d_open"] = await snap(ws, sid, DUR_PANEL_JS)
        out["d_open_triggers"] = await snap(ws, sid, BTN_STATE_JS)
        # 값 선택: 슬라이더 틱/버튼(라이브 구조대로)
        kids = out["d_open"].get("kids") or []
        pick = None
        for k in kids:
            if k["tag"] in ("BUTTON", "DIV", "SPAN") and k["rect"]["w"] > 12 and k["rect"]["h"] > 12 \
               and k["attrs"].get("aria-disabled") != "true" and not k["attrs"].get("data-disabled"):
                if "s" in k["txt"] or k["tag"] == "BUTTON":
                    pick = k; break
        if pick and out["d_open"].get("inputs"):
            # range 있으면 값 세팅(실측 min/max 안에서)
            pass
        if pick:
            px, py = center(pick["rect"])
            await click_at(ws, sid, px, py)
            await asyncio.sleep(1.0)
            out["d_after_pick"] = await snap(ws, sid, BTN_STATE_JS)
            out["d_after_pick_panel"] = await snap(ws, sid, DUR_PANEL_JS)
        # Escape 닫힘
        await key(ws, sid, "Escape", 27)
        await asyncio.sleep(0.6)
        out["d_after_esc"] = await snap(ws, sid, BTN_STATE_JS)

        # ===== 비율 =====
        rat = [t for t in (await snap(ws, sid, BTN_STATE_JS))["triggers"] if t["attrs"].get("aria-label") == "비율"]
        if rat:
            x, y = center(rat[0]["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(1.0)
            out["r_open"] = await snap(ws, sid, MENU_JS)
            out["r_open_triggers"] = await snap(ws, sid, BTN_STATE_JS)
            items = []
            for p in out["r_open"]["pops"]:
                items.extend(p["items"])
            # 첫 유효 항목(현재와 다른 값)
            pick2 = None
            for o in items:
                if o["rect"]["w"] > 10 and o["txt"] and o["attrs"].get("aria-disabled") != "true" \
                   and not o["attrs"].get("data-disabled") and o["txt"] != "자동":
                    pick2 = o; break
            if pick2:
                px, py = center(pick2["rect"])
                await click_at(ws, sid, px, py)
                await asyncio.sleep(1.0)
                out["r_after_pick"] = await snap(ws, sid, BTN_STATE_JS)
                out["r_after_pick_menu"] = await snap(ws, sid, MENU_JS)
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.5)

        # ===== 최종 sweep: 펼침 후에도 부재하는 항목(auth-gate 근거) =====
        sweep = await snap(ws, sid, r"""(()=>{
          const t=document.body.innerText||'';
          const kw={};
          for(const k of ['고급','프롬프트 확장','번역','네거티브','시드','1080p','720p','해상도','advanced','prompt extend'])
            kw[k]={present:t.includes(k)};
          return JSON.stringify(kw)})()""")
        out["final_sweep"] = sweep
        await send(ws, "Target.closeTarget", {"targetId": target})
    outp = "/home/baramofme/open-higgsfield/.worktrees/t_594cd9af/anim_verify/hf_settings_probe2.json"
    with open(outp, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("WROTE", outp)

if __name__ == "__main__":
    asyncio.run(main())
