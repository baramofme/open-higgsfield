#!/usr/bin/env python3
"""crash_probe_t159.py — t_159e30db removeChild 크래시 수복 집중 실측.

격리 CDP(chrome :9335) 로 OHF dev(3122) 에 실제 insertText 타이핑을 가하고
① 트리 생존(form·generatePresent), ② placeholder 소진·카운터 부재,
③ removeChild 콘솔/예외 흔적 유무 를 라이브로 측정한다(fabrication 금지).
HF live ground-truth 는 같은 조작 후 트리가 살아있고(생성하기 True) placeholder
소진·카운터 없음 → 이 프로브의 OHF 결과가 그 ground-truth 와 매칭되는지 판정.
"""
import asyncio, json, sys, urllib.request, websockets

OHF_EP = "http://127.0.0.1:9335"
OHF_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3122/"

async def send(ws, m, p=None, s=None):
    send.n = getattr(send, "n", 0) + 1
    mid = send.n
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
    if ex: raise RuntimeError(f"EXPR_ERR: {json.dumps(ex)[:300]} :: {js[:120]}")
    v = r["result"].get("value")
    return json.loads(v) if isinstance(v, str) else v

INSTALL_HOOKS = r"""(() => {
  window.__errs = [];
  const push = (t, m) => { window.__errs.push(t + ": " + String(m).slice(0, 400)); };
  window.addEventListener("error", (e) => push("window.onerror", e && e.message));
  const origErr = console.error;
  console.error = (...a) => { try { push("console.error", a.map(String).join(" | ")); } catch(e){} return origErr.apply(console, a); };
  return 1;
})()"""

FOCUS_JS = r"""(async () => {
  const pbox = document.querySelector('[contenteditable="true"],[role="textbox"]');
  if (!pbox) return JSON.stringify({ err: "no-textbox" });
  pbox.focus(); await new Promise(r => setTimeout(r, 150));
  return JSON.stringify({ focused: document.activeElement === pbox });
})()"""

AFTER_JS = r"""(async () => {
  await new Promise(r => setTimeout(r, 350));
  const TX = e => (e.textContent || "").trim().replace(/\s+/g, " ");
  const pbox = document.querySelector('[contenteditable="true"],[role="textbox"]');
  const ph = document.querySelector('[data-prompt-placeholder]');
  const counters = [];
  document.querySelectorAll("*").forEach(e => { const t = TX(e); if (/^[0-9]+\s*[\/]\s*[0-9]+$/.test(t) && e.children.length === 0) counters.push(t); });
  const g = Array.from(document.querySelectorAll("button")).find(b => /^생성하기/.test(TX(b)) && b.type === "submit");
  return JSON.stringify({
    pboxTxt: pbox ? TX(pbox).slice(0, 40) : null,
    phShown: ph ? ph.textContent.trim().slice(0, 40) : null,
    counterCount: counters.length,
    form: !!document.querySelector("form"),
    generatePresent: !!g,
    errs: (window.__errs || []).slice(-15),
    removeChildHits: (window.__errs || []).filter(s => /removeChild|not a child|NotFoundError/.test(s)).length
  });
})()"""

async def main():
    ver = json.loads(urllib.request.urlopen(OHF_EP + "/json/version", timeout=10).read().decode())
    async with websockets.connect(ver["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
        t = await send(ws, "Target.createTarget", {"url": "about:blank"})
        a = await send(ws, "Target.attachToTarget", {"targetId": t["targetId"], "flatten": True})
        sid = a["sessionId"]
        await send(ws, "Page.enable", {}, sid); await send(ws, "Runtime.enable", {}, sid)
        await send(ws, "Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, sid)
        await send(ws, "Page.navigate", {"url": OHF_URL}, sid); await asyncio.sleep(1.5)
        await ev(ws, sid, '(() => { try { localStorage.clear(); } catch(e){} return "1"; })()')  # OHF 격리만 clear
        await send(ws, "Page.navigate", {"url": OHF_URL}, sid)
        await asyncio.sleep(3)
        # dismiss cookie/banner (gate 의 DISMISS 와 동일 intent)
        await ev(ws, sid, '(() => { document.querySelectorAll("button,a").forEach(b => { const t=(b.textContent||"").trim(); if(/(동의|닫기|거부|나중에|확인|Got it|Accept|Close)/.test(t)) b.click(); }); return "1"; })()')
        await asyncio.sleep(1)
        d = None
        for _ in range(15):
            d = await ev(ws, sid, '(() => !!document.querySelector(\'[contenteditable="true"],[role="textbox"]\'))()')
            if d: break
            await asyncio.sleep(1)
        if not d:
            print(json.dumps({"err": "no-textbox-on-mount"}, ensure_ascii=False)); return 1
        await ev(ws, sid, INSTALL_HOOKS)
        await ev(ws, sid, FOCUS_JS)
        # 실제 타이핑: CDP insertText
        await send(ws, "Input.insertText", {"text": "고양이 영상 테스트"}, sid)
        await asyncio.sleep(0.2)
        # 키보드 타이핑도 병행(실 key event 경로)
        for ch in "abc":
            await send(ws, "Input.dispatchKeyEvent", {"type": "keyDown", "key": ch, "code": "Key" + ch, "windowsVirtualKeyCode": 0, "text": ch}, sid)
            await send(ws, "Input.dispatchKeyEvent", {"type": "keyUp", "key": ch, "code": "Key" + ch, "windowsVirtualKeyCode": 0, "text": ch}, sid)
        await asyncio.sleep(0.3)
        after = await ev(ws, sid, AFTER_JS)
        print(json.dumps(after, ensure_ascii=False, indent=1))
        await send(ws, "Target.closeTarget", {"targetId": t["targetId"]})
    ok = after.get("generatePresent") is True and after.get("form") is True and after.get("removeChildHits") == 0
    print("\nVERDICT:", "FIXED(no-crash, tree alive)" if ok else "STILL-BROKEN", "  generatePresent=", after.get("generatePresent"), "form=", after.get("form"), "removeChildHits=", after.get("removeChildHits"), "phShown=", after.get("phShown"), "counterCount=", after.get("counterCount"), "pboxTxt=", after.get("pboxTxt"))
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
