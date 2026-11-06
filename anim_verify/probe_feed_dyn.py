#!/usr/bin/env python3
"""t_483bdaf0 — HF live 피드/쇼케이스 카드 동속성 실측.

HF live(:9222) 만. 시나:
  initial(뷰포트) → scroll-to-feed(카드를 뷰포트로) → hover(카드 center) →
  scroll-away(교차 이탈) → click(카드 center)
각 단계에서 video paused/currentTime/opacity/mute-button/aria-expanded 을 수확.
storage clear 하지 않는다(공유 프로필 보호).
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

# 카드(figure/video 를 가진 article/li/div) 중심 + 그 카드 내부 mute/expand 요소
CARD_JS = r"""
(() => {
  const rect = el => { const r = el.getBoundingClientRect();
    return {x:+r.x.toFixed(2), y:+r.y.toFixed(2), w:+r.width.toFixed(2), h:+r.height.toFixed(2)}; };
  const cs = el => { const s = getComputedStyle(el); return {
    opacity: s.opacity, transitionProperty: s.transitionProperty,
    transitionDuration: s.transitionDuration, transform: s.transform }; };
  // 모든 video 를 포함하는 '카드' 컨테이너를 찾는다(figure 또는 article/li 가 video 포함).
  const vids = Array.from(document.querySelectorAll('video'));
  const cards = [];
  for (const v of vids) {
    // figure 또는 그 상위 article/li/section 중 첫 번째
    let card = v.closest('figure') || v.closest('article') || v.closest('li') ||
               v.parentElement;
    const ov = card ? card.querySelector('[class*=overlay],[class*=hover],[aria-label],[class*=mute],[class*=muted],button') : null;
    const muteBtns = card ? Array.from(card.querySelectorAll('button,[aria-label]'))
       .filter(b=>/음소거|mute|sound|소리|음성|volume/i.test((b.getAttribute('aria-label')||'')+b.textContent)) : [];
    cards.push({ vcls:String(v.className||''), cardcls:String((card||{}).className||''),
      cardtag:(card||{}).tagName, cardrect: card?rect(card):null,
      vrect: rect(v), vpaused:v.paused, vmuted:v.muted, vautoplay:v.autoplay,
      vcurrentTime:+v.currentTime.toFixed(3), vreadyState:v.readyState,
      vcs: cs(v), cardcs: card?cs(card):null,
      overlay: ov?{cls:String(ov.className||''),cs:cs(ov),rect:rect(ov),
                   ariaLabel:ov.getAttribute('aria-label')}:null,
      muteBtn: muteBtns.length?{cls:String(muteBtns[0].className||''),
                ariaLabel:muteBtns[0].getAttribute('aria-label'),
                cs:cs(muteBtns[0]),rect:rect(muteBtns[0])}:null });
  }
  // 페이지 내 모든 mute/sound 라벨 버튼 (피드 어디든)
  const allMute = Array.from(document.querySelectorAll('[aria-label],button')).filter(b=>
    /음소거|mute|sound|소리|음성|volume/i.test((b.getAttribute('aria-label')||'')+(b.textContent||'')))
    .map(b=>({cls:String(b.className||''),ariaLabel:b.getAttribute('aria-label'),
              tag:b.tagName,rect:rect(b),cs:cs(b)})).slice(0,30);
  // aria-expanded 를 가진 카드성 요소
  const exps = Array.from(document.querySelectorAll('[aria-expanded]')).map(e=>({
    cls:String(e.className||''),tag:e.tagName,exp:e.getAttribute('aria-expanded'),
    label:e.getAttribute('aria-label'),rect:rect(e)})).slice(0,30);
  return JSON.stringify({ ready: document.readyState, cards, allMuteCount: allMute.length,
                          allMute, exps });
})()
"""

async def hover(ws, sid, x, y):
    await send(ws, "Input.dispatchMouseEvent",
               {"type":"mouseMoved","x":x,"y":y,"button":"none","clickCount":0}, sid)
async def click(ws, sid, x, y):
    await send(ws, "Input.dispatchMouseEvent",
               {"type":"mousePressed","x":x,"y":y,"button":"left","clickCount":1}, sid)
    await send(ws, "Input.dispatchMouseEvent",
               {"type":"mouseReleased","x":x,"y":y,"button":"left","clickCount":1}, sid)
async def scroll(ws, sid, dx, dy):
    await send(ws, "Input.dispatchMouseEvent",
               {"type":"mouseWheel","x":720,"y":450,"deltaX":dx,"deltaY":dy}, sid)
async def snap(ws, sid):
    r = await send(ws, "Runtime.evaluate", {"expression": CARD_JS, "returnByValue": True}, sid)
    return json.loads(r["result"]["value"])

async def main():
    ver = http_json(HF_EP, "/json/version")
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=16_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url":"about:blank"}); target=t["targetId"]
        sid = (await send(ws,"Target.attachToTarget",{"targetId":target,"flatten":True}))["sessionId"]
        await send(ws,"Page.enable",{},sid); await send(ws,"Runtime.enable",{},sid)
        await send(ws,"Emulation.setDeviceMetricsOverride",
                   {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False},sid)
        await send(ws,"Network.enable",{},sid)
        await send(ws,"Page.navigate",{"url":HF_URL},sid)
        for _ in range(40):
            await asyncio.sleep(0.5); s=await snap(ws,sid)
            if s["ready"]=="complete" and len(s["cards"])>0: break
        states = {"initial": s}
        # 카드 중심 좌표로 hover
        pre = await snap(ws,sid)
        if pre["cards"]:
            cr = pre["cards"][0]["cardrect"] or pre["cards"][0]["vrect"]
            cx, cy = cr["x"]+cr["w"]/2, cr["y"]+cr["h"]/2
            await hover(ws,sid,cx,cy); await asyncio.sleep(0.6)
            states["hover"] = await snap(ws,sid)
        # 교차 이탈/진입을 위해 스크롤
        await scroll(ws,sid,0,-300); await asyncio.sleep(1.0); states["scroll_up"] = await snap(ws,sid)
        await scroll(ws,sid,0,600);  await asyncio.sleep(1.0); states["scroll_down"] = await snap(ws,sid)
        # 카드 클릭(확대/세부 동작 확인)
        if pre["cards"]:
            cr = pre["cards"][0]["cardrect"] or pre["cards"][0]["vrect"]
            cx, cy = cr["x"]+cr["w"]/2, cr["y"]+cr["h"]/2
            await click(ws,sid,cx,cy); await asyncio.sleep(1.2); states["click"] = await snap(ws,sid)
        out="/home/baramofme/open-higgsfield/.worktrees/t_483bdaf0/anim_verify/hf_feed_dyn.json"
        with open(out,"w") as f: json.dump(states,f,ensure_ascii=False,indent=1)
        # 요약: 단계별 each video paused/currentTime + card opacity
        for st,s in states.items():
            vids=[(c["vcls"][:30],c["vpaused"],c["vcurrentTime"]) for c in s["cards"]]
            print(st,"mutes=",s["allMuteCount"],"exps=",len(s["exps"]),"vids=",vids)
        # 카드별 mute button + overlay 존재 유무
        for c in states["initial"]["cards"]:
            print("CARD",c["cardtag"],c["cardcls"][:40],"muteBtn=",bool(c["muteBtn"]),
                  "overlay=",bool(c["overlay"]),"vautoplay=",c["vautoplay"])
        print("ALLMUTE:",json.dumps(states["initial"]["allMute"][:8],ensure_ascii=False,indent=1))
        print("EXPS:",json.dumps(states["initial"]["exps"][:12],ensure_ascii=False))
        try: await send(ws,"Target.closeTarget",{"targetId":target})
        except Exception: pass

if __name__=="__main__": asyncio.run(main())
