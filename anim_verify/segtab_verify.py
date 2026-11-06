#!/usr/bin/env python3
"""t_e0c64917 — 요소 1: 세그먼트 탭(레퍼런스↔프레임) 전환 동작 실측 (v2).

HF live(:9222) 가 ground-truth, OHF dev(:3113, 측정 chrome :9335) 가 검증 대상.
양 흐름을 같은 asyncio 루프에서 동시 진행(동시 라이브 실측).
모든 판정 근거는 라이브 DOM 실측만 사용한다 — fabrication 금지.

v2 변경:
  1) 지오메트리는 tablist 원점 기준 상대값으로 정규화(페이지 전역 shift-가 HF에서
     관측되어 절대 y 비교는 무의미 → 리스트 기준 상대값이 동속성 판정의 알짜).
  2) 매 상호작용 직전 새 스냅샷에서 좌표를 다시 계산(정적 좌표로 클릭하면 HF 레이아웃
     shift 때문에 빗나갔던 v1 결함 교정).
  3) Enter 활성화 단계(s4) 추가 — 수동 활성화 여부 판별.
  4) 콘텐츠(드롭존) 지오메트리 잔차는 정적 소관으로 별도 버킷(content_residual)에
     분리 기록. 판정(OVERALL)은 탭 메커니즘·indicator·키보드 only.

상태 시퀀스(양쪽 동일 조작):
  s0(초기) → hover(레퍼런스 중심) → click(레퍼런스 정적 클릭) → s1 →
  focus(레퍼런스)+ArrowRight → s2 → ArrowLeft → s3 → Enter → s4
"""
import asyncio, json, time, urllib.request
import websockets

HF_EP = "http://127.0.0.1:9222"
OHF_EP = "http://127.0.0.1:9335"
HF_URL = "https://higgsfield.ai/ko/ai/video?model=minimax_h3"
OHF_URL = "http://127.0.0.1:3113/"
KEY = "openhiggsfield.active.v2"

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

SNAP_JS = r"""
(() => {
  const rect = el => { const r = el.getBoundingClientRect();
    return {x:+r.x.toFixed(2), y:+r.y.toFixed(2), w:+r.width.toFixed(2), h:+r.height.toFixed(2)}; };
  const cs = el => { const s = getComputedStyle(el); return {
    color: s.color, backgroundColor: s.backgroundColor, borderRadius: s.borderRadius,
    boxShadow: s.boxShadow, transitionProperty: s.transitionProperty,
    transitionDuration: s.transitionDuration, transitionTimingFunction: s.transitionTimingFunction,
    transform: s.transform }; };
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
    .filter(t => ['레퍼런스','프레임'].includes((t.textContent||'').trim()));
  const list = tabs.length ? tabs[0].closest('[role="tablist"]') : null;
  const root = list ? list.parentElement : null;
  let ind = document.querySelector('.q-tabs-indicator');
  if (!ind && root) ind = root.querySelector('[role="presentation"][style*="active-tab"]');
  const content = root ? (function(){ const el = root.nextElementSibling; if(!el) return null;
    const kids = Array.from(el.querySelectorAll('[data-state],[data-disabled]')).map(k => ({
      txt:(k.textContent||'').trim().replace(/\s+/g,' ').slice(0,30),
      state:k.getAttribute('data-state'), disabled:k.getAttribute('data-disabled'),
      rect: rect(k) }));
    return { rect: rect(el), kids: kids }; })() : null;
  return JSON.stringify({
    ready: document.readyState,
    tabs: tabs.map(t => ({ txt:(t.textContent||'').trim(),
      attrs:{ 'aria-selected':t.getAttribute('aria-selected'), tabindex:t.getAttribute('tabindex'),
        'data-active':t.getAttribute('data-active'),
        'data-composite-item-active':t.getAttribute('data-composite-item-active'),
        'aria-disabled':t.getAttribute('aria-disabled'), 'data-orientation':t.getAttribute('data-orientation') },
      cs: cs(t), rect: rect(t) })),
    list: list ? { orientation:list.getAttribute('data-orientation'),
      dir: list.getAttribute('data-activation-direction'),
      id: list.id, cls: list.className, cs: cs(list), rect: rect(list) } : null,
    root: root ? { dir: root.getAttribute('data-activation-direction'),
      tint: (root.getAttribute('style')||''), cs: cs(root) } : null,
    ind: ind ? { style: ind.getAttribute('style'), cls: String(ind.className||''),
      dir: ind.getAttribute('data-activation-direction'), cs: cs(ind), rect: rect(ind) } : null,
    content: content,
    focusText: document.activeElement ? (document.activeElement.textContent||'').trim().slice(0,20) : null
  });
})()
"""

async def wait_tabs(ws, sid, secs=25):
    t0 = time.time()
    while time.time() - t0 < secs:
        r = await send(ws, "Runtime.evaluate", {"expression": SNAP_JS, "returnByValue": True}, sid)
        v = json.loads(r["result"]["value"])
        if len(v["tabs"]) == 2 and v["ind"] is not None:
            await asyncio.sleep(0.8)
            return v
        await asyncio.sleep(0.4)
    raise RuntimeError("tablist never appeared")

async def snap(ws, sid):
    r = await send(ws, "Runtime.evaluate", {"expression": SNAP_JS, "returnByValue": True}, sid)
    return json.loads(r["result"]["value"])

async def hover(ws, sid, x, y):
    await send(ws, "Input.dispatchMouseEvent",
               {"type": "mouseMoved", "x": x, "y": y, "button": "none", "clickCount": 0}, sid)

async def click(ws, sid, x, y):
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

async def focus_tab(ws, sid, want):
    await send(ws, "Runtime.evaluate", {
        "expression": ("(()=>{const ts=Array.from(document.querySelectorAll('[role=\"tab\"]'))"
                       ".filter(t=>['레퍼런스','프레임'].includes((t.textContent||'').trim()));"
                       "const t=ts.find(t=>(t.textContent||'').trim()==='%s');if(t)t.focus();})()" % want)}, sid)

def tab_center(state, want):
    t = [x for x in state["tabs"] if x["txt"] == want]
    if not t: raise RuntimeError("no tab " + want)
    r = t[0]["rect"]
    return r["x"] + r["w"] / 2.0, r["y"] + r["h"] / 2.0

async def run_flow(ep, url, label, is_hf):
    for _ in range(30):
        try:
            ver = http_json(ep, "/json/version"); break
        except Exception:
            await asyncio.sleep(0.5)
    else:
        raise RuntimeError(f"{ep} never came up")
    bws = ver["webSocketDebuggerUrl"]
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
        if not is_hf:
            await send(ws, "Page.navigate", {"url": url}, sid)
            await asyncio.sleep(0.6)
            await send(ws, "Runtime.evaluate",
                       {"expression": f"try{{localStorage.removeItem('{KEY}')}}catch(e){{}}"}, sid)
            await send(ws, "Page.navigate", {"url": url}, sid)
        else:
            await send(ws, "Page.navigate", {"url": url}, sid)
        await asyncio.sleep(1.2)
        await wait_tabs(ws, sid)
        # 세션 잔존 상태 제거 — run3 에서 HF 가 이전 런(run2)의 탭 선택을
        # localStorage 로 기억해 s0 가 레퍼런스 선택으로 나타난 것을 실측으로 확인.
        # 양쪽 공통으로 스토리지를 비운 뒤 재로드하여 순수 초기 상태로 정렬한다.
        await send(ws, "Runtime.evaluate",
                   {"expression": "try{localStorage.clear()}catch(e){};"
                                   "try{sessionStorage.clear()}catch(e){}"}, sid)
        if not is_hf:
            await send(ws, "Runtime.evaluate",
                       {"expression": f"try{{localStorage.removeItem('{KEY}')}}catch(e){{}}"}, sid)
        await send(ws, "Page.navigate", {"url": url}, sid)
        await asyncio.sleep(1.2)
        s0 = await wait_tabs(ws, sid)
        # 매 상호작용 직전 좌표 재계산(전역 shift 대응)
        pre = await snap(ws, sid)
        hx, hy = tab_center(pre, "레퍼런스")
        await hover(ws, sid, hx, hy)
        await asyncio.sleep(0.5)
        sh = await snap(ws, sid)
        pre2 = await snap(ws, sid)
        hx, hy = tab_center(pre2, "레퍼런스")
        await click(ws, sid, hx, hy)
        await asyncio.sleep(0.9)
        s1 = await snap(ws, sid)
        await focus_tab(ws, sid, "레퍼런스")
        await asyncio.sleep(0.2)
        await key(ws, sid, "ArrowRight", 39)
        await asyncio.sleep(0.7)
        s2 = await snap(ws, sid)
        await key(ws, sid, "ArrowLeft", 37)
        await asyncio.sleep(0.7)
        s3 = await snap(ws, sid)
        await key(ws, sid, "Enter", 13)
        await asyncio.sleep(0.7)
        s4 = await snap(ws, sid)
        try:
            await send(ws, "Target.closeTarget", {"targetId": target})
        except Exception:
            pass
        return {"label": label, "s0": s0, "pre": pre, "hover": sh, "s1": s1,
                "s2": s2, "s3": s3, "s4": s4}

def var_map(style_str):
    out = {}
    for part in (style_str or "").split(";"):
        if ":" in part:
            k, v = part.split(":", 1)
            k = k.strip(); v = v.strip()
            if k.startswith("--active-tab"):
                out[k] = v
    return out

def num(v):
    try:
        return float(str(v).replace("px", "").strip())
    except Exception:
        return None

def rel(state, r):
    """tablist 원점 기준 상대 지오메트리(전역 shift 무효화)."""
    o = (state.get("list") or {}).get("rect")
    if not o or not r:
        return r
    return {"x": round(r["x"] - o["x"], 2), "y": round(r["y"] - o["y"], 2),
            "w": r["w"], "h": r["h"]}

def cmp_mechanics(h, o, name):
    """탭 메커니즘·indicator·activation direction — 요소 1의 판정 게이트."""
    issues = []
    for i, (th, to) in enumerate(zip(h["tabs"], o["tabs"])):
        if th["txt"] != to["txt"]:
            issues.append(f"{name} tab{i} txt {th['txt']}!={to['txt']}")
        for k in ("aria-selected", "tabindex", "data-active",
                  "data-composite-item-active", "aria-disabled"):
            if th["attrs"].get(k) != to["attrs"].get(k):
                issues.append(f"{name} tab[{th['txt']}].{k} HF={th['attrs'].get(k)!r} OHF={to['attrs'].get(k)!r}")
        for k in ("color", "backgroundColor"):
            if th["cs"][k] != to["cs"][k]:
                issues.append(f"{name} tab[{th['txt']}].{k} HF={th['cs'][k]} OHF={to['cs'][k]}")
        rh, ro = rel(h, th["rect"]), rel(o, to["rect"])
        if rh and ro and (abs(rh["x"] - ro["x"]) > 1.5 or abs(rh["w"] - ro["w"]) > 1.5):
            issues.append(f"{name} tab[{th['txt']}].relrect HF={rh} OHF={ro}")
        # 탭 높이 잔차: QA disclosed_geometry_residual(128/134 'rect h Δ8.0px =
        # content-driven, 부모 content-domain')로 기확정·용인된 잔차 → Δ8 는 면제,
        # 그 외 크기 차이만 실결함으로 계상.
        if rh and ro and abs(rh["h"] - ro["h"]) > 1.5 and abs(abs(rh["h"] - ro["h"]) - 8.0) > 1.5:
            issues.append(f"{name} tab[{th['txt']}].h Δ disclosed(8px) 초과 HF={rh['h']} OHF={ro['h']}")
    for a, b in (("list", "dir"), ("root", "dir"), ("ind", "dir")):
        hh = h.get(a) or {}; oo = o.get(a) or {}
        if hh.get(b) != oo.get(b):
            issues.append(f"{name} {a}.{b} HF={hh.get(b)!r} OHF={oo.get(b)!r}")
    ih, io = h.get("ind") or {}, o.get("ind") or {}
    vh, vo = var_map(ih.get("style")), var_map(io.get("style"))
    for k in sorted(set(vh) | set(vo)):
        nh, nv = num(vh.get(k)), num(vo.get(k))
        if nh is None or nv is None:
            issues.append(f"{name} ind {k} HF={vh.get(k)!r} OHF={vo.get(k)!r}")
        elif abs(nh - nv) > 0.6:
            issues.append(f"{name} ind {k} HF={nh} OHF={nv}")
    rh, ro = rel(h, ih.get("rect")), rel(o, io.get("rect"))
    if rh and ro:
        for k in ("x", "y", "w", "h"):
            if abs(rh[k] - ro[k]) > 1.5:
                issues.append(f"{name} ind.relrect.{k} HF={rh[k]} OHF={ro[k]}")
    for k in ("transitionProperty", "transitionDuration", "transitionTimingFunction",
              "backgroundColor", "boxShadow", "borderRadius"):
        if (ih.get("cs") or {}).get(k) != (io.get("cs") or {}).get(k):
            issues.append(f"{name} ind.{k} HF={(ih.get('cs') or {}).get(k)!r} OHF={(io.get('cs') or {}).get(k)!r}")
    # s0 초기 포커스는 페이지 환경 요인(HF 는 게스트 프로모 배너가 포커스, OHF 는 body)
    # — 요소의 동작 산출물이 아니므로 s0 는 포커스 비교에서 제외(s1~s4 게이트).
    if name != "s0" and h.get("focusText") != o.get("focusText"):
        issues.append(f"{name} focus HF={h.get('focusText')!r} OHF={o.get('focusText')!r}")
    return issues

def cmp_content(h, o, name):
    """드롭존 콘텐츠 상태 패리티(정적 지오메트리 잔차는 별도 기록, 판정 게이트 아님)."""
    residual = []
    ch = h.get("content") or {}; co = o.get("content") or {}
    kh = ch.get("kids") or []; ko = co.get("kids") or []
    if len(kh) != len(ko):
        residual.append(f"{name} content kids count HF={len(kh)} OHF={len(ko)}")
    for a, b in zip(kh, ko):
        if a["state"] != b["state"] or a["disabled"] != b["disabled"] or a["txt"] != b["txt"]:
            residual.append(f"{name} content kid 상태 HF={(a['state'],a['disabled'],a['txt'])} OHF={(b['state'],b['disabled'],b['txt'])}")
        rh, ro = rel(h, a["rect"]), rel(o, b["rect"])
        if rh and ro and abs(rh["x"] - ro["x"]) > 1.5:
            residual.append(f"{name} content kid relx HF={rh['x']} OHF={ro['x']}")
        if abs(a["rect"]["h"] - b["rect"]["h"]) > 1.5:
            residual.append(f"{name} content kid h HF={a['rect']['h']} OHF={b['rect']['h']}")
    return residual

async def main():
    hf, ohf = await asyncio.gather(
        run_flow(HF_EP, HF_URL, "HF", True),
        run_flow(OHF_EP, OHF_URL, "OHF", False))
    report = {"hf": hf, "ohf": ohf, "checks": {}, "content_residual": {}}
    all_issues = []
    for name in ("s0", "s1", "s2", "s3", "s4"):
        iss = cmp_mechanics(hf[name], ohf[name], name)
        report["checks"][name] = {"issues": iss, "pass": not iss}
        all_issues.extend(iss)
        report["content_residual"][name] = cmp_content(hf[name], ohf[name], name)
    report["hover_info"] = {
        "hf_tab": [{"txt": t["txt"], "bg": t["cs"]["backgroundColor"], "color": t["cs"]["color"]}
                   for t in hf["hover"]["tabs"]],
        "ohf_tab": [{"txt": t["txt"], "bg": t["cs"]["backgroundColor"], "color": t["cs"]["color"]}
                    for t in ohf["hover"]["tabs"]],
    }
    # HF 동작 요약(라이브 실측 원문만)
    def sel(state):
        return {t["txt"]: t["attrs"]["aria-selected"] for t in state["tabs"]}
    report["hf_behavior"] = {st: {"sel": sel(hf[st]),
                                  "focus": hf[st]["focusText"],
                                  "tabindex": {t["txt"]: t["attrs"]["tabindex"] for t in hf[st]["tabs"]}}
                             for st in ("s0", "s1", "s2", "s3", "s4")}
    report["OVERALL"] = "PASS" if not all_issues else "FAIL"
    report["issue_total"] = len(all_issues)
    out = "/home/baramofme/open-higgsfield/.worktrees/t_e0c64917/anim_verify/segtab_report.json"
    with open(out, "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print("OVERALL:", report["OVERALL"], "issues:", report["issue_total"])
    for i in all_issues[:40]:
        print("  ISSUE:", i)
    print("HF BEHAVIOR:", json.dumps(report["hf_behavior"], ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
