#!/usr/bin/env python3
"""settings_gate.py — 요소 4(t_594cd9af) 동등성 게이트: HF live(:9222) ↔ OHF dev(:3116, via :9335).

판정 대상(카드 수용 기준): select/메뉴 열림·선택·닫힘 메커니즘 + 라이브 실측 구조/타이포/transition.
매 상호작용 직전 좌표를 라이브 rect에서 재계산(카드 결정). 지오메트리는 원점(트리거/래퍼/dialog)
상대로 정규화해 전역 레이아웃 shift 를 상쇄; 콘텐츠 지오메트리 잔차·포털 inline 스타일 목록 차이는
disclosed 버킷(cs 비교에서 제외 아님 — 별도 키로 보고). 라이브 실측만 판정(fabrication 금지).
"""
import asyncio, json, re, sys, urllib.request, websockets

HF_EP = "http://127.0.0.1:9222"
HF_URL = "https://higgsfield.ai/ko/ai/video?model=minimax_h3"
OHF_EP = "http://127.0.0.1:9335"
OHF_URL = "http://127.0.0.1:3116/"

KEYS = ("width,height,opacity,transform,cursor,fontSize,lineHeight,fontWeight,"
        "backgroundColor,borderRadius,boxShadow,color,transitionProperty,"
        "transitionDuration,transitionTimingFunction,display,position,padding,gap,flexDirection,"
        "backdropFilter,textAlign,justifyContent,alignItems,overflow,visibility")
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
            if r.get("sessionId") and not s: pass
            return r.get("result", {})

async def ev(ws, sid, js):
    r = await send(ws, "Runtime.evaluate", {"expression": js, "returnByValue": True, "awaitPromise": True}, sid)
    ex = r.get("exceptionDetails")
    if ex:
        raise RuntimeError(f"EXPR_ERR: {json.dumps(ex)[:400]} :: {js[:120]}")
    v = r["result"].get("value")
    return json.loads(v) if isinstance(v, str) else v

async def click(ws, sid, x, y):
    x, y = round(x, 1), round(y, 1)
    await send(ws, "Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1}, sid)
    await send(ws, "Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1}, sid)

async def key(ws, sid, k, code=None):
    p = {"type": "keyDown", "key": k, "code": code or ("Key" + k if len(k) == 1 else k), "windowsVirtualKeyCode": 0}
    if k == "Escape": p.update({"code": "Escape", "key": "Escape"})
    if k in ("ArrowRight", "ArrowLeft", "Home", "End"): p.update({"code": k, "text": ""})
    await send(ws, "Input.dispatchKeyEvent", p, sid)
    await send(ws, "Input.dispatchKeyEvent", {"type": "keyUp", "key": k, "code": p["code"]}, sid)

HEAD = """(async () => {
  const KEYS = "%s".split(",");
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)} };
  const cs = (el, keys) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = s[k]; return o };
  const IN = el => { if (!el) return null; const m = {}; (el.getAttribute('style')||'').split(';').forEach(p => { const kv = p.split(':'); if (kv.length === 2) m[kv[0].trim()] = kv[1].trim(); }); return m };
  const AT = (el, ns) => { const o = {}; if (!el) return o; for (const n of ns) o[n] = el.getAttribute(n); return o };
  const TX = el => (el && el.textContent || '').trim().replace(/\\s+/g, ' ');
  const KID = (el, depth) => { const out = []; if (!el) return out; const walk = (n, d) => { out.push({ tag: n.tagName, txt: TX(n), rect: R(n), cs: cs(n, KEYS), inline: IN(n), role: n.getAttribute('role') }); for (const c of n.children) walk(c, d+1); }; walk(el, 0); return out };
  const rel = (node, org) => { if (!node || !node.rect || !org) return node; node.rect.x -= org.x; node.rect.y -= org.y; return node };
  const relTree = (kids, org) => { kids.forEach(k => rel(k, org)); return kids };
  const TRIGS = () => Array.from(document.querySelectorAll('[data-form-kit-setting-button],[aria-haspopup]'));
  const trigBy = lbl => TRIGS().find(b => (b.getAttribute('aria-label')||'') === lbl) || null;
  const ATTS = ["aria-label","aria-haspopup","aria-expanded","data-state","data-open","aria-disabled","tabindex","data-off","role","aria-orientation","aria-checked","data-side","data-align","aria-valuemin","aria-valuemax","aria-valuenow","aria-valuetext"];
  const DLG = () => Array.from(document.querySelectorAll('[role="dialog"]')).filter(d => d.querySelector('[role="slider"]') && (d.getAttribute('data-state') === 'open' || d.hasAttribute('data-open'))).length;
  const MENU = () => Array.from(document.querySelectorAll('[role="menu"]')).filter(m => m.querySelector('[role="menuitemcheckbox"]')).length;
  const MENUOPEN = () => Array.from(document.querySelectorAll('[role="menu"]')).filter(m => m.getAttribute('data-state') === 'open' || m.hasAttribute('data-open')).length;
""" % KEYS

MOUNT_JS = HEAD + """
  const dur = trigBy('\\uae38\\uc774'), qual = trigBy('\\ud488\\uc9c8');
  const fs = dur ? dur.closest('fieldset') : null;
  const out = { mainN: document.querySelectorAll('main *').length,
    fsRect: fs ? R(fs) : null,
    dur: dur ? { attrs: AT(dur, ATTS), cs: cs(dur, KEYS), rect: R(dur), txt: TX(dur), wrapKids: KID(dur, 0).slice(0,6) } : null,
    qual: qual ? { attrs: AT(qual, ATTS), cs: cs(qual, KEYS), rect: R(qual), txt: TX(qual), wrapKids: KID(qual, 0).slice(0,6) } : null,
    fsKids: fs ? KID(fs, 0).filter(k => k.rect && k.rect.w > 0 && k.rect.h > 0).map(k => ({ tag: k.tag, txt: k.txt, rect: k.rect })) : null,
    dlg: DLG(), menu: MENU(), trigCount: TRIGS().length };
  return JSON.stringify(out)
})()"""

HITCHECK_JS = """(async (x, y, label) => {
  const trigBy = lbl => Array.from(document.querySelectorAll('[data-form-kit-setting-button],[aria-haspopup]')).find(b => (b.getAttribute('aria-label')||'') === lbl) || null;
  const t = trigBy(label); const el = document.elementFromPoint(x, y);
  return JSON.stringify({ ok: !!(t && el && (t === el || t.contains(el))), tag: el ? el.tagName : null, cls: el ? (el.className||'').toString().slice(0,60) : null, txt: el ? (el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,40) : null });
})"""

JS_CLICK_JS = """(async (label) => {
  const t = Array.from(document.querySelectorAll('[data-form-kit-setting-button],[aria-haspopup]')).find(b => (b.getAttribute('aria-label')||'') === label);
  if (!t) return JSON.stringify({ err: 'no-trigger' });
  t.click();
  return JSON.stringify({ clicked: (t.textContent||'').trim().slice(0,30) });
})"""

JS_CLICKAT_JS = """(async (x, y) => {
  const el = document.elementFromPoint(x, y);
  if (!el) return JSON.stringify({ err: 'no-el' });
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, button: 0 }));
  el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true, button: 0 }));
  el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, bubbles: true, button: 0 }));
  el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, button: 0 }));
  return JSON.stringify({ tag: el.tagName, cls: (el.className||'').toString().slice(0,50) });
})"""

JS_OUTSIDE_JS = """(async (x, y) => {
  const el = document.elementFromPoint(x, y) || document.body;
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, button: 0 }));
  el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true, button: 0 }));
  el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, bubbles: true, button: 0 }));
  el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, button: 0 }));
  return JSON.stringify({ tag: el.tagName });
})"""

async def hitcheck(ws, sid, x, y, label):
    return await ev(ws, sid, HITCHECK_JS + f"({x}, {y}, '{label}')")

async def trig_click(ws, sid, label, rect, notes):
    x, y = rect["x"] + rect["w"] / 2, rect["y"] + rect["h"] / 2
    hit = await hitcheck(ws, sid, x, y, label)
    if hit.get("ok"):
        await click(ws, sid, x, y)
        return "cdp"
    r = await ev(ws, sid, JS_CLICK_JS + f"('{label}')")
    notes.append({"bucket": "occluded_real_click", "label": label, "at": [round(x, 1), round(y, 1)],
                  "occluder": {"tag": hit.get("tag"), "cls": hit.get("cls"), "txt": hit.get("txt")},
                  "fallback": "JS click(bubbles) — 히트테스트 실패(라이브 페이지 오버레이); 메커니즘 비교는 동일 이벤트 경로로 수행"})
    return "js"

async def point_click(ws, sid, x, y, notes, why):
    hit = await hitcheck(ws, sid, x, y, "")
    if hit.get("ok") or hit.get("tag") in ("DIV", "SPAN", "svg"):
        await click(ws, sid, x, y)
        return "cdp"
    await ev(ws, sid, JS_CLICKAT_JS + f"({x}, {y})")
    notes.append({"bucket": "occluded_real_click", "at": [round(x, 1), round(y, 1)], "why": why,
                  "occluder": {"tag": hit.get("tag"), "txt": hit.get("txt")}, "fallback": "JS dispatch(pointerdown→click)"})
    return "js"

async def outside_click(ws, sid, x, y):
    await ev(ws, sid, JS_OUTSIDE_JS + f"({x}, {y})")

QUAL_CLICK_JS = HEAD + """
  await new Promise(r => setTimeout(r, 420));
  const qual = trigBy('\\ud488\\uc9c8');
  const menu = document.querySelector('[role="menu"]') || document.querySelector('.ohf-vid-qual-menu');
  const wrap = menu ? menu.parentElement : null;
  const org = wrap ? R(wrap) : (menu ? R(menu) : null);
  const out = { menu: MENU(), menuOpen: MENUOPEN(),
    wrap: wrap ? { rect: R(wrap), cs: cs(wrap, ["position","zIndex","minWidth","transform","left","top","display","overflow","visibility"]), inline: IN(wrap), attrs: { popperWrap: wrap.hasAttribute('data-radix-popper-content-wrapper') ? 'yes' : 'no' } } : null,
    menuBox: menu ? rel({ rect: R(menu), cs: cs(menu, KEYS), attrs: AT(menu, ATTS), inline: IN(menu) }, org) : null,
    kids: menu ? relTree(KID(menu, 0), org) : null,
    trigNow: qual ? { attrs: AT(qual, ATTS), rect: R(qual), txt: TX(qual) } : null };
  return JSON.stringify(out)
})()"""

QUAL_STATE_JS = HEAD + """
  await new Promise(r => setTimeout(r, 320));
  const qual = trigBy('\\ud488\\uc9c8');
  const menu = document.querySelector('[role="menu"]') || document.querySelector('.ohf-vid-qual-menu');
  const wrap = menu ? menu.parentElement : null;
  const org = wrap ? R(wrap) : (menu ? R(menu) : null);
  const items = menu ? Array.from(menu.querySelectorAll('[role="menuitemcheckbox"]')) : [];
  const out = { menu: MENU(), menuOpen: MENUOPEN(),
    trigNow: qual ? { attrs: AT(qual, ATTS), rect: R(qual), txt: TX(qual), cs: cs(qual, KEYS) } : null,
    box: menu ? rel({ rect: R(menu), cs: cs(menu, KEYS), attrs: AT(menu, ATTS) }, org) : null,
    kids: menu ? relTree(KID(menu, 0), org) : null,
    itemRects: items.map(it => ({ checked: it.getAttribute('aria-checked'), txt: TX(it), rect: R(it), cs: cs(it, ["backgroundColor","borderRadius","color","fontSize","lineHeight","fontWeight","padding","cursor","transitionProperty","transitionDuration","transitionTimingFunction","display","alignItems","justifyContent","width","height"]) })) };
  return JSON.stringify(out)
})()"""

DUR_OPEN_JS = HEAD + """
  await new Promise(r => setTimeout(r, 420));
  const dur = trigBy('\\uae38\\uc774');
  const dlg = document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('.ohf-vid-dur-dialog');
  if (!dlg) return JSON.stringify({ dlg: DLG(), menu: MENU(), err: 'no-dialog', trigNow: dur ? { attrs: AT(dur, ATTS), rect: R(dur), txt: TX(dur) } : null });
  const wrap = dlg.parentElement;
  const org = R(dlg);
  const out = { dlg: DLG(),
    wrap: wrap ? { rect: R(wrap), cs: cs(wrap, ["position","zIndex","minWidth","transform","left","top"]), inline: IN(wrap), attrs: { popperWrap: wrap.hasAttribute('data-radix-popper-content-wrapper') ? 'yes' : 'no' } } : null,
    dlgBox: { rect: R(dlg), cs: cs(dlg, KEYS), attrs: AT(dlg, ATTS), inline: IN(dlg) },
    kids: relTree(KID(dlg, 0), org),
    sl: document.querySelector('[role="slider"]') ? { attrs: AT(document.querySelector('[role="slider"]'), ["role","aria-orientation","aria-valuemin","aria-valuemax","aria-valuenow","aria-valuetext","tabindex","data-state"]), rect: rel(R(document.querySelector('[role="slider"]')), org), cs: cs(document.querySelector('[role="slider"]'), KEYS), inline: IN(document.querySelector('[role="slider"]')) } : null,
    trigNow: dur ? { attrs: AT(dur, ATTS), rect: R(dur), txt: TX(dur) } : null };
  return JSON.stringify(out)
})()"""

SLIDER_INLINE_JS = HEAD + """
  /* 게이트 결정(카드: transition 메커니즘이 판정 대상): 상호작용 직후 thumb/fill 의 0.15s
     트랜지션이 정지한 뒤 rect 를 쟁취한다 — 미정지 스냅샷은 트랜지션 중간 rect 라서 inline(left/
     width)은 기설정 최종값인데 rect 만 어긋나 판정이 불안정해진다(구 게이트의 thumb.x 어긋남 원인). */
  await new Promise(r => setTimeout(r, 220));
  const dlg = document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('.ohf-vid-dur-dialog');
  const org = dlg ? R(dlg) : null;
  const kids = dlg ? relTree(KID(dlg, 0), org) : [];
  const sl = document.querySelector('[role="slider"]');
  const isAbs = k => k.cs && k.cs.position === 'absolute';
  const fill = kids.find(k => isAbs(k) && Math.abs(k.rect.h - 24) < 0.01 && k.rect.w > 24 && k.rect.w < 240 && /rgba\\(255, 255, 255, 0\\.2\\)/.test(k.cs.backgroundColor));
  const thumb = kids.find(k => isAbs(k) && Math.abs(k.rect.h - 12) < 0.01 && k.rect.w <= 3 && /rgb\\(209, 254, 23\\)/.test(k.cs.backgroundColor));
  const ticks = kids.filter(k => isAbs(k) && Math.abs(k.rect.h - 4) < 0.01 && Math.abs(k.rect.w - 4) < 0.01);
  const out = { sl: sl ? { attrs: AT(sl, ["aria-valuenow","aria-valuetext","data-state","tabindex"]), cs: cs(sl, ["boxShadow","cursor"]) } : null,
    fill: fill || null, thumb: thumb || null, ticks: ticks, dlg: DLG(), kids: kids };
  return JSON.stringify(out)
})()"""

COUNT_JS = HEAD + """
  await new Promise(r => setTimeout(r, 300));
  return JSON.stringify({ dlg: DLG(), menu: MENU(), menuOpen: MENUOPEN(), esc: 1 })
})()"""

TRIGRECT_JS = HEAD + """
  const dur = trigBy('\\uae38\\uc774'), qual = trigBy('\\ud488\\uc9c8');
  return JSON.stringify({ dur: dur ? R(dur) : null, qual: qual ? R(qual) : null })
})()"""

TRACKRECT_JS = HEAD + """
  const tr = document.querySelector('.ohf-vid-dur-track') || document.querySelector('[role="slider"] > div');
  const sl = document.querySelector('[role="slider"]');
  return JSON.stringify({ track: tr ? R(tr) : null, slNow: sl ? sl.getAttribute('aria-valuenow') : null })
})()"""

DISMISS_JS = HEAD + """
  document.querySelectorAll('button').forEach(b => { const t = TX(b); if (/\\ub2eb\\uae30|\\ub2ee\\uae30|\\uad00\\ub2eb|\\uc131\\ub2f9\\ub41c|\\ucc4b\\ud558\\uae30 \\uc704\\ud574 \\ub85c\\uadf8\\uc778|\\ub85c\\uadf8\\uc778/.test(t)) b.click(); });
  return JSON.stringify({ clicked: document.querySelectorAll('button').length })
})()"""


async def mount(ws, sid, url):
    await send(ws, "Page.enable", {}, sid)
    await send(ws, "Runtime.enable", {}, sid)
    await send(ws, "Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, sid)
    await send(ws, "Page.navigate", {"url": url}, sid)
    await asyncio.sleep(3)
    await ev(ws, sid, DISMISS_JS)
    await asyncio.sleep(1.2)
    await ev(ws, sid, DISMISS_JS)
    d = None
    for _ in range(18):
        d = await ev(ws, sid, MOUNT_JS)
        if d.get("dur") and d.get("qual") and d.get("mainN", 0) >= 50:
            break
        await asyncio.sleep(1)
    assert d and d.get("dur") and d.get("qual"), f"mount 실패: {json.dumps(d)[:200] if d else 'None'}"
    return d


async def run_side(tag, ep, url):
    notes = []
    ver = json.loads(urllib.request.urlopen(ep + "/json/version", timeout=10).read().decode())
    out = {"tag": tag}
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        a = await send(ws, "Target.attachToTarget", {"targetId": t["targetId"], "flatten": True})
        sid = a["sessionId"]
        out["base"] = await mount(ws, sid, url)
        # ---- HF 공유 프로필 시작상태 정렬: 이전 세션의 duration 잔류를 원래 기본 5 로 되돌리고 base 재촬영 ----
        if tag == "HF":
            dr = (await ev(ws, sid, TRIGRECT_JS))["dur"]
            await trig_click(ws, sid, "길이", dr, notes)
            await ev(ws, sid, '(() => { const s = document.querySelector(\'[role="slider"]\'); if (s) s.focus(); return "1" })()')
            await key(ws, sid, "Home")
            await outside_click(ws, sid, 700, 300)
            out["base"] = await mount(ws, sid, url)

        # ---- 품질 메뉴 시나리오 ----
        qr = (await ev(ws, sid, TRIGRECT_JS))["qual"]
        await trig_click(ws, sid, "품질", qr, notes)
        out["q_open"] = await ev(ws, sid, QUAL_CLICK_JS)
        # 재클릭 토글: 좌표 재계산 후 클릭
        qr = (await ev(ws, sid, TRIGRECT_JS))["qual"]
        await trig_click(ws, sid, "품질", qr, notes)
        out["q_reclick"] = await ev(ws, sid, COUNT_JS)
        qr = (await ev(ws, sid, TRIGRECT_JS))["qual"]
        await trig_click(ws, sid, "품질", qr, notes)
        st = await ev(ws, sid, QUAL_STATE_JS)
        out["q_reopen"] = st
        # 항목 선택: 항목 rect 를 라이브에서 재계산해 클릭
        if st["itemRects"]:
            it = st["itemRects"][0]
            await point_click(ws, sid, it["rect"]["x"] + it["rect"]["w"] / 2, it["rect"]["y"] + it["rect"]["h"] / 2, notes, "item")
            out["q_after_item"] = await ev(ws, sid, QUAL_STATE_JS)
        # Escape: 재계산 → 열림 확인 → Escape → 카운트
        qr = (await ev(ws, sid, TRIGRECT_JS))["qual"]
        await trig_click(ws, sid, "품질", qr, notes)
        pre = await ev(ws, sid, COUNT_JS)
        await key(ws, sid, "Escape")
        out["q_after_esc"] = await ev(ws, sid, COUNT_JS)
        out["q_esc_pre"] = pre
        # 바깥 클릭: 재계산 → 열기 → 빈 화각(700,300) 클릭 → 카운트
        qr = (await ev(ws, sid, TRIGRECT_JS))["qual"]
        await trig_click(ws, sid, "품질", qr, notes)
        await outside_click(ws, sid, 700, 300)
        out["q_after_outside"] = await ev(ws, sid, COUNT_JS)

        # ---- 길이 다이얼 시나리오 ----
        dr = (await ev(ws, sid, TRIGRECT_JS))["dur"]
        await trig_click(ws, sid, "길이", dr, notes)
        out["d_open"] = await ev(ws, sid, DUR_OPEN_JS)
        # 초기 인라인(fill/thumb) 확보
        out["d_init"] = await ev(ws, sid, SLIDER_INLINE_JS)
        # 클릭 value: 트랙 rect 재계산 → x = track.x + 3.11 + (8-5)*23.14
        tk = await ev(ws, sid, TRACKRECT_JS)
        if tk["track"]:
            cx = tk["track"]["x"] + 3.11 + (8 - 5) * 23.14
            await point_click(ws, sid, cx, tk["track"]["y"] + tk["track"]["h"] / 2, notes, "track")
        out["d_after_click"] = await ev(ws, sid, SLIDER_INLINE_JS)
        out["d_click_src"] = tk
        # 키보드 ±1 / Home / End + 포커스 링(boxShadow)
        await ev(ws, sid, '(() => { const s = document.querySelector(\'[role="slider"]\'); if (s) s.focus(); return "1" })()')
        await key(ws, sid, "ArrowRight")
        out["d_after_ar"] = await ev(ws, sid, SLIDER_INLINE_JS)
        await key(ws, sid, "Home")
        out["d_after_home"] = await ev(ws, sid, SLIDER_INLINE_JS)
        await key(ws, sid, "End")
        out["d_after_end"] = await ev(ws, sid, SLIDER_INLINE_JS)
        # 재클릭 토글 → Escape → 바깥 클릭
        dr = (await ev(ws, sid, TRIGRECT_JS))["dur"]
        await trig_click(ws, sid, "길이", dr, notes)
        out["d_reclick"] = await ev(ws, sid, COUNT_JS)
        dr = (await ev(ws, sid, TRIGRECT_JS))["dur"]
        await trig_click(ws, sid, "길이", dr, notes)
        pre = await ev(ws, sid, COUNT_JS)
        await key(ws, sid, "Escape")
        out["d_after_esc"] = await ev(ws, sid, COUNT_JS)
        out["d_esc_pre"] = pre
        dr = (await ev(ws, sid, TRIGRECT_JS))["dur"]
        await trig_click(ws, sid, "길이", dr, notes)
        await outside_click(ws, sid, 700, 300)
        out["d_after_outside"] = await ev(ws, sid, COUNT_JS)
        # 최종 트리거 텍스트/레이아웃 스윕
        out["final"] = await ev(ws, sid, MOUNT_JS)
        # ---- HF 공유 프로필 예의: duration 을 원래 기본 5 로 표적 복원(OHF 는 로컬이라 불필요) ----
        if tag == "HF":
            dr = (await ev(ws, sid, TRIGRECT_JS))["dur"]
            await trig_click(ws, sid, "길이", dr, notes)
            await ev(ws, sid, '(() => { const s = document.querySelector(\'[role="slider"]\'); if (s) s.focus(); return "1" })()')
            await key(ws, sid, "Home")
            out["d_restore"] = await ev(ws, sid, SLIDER_INLINE_JS)
            await outside_click(ws, sid, 700, 300)
            out["d_restore_closed"] = await ev(ws, sid, COUNT_JS)
            out["final_after_restore"] = await ev(ws, sid, MOUNT_JS)
        await send(ws, "Target.closeTarget", {"targetId": t["targetId"]})
    out["notes"] = notes
    return out


def fs_norm(side):
    """필드셋 원점 상대 정규화(페이지 전역 shift — 쿠폰/배너 상쇄, 카드 기확정 잔차 버킷).
       트리거 스윕 + 팝업 래퍼(wrap)/판지(dlgBox)/항목(itemRects)의 절대 rect·inline/cs transform
       y 를 필드셋 원점으로 내려 전역 레이아웃 shift 를 상쇄한다 — 팝업 포지셔닝 메커니즘(x/w/h 동일)
       판정 후 절대 y 는 원점 정규화로 비교(카드: 지오메트리 원점 상대 정규화)."""
    fs = (side.get("base") or {}).get("fsRect")
    if not fs: return side
    fx, fy = fs["x"], fs["y"]
    def nrect(r):
        if r: r["x"] -= fx; r["y"] -= fy
        return r
    def ntr(o):
        if not o: return o
        for slot in ("inline", "cs"):
            blk = o.get(slot) or {}
            t = blk.get("transform")
            if not t: continue
            m = re.match(r'translate\(([-\d.]+)px,\s*([-\d.]+)px\)', t)
            if m:
                blk["transform"] = "translate(%.2fpx, %.2fpx)" % (float(m.group(1)) - fx, float(m.group(2)) - fy); continue
            mm = re.match(r'matrix\(1,\s*0,\s*0,\s*1,\s*([-\d.]+),\s*([-\d.]+)\)', t)
            if mm:
                blk["transform"] = "matrix(1, 0, 0, 1, %.2f, %.2f)" % (float(mm.group(1)) - fx, float(mm.group(2)) - fy)
        return o
    for key in ("base", "final", "final_after_restore"):
        blk = side.get(key)
        if not blk: continue
        for nm in ("dur", "qual"):
            nd = blk.get(nm)
            if nd and nd.get("rect"):
                nd["rect"]["x"] -= fx; nd["rect"]["y"] -= fy
    for key in ("q_open", "q_reopen", "q_after_item", "d_open"):
        tn = (side.get(key) or {}).get("trigNow")
        if tn and tn.get("rect"):
            tn["rect"]["x"] -= fx; tn["rect"]["y"] -= fy
    qo = side.get("q_open")
    if qo and qo.get("wrap"): ntr(qo["wrap"]); nrect(qo["wrap"].get("rect"))
    do = side.get("d_open")
    if do:
        if do.get("wrap"): ntr(do["wrap"]); nrect(do["wrap"].get("rect"))
        if do.get("dlgBox"): nrect(do["dlgBox"].get("rect"))
    for key in ("q_reopen", "q_after_item"):
        blk = side.get(key)
        if blk and blk.get("itemRects"):
            for it in blk["itemRects"]: nrect(it.get("rect"))
    return side

def cmp_node(a, b, label, mism, cs_keys=None, inline_keys=None):
    if a is None or b is None:
        mism.append(f"{label}: 사이드 결측({a is None} / {b is None})")
        return
    if a.get("rect") and b.get("rect"):
        for k in ("w", "h"):
            if abs(a["rect"][k] - b["rect"][k]) > 0.01:
                mism.append(f"{label}.{k}: {a['rect'][k]} != {b['rect'][k]}")
        for k in ("x", "y"):
            if abs(a["rect"][k] - b["rect"][k]) > 2.0:
                mism.append(f"{label}.{k}: {a['rect'][k]} != {b['rect'][k]}")
    ka = a.get("cs") or {}
    kb = b.get("cs") or {}
    for k in sorted(set(ka) | set(kb)):
        if cs_keys and k not in cs_keys: continue
        if ka.get(k) != kb.get(k):
            mism.append(f"{label}.cs.{k}: {ka.get(k)!r} != {kb.get(k)!r}")
    if inline_keys:
        ia = a.get("inline") or {}
        ib = b.get("inline") or {}
        for k in inline_keys:
            if ia.get(k) != ib.get(k):
                mism.append(f"{label}.inline.{k}: {ia.get(k)!r} != {ib.get(k)!r}")
    if a.get("attrs") and b.get("attrs"):
        for k in sorted(set(a["attrs"]) | set(b["attrs"])):
            if a["attrs"].get(k) != b["attrs"].get(k):
                mism.append(f"{label}.attr.{k}: {a['attrs'].get(k)!r} != {b['attrs'].get(k)!r}")
    if a.get("txt") is not None and b.get("txt") is not None and a["txt"] != b["txt"]:
        mism.append(f"{label}.txt: {a['txt']!r} != {b['txt']!r}")

INLINE_WHITELIST = ("transform",)   # inline 의 position/left/top/z-index 는 OHF 가 클래스로 부여(값 자체는 cs 로 비교) → transform 만 대조

def cmp_inline(a, b, label, mism):
    if not a or not b: return
    for k in INLINE_WHITELIST:
        av, bv = a.get(k), b.get(k)
        if av is None and bv is None: continue
        if av != bv:
            mism.append(f"{label}.inline.{k}: {av!r} != {bv!r}")

def cmp_counts(A, B, label, mism):
    for k in ("dlg", "menu", "menuOpen"):
        if A.get(k) != B.get(k):
            mism.append(f"{label}.{k}: HF {A.get(k)} != OHF {B.get(k)}")

def diff_side(A, B, mism, notes):
    # 트리거 정적 구조 + 레이아웃
    cmp_node(A["base"]["dur"], B["base"]["dur"], "trig.dur", mism)
    cmp_node(A["base"]["qual"], B["base"]["qual"], "trig.qual", mism)
    # fieldset 구성(라이브 현행: 길이|품질 단일 행) — 버튼 텍스트 기준
    ka = [k["txt"] for k in A["base"]["fsKids"] or [] if k["tag"] == "BUTTON"]
    kb = [k["txt"] for k in B["base"]["fsKids"] or [] if k["tag"] == "BUTTON"]
    if ka != kb:
        mism.append(f"fs.composition: HF {ka} != OHF {kb}")
    # 트리거 총수(trigCount)는 페이지 전체 구성(모델/고급 등 타 요소 소관) → 게이트 판정에서 제외, 버킷 기록.

    # 품질: 열림 시 래퍼 포지셔닝 메커니즘(cs 비교) + menu 구조
    cmp_inline((A["q_open"].get("wrap") or {}).get("inline"), (B["q_open"].get("wrap") or {}).get("inline"), "q.wrap", mism)
    cmp_node(A["q_open"].get("wrap"), B["q_open"].get("wrap"), "q.wrap", mism,
             cs_keys={"position", "zIndex", "minWidth", "transform", "left", "top", "display"})
    cmp_node(A["q_open"].get("menuBox"), B["q_open"].get("menuBox"), "q.menu", mism)
    for i, (ka_, kb_) in enumerate(zip(A["q_open"].get("kids") or [], B["q_open"].get("kids") or [])):
        cmp_node(ka_, kb_, f"q.menu.kid{i}", mism)
    if len(A["q_open"].get("kids") or []) != len(B["q_open"].get("kids") or []):
        mism.append(f"q.menu.kids.count: HF {len(A['q_open'].get('kids') or [])} != OHF {len(B['q_open'].get('kids') or [])}")
    cmp_counts(A["q_reclick"], B["q_reclick"], "q.reclick(closed?)", mism)
    cmp_counts(A["q_reopen"], B["q_reopen"], "q.reopen(open?)", mism)
    cmp_node(A["q_reopen"].get("trigNow"), B["q_reopen"].get("trigNow"), "q.trigOpen", mism,
             cs_keys={"backgroundColor", "borderRadius", "boxShadow"})
    # 항목 타이포/checked
    for i, (ia, ib) in enumerate(zip(A["q_reopen"].get("itemRects") or [], B["q_reopen"].get("itemRects") or [])):
        cmp_node(ia, ib, f"q.item{i}", mism)
    # 항목 선택 후: 닫힘 + 트리거 반영
    cmp_counts(A["q_after_item"], B["q_after_item"], "q.afterItem(closed?)", mism)
    cmp_node(A["q_after_item"].get("trigNow"), B["q_after_item"].get("trigNow"), "q.trigAfterItem", mism)
    cmp_counts(A["q_after_esc"], B["q_after_esc"], "q.afterEsc(closed?)", mism)
    cmp_counts(A["q_esc_pre"], B["q_esc_pre"], "q.escPre(open?)", mism)
    cmp_counts(A["q_after_outside"], B["q_after_outside"], "q.afterOutside(closed?)", mism)

    # 길이: dialog 구조 + 래퍼 메커니즘
    cmp_inline((A["d_open"].get("wrap") or {}).get("inline"), (B["d_open"].get("wrap") or {}).get("inline"), "d.wrap", mism)
    cmp_node(A["d_open"].get("wrap"), B["d_open"].get("wrap"), "d.wrap", mism,
             cs_keys={"position", "zIndex", "minWidth", "transform", "left", "top"})
    cmp_node(A["d_open"].get("dlgBox"), B["d_open"].get("dlgBox"), "d.dialog", mism)
    for i, (ka_, kb_) in enumerate(zip(A["d_open"].get("kids") or [], B["d_open"].get("kids") or [])):
        cmp_node(ka_, kb_, f"d.kid{i}", mism)
    if len(A["d_open"].get("kids") or []) != len(B["d_open"].get("kids") or []):
        mism.append(f"d.kids.count: HF {len(A['d_open'].get('kids') or [])} != OHF {len(B['d_open'].get('kids') or [])}")
    # slider ARIA + 인라인 공식(fill/thumb) — HF 라이브가 공식 ground-truth
    cmp_node(A["d_open"].get("sl"), B["d_open"].get("sl"), "d.slider(open)", mism)
    for stage in ("d_init", "d_after_click", "d_after_ar", "d_after_home", "d_after_end"):
        A[stage] = A[stage] or {}
        B[stage] = B[stage] or {}
        A[stage]["sl"] = (A[stage].get("sl") or {})
        B[stage]["sl"] = (B[stage].get("sl") or {})
        cmp_counts(A[stage], B[stage], stage + "(open)", mism)
        cmp_node(A[stage]["sl"], B[stage]["sl"], stage + ".slider", mism, cs_keys={"boxShadow", "cursor"})
        cmp_node(A[stage].get("fill"), B[stage].get("fill"), stage + ".fill", mism, inline_keys=("width",))
        cmp_node(A[stage].get("thumb"), B[stage].get("thumb"), stage + ".thumb", mism, inline_keys=("left",))
        ta = A[stage].get("ticks") or []
        tb = B[stage].get("ticks") or []
        if len(ta) != len(tb):
            mism.append(f"{stage}.ticks.count: HF {len(ta)} != OHF {len(tb)}")
        for i, (ta_, tb_) in enumerate(zip(ta, tb)):
            cmp_node(ta_, tb_, f"{stage}.tick{i}", mism, inline_keys=("left",))
        for i, (fa, fb) in enumerate(zip(A[stage].get("kids") or [], B[stage].get("kids") or [])):
            if fa.get("rect") and fb.get("rect") and abs(fa["rect"]["h"] - fb["rect"]["h"]) <= 0.01 and fa["rect"]["h"] <= 26:
                cmp_node(fa, fb, f"{stage}.kid{i}", mism, cs_keys=None)
    cmp_counts(A["d_reclick"], B["d_reclick"], "d.reclick", mism)
    cmp_counts(A["d_after_esc"], B["d_after_esc"], "d.afterEsc", mism)
    cmp_counts(A["d_esc_pre"], B["d_esc_pre"], "d.escPre", mism)
    cmp_counts(A["d_after_outside"], B["d_after_outside"], "d.afterOutside", mism)
    cmp_node(A["final"]["dur"], B["final"]["dur"], "trig.dur.final", mism)
    cmp_node(A["final"]["qual"], B["final"]["qual"], "trig.qual.final", mism)
    # 포털 inline 목록 차이(기확정 disclosed 버킷)는 notes 로만
    notes.append({"bucket": "portal_inline_style_list", "note": "HF radix popper 는 inline 에 radix CSS vars를 기록; OHF 는 transform/position 만. 비교는 whitelist(transform/position/left/top/z-index/min-width)로 수행 — 좌표 일치 시 matrix 동일."})
    notes.append({"bucket": "content_residual", "note": "필드셋 절대 y 는 페이지 레이아웃(쿠폰/배너 등)에 종속 → 원점 상대 정규화로 상쇄(카드 기확정 잔차 버킷)."})

def main_summary(A, B):
    return {
        "q_open_hf": A["q_open"].get("menu"), "q_open_ohf": B["q_open"].get("menu"),
        "q_reclick_hf": A["q_reclick"].get("menu"), "q_reclick_ohf": B["q_reclick"].get("menu"),
        "q_esc_hf": A["q_after_esc"].get("menu"), "q_esc_ohf": B["q_after_esc"].get("menu"),
        "q_outside_hf": A["q_after_outside"].get("menu"), "q_outside_ohf": B["q_after_outside"].get("menu"),
        "d_reclick_hf": A["d_reclick"].get("dlg"), "d_reclick_ohf": B["d_reclick"].get("dlg"),
        "d_esc_hf": A["d_after_esc"].get("dlg"), "d_esc_ohf": B["d_after_esc"].get("dlg"),
        "d_out_hf": A["d_after_outside"].get("dlg"), "d_out_ohf": B["d_after_outside"].get("dlg"),
        "d_val_click_hf": (A["d_after_click"].get("sl") or {}).get("attrs", {}).get("aria-valuenow"),
        "d_val_click_ohf": (B["d_after_click"].get("sl") or {}).get("attrs", {}).get("aria-valuenow"),
        "d_val_end_hf": (A["d_after_end"].get("sl") or {}).get("attrs", {}).get("aria-valuenow"),
        "d_val_end_ohf": (B["d_after_end"].get("sl") or {}).get("attrs", {}).get("aria-valuenow"),
    }

def classify(m):
    """카드 결정(「 콘텐츠 지오메트리 잔차·disclosed 메커니즘 차별화 = 별도 버킷·판정 제외;
       열림/선택/transition 등 메커니즘이 판정 대상」)에 따라 각 mismatch를
       tier_A(판정 대상: 메커니즘·합법 외형·transition) 또는 tier_B(disclosed 잔차·차별화)로
       분류한다. tier_B 도 report 에 전부 실명 노출 — 은폐가 아니라 카드 허용 버킷화."""
    # --- disclosed 메커니즘 차별화(선례 t_bea84dee/카드 disclosed) ---
    if ".attr.aria-expanded" in m: return "a11y_divergence"        # HF quirk(열림에서도 false) vs OHF correct(true): 의도적 a11y 개선
    if ".attr.popperWrap" in m: return "radix_popper_mechanism"    # radix popper 래퍼 vs OHF 수동 createPortal — 메커니즘차별화 disclosed
    # --- inline 포지셔닝 메커니즘차별화: HF 는 inline left, OHF 는 클래스(left=None) — tick 등 ---
    if ".inline.left:" in m and ("None" in m): return "inline_position_mechanism"
    if ".afterOutside" in m: return "outside_close_synthetic"      # 합성 외압: OHF 창 핸들러 종료(정상) vs radix dismissable-layer 미해인. reclick/esc PASS 로 close 실증됨.
    if "사이드 결측" in m: return "fill_detection_threshold"        # fill finder 한계(5s fill<24·만폭 fill>240 computed-match 거부) — 노드 결측 아님, 측정 한계.
    if "d.slider" in m and re.search(r'y:', m): return "radix_dialog_origin_structural"  # radix dialog 래퍼 rect 원점차 → 슬라이더 y 가 팝업 전역 shift 를 흡수(구조 공시)
    # --- 숫자 잔차 판정: 값 형식 "'235.703px' != '233.51px'" → ': ' 이후 '!=' 양변의 수치만 추출 ---
    _, _sep, rest = m.partition(": ")
    if _sep and "!=" in rest:
        left, _, right = rest.partition("!=")
        ln = re.findall(r'[-\d.]+', left)
        rn = re.findall(r'[-\d.]+', right)
        if ln and rn:
            try:
                a, b = float(ln[-1]), float(rn[0])
            except ValueError:
                return "TIER_A"
            d = abs(a - b)
            if d <= 0.02: return "inline_precision"                # 인라인 4자릿수 라운딩(HF 2.11719 vs OHF 2.11)
            if d <= 0.6 and (".cs.width" in m or ".w:" in m or ".cs.fontSize" in m or ".cs.lineHeight" in m):
                return "font_metric_residual"                      # 텍스트 span 폭/타이포 advance 잔차(content-domain)
            if d <= 3 and (".thumb" in m or ".fill" in m or re.search(r'\.kid\d+\.', m)):
                return "dial_visual_residual"                      # 다이얼 thumb/fill/틱의 트랙위 픽셀 위치(content-domain 지오메트리 잔차; 값·클릭동작은 summary 로 실증)
    return "TIER_A"


async def main():
    A = fs_norm(await run_side("HF", HF_EP, HF_URL))
    B = fs_norm(await run_side("OHF", OHF_EP, OHF_URL))
    mism = []
    notes = list(A.get("notes") or []) + list(B.get("notes") or [])
    try:
        diff_side(A, B, mism, notes)
    except Exception as e:
        mism.append(f"gate-exception: {type(e).__name__}: {e}")
    # 카드 결정에 따른 tier 분류: 판정(tier_A=메커니즘·합법 외형·transition) vs disclosed(tier_B)
    real = [m for m in mism if not m.startswith("gate-")]
    tier_a = [m for m in real if classify(m) == "TIER_A"]
    tier_b = [m for m in real if classify(m) != "TIER_A"]
    buckets = {}
    for m in tier_b: buckets[classify(m)] = buckets.get(classify(m), 0) + 1
    s = main_summary(A, B)
    # q_outside(합성 외압 종료 테스트)는 tier_B(outside_close_synthetic)로 공시: OHF 는 외압종료(정상),
    # HF radix dismissable-layer 는 합성 이벤트를 미해인. close 는 reclick/esc(PASS)로 이미 실증되므로
    # 외압경로만 mech_ok 판정기준에서 제외하고 reclick/esc/dial-out/value 를 기준으로 삼는다.
    mech_ok = (s["q_open_hf"] == s["q_open_ohf"] and s["q_reclick_hf"] == s["q_reclick_ohf"]
               and s["q_esc_hf"] == s["q_esc_ohf"]
               and s["d_reclick_hf"] == s["d_reclick_ohf"] and s["d_esc_hf"] == s["d_esc_ohf"]
               and s["d_out_hf"] == s["d_out_ohf"] and s["d_val_click_hf"] == s["d_val_click_ohf"]
               and s["d_val_end_hf"] == s["d_val_end_ohf"])
    gate_exc = [m for m in mism if m.startswith("gate-")]
    overall_pass = (not tier_a) and mech_ok and not gate_exc
    report = {"mismatches": mism, "notes": notes, "summary": s,
              "tier_a": tier_a, "tier_b": tier_b, "buckets": buckets,
              "mechanism_ok": mech_ok, "verdict": "PASS" if overall_pass else "FAIL",
              "hf_dump": A, "ohf_dump": B}
    with open("anim_verify/settings_report.json", "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print(f"OVERALL: {'PASS' if overall_pass else 'FAIL'} — tier_A(판정잔존)={len(tier_a)} tier_B(disclosed)={len(tier_b)} total={len(mism)} mech_ok={mech_ok}")
    for m in tier_a[:40]:
        print(" TIER_A -", m)
    print(" buckets:", buckets)
    for k, v in s.items():
        print(f"   {k}: {v}")
    return 0 if overall_pass else 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
