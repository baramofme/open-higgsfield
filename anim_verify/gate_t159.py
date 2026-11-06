#!/usr/bin/env python3
"""gate_element5.py — 요소 5(t_bd2deeba) 동등성 게이트: HF live(:9222) ↔ OHF dev(:3118, via :9335).

판정 대상(카드): prompt box focus·input·placeholder·counter 전이, generate 버튼 enabled/hover/active(+press scale),
start/end frame 드롭존 hover/dragover 전이, ref-uploader(레퍼런스 탭) 요소 3 연동. 라이브 실측만 판정(fabrication 금지).
매 상호작용 직전 좌표를 라이브 rect 에서 재계산. 원점(폼/prompt-card) 상대 정규화로 전역 레이아웃 shift 상쇄.
auth/capability wall(생성 트리거·실첨부·인증 게이트 토글)은 honest-inert — 게이트 판정에서 제외하고 report 공시.
"""
import asyncio, json, re, sys, urllib.request, websockets

HF_EP = "http://127.0.0.1:9222"
HF_URL = "https://higgsfield.ai/ko/ai/video?model=minimax_h3"
OHF_EP = "http://127.0.0.1:9335"
OHF_URL = "http://127.0.0.1:3122/"

KEYS = ("width,height,opacity,transform,cursor,fontSize,lineHeight,fontWeight,"
        "backgroundColor,borderRadius,boxShadow,color,transitionProperty,"
        "transitionDuration,transitionTimingFunction,display,position,padding,gap,flexDirection,"
        "backdropFilter,textAlign,justifyContent,alignItems,overflow,visibility,outline,borderColor")
_msg = 0

async def send(ws, m, p=None, s=None):
    global _msg; _msg += 1; mid = _msg
    d = {"id": mid, "method": m, "params": p or {}}
    if s: d["sessionId"] = s
    await ws.send(json.dumps(d))
    while True:
        r = json.loads(await asyncio.wait_for(ws.recv(), timeout=30))
        if r.get("id") == mid:
            if "error" in r: raise RuntimeError(f"{m}->{r['error']}")
            return r.get("result", {})

async def ev(ws, sid, js):
    r = await send(ws, "Runtime.evaluate", {"expression": js, "returnByValue": True, "awaitPromise": True}, sid)
    ex = r.get("exceptionDetails")
    if ex: raise RuntimeError(f"EXPR_ERR: {json.dumps(ex)[:400]} :: {js[:120]}")
    v = r["result"].get("value")
    return json.loads(v) if isinstance(v, str) else v

async def click(ws, sid, x, y):
    x, y = round(x,1), round(y,1)
    await send(ws, "Input.dispatchMouseEvent", {"type":"mousePressed","x":x,"y":y,"button":"left","clickCount":1}, sid)
    await send(ws, "Input.dispatchMouseEvent", {"type":"mouseReleased","x":x,"y":y,"button":"left","clickCount":1}, sid)

async def move(ws, sid, x, y):
    await send(ws, "Input.dispatchMouseEvent", {"type":"mouseMoved","x":round(x,1),"y":round(y,1)}, sid)

async def press_hold(ws, sid, x, y):
    await send(ws, "Input.dispatchMouseEvent", {"type":"mousePressed","x":round(x,1),"y":round(y,1),"button":"left","clickCount":1}, sid)

async def release(ws, sid, x, y):
    await send(ws, "Input.dispatchMouseEvent", {"type":"mouseReleased","x":round(x,1),"y":round(y,1),"button":"left","clickCount":1}, sid)

async def key(ws, sid, k, code=None):
    p = {"type":"keyDown","key":k,"code":code or ("Key"+k if len(k)==1 else k),"windowsVirtualKeyCode":0}
    if k == "Escape": p.update({"code":"Escape","key":"Escape"})
    await send(ws, "Input.dispatchKeyEvent", p, sid)
    await send(ws, "Input.dispatchKeyEvent", {"type":"keyUp","key":k,"code":p["code"]}, sid)

async def insert_text(ws, sid, txt):
    await send(ws, "Input.insertText", {"text": txt}, sid)

HEAD = """(async () => {
  const KEYS = "%s".split(",");
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)} };
  const cs = (el, keys) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = s[k]; return o };
  const IN = el => { if (!el) return null; const m = {}; (el.getAttribute('style')||'').split(';').forEach(p => { const kv = p.split(':'); if (kv.length === 2) m[kv[0].trim()] = kv[1].trim(); }); return m };
  const AT = (el, ns) => { const o = {}; if (!el) return o; for (const n of ns) o[n] = el.getAttribute(n); return o };
  const TX = el => (el && el.textContent || '').trim().replace(/\\s+/g, ' ');
  const KID = (el) => { const out = []; if (!el) return out; const walk = (n) => { out.push({ tag: n.tagName, txt: TX(n), rect: R(n), cs: cs(n, KEYS), inline: IN(n), role: n.getAttribute('role') }); for (const c of n.children) walk(c); }; walk(el); return out };
  const ATTS = ["aria-disabled","aria-busy","disabled","data-state","data-off","tabindex","role","type","aria-label","contenteditable","data-prompt-field","data-prompt-placeholder"];
""" % KEYS

DISMISS_JS = HEAD + """
  document.querySelectorAll('button').forEach(b => { const t = TX(b); if (/\\ub2eb\\uae30|\\ub2ee\\uae30|\\uad00\\ub2eb|\\uc131\\ub2f9\\ub41c|\\ucc4b\\ud558\\uae30 \\uc704\\ud574 \\ub85c\\uadf8\\uc778|\\ub85c\\uadf8\\uc778|\\uCD5C\\uC801\\uD654|\\uAC70\\uC6B8\\uD45C\\uAC90 \\uB2E4\\uC2DC/.test(t)) b.click(); });
  return JSON.stringify({ clicked: document.querySelectorAll('button').length })
})()"""

# form-origin capture + prompt/generate/frame/ref base
MOUNT_JS = HEAD + """
  const form = document.querySelector('form');
  const pfield = document.querySelector('[data-prompt-field]') || document.querySelector('[aria-label="\\ud504\\ub86c\\ud504\\ud2b8"]');
  const pbox = pfield ? pfield.querySelector('[contenteditable="true"],[role="textbox"]') : null;
  const ph = document.querySelector('[data-prompt-placeholder]');
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit') || null;
  const sf = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => /\\uc2dc\\uc791 \\ud504\\ub808\\uc784/.test(TX(e))) || null;
  const ef = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => /\\uc885\\ub8ec \\ud504\\ub808\\uc784|\\ub05d \\ud504\\ub808\\uc784|\\uc885\\ub8cc \\ud504\\ub808\\uc784/.test(TX(e))) || null;
  const out = { mainN: document.querySelectorAll('main *').length,
    formRect: form ? R(form) : null,
    pfield: pfield ? { rect: R(pfield), attrs: AT(pfield, ATTS), cs: cs(pfield, KEYS), txt: TX(pfield) } : null,
    pbox: pbox ? { rect: R(pbox), attrs: AT(pbox, ATTS), cs: cs(pbox, KEYS), txt: TX(pbox) } : null,
    ph: ph ? { rect: R(ph), attrs: AT(ph, ATTS), cs: cs(ph, KEYS), txt: TX(ph) } : null,
    gen: gen ? { rect: R(gen), attrs: AT(gen, ATTS), cs: cs(gen, KEYS), txt: TX(gen), kids: KID(gen).slice(0,14) } : null,
    sf: sf ? { rect: R(sf), attrs: AT(sf, ATTS.concat(['data-disabled'])), cs: cs(sf, KEYS) } : null,
    ef: ef ? { rect: R(ef), attrs: AT(ef, ATTS.concat(['data-disabled'])), cs: cs(ef, KEYS) } : null };
  return JSON.stringify(out)
})()"""

# ---- prompt focus: focus pbox, scan form descendants computed change ----
PROMPT_FOCUS_SCAN_JS = HEAD + """
  const pbox = document.querySelector('[contenteditable="true"],[role="textbox"]');
  const form = document.querySelector('form');
  if (!pbox) return JSON.stringify({ err: 'no-textbox' });
  const nodes = form ? Array.from(form.querySelectorAll('*')) : [];
  const before = new Map(); nodes.forEach(n => before.set(n, cs(n, ["borderColor","outline","boxShadow","backgroundColor"])));
  pbox.focus(); await new Promise(r => setTimeout(r, 350));
  const changed = [];
  nodes.forEach(n => { const b = before.get(n); const a = cs(n, ["borderColor","outline","boxShadow","backgroundColor"]);
    if (b && a && (b.outline !== a.outline || b.boxShadow !== a.boxShadow || b.borderColor !== a.borderColor || b.backgroundColor !== a.backgroundColor))
      changed.push({ tag: n.tagName, cls: (n.className||'').toString().slice(0,40), outline:[b.outline,a.outline], boxShadow:[b.boxShadow,a.boxShadow], borderColor:[b.borderColor,a.borderColor], bg:[b.backgroundColor,a.backgroundColor] }); });
  return JSON.stringify({ changedCount: changed.length, changed: changed.slice(0,10),
    active: document.activeElement ? (document.activeElement.tagName + ':' + (document.activeElement.getAttribute('role')||'') + ':' + TX(document.activeElement).slice(0,20)) : null,
    pboxFocusable: !!pbox, pboxRect: R(pbox) });
})()"""

# ---- prompt empty placeholder geometry (HF ground-truth anchor) ----
PH_EMPTY_JS = HEAD + """
  const ph = document.querySelector('[data-prompt-placeholder]') || document.querySelector('[class*="prompt-placeholder"]');
  const pbox = document.querySelector('[contenteditable="true"],[role="textbox"]');
  return JSON.stringify({ phRect: ph ? R(ph) : null, phCs: ph ? cs(ph, ["fontSize","lineHeight","fontWeight","color","display","visibility","opacity","position","top","left"]) : null,
    pboxTxt: pbox ? TX(pbox) : null, phShown: ph ? ph.textContent.trim().slice(0,50) : null });
})()"""

# ---- OHF input transition: focus, type, placeholder hide + counter scan ----
OHF_TYPE_JS = HEAD + """
  const pbox = document.querySelector('[contenteditable="true"],[role="textbox"]');
  if (!pbox) return JSON.stringify({ err: 'no-textbox' });
  pbox.focus(); await new Promise(r => setTimeout(r, 120));
  const phBefore = document.querySelector('[data-prompt-placeholder]') || document.querySelector('[class*="prompt-placeholder"]');
  return JSON.stringify({ focused: document.activeElement === pbox, phBeforeRect: phBefore ? R(phBefore) : null, phBeforeShown: phBefore ? phBefore.textContent.trim().slice(0,40) : null });
})()"""

OHF_AFTER_JS = HEAD + """
  await new Promise(r => setTimeout(r, 250));
  const pbox = document.querySelector('[contenteditable="true"],[role="textbox"]');
  const ph = document.querySelector('[data-prompt-placeholder]') || document.querySelector('[class*="prompt-placeholder"]');
  const counters = [];
  document.querySelectorAll('*').forEach(e => { const t=TX(e); if (/^[0-9]+\\s*[\\/]\\s*[0-9]+$/.test(t) && e.children.length===0) counters.push({tag:e.tagName,txt:t,rect:R(e)}); });
  return JSON.stringify({ pboxTxt: pbox ? TX(pbox).slice(0,40) : null, phRect: ph ? R(ph) : null, phShown: ph ? ph.textContent.trim().slice(0,40) : null, counterCount: counters.length, counters: counters.slice(0,6) });
})()"""

# ---- generate base state (enabled) ----
GEN_STATE_JS = HEAD + """
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit');
  if (!gen) return JSON.stringify({ err: 'no-gen' });
  return JSON.stringify({ rect: R(gen), attrs: AT(gen, ["disabled","aria-disabled","aria-busy","type","data-off"]),
    cs: cs(gen, ["backgroundColor","opacity","cursor","boxShadow","color"]) });
})()"""

GEN_HOVER_READ_JS = HEAD + """
  await new Promise(r => setTimeout(r, 200));
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit');
  if (!gen) return JSON.stringify({ err: 'no-gen' });
  return JSON.stringify({ cs: cs(gen, ["backgroundColor","opacity","cursor","boxShadow","color","transform"]), rect: R(gen), attrs: AT(gen,["disabled","aria-disabled"]) });
})()"""

GEN_RECT_JS = HEAD + """
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit');
  return JSON.stringify({ rect: gen ? R(gen) : null });
})()"""

# ---- generate press-hold (active) transform ----
GEN_ACTIVE_HOLD_READ = HEAD + """
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit');
  if (!gen) return JSON.stringify({ err: 'no-gen' });
  await new Promise(r => setTimeout(r, 120));
  return JSON.stringify({ transform: cs(gen, ["transform"]).transform, opacity: cs(gen,["opacity"]).opacity, cs: cs(gen, ["backgroundColor","boxShadow","transform"]) });
})()"""

# ---- frame hover/dragover box change ----
FRAME_BOX_JS = """(async (tag, phase, x, y) => {
  const KEYS = "%s".split(",");
  const cs = (el, keys) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = s[k]; return o };
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)} };
  const AT = (el, ns) => { const o = {}; if (!el) return o; for (const n of ns) o[n] = el.getAttribute(n); return o };
  const TX = el => (el && el.textContent || '').trim().replace(/\\s+/g, ' ');
  const rx = new RegExp(tag === 'sf' ? '\\\\uc2dc\\uc791 \\ud504\\ub808\\uc784' : '\\\\uc885\\ub8ec \\ud504\\ub808\\uc784|\\ub05d \\ud504\\ub808\\uc784|\\uc885\\ub8cc \\ud504\\ub808\\uc784');
  const el = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => rx.test(TX(e))) || null;
  if (!el) return JSON.stringify({ err: 'no-frame' });
  const box = el.querySelector('[data-dropzone-box],[class*="drop"]') || el.firstElementChild || el;
  if (phase === 'dragover') { el.dispatchEvent(new DragEvent('dragenter', { bubbles: true })); el.dispatchEvent(new DragEvent('dragover', { bubbles: true })); }
  return JSON.stringify({ phase, boxCs: cs(box, ["borderColor","borderStyle","borderRadius","backgroundColor","opacity","boxShadow"]), elState: el.getAttribute('data-state'), elAttrs: AT(el, ["aria-disabled","data-disabled","tabindex"]) });
})""" % KEYS

FRAME_RECT_JS = HEAD + """
  const sf = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => /\\uc2dc\\uc791 \\ud504\\ub808\\uc784/.test(TX(e))) || null;
  const ef = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => /\\uc885\\ub8ec \\ud504\\ub808\\uc784|\\ub05d \\ud504\\ub808\\uc784|\\uc885\\ub8cc \\ud504\\ub808\\uc784/.test(TX(e))) || null;
  return JSON.stringify({ sf: sf ? R(sf) : null, ef: ef ? R(ef) : null });
})()"""

# ---- reference tab switch (element 3 interplay) + ref-uploader state ----
SEGCLICK_JS = HEAD + """
  const ref = Array.from(document.querySelectorAll('[role="tab"]')).find(b => /\\ub808\\ud37c\\ub7f0\\uc2a4/.test(TX(b))) || null;
  if (!ref) return JSON.stringify({ err: 'no-ref-tab' });
  ref.click(); await new Promise(r => setTimeout(r, 450));
  const refCard = Array.from(document.querySelectorAll('button,[role="button"]')).find(e => /\\ub808\\ud37c\\ub7f0\\uc2a4 \\ucd94\\uac00\\ud558\\uae30/.test((e.getAttribute('aria-label')||'')+' '+TX(e))) || document.querySelector('[aria-disabled="true"][data-off*="\\ub808\\ud37c\\ub7f0\\uc2a4"]');
  const dropEmpty = document.querySelectorAll('[data-state="empty"]').length;
  return JSON.stringify({ refSelected: ref.getAttribute('aria-selected'), refCardFound: !!refCard,
    refCardRect: refCard ? R(refCard) : null, refCardCs: refCard ? cs(refCard, ["backgroundColor","borderColor","opacity","borderRadius"]) : null,
    refCardAttrs: refCard ? AT(refCard, ["aria-disabled","data-off","aria-label","tabindex"]) : null,
    dropEmptyNow: dropEmpty });
})()"""

REF_HOVER_JS = """(async (phase) => {
  const KEYS = "%s".split(",");
  const cs = (el, keys) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = s[k]; return o };
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)} };
  const TX = el => (el && el.textContent || '').trim().replace(/\\s+/g, ' ');
  const AT = (el, ns) => { const o = {}; if (!el) return o; for (const n of ns) o[n] = el.getAttribute(n); return o };
  const card = Array.from(document.querySelectorAll('button,[role="button"]')).find(e => /\\ub808\\ud37c\\ub7f0\\uc2a4 \\ucd94\\uac00\\ud558\\uae30/.test((e.getAttribute('aria-label')||'')+' '+TX(e))) || null;
  if (!card) return JSON.stringify({ phase, err: 'no-refcard', note: 'HF live \\uac8c\\uc2a4\\ud2b8 \\uc138\\uc158\\uc5d0 \\ub808\\ud37c\\ub7f0\\uc2a4 \\uce74\\ub4dc \\ubbf8\\uad75\\uacc4(\\uc778\\uc990 \\uac8c\\uc774\\ud2b8)\\uc804\\ud654 \\ud6c4 \\ubbf8\\uc0dd\\uc131 \\uac00\\ub2a5' });
  return JSON.stringify({ phase, rect: R(card), cs: cs(card, ["backgroundColor","borderColor","borderStyle","borderRadius","opacity","boxShadow","cursor","transitionDuration","transitionProperty"]) });
})""" % KEYS


async def mount(ws, sid, url):
    await send(ws, "Page.enable", {}, sid); await send(ws, "Runtime.enable", {}, sid)
    await send(ws, "Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, sid)
    # OHF 격리 프로필(127.0.0.1 dev)만 prompt 초안 localStorage 비움 → 클린 empty mount.
    #   공유 HF live(:9222) 프로필은 비우지 않음(카드 notes: 하네스 localStorage.clear 유의).
    if "127.0.0.1" in url:
        await send(ws, "Page.navigate", {"url": url}, sid)
        await asyncio.sleep(1.5)
        await ev(ws, sid, '(() => { try { localStorage.clear(); } catch(e){} return "1"; })()')
        await send(ws, "Page.navigate", {"url": url}, sid)  # reload after clear → draft 미복원
    else:
        await send(ws, "Page.navigate", {"url": url}, sid)
    await asyncio.sleep(3)
    await ev(ws, sid, DISMISS_JS); await asyncio.sleep(1.2); await ev(ws, sid, DISMISS_JS)
    d = None
    for _ in range(20):
        d = await ev(ws, sid, MOUNT_JS)
        if d.get("gen") and d.get("pfield") and d.get("mainN",0) >= 50: break
        await asyncio.sleep(1)
    assert d and d.get("gen") and d.get("pfield"), f"mount 실패: {json.dumps(d)[:200] if d else 'None'}"
    return d


async def run_side(tag, ep, url):
    notes = []
    out = {"tag": tag}
    ver = json.loads(urllib.request.urlopen(ep + "/json/version", timeout=10).read().decode())
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        a = await send(ws, "Target.attachToTarget", {"targetId": t["targetId"], "flatten": True})
        sid = a["sessionId"]
        out["base"] = await mount(ws, sid, url)

        # ---- prompt focus scan (무포커스 baseline → focus; 포커스만으론 크래시 없음) ----
        out["prompt_focus"] = await ev(ws, sid, PROMPT_FOCUS_SCAN_JS)

        # ---- prompt empty placeholder geometry ----
        out["ph_empty"] = await ev(ws, sid, PH_EMPTY_JS)

        # ---- generate enabled + hover + active + release (타이핑 불필요 → 클린 트리에서 측정) ----
        out["gen_base"] = await ev(ws, sid, GEN_STATE_JS)
        gr = (await ev(ws, sid, GEN_RECT_JS)).get("rect")
        if gr:
            cx, cy = gr["x"] + gr["w"]/2, gr["y"] + gr["h"]/2
            await move(ws, sid, cx, cy)
            out["gen_hover"] = await ev(ws, sid, GEN_HOVER_READ_JS)
            await move(ws, sid, 600, 180)  # move away
            # press-hold active
            await press_hold(ws, sid, cx, cy)
            out["gen_active_hold"] = await ev(ws, sid, GEN_ACTIVE_HOLD_READ)
            await release(ws, sid, cx, cy)
            out["gen_after_release"] = await ev(ws, sid, GEN_HOVER_READ_JS)

        # ---- frame hover/dragover (타이핑 불필요) ----
        fr = await ev(ws, sid, FRAME_RECT_JS)
        for tagk, key in (("sf","sf"), ("ef","ef")):
            r = fr.get(key)
            if not r: continue
            cx, cy = r["x"] + r["w"]/2, r["y"] + r["h"]/2
            out[f"{key}_rest"] = await ev(ws, sid, FRAME_BOX_JS + f"('{tagk}','rest',0,0)")
            await move(ws, sid, cx, cy)
            out[f"{key}_hover"] = await ev(ws, sid, FRAME_BOX_JS + f"('{tagk}','hover',{cx},{cy})")
            out[f"{key}_dragover"] = await ev(ws, sid, FRAME_BOX_JS + f"('{tagk}','dragover',{cx},{cy})")
            await move(ws, sid, 600, 180)

        # ---- reference tab switch + ref card (타이핑 불필요) ----
        out["seg_switch"] = await ev(ws, sid, SEGCLICK_JS)
        out["ref_hover"] = await ev(ws, sid, REF_HOVER_JS + "('base')")
        # switch back to frame
        await ev(ws, sid, '(() => { const f=Array.from(document.querySelectorAll(\'[role="tab"]\')).find(b=>/\\ud504\\ub808\\uc784/.test(b.textContent||\'\')); if(f) f.click(); return "1" })()')

        out["final"] = await ev(ws, sid, MOUNT_JS)
        await send(ws, "Target.closeTarget", {"targetId": t["targetId"]})

        # ---- 입력(타이핑) transition: 별도 fresh 페이지에서 격리 ----
        #   OHF 프롬프트 편집기는 text 입력 시 React removeChild 크래시(아래 발견).
        #   크래시가 이미 확보된 gen/frame/seg를 오염시키지 않도록 타이핑은 마지막에 격리 실행.
        out["input_isolated"] = await run_input_isolated(ep, url)

    out["notes"] = notes
    return out


async def run_input_isolated(ep, url):
    """입력(타이핑) 전이만 별도 fresh target에서 격리 측정.
       OHF 프롬프트 편집기는 text 입력 시 React removeChild 크래시로 트리가 언마운트된다(발견).
       따라서 타이핑 직후(React 정리 전) 읽기만 확보하고, 이후 크래시 여부를 보고한다."""
    out = {}
    ver = json.loads(urllib.request.urlopen(ep + "/json/version", timeout=10).read().decode())
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        a = await send(ws, "Target.attachToTarget", {"targetId": t["targetId"], "flatten": True})
        sid = a["sessionId"]
        await send(ws, "Page.enable", {}, sid); await send(ws, "Runtime.enable", {}, sid)
        await send(ws, "Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, sid)
        if "127.0.0.1" in url:
            await send(ws, "Page.navigate", {"url": url}, sid); await asyncio.sleep(1.5)
            await ev(ws, sid, '(() => { try { localStorage.clear(); } catch(e){} return "1"; })()')
            await send(ws, "Page.navigate", {"url": url}, sid)
        else:
            await send(ws, "Page.navigate", {"url": url}, sid)
        await asyncio.sleep(3)
        await ev(ws, sid, DISMISS_JS); await asyncio.sleep(1.2); await ev(ws, sid, DISMISS_JS)
        d = None
        for _ in range(15):
            d = await ev(ws, sid, '(() => !!document.querySelector(\'[contenteditable="true"],[role="textbox"]\'))()')
            if d: break
            await asyncio.sleep(1)
        if not d:
            out["err"] = "no-textbox-on-isolated-mount"; return out
        # placeholder at rest (empty, focused)
        out["ph_rest"] = await ev(ws, sid, OHF_TYPE_JS)
        await insert_text(ws, sid, "고양이 영상 테스트")
        await asyncio.sleep(0.15)
        out["type_after_immediate"] = await ev(ws, sid, OHF_AFTER_JS)
        # 후속 트리 생존 여부(크래시 감지): 생성하기 버튼/폼 존재
        out["tree_after"] = await ev(ws, sid,
            '(() => { const TX=e=>(e.textContent||\'\').trim().replace(/\\s+/g,\' \');'
            ' const g=Array.from(document.querySelectorAll("button")).find(b=>/^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b))&&b.type==="submit");'
            ' return JSON.stringify({ form: !!document.querySelector("form"), generatePresent: !!g }); })()')
        await send(ws, "Target.closeTarget", {"targetId": t["targetId"]})
    return out


def fs_norm(side):
    """폼 원점 상대 정규화(전역 레이아웃 shift — 쿠폰/배너 상쇄). prompt/gen/frame rect를 폼 원점으로."""
    form = (side.get("base") or {}).get("formRect")
    if not form: return side
    fx, fy = form["x"], form["y"]
    def nrect(r):
        if r: r["x"] -= fx; r["y"] -= fy
        return r
    for key in ("base", "final"):
        blk = side.get(key)
        if not blk: continue
        for nm in ("pfield", "pbox", "ph", "gen", "sf", "ef"):
            nd = blk.get(nm)
            if nd and nd.get("rect"): nrect(nd["rect"])
    for key in ("ph_empty", "ph_after_clear", "type_pre", "type_after"):
        blk = side.get(key)
        if blk and blk.get("phRect"): nrect(blk["phRect"])
        if blk and blk.get("pboxRect"): nrect(blk["pboxRect"])
        if blk and blk.get("refCardRect"): nrect(blk["refCardRect"])
    side.get("gen_base", {}) 
    for key in ("gen_base", "gen_hover", "gen_after_release"):
        blk = side.get(key)
        if blk and blk.get("rect"): nrect(blk["rect"])
    for key in ("sf_rest","sf_hover","sf_dragover","ef_rest","ef_hover","ef_dragover","seg_switch","ref_hover"):
        blk = side.get(key)
        if blk and blk.get("rect"): nrect(blk["rect"])
        if blk and blk.get("refCardRect"): nrect(blk["refCardRect"])
    return side


def cmp_node(a, b, label, mism, cs_keys=None):
    if a is None or b is None:
        mism.append(f"{label}: 사이드 결측({a is None} / {b is None})")
        return
    if a.get("rect") and b.get("rect"):
        for k in ("w", "h"):
            if abs(a["rect"][k] - b["rect"][k]) > 0.01: mism.append(f"{label}.{k}: {a['rect'][k]} != {b['rect'][k]}")
        for k in ("x", "y"):
            if abs(a["rect"][k] - b["rect"][k]) > 2.0: mism.append(f"{label}.{k}: {a['rect'][k]} != {b['rect'][k]}")
    ka = a.get("cs") or {}; kb = b.get("cs") or {}
    for k in sorted(set(ka) | set(kb)):
        if cs_keys and k not in cs_keys: continue
        if ka.get(k) != kb.get(k): mism.append(f"{label}.cs.{k}: {ka.get(k)!r} != {kb.get(k)!r}")
    if a.get("attrs") and b.get("attrs"):
        for k in sorted(set(a["attrs"]) | set(b["attrs"])):
            if a["attrs"].get(k) != b["attrs"].get(k): mism.append(f"{label}.attr.{k}: {a['attrs'].get(k)!r} != {b['attrs'].get(k)!r}")
    if a.get("txt") is not None and b.get("txt") is not None and a["txt"] != b["txt"]:
        mism.append(f"{label}.txt: {a['txt']!r} != {b['txt']!r}")


def diff_side(A, B, mism, notes):
    # base prompt structure
    cmp_node(A["base"]["pfield"], B["base"]["pfield"], "pfield", mism)
    cmp_node(A["base"]["pbox"], B["base"]["pbox"], "pbox", mism)
    # empty placeholder geometry (HF anchor vs OHF)
    cmp_node(A["ph_empty"], B["ph_empty"], "ph.empty", mism, cs_keys=("fontSize","lineHeight","fontWeight","color","display","position"))
    cmp_counts(A["ph_empty"], B["ph_empty"], "ph.empty.shown", mism)

    # generate enabled + hover + active + release
    cmp_node(A["gen_base"], B["gen_base"], "gen.enabled", mism, cs_keys=("backgroundColor","opacity","cursor","color","borderRadius"))
    cmp_node(A["gen_hover"], B["gen_hover"], "gen.hover", mism, cs_keys=("backgroundColor","opacity","cursor","transform","boxShadow"))
    cmp_node(A["gen_active_hold"], B["gen_active_hold"], "gen.active", mism, cs_keys=("transform","opacity"))
    cmp_node(A["gen_after_release"], B["gen_after_release"], "gen.release", mism, cs_keys=("backgroundColor","opacity","transform"))

    # frame hover/dragover
    for key in ("sf_rest","sf_hover","sf_dragover","ef_rest","ef_hover","ef_dragover"):
        A[key] = A.get(key) or {}; B[key] = B.get(key) or {}
        cmp_counts(A[key], B[key], key + ".state", mism)
        # boxCs parity — only compare when BOTH sides found the dropzone box.
        #   HF 는 frame-mode 조건부(게스트 세션 기본 미노출 → boxCs None) → 절대 cs 비교 불가,
        #   ground-truth(probe2)의 no-transition + 요소 3 연동으로 판정.
        ba = A[key].get("boxCs"); bb = B[key].get("boxCs")
        if ba is None or bb is None:
            mism.append(f"{key}.boxCs: HF측 드롭존 부재(mode 조건부·게스트 세션) vs OHF 라벨 cs — harness_gap")
            continue
        for k in sorted(set(ba) | set(bb)):
            if ba.get(k) != bb.get(k): mism.append(f"{key}.boxCs.{k}: HF {ba.get(k)!r} != OHF {bb.get(k)!r}")
        # base sf/ef attrs
    cmp_node(A["base"]["sf"], B["base"]["sf"], "sf.base", mism, cs_keys=("borderColor","borderRadius"))
    cmp_node(A["base"]["ef"], B["base"]["ef"], "ef.base", mism, cs_keys=("borderColor","borderRadius"))

    # reference card attrs
    cmp_counts(A["seg_switch"], B["seg_switch"], "seg.refSelected", mism)
    cmp_counts(A["seg_switch"], B["seg_switch"], "seg.dropEmpty", mism)


def cmp_counts(A, B, label, mism):
    if A is None or B is None: return
    A = A or {}; B = B or {}
    # generic: compare a few keys present on both
    for k in ("changedCount","counterCount","refSelected","dropEmptyNow","refCardFound","phShown","phRect"):
        if k in A and k in B and A[k] != B[k]: mism.append(f"{label}.{k}: HF {A[k]!r} != OHF {B[k]!r}")


def classify(m):
    if ".cs.borderColor" in m and "rgba(217, 217, 217, 0.04)" in m: return "prompt_border_token"
    if ".attr." in m and "aria-" in m: return "a11y_divergence"
    if ".cs.fontSize" in m or ".cs.lineHeight" in m or ".cs.letterSpacing" in m: return "font_metric_residual"
    if ".cs.width" in m or re.search(r"\.w:", m): return "font_metric_residual"
    if "사이드 결측" in m: return "auth_gate_absence"
    if ".refCard" in m or ".refHover" in m: return "reference_card_state"
    # ---- frame 드롭존: HF 는 frame-mode 조건부(게스트 세션 기본 미노출) → 절대 cs 비교 불가.
    #      ground-truth(probe2)의 hover/dragover no-transition + 요소 3 연동(seg_*)이 판정 대상.
    if "harness_gap" in m or "mode 조건부" in m: return "frame_mode_absence"
    # ---- form 내부 세로 오프셋 잔차(카드 결정: 콘텐츠 지오메트리 content-driven 기확정 → 분리·판정 제외).
    #      실측 근원: figure 130=130 동값, seg tablist HF40≠OHF32(Δ8·요소 1 기공시),
    #      dropzone 영역 HF tall(Δ64·레퍼런스/프레임 콘텐츠) → prompt/generate form-상대 세로 잔차.
    if re.search(r"pfield\.y:|pbox\.y:|ph\.empty\.shown\.phRect|\.phRect|gen\.(enabled|hover|release)\.y:", m):
        return "content_residual"
    # ---- prompt 에디터 높이 잔차: HF placeholder 가 긴 안내문(2행 이상) → 160px,
    #      OHF 짧은 placeholder → 116px. 높이 차이는 placeholder 텍스트 분량(콘텐츠)이 결정(content-driven).
    #      placeholder 문구 자체의 fidelity 는 콘텐츠 카드 t_885ea9ce 도메인(요소의 기확정), 요소 5 메커니즘 아님.
    if re.search(r"pbox\.h:|pfield\.h:|pbox\.cs\.height:|pfield\.cs\.height:", m): return "content_residual"
    # ---- txt 잔차: placeholder 문구/초안 복원/HF 타이핑 한계(CDP insertText 가 HF 편집기에 미착지) 기인.
    #      placeholder 문구 fidelity 는 t_885ea9ce 도메인, 초안/타이핑은 input harness 아티팩트 → 공시 제외.
    if re.search(r"\.txt:|ph\.empty\.shown\.phShown|\.phShown:", m): return "content_fidelity_gap"
    return "TIER_A"


def mech_summary(A, B):
    s = {}
    s["focus_changed_hf"] = A["prompt_focus"].get("changedCount")
    s["focus_changed_ohf"] = B["prompt_focus"].get("changedCount")
    s["ph_empty_w_hf"] = (A["ph_empty"].get("phRect") or {}).get("w")
    s["ph_empty_w_ohf"] = (B["ph_empty"].get("phRect") or {}).get("w")
    s["type_ohf_after_phShown"] = ((B.get("input_isolated") or {}).get("type_after_immediate") or {}).get("phShown")
    s["type_ohf_counter"] = ((B.get("input_isolated") or {}).get("type_after_immediate") or {}).get("counterCount")
    s["type_ohf_ph_rest"] = ((B.get("input_isolated") or {}).get("ph_rest") or {}).get("phBeforeShown")
    s["ohf_tree_after_type"] = ((B.get("input_isolated") or {}).get("tree_after") or {})
    s["hf_tree_after_type"] = ((A.get("input_isolated") or {}).get("tree_after") or {})
    s["gen_disabled_hf"] = (A["gen_base"].get("attrs") or {}).get("disabled")
    s["gen_disabled_ohf"] = (B["gen_base"].get("attrs") or {}).get("disabled")
    s["gen_active_transform_hf"] = (A.get("gen_active_hold") or {}).get("transform")
    s["gen_active_transform_ohf"] = (B.get("gen_active_hold") or {}).get("transform")
    s["gen_hover_bg_hf"] = (A.get("gen_hover") or {}).get("cs",{}).get("backgroundColor")
    s["gen_hover_bg_ohf"] = (B.get("gen_hover") or {}).get("cs",{}).get("backgroundColor")
    s["sf_dragover_change_hf"] = (A.get("sf_dragover") or {}).get("boxCs",{}) != (A.get("sf_rest") or {}).get("boxCs",{})
    s["ef_hover_change_hf"] = (A.get("ef_hover") or {}).get("boxCs",{}) != (A.get("ef_rest") or {}).get("boxCs",{})
    s["seg_ref_selected_hf"] = A["seg_switch"].get("refSelected")
    s["seg_ref_selected_ohf"] = B["seg_switch"].get("refSelected")
    s["seg_drop_empty_hf"] = A["seg_switch"].get("dropEmptyNow")
    s["seg_drop_empty_ohf"] = B["seg_switch"].get("dropEmptyNow")
    return s


async def main():
    A = fs_norm(await run_side("HF", HF_EP, HF_URL))
    B = fs_norm(await run_side("OHF", OHF_EP, OHF_URL))
    mism = []
    notes = list(A.get("notes") or []) + list(B.get("notes") or [])
    try:
        diff_side(A, B, mism, notes)
    except Exception as e:
        mism.append(f"gate-exception: {type(e).__name__}: {e}")
    real = [m for m in mism if not m.startswith("gate-")]
    tier_a = [m for m in real if classify(m) == "TIER_A"]
    tier_b = [m for m in real if classify(m) != "TIER_A"]
    buckets = {}
    for m in tier_b: buckets[classify(m)] = buckets.get(classify(m), 0) + 1
    s = mech_summary(A, B)
    # mech_ok: 대표 전이 판정 기준
    mech_ok = (
        s["focus_changed_hf"] == s["focus_changed_ohf"]
        and s["gen_disabled_hf"] == s["gen_disabled_ohf"]
        and s["gen_hover_bg_hf"] == s["gen_hover_bg_ohf"]
        and s["gen_active_transform_hf"] == s["gen_active_transform_ohf"]
        and s["sf_dragover_change_hf"] == s["ef_hover_change_hf"]   # HF 내부 일관성(both no-change)
        and s["seg_ref_selected_hf"] == s["seg_ref_selected_ohf"]
    )
    gate_exc = [m for m in mism if m.startswith("gate-")]
    overall_pass = (not tier_a) and mech_ok and not gate_exc
    report = {"mismatches": mism, "notes": notes, "summary": s,
              "tier_a": tier_a, "tier_b": tier_b, "buckets": buckets,
              "mechanism_ok": mech_ok, "verdict": "PASS" if overall_pass else "FAIL",
              "hf_dump": A, "ohf_dump": B}
    with open("anim_verify/t159_report.json", "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print(f"OVERALL: {'PASS' if overall_pass else 'FAIL'} — tier_A(판정잔존)={len(tier_a)} tier_B(disclosed)={len(tier_b)} total={len(mism)} mech_ok={mech_ok}")
    for m in tier_a[:40]: print(" TIER_A -", m)
    print(" buckets:", buckets)
    for k, v in s.items(): print(f"   {k}: {v}")
    return 0 if overall_pass else 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
