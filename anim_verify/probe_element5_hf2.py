#!/usr/bin/env python3
"""probe_element5_hf2.py — HF live(:9222) 정밀 프로브 2: focus-within 링·generate enable·frame hover/dragover·ref-uploader·:active.

fabrication 금지 — 라이브 실측만 판정. 매 상호작용 직전 좌표 재계산.
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

async def insert_text(ws, sid, txt):
    await send(ws, "Input.insertText", {"text": txt}, sid)

HEAD = """(async () => {
  const KEYS = "%s".split(",");
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)} };
  const cs = (el, keys) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = s[k]; return o };
  const IN = el => { if (!el) return null; const m = {}; (el.getAttribute('style')||'').split(';').forEach(p => { const kv = p.split(':'); if (kv.length === 2) m[kv[0].trim()] = kv[1].trim(); }); return m };
  const AT = (el, ns) => { const o = {}; if (!el) return o; for (const n of ns) o[n] = el.getAttribute(n); return o };
  const TX = el => (el && el.textContent || '').trim().replace(/\\s+/g, ' ');
""" % KEYS

DISMISS_JS = HEAD + """
  document.querySelectorAll('button').forEach(b => { const t = TX(b); if (/\\ub2eb\\uae30|\\ub2ee\\uae30|\\uad00\\ub2eb|\\uc131\\ub2f9\\ub41c|\\ucc4b\\ud558\\uae30 \\uc704\\ud574 \\ub85c\\uadf8\\uc778|\\ub85c\\uadf8\\uc778|\\uCD5C\\uC801\\uD654|\\uAC70\\uC6B8\\uD45C\\uAC90 \\uB2E4\\uC2DC/.test(t)) b.click(); });
  return JSON.stringify({ clicked: document.querySelectorAll('button').length })
})()"""

MOUNT_JS = HEAD + """
  const pcard = document.querySelector('[data-prompt-card]') || document.querySelector('form');
  const pfield = document.querySelector('[data-prompt-field]');
  const pbox = pfield ? pfield.querySelector('[contenteditable="true"],[role="textbox"]') : null;
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit') || null;
  const sf = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => /\\uc2dc\\uc791 \\ud504\\ub808\\uc784/.test(TX(e))) || null;
  const ef = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => /\\uc885\\ub8ec \\ud504\\ub808\\uc784|\\ub05d \\ud504\\ub808\\uc784|\\uc885\\ub8cc \\ud504\\ub808\\uc784/.test(TX(e))) || null;
  const ref = Array.from(document.querySelectorAll('button,[role="button"]')).find(e => /\\ub808\\ud37c\\ub7f0\\uc2a4 \\ucd94\\uac00\\ud558\\uae30/.test((e.getAttribute('aria-label')||'')+' '+TX(e))) || null;
  const out = { mainN: document.querySelectorAll('main *').length,
    pfield: pfield ? { rect: R(pfield), attrs: AT(pfield, ["data-prompt-field"]) } : null,
    pbox: pbox ? { rect: R(pbox), txt: TX(pbox), attrs: AT(pbox, ["role","contenteditable","aria-label"]) } : null,
    gen: gen ? { rect: R(gen), attrs: AT(gen, ["disabled","aria-disabled","aria-busy","type","data-off"]), cs: cs(gen, ["backgroundColor","opacity","cursor"]) } : null,
    sf: sf ? { rect: R(sf), attrs: AT(sf, ["aria-disabled","data-disabled","data-state","data-off","tabindex"]) } : null,
    ef: ef ? { rect: R(ef), attrs: AT(ef, ["aria-disabled","data-disabled","data-state","data-off","tabindex"]) } : null,
    ref: ref ? { rect: R(ref), attrs: AT(ref, ["aria-disabled","data-off","tabindex","aria-label","type"]) } : null };
  return JSON.stringify(out)
})()"""

# ---- focus-within scan: does ANY element change computed on focus? ----
FOCUS_SCAN_JS = HEAD + """
  const pbox = document.querySelector('[contenteditable="true"],[role="textbox"]');
  if (!pbox) return JSON.stringify({ err: 'no-textbox' });
  const form = document.querySelector('form');
  const nodes = form ? Array.from(form.querySelectorAll('*')) : [];
  pbox.blur(); await new Promise(r => setTimeout(r, 250));
  const before = new Map(); nodes.forEach(n => before.set(n, cs(n, ["borderColor","outline","boxShadow","backgroundColor"])));
  pbox.focus(); await new Promise(r => setTimeout(r, 350));
  const changed = [];
  nodes.forEach(n => { const b = before.get(n); const a = cs(n, ["borderColor","outline","boxShadow","backgroundColor"]);
    if (b && a && (b.borderOutlineDiff = (b.outline !== a.outline || b.boxShadow !== a.boxShadow || b.borderColor !== a.borderColor))) {
      if (b.outline !== a.outline || b.boxShadow !== a.boxShadow || b.borderColor !== a.borderColor) changed.push({ tag: n.tagName, cls: (n.className||'').toString().slice(0,50), outline: [b.outline, a.outline], boxShadow: [b.boxShadow, a.boxShadow], borderColor: [b.borderColor, a.borderColor], rect: R(n) }); } });
  return JSON.stringify({ active: document.activeElement ? (document.activeElement.tagName + ':' + TX(document.activeElement).slice(0,20)) : null, changedCount: changed.length, changed: changed.slice(0,12) });
})()"""

# ---- generate disabled vs prompt-empty/nonempty ----
GEN_ENABLE_JS = HEAD + """
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit');
  const pbox = document.querySelector('[contenteditable="true"],[role="textbox"]');
  if (!gen) return JSON.stringify({ err: 'no-gen' });
  const readGen = () => ({ disabled: gen.hasAttribute('disabled'), ariaDisabled: gen.getAttribute('aria-disabled'), csOpacity: cs(gen,["opacity"]).opacity, csCursor: cs(gen,["cursor"]).cursor, csBg: cs(gen,["backgroundColor"]).backgroundColor });
  const emptyTxt = pbox ? TX(pbox) : null;
  const out = { promptEmptyTxt: emptyTxt, genWhenEmpty: readGen() };
  if (pbox) { pbox.focus(); await new Promise(r => setTimeout(r, 150)); }
  await (async () => {})();
  return JSON.stringify(out);
})()"""

# ---- generate enable after typing ----
GEN_AFTER_TYPE_JS = HEAD + """
  await new Promise(r => setTimeout(r, 250));
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit');
  const pbox = document.querySelector('[contenteditable="true"],[role="textbox"]');
  const readGen = () => ({ disabled: gen ? gen.hasAttribute('disabled') : null, ariaDisabled: gen ? gen.getAttribute('aria-disabled') : null, csOpacity: gen ? cs(gen,["opacity"]).opacity : null, csCursor: gen ? cs(gen,["cursor"]).cursor : null });
  return JSON.stringify({ promptTxt: pbox ? TX(pbox).slice(0,30) : null, genAfterType: readGen() });
})()"""

# ---- frame hover/dragover ----
FRAME_HOVER_JS = """(async (tag, x, y) => {
  const KEYS = "%s".split(",");
  const cs = (el, keys) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = s[k]; return o };
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)} };
  const AT = (el, ns) => { const o = {}; if (!el) return o; for (const n of ns) o[n] = el.getAttribute(n); return o };
  const TX = el => (el && el.textContent || '').trim().replace(/\\s+/g, ' ');
  const rx = new RegExp(tag === 'sf' ? '\\\\uc2dc\\uc791 \\ud504\\ub808\\uc784' : '\\\\uc885\\ub8ec \\ud504\\ub808\\uc784|\\ub05d \\ud504\\ub808\\uc784|\\uc885\\ub8cc \\ud504\\ub808\\uc784');
  const el = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => rx.test(TX(e))) || null;
  if (!el) return JSON.stringify({ err: 'no-frame' });
  const box = el.querySelector('[data-dropzone-box],[class*="drop"]') || el.firstElementChild || el;
  return JSON.stringify({ tag: tag, elRect: R(el), boxRect: R(box),
    boxCs: cs(box, ["borderColor","borderStyle","borderRadius","backgroundColor","opacity","boxShadow"]),
    elAttrs: AT(el, ["aria-disabled","data-disabled","data-state","tabindex"]) });
})""" % KEYS

FRAME_TRANS_JS = """(async (tag, x, y, phase) => {
  const KEYS = "%s".split(",");
  const cs = (el, keys) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = s[k]; return o };
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)} };
  const TX = el => (el && el.textContent || '').trim().replace(/\\s+/g, ' ');
  const rx = new RegExp(tag === 'sf' ? '\\\\uc2dc\\uc791 \\ud504\\ub808\\uc784' : '\\\\uc885\\ub8ec \\ud504\\ub808\\uc784|\\ub05d \\ud504\\ub808\\uc784|\\uc885\\ub8cc \\ud504\\ub808\\uc784');
  const el = Array.from(document.querySelectorAll('label,[role="button"]')).find(e => rx.test(TX(e))) || null;
  if (!el) return JSON.stringify({ err: 'no-frame' });
  const box = el.querySelector('[data-dropzone-box],[class*="drop"]') || el.firstElementChild || el;
  if (phase === 'dragover') { el.dispatchEvent(new DragEvent('dragenter', { bubbles: true })); el.dispatchEvent(new DragEvent('dragover', { bubbles: true })); }
  return JSON.stringify({ phase, boxCs: cs(box, ["borderColor","borderStyle","borderRadius","backgroundColor","opacity","boxShadow"]), elState: el.getAttribute('data-state') });
})""" % KEYS

# ---- ref-uploader hover/active ----
REF_STATE_JS = """(async (phase) => {
  const KEYS = "%s".split(",");
  const cs = (el, keys) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = s[k]; return o };
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)} };
  const TX = el => (el && el.textContent || '').trim().replace(/\\s+/g, ' ');
  const AT = (el, ns) => { const o = {}; if (!el) return o; for (const n of ns) o[n] = el.getAttribute(n); return o };
  const el = Array.from(document.querySelectorAll('button,[role="button"]')).find(e => /\\ub808\\ud37c\\ub7f0\\uc2a4 \\ucd94\\uac00\\ud558\\uae30/.test((e.getAttribute('aria-label')||'')+' '+TX(e))) || null;
  if (!el) return JSON.stringify({ phase, err: 'no-ref', note: 'HF live \\uac8c\\uc2a4\\ud2b8 \\uc138\\uc158\\uc5d0 \\ub808\\ud37c\\ub7f0\\uc2a4 \\ucd94\\uac00 \\ub290\\ubb34\\uae08 \\ubbf8\\ucc3d\\uac74\\ubb34 — \\ud604\\ud589 \\ud504\\ub808\\uc784 \\ubaa8\\ub4dc(\\uc2dc\\uc791/\\uc885\\ub8ec \\ub4dc\\ub86d\\uc870\\ub9cc \\uc2dc\\uac01)' });
  return JSON.stringify({ phase, rect: R(el), cs: cs(el, ["backgroundColor","borderColor","borderStyle","borderRadius","opacity","boxShadow","cursor","transitionDuration"]), attrs: AT(el, ["aria-disabled","data-off","tabindex"]) });
})""" % KEYS

# ---- :active press-hold snapshot ----
GEN_ACTIVE_HOLD_JS = HEAD + """
  const gen = Array.from(document.querySelectorAll('button')).find(b => /^\\uc0dd\\uc131\\ud558\\uae30/.test(TX(b)) && b.type === 'submit');
  if (!gen) return JSON.stringify({ err: 'no-gen' });
  return JSON.stringify({ rect: R(gen), cs: cs(gen, ["transitionProperty","transitionDuration","transitionTimingFunction","transform"]) });
})()"""


async def mount(ws, sid, url):
    await send(ws, "Page.enable", {}, sid); await send(ws, "Runtime.enable", {}, sid)
    await send(ws, "Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, sid)
    await send(ws, "Page.navigate", {"url": url}, sid)
    await asyncio.sleep(3)
    await ev(ws, sid, DISMISS_JS); await asyncio.sleep(1.2); await ev(ws, sid, DISMISS_JS)
    d = None
    for _ in range(18):
        d = await ev(ws, sid, MOUNT_JS)
        if d.get("gen") and d.get("pfield") and d.get("mainN",0) >= 50: break
        await asyncio.sleep(1)
    assert d, f"mount 실패"
    return d

async def main():
    out = {}
    ver = json.loads(urllib.request.urlopen(HF_EP + "/json/version", timeout=10).read().decode())
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url":"about:blank"})
        a = await send(ws, "Target.attachToTarget", {"targetId": t["targetId"], "flatten": True})
        sid = a["sessionId"]
        out["base"] = await mount(ws, sid, HF_URL)
        out["focus_scan"] = await ev(ws, sid, FOCUS_SCAN_JS)
        # generate enable: read when empty
        out["gen_empty"] = await ev(ws, sid, GEN_ENABLE_JS)
        # focus pbox, type, re-read generate
        pboxrect = (out["base"].get("pbox") or {}).get("rect")
        await ev(ws, sid, '(() => { const p = document.querySelector(\'[contenteditable="true"],[role="textbox"]\'); if(p){p.focus();} return "1" })()')
        await insert_text(ws, sid, "고양이 영상")
        out["gen_after_type"] = await ev(ws, sid, GEN_AFTER_TYPE_JS)
        # restore (clear)
        await ev(ws, sid, '(() => { const p = document.querySelector(\'[contenteditable="true"],[role="textbox"]\'); if(p){p.focus(); document.execCommand("selectAll",false,null); document.execCommand("delete",false,null);} return "1" })()')
        # frame hover: move over sf center
        sf = (out["base"].get("sf") or {}).get("rect"); ef = (out["base"].get("ef") or {}).get("rect")
        if sf:
            cx, cy = sf["x"]+sf["w"]/2, sf["y"]+sf["h"]/2
            out["sf_rest"] = await ev(ws, sid, FRAME_HOVER_JS + "('sf', 0, 0)")
            await move(ws, sid, cx, cy); out["sf_hover"] = await ev(ws, sid, FRAME_TRANS_JS + f"('sf', {cx}, {cy}, 'hover')")
            out["sf_dragover"] = await ev(ws, sid, FRAME_TRANS_JS + f"('sf', {cx}, {cy}, 'dragover')")
            await move(ws, sid, 700, 200)  # move away
        if ef:
            cx, cy = ef["x"]+ef["w"]/2, ef["y"]+ef["h"]/2
            out["ef_rest"] = await ev(ws, sid, FRAME_HOVER_JS + "('ef', 0, 0)")
            await move(ws, sid, cx, cy); out["ef_hover"] = await ev(ws, sid, FRAME_TRANS_JS + f"('ef', {cx}, {cy}, 'hover')")
            await move(ws, sid, 700, 200)
        # ref-uploader hover/active
        out["ref_base"] = await ev(ws, sid, REF_STATE_JS + "('base')")
        await send(ws, "Target.closeTarget", {"targetId": t["targetId"]})
    with open("anim_verify/hf_element5_probe2.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    fs = out["focus_scan"]
    print("== focus_scan: active=", fs.get("active"), "changedCount=", fs.get("changedCount"))
    for c in (fs.get("changed") or [])[:8]: print("   ", c.get("tag"), c.get("cls"), "outline", c.get("outline"), "bshadow", c.get("boxShadow"), "border", c.get("borderColor"))
    ge = out["gen_empty"]; gt = out["gen_after_type"]
    print("== gen when empty:", ge.get("genWhenEmpty"), " promptEmptyTxt=", repr(ge.get("promptEmptyTxt")))
    print("== gen after type:", gt.get("genAfterType"), " promptTxt=", repr(gt.get("promptTxt")))
    print("== frame sf rest/hover/dragover:")
    for k in ("sf_rest","sf_hover","sf_dragover"):
        print("   ",k, (out.get(k) or {}).get("boxCs"), "state", (out.get(k) or {}).get("elState"))
    print("== frame ef rest/hover:")
    for k in ("ef_rest","ef_hover"):
        print("   ",k, (out.get(k) or {}).get("boxCs"))
    rb = out.get("ref_base") or {}
    print("== ref:", "err=", rb.get("err"), rb.get("note"), "cs=", rb.get("cs"))
    print("== base.ref:", out["base"].get("ref") is not None, " base.sf:", out["base"].get("sf") is not None, " base.ef:", out["base"].get("ef") is not None)
    return out

if __name__ == "__main__":
    asyncio.run(main())
