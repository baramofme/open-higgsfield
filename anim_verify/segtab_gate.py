#!/usr/bin/env python3
"""segtab_gate.py — 요소 1(세그먼트 탭) 동등성 게이트: HF live(:9222) ↔ OHF dev(:3116, via :9335)."""
import asyncio, json, sys, urllib.request, websockets

HF_EP = "http://127.0.0.1:9222"
HF_URL = "https://higgsfield.ai/ko/ai/video?model=minimax_h3"
OHF_EP = "http://127.0.0.1:9335"
OHF_URL = "http://127.0.0.1:3116/"

BASE = ("width,height,opacity,transform,cursor,fontSize,lineHeight,fontWeight,"
        "backgroundColor,borderRadius,boxShadow,color,transitionProperty,"
        "transitionDuration,transitionTimingFunction,display,position,padding,gap,flexDirection")
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

JS = """(async () => {
  const KEYS = ["width","height","opacity","transform","cursor","fontSize","lineHeight","fontWeight","backgroundColor","borderRadius","boxShadow","color","transitionProperty","transitionDuration","transitionTimingFunction","display","position","padding","gap","flexDirection"];
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)} };
  const cs = (el, keys) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = s[k]; return o };
  const segTabs = () => Array.from(document.querySelectorAll('[role="tab"]')).filter(t => /\\u1f49f|\\u1f490|\\uc785\\ub825 \\ud56d\\ubaa9|\\uc2dc\\uc791 \\ud504\\ub808|\\ub808\\ud37c\\ub7f0\\uc2a4|\\ud504\\ub808\\uc784/.test((t.textContent||'').trim()));
  const segInd = () => { const n = document.querySelector('[data-ohf-video="140"]'); return n || document.querySelector('[data-orientation="horizontal"][role="presentation"]'); };
  const out = { mainN: document.querySelectorAll('main *').length };
  const tabs = segTabs();
  out.tabCount = tabs.length;
  out.tabs = tabs.map(t => ({ txt: (t.textContent||'').trim().replace(/\\s+/g,' '), sel: t.getAttribute('aria-selected'), ti: t.getAttribute('tabindex'), rect: R(t), cs: cs(t, KEYS), cls: (t.className||'').toString().slice(0,70) }));
  out.ind = (() => { const el = segInd(); if (!el) return null; const st = el.getAttribute('style')||''; const m = {}; st.split(';').forEach(p => { const kv = p.split(':'); if (kv.length === 2) m[kv[0].trim()] = kv[1].trim(); }); return { attrs: {orient: el.getAttribute('data-orientation'), act: el.getAttribute('data-activation-direction'), role: el.getAttribute('role')}, rect: R(el), cs: cs(el, KEYS), inline: m, cls: (el.className||'').toString().slice(0,70) }; })();
  out.selBefore = { tabs: out.tabs, ind: out.ind };
  const ref = tabs.find(t => /\\ub808\\ud37c\\ub7f0\\uc2a4/.test((t.textContent||'').trim()));
  const frm = tabs.find(t => /\\ud504\\ub808\\uc784/.test((t.textContent||'').trim()) && !/\\uc785\\ub825 \\ud56d\\ubaa9/.test((t.textContent||'').trim()));
  if (ref) { ref.click(); }
  await new Promise(r => setTimeout(r, 350));
  const tabs2 = segTabs();
  const ind2 = (() => { const el = segInd(); if (!el) return null; const st = el.getAttribute('style')||''; const m = {}; st.split(';').forEach(p => { const kv = p.split(':'); if (kv.length === 2) m[kv[0].trim()] = kv[1].trim(); }); return { attrs: {orient: el.getAttribute('data-orientation'), act: el.getAttribute('data-activation-direction')}, rect: R(el), cs: cs(el, KEYS), inline: m }; })();
  out.selAfterRef = { tabs: tabs2.map(t => ({ txt: (t.textContent||'').trim().replace(/\\s+/g,' '), sel: t.getAttribute('aria-selected'), ti: t.getAttribute('tabindex'), rect: R(t), cs: cs(t, KEYS) })), ind: ind2 };
  out.clickTargetTxt = ref ? (ref.textContent||'').trim().replace(/\\s+/g,' ') : null;
  if (frm) { frm.click(); await new Promise(r0 => setTimeout(r0, 350)); }
  const tabs3 = segTabs();
  const ind3 = (() => { const el = segInd(); if (!el) return null; const st = el.getAttribute('style')||''; const m = {}; st.split(';').forEach(p => { const kv = p.split(':'); if (kv.length === 2) m[kv[0].trim()] = kv[1].trim(); }); return { rect: R(el), cs: cs(el, KEYS), inline: m }; })();
  out.selAfterFrame = { tabs: tabs3.map(t => ({ txt: (t.textContent||'').trim().replace(/\\s+/g,' '), sel: t.getAttribute('aria-selected'), ti: t.getAttribute('tabindex'), rect: R(t), cs: cs(t, KEYS) })), ind: ind3 };
  return JSON.stringify(out)
})()"""

async def snap(ws, sid, url, tag):
    t = await send(ws, "Target.createTarget", {"url": "about:blank"})
    a = await send(ws, "Target.attachToTarget", {"targetId": t["targetId"], "flatten": True})
    sid = a["sessionId"]
    await send(ws, "Page.enable", {}, sid)
    await send(ws, "Runtime.enable", {}, sid)
    await send(ws, "Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, sid)
    await send(ws, "Page.navigate", {"url": url}, sid)
    await asyncio.sleep(3)
    d = None
    for _ in range(14):
        r = await send(ws, "Runtime.evaluate", {"expression": JS, "returnByValue": True, "awaitPromise": True}, sid)
        try:
            d = json.loads(r["result"]["value"])
        except Exception:
            await asyncio.sleep(1); continue
        if d.get("mainN", 0) >= 50 and d.get("tabCount", 0) >= 2:
            break
        await asyncio.sleep(1)
    assert d is not None, "snapshot 실패"
    await send(ws, "Target.closeTarget", {"targetId": t["targetId"]})
    d["tag"] = tag
    return d

def norm(d):
    """지오메트리를 원점(fieldset/세그먼트 기준) 상대가 아닌 뷰포트 절대값 그대로 두되, 전역 shift는 tabs[0].x/y로 상쇄."""
    tabs = d.get("selBefore", {}).get("tabs") or []
    if not tabs: return d
    ox, oy = tabs[0]["rect"]["x"], tabs[0]["rect"]["y"]
    def shift(nodes):
        for n in nodes:
            if n and n.get("rect"):
                n["rect"]["x"] -= ox; n["rect"]["y"] -= oy
    shift(d["selBefore"]["tabs"])
    for k in ("selAfterRef", "selAfterFrame"):
        if d.get(k):
            shift(d[k]["tabs"])
    for k in ("selBefore", "selAfterRef", "selAfterFrame"):
        if d.get(k, {}).get("ind"):
            d[k]["ind"]["rect"]["x"] -= ox; d[k]["ind"]["rect"]["y"] -= oy
    return d

def cmp_side(a, b, label, mism):
    if not a or not b:
        mism.append(f"{label}: 사이드 결측"); return
    for k in ("w", "h"):
        if abs(a["rect"][k] - b["rect"][k]) > 0.01:
            mism.append(f"{label}.{k}: {a['rect'][k]} != {b['rect'][k]}")
    for k in ("x", "y"):
        if abs(a["rect"][k] - b["rect"][k]) > 2.0:
            mism.append(f"{label}.{k}: {a['rect'][k]} != {b['rect'][k]}")
    for k, v in b["cs"].items():
        if a["cs"].get(k) != v:
            mism.append(f"{label}.cs.{k}: {a['cs'].get(k)!r} != {v!r}")
    if a.get("inline") and b.get("inline"):
        for k, v in b["inline"].items():
            if a["inline"].get(k) != v:
                mism.append(f"{label}.inline.{k}: {a['inline'].get(k)!r} != {v!r}")

async def main():
    mismatches = []
    snaps = {}
    for tag, ep, url in (("HF", HF_EP, HF_URL), ("OHF", OHF_EP, OHF_URL)):
        ver = json.loads(urllib.request.urlopen(ep + "/json/version", timeout=10).read().decode())
        async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
            snaps[tag] = norm(await snap(ws, None, url, tag))
    # 트리거 텍스트 동등
    for st in ("selBefore", "selAfterRef", "selAfterFrame"):
        ha = snaps["HF"][st]["tabs"]; oa = snaps["OHF"][st]["tabs"]
        if len(ha) != len(oa):
            mismatches.append(f"{st}.tabCount: {len(ha)} != {len(oa)}")
        for h, o in zip(ha, oa):
            if h["txt"] != o["txt"]:
                mismatches.append(f"{st}.tab.txt: {h['txt']!r} != {o['txt']!r}")
            if h["sel"] != o["sel"]:
                mismatches.append(f"{st}.tab.aria-selected: {h['sel']!r} != {o['sel']!r}")
            if h["ti"] != o["ti"]:
                mismatches.append(f"{st}.tab.tabindex: {h['ti']!r} != {o['ti']!r}")
            cmp_side(h, o, f"{st}.tab[{h['txt']}]", mismatches)
        cmp_side(snaps["HF"][st]["ind"], snaps["OHF"][st]["ind"], f"{st}.ind", mismatches)
    # 선택 이동 판정: 레퍼런스 클릭 후 selected 이동, 프레임 복귀 후 원복
    def selidx(d, st):
        for i, t in enumerate(d[st]["tabs"]):
            if t["sel"] == "true": return t["txt"]
        return None
    for tag in ("HF", "OHF"):
        before = selidx(snaps[tag], "selBefore"); after = selidx(snaps[tag], "selAfterRef"); back = selidx(snaps[tag], "selAfterFrame")
        print(f"[{tag}] sel: before={before} afterRef={after} afterFrame={back}")
        if before == after: mismatches.append(f"{tag}: 레퍼런스 클릭 후 선택 미이동")
        if after != back: mismatches.append(f"{tag}: 프레임 복귀 실패")
    json.dump({"snaps": snaps, "mismatches": mismatches}, open("segtab_gate_report.json", "w"), ensure_ascii=False, indent=1)
    print("MISMATCHES:", len(mismatches))
    for m in mismatches: print("  -", m)

asyncio.run(main())
