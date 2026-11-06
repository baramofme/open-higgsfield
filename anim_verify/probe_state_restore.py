#!/usr/bin/env python3
"""t_594cd9af — HF 라이브 상태 복원 + 조건부 가설 실측(라이브 실측만).

배경: 내 이전 프로브(probe2/5)가 공유 :9222 프로필의 HF site storage 를 변형시킴
  hf:video-minimax-h3-store:v2 → duration:11(probe5 ArrowRight), aspectRatio:"21:9"(probe2 픽).
  결과적으로 비율 트리거가 사라진 레이아웃(상태 B: 길이|품질, 품질=row1 col2)이 되어 게이트 불가.

이 스크립트:
 1) 해당 키의 aspectRatio 를 null(자동, probe2가 관찰한 원래 값) 로 복원 + duration 5(원래 기본값) —
    공유 저장소 전체 clear 가 아니라, 내가 변형한 값의 표적 복원(카드 결정은 clear 금지).
 2) reload 후 상태 A(비율 트리거 존재, 길이|비율 + 품질 span2) 재현 여부 실측
 3) 가설 검증: UI 로 비율 선택(21:9) → 비율 트리거 조건부 숨김 + 품질 폭 변화 라이브 실측
 4) 자동 복귀: 저장소 null 복원 후 reload → 재출현 실측
"""
import asyncio, json, time, urllib.request
import websockets

HF_EP = "http://127.0.0.1:9222"
HF_URL = "https://higgsfield.ai/ko/ai/video?model=minimax_h3"
KEY = "hf:video-minimax-h3-store:v2"

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

def center(rect):
    return rect["x"] + rect["w"] / 2.0, rect["y"] + rect["h"] / 2.0

async def click_at(ws, sid, x, y):
    await send(ws, "Input.dispatchMouseEvent",
               {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1}, sid)
    await send(ws, "Input.dispatchMouseEvent",
               {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1}, sid)

async def snap(ws, sid, js):
    r = await send(ws, "Runtime.evaluate", {"expression": js, "returnByValue": True}, sid)
    v = r["result"]["value"]
    return json.loads(v) if isinstance(v, str) else v

FIELDSET_JS = r"""(() => {
  const R = el => { const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}; };
  const fs = document.querySelector('fieldset');
  if (!fs) return JSON.stringify({fs:null});
  return JSON.stringify({
    fsRect: R(fs),
    kids: Array.from(fs.children).map(c => ({tag:c.tagName, txt:(c.textContent||'').trim().replace(/\s+/g,' ').slice(0,30),
      label:c.getAttribute('aria-label'), popup:c.getAttribute('aria-haspopup'), state:c.getAttribute('data-state'),
      rect:R(c), bg:getComputedStyle(c).backgroundColor})),
    store: (()=>{try{return JSON.parse(localStorage.getItem('hf:video-minimax-h3-store:v2'))}catch(e){return null}})()
  });
})()"""

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
        # Escape로 팝업 정리
        for _ in range(5):
            n = await snap(ws, sid, """document.querySelectorAll('[role="dialog"]').length""")
            if not n: break
            await send(ws, "Input.dispatchKeyEvent", {"type":"keyDown","key":"Escape","code":"Escape","windowsVirtualKeyCode":27,"nativeVirtualKeyCode":27}, sid)
            await send(ws, "Input.dispatchKeyEvent", {"type":"keyUp","key":"Escape","code":"Escape","windowsVirtualKeyCode":27,"nativeVirtualKeyCode":27}, sid)
            await asyncio.sleep(0.5)
        await asyncio.sleep(1.0)
        out["before_restore"] = await snap(ws, sid, FIELDSET_JS)

        # 표적 복원: aspectRatio → null, duration → 5 (내가 변형하기 전의 관찰값)
        await send(ws, "Runtime.evaluate", {"expression": """(() => {
          const K='hf:video-minimax-h3-store:v2';
          const s=JSON.parse(localStorage.getItem(K));
          s.aspectRatio=null; s.duration=5;
          localStorage.setItem(K, JSON.stringify(s));
          return JSON.stringify(JSON.parse(localStorage.getItem(K)));
        })()"""}, sid)
        await send(ws, "Page.reload", {}, sid)
        await asyncio.sleep(3)
        cur = None
        for _ in range(5):
            n = await snap(ws, sid, """document.querySelectorAll('[role="dialog"]').length""")
            if not n: break
            await send(ws, "Input.dispatchKeyEvent", {"type":"keyDown","key":"Escape","code":"Escape","windowsVirtualKeyCode":27,"nativeVirtualKeyCode":27}, sid)
            await send(ws, "Input.dispatchKeyEvent", {"type":"keyUp","key":"Escape","code":"Escape","windowsVirtualKeyCode":27,"nativeVirtualKeyCode":27}, sid)
            await asyncio.sleep(0.5)
        for _ in range(20):
            cur = await snap(ws, sid, FIELDSET_JS)
            if cur and cur.get("fsRect") and cur["fsRect"]["w"] > 50: break
            await asyncio.sleep(0.7)
        out["after_restore"] = cur

        # 가설 검증: 비율 트리거가 있으면 21:9 선택 → 레이아웃 전환 실측
        kids = (cur.get("kids") or []) if (cur and cur.get("fsRect")) else []
        rat = [k for k in kids if k.get("label") == "비율"]
        if rat:
            x, y = center(rat[0]["rect"])
            await click_at(ws, sid, x, y)
            await asyncio.sleep(1.0)
            out["menu_open"] = await snap(ws, sid, r"""(() => {
              const R = el => { const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)}; };
              const m = document.querySelector('[role="menu"][data-state="open"]');
              if (!m) return null;
              const wrap = m.parentElement;
              return JSON.stringify({
                wrap: {pos:getComputedStyle(wrap).position, z:getComputedStyle(wrap).zIndex, inline:(wrap.getAttribute('style')||'').slice(0,220), rect:R(wrap)},
                menu: {rect:R(m), bg:getComputedStyle(m).backgroundColor, radius:getComputedStyle(m).borderRadius, sh:getComputedStyle(m).boxShadow, pad:getComputedStyle(m).padding, gap:getComputedStyle(m).gap, dir:getComputedStyle(m).flexDirection},
                kids: Array.from(m.children).map(c => ({tag:c.tagName, txt:(c.textContent||'').trim(), rect:R(c), checked:c.getAttribute('aria-checked'), bg:getComputedStyle(c).backgroundColor, r:getComputedStyle(c).borderRadius, ti:c.getAttribute('tabindex'), role:c.getAttribute('role')}))
              });
            })()""")
            items = (out["menu_open"] or {}).get("kids") or []
            it = [i for i in items if i["txt"] == "21:9"]
            if it:
                x2, y2 = center(it[0]["rect"])
                await click_at(ws, sid, x2, y2)
                await asyncio.sleep(1.0)
                out["after_pick219"] = await snap(ws, sid, FIELDSET_JS)
                out["store_after_pick"] = out["after_pick219"].get("store")
        else:
            out["menu_open"] = None
            out["no_ratio_trigger"] = True

        # 자동 복귀 표적 복원 + reload → 재출현
        await send(ws, "Runtime.evaluate", {"expression": """(() => {
          const K='hf:video-minimax-h3-store:v2';
          const s=JSON.parse(localStorage.getItem(K));
          s.aspectRatio=null; s.duration=5;
          localStorage.setItem(K, JSON.stringify(s));
          return 'ok';
        })()"""}, sid)
        await send(ws, "Page.reload", {}, sid)
        await asyncio.sleep(3)
        cur = None
        for _ in range(5):
            n = await snap(ws, sid, """document.querySelectorAll('[role="dialog"]').length""")
            if not n: break
            await send(ws, "Input.dispatchKeyEvent", {"type":"keyDown","key":"Escape","code":"Escape","windowsVirtualKeyCode":27,"nativeVirtualKeyCode":27}, sid)
            await send(ws, "Input.dispatchKeyEvent", {"type":"keyUp","key":"Escape","code":"Escape","windowsVirtualKeyCode":27,"nativeVirtualKeyCode":27}, sid)
            await asyncio.sleep(0.5)
        for _ in range(20):
            cur2 = await snap(ws, sid, FIELDSET_JS)
            if cur2 and cur2.get("fsRect") and cur2["fsRect"]["w"] > 50: break
            await asyncio.sleep(0.7)
        out["after_auto_restore"] = cur2
        await send(ws, "Target.closeTarget", {"targetId": target})
    with open("/home/baramofme/open-higgsfield/.worktrees/t_594cd9af/anim_verify/hf_state_restore.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("WROTE hf_state_restore.json")

if __name__ == "__main__":
    asyncio.run(main())
