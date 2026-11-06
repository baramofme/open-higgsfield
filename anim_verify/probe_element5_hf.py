#!/usr/bin/env python3
"""probe_element5_hf.py — HF live(:9222) ground-truth 프로브: prompt·generate·토글·frame 영역.

목표: OHF 요소 5 배선의 근거를 라이브 실측만으로 확보한다(fabrication 금지).
  · prompt box: focus 전이(blur↔focus computed), input 전이(타입→placeholder 소진/카운터), send버튼
  · generate 버튼: hover/active computed 전이, 크레딧 노드 구조(credit 관련 honest-inert 확인)
  · 토글: audio group·mode·audio mute / sora2·webpage·multi-caption 의 DOM 실재 여부(전역 탐색)
  · start frame·end frame·add reference: focus/active/hover 전이 + data-disabled 실재
매 상호작용 직전 좌표를 라이브 rect 에서 재계산.
"""
import asyncio, json, re, sys, urllib.request, websockets

HF_EP = "http://127.0.0.1:9222"
HF_URL = "https://higgsfield.ai/ko/ai/video?model=minimax_h3"

KEYS = ("width,height,opacity,transform,cursor,fontSize,lineHeight,fontWeight,"
        "backgroundColor,borderRadius,boxShadow,color,transitionProperty,"
        "transitionDuration,transitionTimingFunction,display,position,padding,gap,flexDirection,"
        "backdropFilter,textAlign,justifyContent,alignItems,overflow,visibility,outline,outlineWidth,borderColor")
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

async def move(ws, sid, x, y):
    await send(ws, "Input.dispatchMouseEvent", {"type": "mouseMoved", "x": round(x,1), "y": round(y,1)}, sid)

async def key(ws, sid, k, code=None):
    p = {"type": "keyDown", "key": k, "code": code or ("Key" + k if len(k) == 1 else k), "windowsVirtualKeyCode": 0}
    if k == "Escape": p.update({"code": "Escape", "key": "Escape"})
    if k in ("ArrowRight", "ArrowLeft", "Home", "End"): p.update({"code": k, "text": ""})
    await send(ws, "Input.dispatchKeyEvent", p, sid)
    await send(ws, "Input.dispatchKeyEvent", {"type": "keyUp", "key": k, "code": p["code"]}, sid)

async def insert_text(ws, sid, txt):
    await send(ws, "Input.insertText", {"text": txt}, sid)

HEAD = """(async () => {
  const KEYS = "%s".split(",");
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)} };
  const cs = (el, keys) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = s[k]; return o };
  const IN = el => { if (!el) return null; const m = {}; (el.getAttribute('style')||'').split(';').forEach(p => { const kv = p.split(':'); if (kv.length === 2) m[kv[0].trim()] = kv[1].trim(); }); return m };
  const AT = (el, ns) => { const o = {}; if (!el) return o; for (const n of ns) o[n] = el.getAttribute(n); return o };
  const TX = el => (el && el.textContent || '').trim().replace(/\\s+/g, ' ');
  const KID = (el, depth) => { const out = []; if (!el) return out; const walk = (n, d) => { out.push({ tag: n.tagName, txt: TX(n), rect: R(n), cs: cs(n, KEYS), inline: IN(n), role: n.getAttribute('role') }); for (const c of n.children) walk(c, d+1); }; walk(el, 0); return out };
  const ATTS = ["aria-label","aria-haspopup","aria-expanded","data-state","data-open","aria-disabled","tabindex","data-off","role","aria-orientation","aria-checked","aria-busy","data-side","data-align","type","translate","data-prompt-field","data-prompt-placeholder","contenteditable","data-lexical-editor","spellcheck"];
""" % KEYS

ATTS = ["aria-label","aria-haspopup","aria-expanded","data-state","data-open","aria-disabled","tabindex","data-off","role","aria-orientation","aria-checked","aria-busy","data-side","data-align","type","translate","data-prompt-field","data-prompt-placeholder","contenteditable","data-lexical-editor","spellcheck"]

# ---- mount: navigate, dismiss popups, wait for form ----
DISMISS_JS = HEAD + """
  document.querySelectorAll('button').forEach(b => { const t = TX(b); if (/\\ub2eb\\uae30|\\ub2ee\\uae30|\\uad00\\ub2eb|\\uc131\\ub2f9\\ub41c|\\ucc4b\\ud558\\uae30 \\uc704\\ud574 \\ub85c\\uadf8\\uc778|\\ub85c\\uadf8\\uc778|\\ud604\\uc7ac \\ub2eb\\uae30|\\uB2E4\\uC74C\\uC5D0 \\ub2E4\\uC2DC \\ubC49\\uB2C8\\Ub2E4|\\uC544\\ubbFC \\uB9C9\\uB2E4|\\uCD5C\\uC801\\uD654|\\uAC70\\uC6B8\\uD45C\\uAC90 \\uB2E4\\uC2DC/.test(t)) b.click(); });
  return JSON.stringify({ clicked: document.querySelectorAll('button').length })
})()"""

MOUNT_JS = HEAD + """
  const pfield = document.querySelector('[data-prompt-field]') || document.querySelector('[aria-label="\\ud504\\ub86c\\ud504\\ud2b8"]');
  const pbox = pfield ? pfield.querySelector('[contenteditable="true"],[role="textbox"]') : null;
  const ph = document.querySelector('[data-prompt-placeholder]');
  const pboxFocusable = pbox || document.querySelector('[role="textbox"]');
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit') || null;
  // frame dropzones
  const sf = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => /\\uc2dc\\uc791 \\ud504\\ub808\\uc784/.test(TX(e))) || null;
  const ef = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => /\\uc885\\ub8ec \\ud504\\ub808\\uc784|\\ub05d \\ud504\\ub808\\uc784|\\uc885\\ub8cc \\ud504\\ub808\\uc784/.test(TX(e))) || null;
  const out = { mainN: document.querySelectorAll('main *').length,
    pfield: pfield ? { attrs: AT(pfield, ATTS), cs: cs(pfield, KEYS), rect: R(pfield), txt: TX(pfield) } : null,
    pbox: pboxFocusable ? { attrs: AT(pboxFocusable, ATTS), cs: cs(pboxFocusable, KEYS), rect: R(pboxFocusable), txt: TX(pboxFocusable) } : null,
    ph: ph ? { attrs: AT(ph, ATTS), cs: cs(ph, KEYS), rect: R(ph), txt: TX(ph) } : null,
    gen: gen ? { attrs: AT(gen, ATTS), cs: cs(gen, KEYS), rect: R(gen), txt: TX(gen), kids: KID(gen, 0).slice(0,12) } : null,
    sf: sf ? { attrs: AT(sf, ATTS), cs: cs(sf, KEYS), rect: R(sf), txt: TX(sf) } : null,
    ef: ef ? { attrs: AT(ef, ATTS), cs: cs(ef, KEYS), rect: R(ef), txt: TX(ef) } : null };
  return JSON.stringify(out)
})()"""

# ---- global presence scan: toggles / audio / sora2 / webpage / multi-caption ----
PRESENCE_JS = HEAD + """
  const scan = (rx) => {
    const hits = [];
    document.querySelectorAll('button,[role="switch"],[role="checkbox"],[role="tab"],label,[aria-label]').forEach(e => {
      const lbl = (e.getAttribute('aria-label')||'') + ' ' + TX(e);
      if (rx.test(lbl)) hits.push({ tag: e.tagName, role: e.getAttribute('role'), aria: e.getAttribute('aria-label'), txt: TX(e).slice(0,40),
        attrs: AT(e, ATTS.concat(['aria-pressed','data-active','data-state','aria-checked','disabled'])), rect: R(e) });
    });
    return hits;
  };
  const out = {
    audio:      scan(/\\uc624\\ub514\\uc624|\\uc740\\uc131|\\uc0ac\\uc6b4\\ub4e4|mute|\\uc74c\\uc131\\ud45c\\ud604|\\uc74c\\uc131 \\uc0dd\\uc131/i),
    audioMute:  scan(/mute|\\uc74c\\uc131 \\ucd08\\uc774\\uc2a4|\\uc815\\uc2dc\\uc815\\uc9c0|\\uc74c\\uc131 \\uc5c6\\uc744|\\uc74c\\uc131 \\ucf00/i),
    sora:       scan(/sora/i),
    webpage:    scan(/\\uc6f9\\ud398\\uc774\\uc9c0|web ?page|\\ud398\\uc774\\uc9c0/i),
    multicap:   scan(/\\uba40\\ud2f0\\uce90\\ud504\\uc158|multi.?caption|\\uce90\\ud504\\uc158 \\ub450|\\ub2e4\\uc911 \\uce90\\ud504\\uc158/i),
    counter:    (() => { const c=[]; document.querySelectorAll('*').forEach(e => { const t=TX(e); if (/^[0-9]+\\s*[\\/]\\s*[0-9]+$|\\uc790\\uc218|\\ubb38\\uc790\\uc218|\\uae00\\uc790\\uc218/.test(t) && e.children.length===0) c.push({tag:e.tagName,txt:t.slice(0,30),rect:R(e)}); }); return c; })(),
    switch:     (() => Array.from(document.querySelectorAll('[role="switch"],[role="checkbox"]')).map(e => ({ tag: e.tagName, role: e.getAttribute('role'), aria: e.getAttribute('aria-label'), txt: TX(e).slice(0,30), attrs: AT(e, ATTS.concat(['aria-pressed','aria-checked','data-state','disabled'])) })))(),
    addRef:     (() => { const hits=[]; document.querySelectorAll('button,[role="button"]').forEach(e => { if (/\\ub808\\ud37c\\ub7f0\\uc2a4 \\ucd94\\uac00|\\uc694\\uc180 \\ucd94\\uac00|\\uc785\\ub825 \\ucd94\\uac00|\\ubb34\\ube44\\uc6b4 \\ud504\\ub808\\uc784 \\ucd94\\uac00|\\uc0dd\\uc131 \\ud504\\ub808\\uc784 \\ucd94\\uac00|image \\ucd94\\uac00|\\uc774\\ubbf8\\uc9c0 \\ucd94\\uac00/.test((e.getAttribute('aria-label')||'')+' '+TX(e))) hits.push({ tag: e.tagName, aria: e.getAttribute('aria-label'), txt: TX(e).slice(0,40), rect: R(e), attrs: AT(e, ATTS) }); }); return hits; })()
  };
  return JSON.stringify(out)
})()"""

# ---- prompt focus transition (blur baseline → focus → computed diff) ----
PROMPT_FOCUS_JS = HEAD + """
  const pbox = document.querySelector('[role="textbox"],[contenteditable="true"]');
  const field = document.querySelector('[data-prompt-field]');
  const wrap = pbox ? pbox.parentElement : null;
  if (!pbox) return JSON.stringify({ err: 'no-textbox' });
  pbox.blur(); await new Promise(r => setTimeout(r, 200));
  const blurState = { pboxCs: cs(pbox, KEYS), wrapCs: cs(wrap, KEYS), fieldCs: cs(field, KEYS), wrapRect: R(wrap), pboxRect: R(pbox), pboxInline: IN(pbox), wrapInline: IN(wrap), active: document.activeElement ? document.activeElement.tagName : null };
  pbox.focus(); await new Promise(r => setTimeout(r, 250));
  const focusState = { pboxCs: cs(pbox, KEYS), wrapCs: cs(wrap, KEYS), fieldCs: cs(field, KEYS), wrapRect: R(wrap), pboxRect: R(pbox), pboxInline: IN(pbox), wrapInline: IN(wrap), active: document.activeElement ? document.activeElement.tagName : null, activeTxt: document.activeElement ? TX(document.activeElement).slice(0,30) : null };
  return JSON.stringify({ blur: blurState, focus: focusState, transitionOnWrap: (wrap && cs(wrap, ["transitionProperty","transitionDuration","transitionTimingFunction"])) || null });
})()"""

# ---- prompt input transition: type → placeholder hide + counter appear ----
PROMPT_INPUT_JS = HEAD + """
  const pbox = document.querySelector('[role="textbox"],[contenteditable="true"]');
  const ph = document.querySelector('[data-prompt-placeholder]');
  if (!pbox) return JSON.stringify({ err: 'no-textbox' });
  pbox.focus(); await new Promise(r => setTimeout(r, 150));
  return JSON.stringify({ focused: document.activeElement === pbox, phVisibleBefore: ph ? R(ph) : null, phShownBefore: ph ? ph.textContent.trim().slice(0,40) : null });
})()"""

AFTER_INPUT_JS = HEAD + """
  await new Promise(r => setTimeout(r, 250));
  const pbox = document.querySelector('[role="textbox"],[contenteditable="true"]');
  const ph = document.querySelector('[data-prompt-placeholder]');
  const counters = [];
  document.querySelectorAll('*').forEach(e => { const t=TX(e); if (/^[0-9]+\\s*[\\/]\\s*[0-9]+$/.test(t) && e.children.length===0) counters.push({tag:e.tagName,txt:t,rect:R(e),cs:cs(e,["fontSize","color","display","visibility"])}); });
  return JSON.stringify({ txt: pbox ? TX(pbox).slice(0,40) : null, phVisible: ph ? R(ph) : null, phShown: ph ? ph.textContent.trim().slice(0,40) : null, counters });
})()"""

# ---- generate hover/active computed transition ----
GEN_HOVER_JS = HEAD + """
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit');
  if (!gen) return JSON.stringify({ err: 'no-gen' });
  return JSON.stringify({ rect: R(gen) });
})()"""

GEN_STATE_JS = """(async (phase, x, y) => {
  const KEYS = "%s".split(",");
  const cs = (el, keys) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = s[k]; return o };
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)} };
  const AT = (el, ns) => { const o = {}; if (!el) return o; for (const n of ns) o[n] = el.getAttribute(n); return o };
  const TX = el => (el && el.textContent || '').trim().replace(/\\s+/g, ' ');
  const IN = el => { if (!el) return null; const m = {}; (el.getAttribute('style')||'').split(';').forEach(p => { const kv = p.split(':'); if (kv.length === 2) m[kv[0].trim()] = kv[1].trim(); }); return m };
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit');
  if (!gen) return JSON.stringify({ err: 'no-gen' });
  return JSON.stringify({ phase, cs: cs(gen, KEYS), rect: R(gen), inline: IN(gen), attrs: AT(gen, ["aria-busy","disabled","data-state","data-off","aria-disabled","type"]) });
})""" % KEYS

# ---- frame dropzone focus/active/hover transition ----
FRAME_JS = HEAD + """
  const sf = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => /\\uc2dc\\uc791 \\ud504\\ub808\\uc784/.test(TX(e))) || null;
  const ef = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => /\\uc885\\ub8ec \\ud504\\ub808\\uc784|\\ub05d \\ud504\\ub808\\uc784|\\uc885\\ub8cc \\ud504\\ub808\\uc784/.test(TX(e))) || null;
  const out = { sf: sf ? { rect: R(sf), attrs: AT(sf, ATTS.concat(['data-disabled','data-state'])), cs: cs(sf, KEYS) } : null,
    ef: ef ? { rect: R(ef), attrs: AT(ef, ATTS.concat(['data-disabled','data-state'])), cs: cs(ef, KEYS) } : null };
  return JSON.stringify(out)
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
        if d.get("gen") and d.get("pfield") and d.get("mainN", 0) >= 50:
            break
        await asyncio.sleep(1)
    assert d, f"mount 실패: {json.dumps(d)[:200] if d else 'None'}"
    return d


async def main():
    out = {}
    ver = json.loads(urllib.request.urlopen(HF_EP + "/json/version", timeout=10).read().decode())
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        a = await send(ws, "Target.attachToTarget", {"targetId": t["targetId"], "flatten": True})
        sid = a["sessionId"]
        out["base"] = await mount(ws, sid, HF_URL)
        out["presence"] = await ev(ws, sid, PRESENCE_JS)
        out["frame"] = await ev(ws, sid, FRAME_JS)
        # prompt focus transition
        out["prompt_focus"] = await ev(ws, sid, PROMPT_FOCUS_JS)
        # prompt input transition: focus then insert text
        out["prompt_input_pre"] = await ev(ws, sid, PROMPT_INPUT_JS)
        await insert_text(ws, sid, "테스트 프롬프트 123")
        out["prompt_input_after"] = await ev(ws, sid, AFTER_INPUT_JS)
        # restore: clear by selecting all + delete via keyboard? Use JS to empty the editor content
        await ev(ws, sid, '(() => { const p = document.querySelector(\'[role="textbox"],[contenteditable="true"]\'); if (p) { p.focus(); document.execCommand(\'selectAll\', false, null); document.execCommand(\'delete\', false, null); } return "1" })()')
        # generate hover/active transition (mouse to button center)
        gr = (await ev(ws, sid, GEN_HOVER_JS)).get("rect")
        if gr:
            cx, cy = gr["x"] + gr["w"]/2, gr["y"] + gr["h"]/2
            out["gen_rest"] = await ev(ws, sid, GEN_STATE_JS + "('rest', 0, 0)")
            await move(ws, sid, cx, cy)
            out["gen_hover"] = await ev(ws, sid, GEN_STATE_JS + f"('hover', {cx}, {cy})")
            await click(ws, sid, cx, cy)
            out["gen_active"] = await ev(ws, sid, GEN_STATE_JS + f"('active', {cx}, {cy})")
        await send(ws, "Target.closeTarget", {"targetId": t["targetId"]})
    with open("anim_verify/hf_element5_probe.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    p = out["presence"]
    print("== PRESENCE ==")
    for k in ("audio","audioMute","sora","webpage","multicap","counter","switch","addRef"):
        print(f"  {k}: {len(p.get(k) or [])}", [ (h.get('tag'),h.get('aria') or h.get('txt')) for h in (p.get(k) or [])][:6])
    print("== base.pfield:", out["base"].get("pfield") is not None, " pbox:", out["base"].get("pbox") is not None)
    print("== gen:", out["base"].get("gen") is not None, " sf:", out["base"].get("sf") is not None, " ef:", out["base"].get("ef") is not None)
    pf = out.get("prompt_focus") or {}
    if pf.get("blur") and pf.get("focus"):
        bk = ("borderColor","outline","boxShadow","backgroundColor")
        print("== focus diff (wrap):", {k: (pf['blur']['wrapCs'].get(k), pf['focus']['wrapCs'].get(k)) for k in bk})
    print("== prompt input:", (out.get("prompt_input_after") or {}).get("txt"), " phShownAfter:", (out.get("prompt_input_after") or {}).get("phShown"))
    g = out.get("gen_rest") or {}; h = out.get("gen_hover") or {}; ac = out.get("gen_active") or {}
    print("== gen rest/hover/active cs diff:")
    for k in ("backgroundColor","color","boxShadow","opacity","transform","cursor"):
        print(f"   {k}: rest={g.get('cs',{}).get(k)} hover={h.get('cs',{}).get(k)} active={ac.get('cs',{}).get(k)}")
    return out


if __name__ == "__main__":
    asyncio.run(main())
