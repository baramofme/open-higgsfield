#!/usr/bin/env python3
"""t_594cd9af — HF 라이브 프로브 v6: 품질(해상도) 메뉴 + 길이 다이얼 현재 상태 실측.

라이브 HT 가설(실측으로만 판정): HF live 현재 fieldset = [길이|품질] 단일 행(비율 부재).
확보: 품질 메뉴 open 시 전체 구조(rect/cs/pad/gap/항목 checked/타이포), 항목 클릭 후 반영+닫힘,
재클릭 토글, Escape, 바깥 클릭; 길이 다이얼 dialog rect vs 트리거 rect(popper 오프셋 공식 검증),
포커스 링(click vs keyboard), 초기 값·미드틱/엔드틱·inline fill/thumb 좌표.
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

R_HELPER = r"""
  const R = el => { const r = el.getBoundingClientRect();
    return {x:+r.x.toFixed(2), y:+r.y.toFixed(2), w:+r.width.toFixed(2), h:+r.height.toFixed(2)}; };
  const CS = el => { const s = getComputedStyle(el); const o = {};
    for (const k of ['color','fontSize','lineHeight','fontWeight','backgroundColor','borderRadius','boxShadow','opacity','cursor','padding','gap','flexDirection','justifyContent','alignItems','display','position','zIndex','backdropFilter','transitionProperty','transitionDuration','transitionTimingFunction']) o[k] = s[k];
    return o; };
  const AT = el => { const o = {};
    for (const a of ['role','tabindex','aria-checked','aria-disabled','data-disabled','data-state','aria-expanded','aria-haspopup','aria-label','data-side','data-align','aria-orientation','aria-valuenow','aria-valuemin','aria-valuemax','aria-valuetext']) { const v = el.getAttribute(a); if (v !== null) o[a] = v; }
    return o; };
  const IN = el => el.getAttribute('style') || '';
"""

MENU_FULL = "(() => {" + R_HELPER + r"""
  const ms = Array.from(document.querySelectorAll('[role="menu"][data-state="open"],[role="menu"]'))
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
  if (!ms.length) return JSON.stringify({menus: []});
  const out = ms.map(m => {
    const wrap = m.parentElement;
    return {
      attrs: AT(m), cs: CS(m), rect: R(m), inline: IN(m),
      wrap: wrap ? {tag: wrap.tagName, attrs: AT(wrap), pos: getComputedStyle(wrap).position, z: getComputedStyle(wrap).zIndex, inline: (wrap.getAttribute('style')||'').slice(0,260), rect: R(wrap)} : null,
      children: Array.from(m.children).map(c => ({tag: c.tagName, txt: (c.textContent||'').trim().replace(/\s+/g,' ').slice(0,30),
        attrs: AT(c), cs: CS(c), rect: R(c), inline: IN(c),
        innerKids: Array.from(c.children).map(k => ({tag: k.tagName, txt: (k.textContent||'').trim().slice(0,20), rect: R(k), cs: CS(k)}))}))
    };
  });
  return JSON.stringify({menus: out});
})()"""

TRIG_RECTS = "(() => {" + R_HELPER + r"""
  const ts = Array.from(document.querySelectorAll('fieldset[style],fieldset') ).slice(-1)[0];
  const btns = Array.from(document.querySelectorAll('[aria-label="품질"],[aria-label="길이"]')).map(b => ({
    label: b.getAttribute('aria-label'), txt: (b.textContent||'').trim().replace(/\s+/g,' '),
    attrs: AT(b), cs: CS(b), rect: R(b), inner: Array.from(b.children).map(c => ({tag:c.tagName, txt:(c.textContent||'').trim().slice(0,20), rect:R(c), cs:CS(c)}) )}));
  const fs = document.querySelector('[aria-label="길이"]') ? document.querySelector('[aria-label="길이"]').closest('fieldset') : null;
  return JSON.stringify({btns, fs: fs ? {rect:R(fs), grid:getComputedStyle(fs).gridTemplateColumns, gap:getComputedStyle(fs).gap} : null});
})()"""

DUR_FULL = "(() => {" + R_HELPER + r"""
  const d = document.querySelector('[role="dialog"][data-state="open"]');
  if (!d) return JSON.stringify({d:null});
  const wrap = d.parentElement;
  const sl = d.querySelector('[role="slider"]');
  const kids = Array.from(d.querySelectorAll('*')).filter(e => R(e).w > 0.5).map(e => ({
    tag: e.tagName, txt: (e.textContent||'').trim().replace(/\s+/g,' ').slice(0,30), attrs: AT(e), rect: R(e), cs: CS(e), inline: IN(e)}));
  return JSON.stringify({
    d: {attrs: AT(d), cs: CS(d), rect: R(d), inline: IN(d)},
    wrap: wrap ? {tag: wrap.tagName, pos: getComputedStyle(wrap).position, z: getComputedStyle(wrap).zIndex, inline: (wrap.getAttribute('style')||'').slice(0,260), rect: R(wrap)} : null,
    slider: sl ? {attrs: AT(sl), cs: CS(sl), rect: R(sl), inline: IN(sl), focus: document.activeElement === sl} : null,
    kids: kids.slice(0, 20)
  });
})()"""

async def click_at(ws, sid, x, y):
    await send(ws, "Input.dispatchMouseEvent",
               {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1}, sid)
    await send(ws, "Input.dispatchMouseEvent",
               {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1}, sid)

async def key(ws, sid, k, vk):
    await send(ws, "Input.dispatchKeyEvent",
               {"type": "keyDown", "key": k, "code": k, "windowsVirtualKeyCode": vk, "nativeVirtualKeyCode": vk}, sid)
    await send(ws, "Input.dispatchKeyEvent",
               {"type": "keyUp", "key": k, "code": k, "windowsVirtualKeyCode": vk, "nativeVirtualKeyCode": vk}, sid)

def center(rect):
    return rect["x"] + rect["w"] / 2.0, rect["y"] + rect["h"] / 2.0

async def snap(ws, sid, js):
    r = await send(ws, "Runtime.evaluate", {"expression": js, "returnByValue": True}, sid)
    if "exceptionDetails" in r:
        raise RuntimeError(f"JS exception: {r['exceptionDetails']} EXPR: {js[:100]}")
    v = r["result"].get("value")
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
        await asyncio.sleep(2.5)
        for _ in range(6):
            n = await snap(ws, sid, """document.querySelectorAll('[role="dialog"]').length""")
            if not n: break
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.5)
        trig = None
        for _ in range(30):
            cand = await snap(ws, sid, TRIG_RECTS)
            if cand["btns"] and cand["fs"]:
                trig = cand; break
            await asyncio.sleep(0.6)
        out["triggers"] = trig

        qual = [b for b in (trig["btns"] if trig else []) if b["label"] == "품질"]
        if qual:
            x, y = center(qual[0]["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(1.0)
            out["q_open"] = await snap(ws, sid, MENU_FULL)
            # 재클릭 토글 닫힘 확인
            await click_at(ws, sid, x, y)
            await asyncio.sleep(0.8)
            out["q_reclick_opencount"] = await snap(ws, sid, """document.querySelectorAll('[role="menu"][data-state="open"]').length""")
            # 다시 열어서 항목 클릭
            await click_at(ws, sid, x, y)
            await asyncio.sleep(0.8)
            o2 = await snap(ws, sid, MENU_FULL)
            out["q_reopen"] = o2
            items = []
            for m in o2.get("menus", []):
                items.extend(m["children"])
            it = [i for i in items if i.get("attrs", {}).get("role") in ("menuitemcheckbox", "menuitemradio", "option")]
            if it:
                x2, y2 = center(it[0]["rect"])
                await click_at(ws, sid, x2, y2)
                await asyncio.sleep(0.8)
                out["q_after_itemclick"] = await snap(ws, sid, MENU_FULL)
                out["q_trig_after"] = await snap(ws, sid, TRIG_RECTS)
                # Escape/outside
                await click_at(ws, sid, x, y)  # reopen
                await asyncio.sleep(0.7)
                await key(ws, sid, "Escape", 27)
                await asyncio.sleep(0.6)
                out["q_after_esc"] = await snap(ws, sid, """document.querySelectorAll('[role="menu"][data-state="open"]').length""")
                await click_at(ws, sid, x, y)  # reopen
                await asyncio.sleep(0.7)
                await click_at(ws, sid, 700, 300)  # 바깥 클릭
                await asyncio.sleep(0.7)
                out["q_after_outside"] = await snap(ws, sid, """document.querySelectorAll('[role="menu"][data-state="open"]').length""")
        else:
            out["quality_trigger_absent"] = True

        dur = [b for b in (trig["btns"] if trig else []) if b["label"] == "길이"]
        if dur:
            x, y = center(dur[0]["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(1.0)
            out["dur_open"] = await snap(ws, sid, DUR_FULL)
            sl = (out["dur_open"] or {}).get("slider")
            if sl and sl["rect"]["w"] > 10:
                # track 기준 클릭: x = track.x + 3.11 + (v-5)*23.14 로 v=8 재현
                kid_tracks = [k for k in (out["dur_open"].get("kids") or [])
                              if k["cs"]["position"] == "relative" and k["rect"]["h"] == 24 and k["rect"]["w"] > 200]
                if kid_tracks:
                    tr = kid_tracks[0]["rect"]
                    xc = tr["x"] + 3.11 + (8 - 5) * 23.14
                    await click_at(ws, sid, xc, tr["y"] + 12)
                    await asyncio.sleep(0.7)
                    out["dur_click8"] = await snap(ws, sid, DUR_FULL)
                    out["dur_trig_after8"] = await snap(ws, sid, TRIG_RECTS)
                # 포커스 링: 클릭 포커스 vs 키보드 포커스
                out["dur_ring_afterclick"] = (out["dur_click8"] or {}).get("slider")
                await key(ws, sid, "ArrowRight", 39)
                await asyncio.sleep(0.5)
                out["dur_ring_kb"] = await snap(ws, sid, DUR_FULL)
                await key(ws, sid, "Home", 36)
                await asyncio.sleep(0.4)
                out["dur_kb_home"] = await snap(ws, sid, DUR_FULL)
                await key(ws, sid, "End", 35)
                await asyncio.sleep(0.4)
                out["dur_kb_end"] = await snap(ws, sid, DUR_FULL)
            # 재클릭/Escape/outside 닫힘
            await click_at(ws, sid, x, y)
            await asyncio.sleep(0.6)
            out["dur_reclick_open"] = await snap(ws, sid, """document.querySelectorAll('[role="dialog"][data-state="open"]').length""")
            await click_at(ws, sid, x, y)
            await asyncio.sleep(0.6)
            await key(ws, sid, "Escape", 27)
            await asyncio.sleep(0.5)
            out["dur_after_esc"] = await snap(ws, sid, """document.querySelectorAll('[role="dialog"][data-state="open"]').length""")
            await click_at(ws, sid, x, y)
            await asyncio.sleep(0.6)
            await click_at(ws, sid, 700, 300)
            await asyncio.sleep(0.6)
            out["dur_after_outside"] = await snap(ws, sid, """document.querySelectorAll('[role="dialog"][data-state="open"]').length""")

        out["fieldset_final"] = await snap(ws, sid, TRIG_RECTS)
        await send(ws, "Target.closeTarget", {"targetId": target})
    with open("/home/baramofme/open-higgsfield/.worktrees/t_594cd9af/anim_verify/hf_settings_probe6.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("WROTE probe6")

if __name__ == "__main__":
    asyncio.run(main())
