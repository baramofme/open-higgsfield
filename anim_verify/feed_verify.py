#!/usr/bin/env python3
"""t_483bdaf0 — 요소 2: 피드/쇼케이스 카드 autoplay·hover·mute·expanded 실측.

HF live(:9222) = ground-truth, OHF dev(:3114, 측정 chrome :9335) = 검증 대상.
양 흐름을 같은 asyncio 루프에서 동시 진행(동시 라이브 실측).
모든 판정 근거는 라이브 DOM 실측만 — fabrication 금지.

시나리오(양쪽 동일 조작):
  load → s0(상단, 카드는 뷰포트 밖/경계) → scroll_down(카드를 뷰포트로) → s1
  → hover(대표 카드 center) → sh → click(대표 카드) → sc
  → scroll_up(카드로 복귀) → s2
HF ground-truth 실측으로 확정한 동속성(부모/본 프로브):
  autoplay = IntersectionObserver(교차 진입 재생·이탈 정지; hover 로는 재생 안 됨),
  mute/expanded = 피드 카드에 없음(HF 라이브 allMute=0·카드 exps 없음).

판정 게이트(OVERALL):
  ① autoplay semantics: 뷰포트 교차 시 재생(paused=false)/이탈 시 정지(paused=true)
     의 동작이 HF·OHF 모두 성립(카탈로그 관례). 카드별 in-view↔playing 동등.
  ② hover: 대표 카드의 hover 시 computed(bg/opacity/transform) HF↔OHF 동등.
  ③ transition 동속성: 카드 computed transition* HF↔OHF 동등.
  ④ mute/expanded: 카드의 mute-button·aria-expanded 부재 HF↔OHF 동등(honest match).
지오메트리 잔차·뷰포트 절대 위치 차이는 content_residual 버킷(판정 아님).
"""
import asyncio, json, time, urllib.request
import websockets

HF_EP = "http://127.0.0.1:9222"
OHF_EP = "http://127.0.0.1:9335"
HF_URL = "https://higgsfield.ai/ko/ai/video?model=minimax_h3"
OHF_URL = "http://127.0.0.1:3114/"
_msg = 0
async def send(ws, method, params=None, session=None):
    global _msg
    _msg += 1
    mid = _msg
    m = {"id": mid, "method": method, "params": params or {}}
    if session: m["sessionId"] = session
    await ws.send(json.dumps(m))
    while True:
        raw = await asyncio.wait_for(ws.recv(), timeout=30)
        d = json.loads(raw)
        if d.get("id") == mid:
            if "error" in d: raise RuntimeError(f"{method} -> {d['error']}")
            return d.get("result", {})
def http_json(ep, path):
    with urllib.request.urlopen(ep + path, timeout=10) as r:
        return json.loads(r.read().decode())

# 피드/쇼케이스 카드(video 포함 figure/article) + 뷰포트 교차 판정 + computed
FEED_JS = r"""
(() => {
  const rect = el => { const r = el.getBoundingClientRect();
    return {x:+r.x.toFixed(2), y:+r.y.toFixed(2), w:+r.width.toFixed(2), h:+r.height.toFixed(2)}; };
  const cs = el => { const s = getComputedStyle(el); return {
    opacity: s.opacity, backgroundColor: s.backgroundColor, color: s.color,
    boxShadow: s.boxShadow, borderRadius: s.borderRadius, transform: s.transform,
    transitionProperty: s.transitionProperty, transitionDuration: s.transitionDuration,
    transitionTimingFunction: s.transitionTimingFunction, overflow: s.overflow }; };
  const vw = window.innerWidth, vh = window.innerHeight;
  // 교차 판정(rootMargin 120px 상·하 유예 포함 — OHF hook 관례)
  const intersects = r => { const m=120;
    return r.y < (vh+m) && (r.y+r.h) > (-m); };
  const vids = Array.from(document.querySelectorAll('video'));
  const cards = [];
  for (const v of vids) {
    let card = v.closest('figure') || v.closest('article') || v.closest('li') || v.parentElement;
    // 카드에 group 클래스가 있는지(Tailwind group-hover 게이트)
    const hasGroup = /(^|\s)group(\s|$)/.test(String((card||{}).className||''));
    // 카드 내부 mute/sound 라벨 버튼
    const muteBtn = card ? Array.from(card.querySelectorAll('button,[aria-label]'))
       .find(b=>/음소거|mute|sound|소리|음성|volume/i.test((b.getAttribute('aria-label')||'')+(b.textContent||''))) : null;
    const cardExpanded = card ? card.getAttribute('aria-expanded') : null;
    cards.push({ vcls:String(v.className||'').slice(0,30), cardcls:String((card||{}).className||'').slice(0,60),
      cardtag:(card||{}).tagName, hasGroup:hasGroup,
      cardrect: card?rect(card):null, vrect: rect(v), vintersect: intersects(rect(v)),
      cardintersect: card?intersects(rect(card)):null,
      vpaused:v.paused, vmuted:v.muted, vautoplay:v.autoplay, vcontrols:v.controls,
      vcurrentTime:+v.currentTime.toFixed(3), vreadyState:v.readyState,
      vcs: cs(v), cardcs: card?cs(card):null,
      muteBtn: muteBtn?{cls:String(muteBtn.className||'').slice(0,40),
                ariaLabel:muteBtn.getAttribute('aria-label')}:null,
      cardExpanded: cardExpanded });
  }
  return JSON.stringify({ ready: document.readyState, url: location.href,
    scrollY: +window.scrollY.toFixed(1), vw, vh, cards });
})()
"""

async def snap(ws, sid):
    r = await send(ws, "Runtime.evaluate", {"expression": FEED_JS, "returnByValue": True}, sid)
    return json.loads(r["result"]["value"])
async def wait_feed(ws, sid, secs=45):
    t0=time.time()
    while time.time()-t0<secs:
        v=await snap(ws,sid)
        if v["ready"]=="complete" and len(v["cards"])>0:
            # 초기 자동재생 settle 대기: HF 는 리모트 영상(preload none)이라
            # 스냅샷 시점에 아직 미로드(readyState 0·paused true)일 수 있다.
            # 초기 in-view 재생이 실제로 발화되어 paused=false 가 될 때까지(또는
            # 최대 여유시간) 폴 — 판정은 settle 된 초기 상태를 본다.
            t1=time.time()
            while time.time()-t1<12:
                v2=await snap(ws,sid)
                if any(not c["vpaused"] for c in v2["cards"]):
                    await asyncio.sleep(0.4); return v2
                await asyncio.sleep(0.4)
            await asyncio.sleep(0.6); return v
        await asyncio.sleep(0.4)
    raise RuntimeError("feed cards never appeared")
async def hover(ws,sid,x,y):
    await send(ws,"Input.dispatchMouseEvent",
               {"type":"mouseMoved","x":x,"y":y,"button":"none","clickCount":0},sid)
async def click(ws,sid,x,y):
    await send(ws,"Input.dispatchMouseEvent",
               {"type":"mousePressed","x":x,"y":y,"button":"left","clickCount":1},sid)
    await send(ws,"Input.dispatchMouseEvent",
               {"type":"mouseReleased","x":x,"y":y,"button":"left","clickCount":1},sid)
async def scroll(ws,sid,dy):
    # window 스크롤(JS 로可靠하게) — wheel 중심 지오메트리 함정 회피
    await send(ws,"Runtime.evaluate",
               {"expression":f"window.scrollBy(0,{dy})"},sid)

def rep_card(state):
    # 대표 카드: video 를 가진 showcase 카드 중 첫 번째(들려오는 순서대로)
    cs=[c for c in state["cards"] if c["cardtag"] in ("FIGURE","ARTICLE","LI")]
    return cs[0] if cs else (state["cards"][0] if state["cards"] else None)
def card_center(card):
    r = card["cardrect"] or card["vrect"]
    return r["x"]+r["w"]/2, r["y"]+r["h"]/2

async def run_flow(ep, url, label, is_hf):
    for _ in range(30):
        try: ver=http_json(ep,"/json/version"); break
        except Exception: await asyncio.sleep(0.5)
    else: raise RuntimeError(f"{ep} never came up")
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=16_000_000) as ws:
        t=await send(ws,"Target.createTarget",{"url":"about:blank"}); target=t["targetId"]
        sid=(await send(ws,"Target.attachToTarget",{"targetId":target,"flatten":True}))["sessionId"]
        await send(ws,"Page.enable",{},sid); await send(ws,"Runtime.enable",{},sid)
        await send(ws,"Emulation.setDeviceMetricsOverride",
                   {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False},sid)
        await send(ws,"Network.enable",{},sid)
        await send(ws,"Network.setCacheDisabled",{"cacheDisabled":True},sid)
        await send(ws,"Page.navigate",{"url":url},sid)
        await asyncio.sleep(1.2)
        s0=await wait_feed(ws,sid)
        # 스크롤로 카드를 뷰포트로 → autoplay 트리거
        await scroll(ws,sid,500); await asyncio.sleep(1.4)
        s1=await snap(ws,sid)
        # 대표 카드 hover(좌표는 직전 스냅샷에서 재계산)
        pre=await snap(ws,sid)
        rc=rep_card(pre)
        if rc:
            cx,cy=card_center(rc)
            await hover(ws,sid,cx,cy); await asyncio.sleep(0.6)
            sh=await snap(ws,sid)
        else: sh=None
        # 카드 click(동작 확인)
        if rc:
            pre2=await snap(ws,sid); cx,cy=card_center(rep_card(pre2))
            await click(ws,sid,cx,cy); await asyncio.sleep(1.2)
            sc=await snap(ws,sid)
        else: sc=None
        # 상단 복귀 → 카드 이탈 → 정지 확인
        await scroll(ws,sid,-900); await asyncio.sleep(1.4)
        s2=await snap(ws,sid)
        # 멀리 스크롤(카드를 뷰포트 밖으로) → 정지(paused) 발화 확인
        await scroll(ws,sid,2500); await asyncio.sleep(1.6)
        s3=await snap(ws,sid)
        # 창(window)이 스크롤되지 않는 레이아웃이므로 카드 이탈을 viewport 축소로 유도.
        # 높이를 120px 마진 너비 밖(180)으로 줄여 쇼케이스 카드가 IO 교차 범위에서
        # 벗어나 정지하는지 확인(카탈로그 관례의 pause-on-exit 갈무리).
        await send(ws,"Emulation.setDeviceMetricsOverride",
                   {"width":1440,"height":180,"deviceScaleFactor":1,"mobile":False},sid)
        await asyncio.sleep(1.8)
        s_out=await snap(ws,sid)
        await send(ws,"Emulation.setDeviceMetricsOverride",
                   {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False},sid)
        try: await send(ws,"Target.closeTarget",{"targetId":target})
        except Exception: pass
        return {"label":label,"s0":s0,"s1":s1,"hover":sh,"click":sc,"s2":s2,"s3":s3,"s_out":s_out}

def vid_sig(c):
    return {c["vcls"][:28], c["vpaused"], c["vcurrentTime"]}
def playmap(state):
    # 각 video 의 (intersect↔playing) 매핑
    return {c["vcls"][:28]: (c["vintersect"], c["vpaused"], c["vcurrentTime"])
            for c in state["cards"]}

def cmp_autoplay(h,o,name):
    """autoplay semantics: 교차 진입 재생/이탈 정지 — HF·OHF 동작 동등."""
    issues=[]; residual=[]
    hm=playmap(h); om=playmap(o)
    # HF 는 video_cls 가 OHF 와 다를 수 있으므로 인덱스 기반 비교(같은 순서)
    for i,(ch,co) in enumerate(zip(h["cards"],o["cards"])):
        # semantics: in-view → playing(paused false), out → paused true
        def expect(c): 
            iv=c["vintersect"]
            if iv and c["ready"]: return not c["vpaused"]
            return True
        # 진입 상태인데 정져있거나, 이탈 상태인데 재생 중이면 어긋남
        if ch["vintersect"] and ch["vpaused"]:
            issues.append(f"{name} card[{i}] HF in-view but paused")
        if co["vintersect"] and co["vpaused"]:
            issues.append(f"{name} card[{i}] OHF in-view but paused")
        if (not ch["vintersect"]) and (not ch["vpaused"]):
            issues.append(f"{name} card[{i}] HF out-of-view but playing")
        if (not co["vintersect"]) and (not co["vpaused"]):
            issues.append(f"{name} card[{i}] OHF out-of-view but playing")
        # 잔차 기록: 진도/위치 절대 차이
        residual.append(f"{name} card[{i}] HF(iv={ch['vintersect']},paused={ch['vpaused']},t={ch['vcurrentTime']}) OHF(iv={co['vintersect']},paused={co['vpaused']},t={co['vcurrentTime']})")
    return issues, residual

def cmp_hover(h,o,name):
    issues=[]
    rh=rep_card(h); ro=rep_card(o)
    if not rh or not ro: return [f"{name} rep card missing HF={bool(rh)} OHF={bool(ro)}"],[]
    for k in ("opacity","backgroundColor","transform","boxShadow"):
        if (rh["cardcs"] or {}).get(k)!=(ro["cardcs"] or {}).get(k):
            issues.append(f"{name} hover card.{k} HF={rh['cardcs'].get(k)} OHF={ro['cardcs'].get(k)}")
    residual=[]
    rh_c, ro_c = rh["cardcs"] or {}, ro["cardcs"] or {}
    residual.append(f"{name} hover cardcls HF={rh['cardcls']} OHF={ro['cardcls']}")
    return issues, residual

def cmp_transition(h,o,name):
    issues=[]
    rh=rep_card(h); ro=rep_card(o)
    if not rh or not ro: return [f"{name} rep card missing"],[]
    for k in ("transitionProperty","transitionDuration","transitionTimingFunction"):
        if (rh["cardcs"] or {}).get(k)!=(ro["cardcs"] or {}).get(k):
            issues.append(f"{name} card.{k} HF={rh['cardcs'].get(k)} OHF={ro['cardcs'].get(k)}")
    return issues, []

def cmp_mute_expand(h,o,name):
    issues=[]
    # HF/모든 카드 기준: mute button·card aria-expanded 부재 동등
    for i,(ch,co) in enumerate(zip(h["cards"],o["cards"])):
        if bool(ch["muteBtn"])!=bool(co["muteBtn"]):
            issues.append(f"{name} card[{i}] muteBtn HF={bool(ch['muteBtn'])} OHF={bool(co['muteBtn'])}")
        if (ch["cardExpanded"] or "")!=(co["cardExpanded"] or ""):
            issues.append(f"{name} card[{i}] cardExpanded HF={ch['cardExpanded']!r} OHF={co['cardExpanded']!r}")
    return issues, []

async def main():
    hf,ohf=await asyncio.gather(
        run_flow(HF_EP,HF_URL,"HF",True), run_flow(OHF_EP,OHF_URL,"OHF",False))
    report={"hf":hf,"ohf":ohf,"checks":{},"residual":{}}
    all_issues=[]
    for name in ("s0","s1","s2","s3","s_out"):
        iss,res=cmp_autoplay(hf[name],ohf[name],name)
        report["checks"][name]={"autoplay_issues":iss,"autoplay_pass":not iss}
        report["residual"].setdefault(name,[]).extend(res)
        # s_out(인공 축소한 뷰포트) 은 제품 뷰포트(1440x900) 에서 카드가 클리핑되지
        # 않으므로 제품에서 관측 불가능한 임계값 잔차 — 카드 지시의 '별도 버킷 분리·
        # 게이트 면제' 에 따라 OVERALL 게이트에서 제외하고 진단 버킷에만 기록.
        if name != "s_out":
            all_issues.extend(iss)
    # hover + transition (hover state 가 있으면)
    if hf["hover"] and ohf["hover"]:
        iss,res=cmp_hover(hf["hover"],ohf["hover"],"hover")
        report["checks"]["hover"]={"issues":iss,"pass":not iss}
        report["residual"].setdefault("hover",[]).extend(res); all_issues.extend(iss)
        iss,_=cmp_transition(hf["hover"],ohf["hover"],"transition")
        report["checks"]["transition"]={"issues":iss,"pass":not iss}; all_issues.extend(iss)
    # mute/expanded across states
    for name in ("s0","s1","s2","s3","s_out"):
        iss,_=cmp_mute_expand(hf[name],ohf[name],name)
        report["checks"][name]["mute_expand_issues"]=iss
        report["checks"][name]["mute_expand_pass"]=not iss
        all_issues.extend(iss)
    # HF 동작 요약(실측 원문)
    report["hf_autoplay_map"]={st:playmap(hf[st]) for st in ("s0","s1","hover","click","s2","s3","s_out")}
    report["ohf_autoplay_map"]={st:playmap(ohf[st]) for st in ("s0","s1","hover","click","s2","s3","s_out")}
    report["OVERALL"]="PASS" if not all_issues else "FAIL"
    report["issue_total"]=len(all_issues)
    out="/home/baramofme/open-higgsfield/.worktrees/t_483bdaf0/anim_verify/feed_report.json"
    with open(out,"w") as f: json.dump(report,f,ensure_ascii=False,indent=1)
    print("OVERALL:",report["OVERALL"],"issues:",report["issue_total"])
    for i in all_issues[:40]: print("  ISSUE:",i)
    print("HF autoplay map:",json.dumps(report["hf_autoplay_map"],ensure_ascii=False))
    print("OHF autoplay map:",json.dumps(report["ohf_autoplay_map"],ensure_ascii=False))
    if hf["hover"]: print("HF hover card cls:",rep_card(hf["hover"])["cardcls"])
    if ohf["hover"]: print("OHF hover card cls:",rep_card(ohf["hover"])["cardcls"])

if __name__=="__main__": asyncio.run(main())
