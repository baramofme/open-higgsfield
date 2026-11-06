#!/usr/bin/env python3
"""t_483bdaf0 — HF live feed card 구조·동속성 프로브.

HF live(:9222) 만 사용. 피드 칼럼의 video 카드가 autoplay(hover vs Intersection)·
mute·expanded·transition 을 어떻게 구동하는지 라이브 DOM 실측으로 수확한다.
storage clear 하지 않는다(공유 프로필 보호 — 부모 경고 반영).
"""
import asyncio, json, urllib.request
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

# 피드 칼럼 전체 video/figure/aria-expanded/mute 후보 dump
PROBE_JS = r"""
(() => {
  const rect = el => { const r = el.getBoundingClientRect();
    return {x:+r.x.toFixed(2), y:+r.y.toFixed(2), w:+r.width.toFixed(2), h:+r.height.toFixed(2)}; };
  const cs = el => { const s = getComputedStyle(el); return {
    color: s.color, backgroundColor: s.backgroundColor, opacity: s.opacity,
    boxShadow: s.boxShadow, borderRadius: s.borderRadius,
    transitionProperty: s.transitionProperty, transitionDuration: s.transitionDuration,
    transitionTimingFunction: s.transitionTimingFunction,
    transform: s.transform, overflow: s.overflow }; };
  // 피드=우측 컬럼(creation plate 아님). 광범위 탐색: page 전체 video + figure + 버튼들.
  const vids = Array.from(document.querySelectorAll('video')).map(v => ({
    cls: String(v.className||''), autoplay: v.autoplay, loop: v.loop, muted: v.muted,
    playsInline: v.playsInline, preload: v.preload, paused: v.paused,
    currentTime: +v.currentTime.toFixed(3), readyState: v.readyState,
    src: (v.currentSrc||v.src||'').slice(0,140),
    parentCls: String((v.parentElement||{}).className||''),
    cs: cs(v), rect: rect(v) }));
  const expandable = Array.from(document.querySelectorAll('[aria-expanded]')).map(e => ({
    cls: String(e.className||''), tag: e.tagName,
    expanded: e.getAttribute('aria-expanded'), label: e.getAttribute('aria-label'),
    cs: cs(e), rect: rect(e) }));
  // hover 게이트 후보: opacity 0 기본 + transition opacity 가진 요소
  const hoverGate = Array.from(document.querySelectorAll('*')).filter(el => {
    const s = getComputedStyle(el);
    return parseFloat(s.opacity) === 0 && s.transitionProperty &&
           /opacity/.test(s.transitionProperty);
  }).slice(0, 60).map(el => ({
    cls: String(el.className||''), tag: el.tagName, txt:(el.textContent||'').trim().slice(0,30),
    cs: cs(el), rect: rect(el) }));
  // 데이터 속성 중 feed/video 관련 마커 전수
  const feedAttrs = Array.from(document.querySelectorAll(
    '[data-feed],[data-feed-card],[data-tile],[data-video-card],[data-explore],[data-autoplay],[data-expanded],[data-muted],[data-mute]')).map(e => ({
    tag: e.tagName, cls: String(e.className||''),
    attrs: { 'data-feed':e.getAttribute('data-feed'),'data-feed-card':e.getAttribute('data-feed-card'),
      'data-tile':e.getAttribute('data-tile'),'data-video-card':e.getAttribute('data-video-card'),
      'data-autoplay':e.getAttribute('data-autoplay'),'data-expanded':e.getAttribute('data-expanded'),
      'data-muted':e.getAttribute('data-muted'),'data-mute':e.getAttribute('data-mute'),
      'aria-expanded':e.getAttribute('aria-expanded') },
    rect: rect(e), cs: cs(e) }));
  return JSON.stringify({
    ready: document.readyState,
    url: location.href,
    vidCount: vids.length,
    vids: vids,
    expandableCount: expandable.length,
    expandable: expandable.slice(0,40),
    hoverGateCount: hoverGate.length,
    hoverGate: hoverGate,
    feedAttrs: feedAttrs });
})()
"""

async def main():
    ver = http_json(HF_EP, "/json/version")
    bws = ver["webSocketDebuggerUrl"]
    async with websockets.connect(bws, max_size=16_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        target = t["targetId"]
        a = await send(ws, "Target.attachToTarget", {"targetId": target, "flatten": True})
        sid = a["sessionId"]
        await send(ws, "Page.enable", {}, sid)
        await send(ws, "Runtime.enable", {}, sid)
        await send(ws, "Emulation.setDeviceMetricsOverride",
                   {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, sid)
        await send(ws, "Network.enable", {}, sid)
        await send(ws, "Page.navigate", {"url": HF_URL}, sid)
        # 페이지·비디오가 settle 될 때까지 폴
        settle = None
        for _ in range(40):
            await asyncio.sleep(0.5)
            r = await send(ws, "Runtime.evaluate", {"expression": PROBE_JS, "returnByValue": True}, sid)
            settle = json.loads(r["result"]["value"])
            if settle["vidCount"] > 0 and settle["ready"] == "complete":
                break
        print("vidCount:", settle["vidCount"], "expandable:", settle["expandableCount"],
              "hoverGate:", settle["hoverGateCount"], "feedAttrs:", len(settle["feedAttrs"]))
        out = "/home/baramofme/open-higgsfield/.worktrees/t_483bdaf0/anim_verify/hf_feed_probe.json"
        with open(out, "w") as f:
            json.dump(settle, f, ensure_ascii=False, indent=1)
        # 요약: each video 의 paused/muted/autoplay
        for v in settle["vids"]:
            print("VID cls=", v["cls"][:60], "autoplay=", v["autoplay"], "muted=", v["muted"],
                  "paused=", v["paused"], "t=", v["currentTime"], "src=", v["src"][:80])
        print("HF FEED attrs:", json.dumps(settle["feedAttrs"][:20], ensure_ascii=False, indent=1))
        try:
            await send(ws, "Target.closeTarget", {"targetId": target})
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(main())
