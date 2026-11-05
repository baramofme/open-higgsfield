#!/usr/bin/env python3
"""HF CDP fresh-tab auth probe against the operator chrome on [::1]:9222.
Reports final href/title/cookie names/__session/cookie_len/body/markers per URL.
No fabrication; honest session read. Adapted from hf-cdp-auth-probe/scripts/probe.py
(CDP_HTTP -> IPv6 literal [::1] since this chrome binds IPv6-only)."""
import asyncio, json, sys, urllib.request
import websockets

CDP_HTTP = "http://[::1]:9222"
# Korean-locale markers (English marker list false-rejects on authed Korean pages)
KO_MARKERS = [
    "개인 프로필", "크레딧", "사용량", "구독", "로그아웃", "워크스페이스",
    "새 프로젝트", "휴지통", "계정 삭제", "폴더", "모든 에셋", "설정",
    "요소", "도구", "생성하기",
]


def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=5) as r:
        return json.load(r)["webSocketDebuggerUrl"]


async def probe(url, width=1440, height=900):
    ws_url = browser_ws()
    async with websockets.connect(ws_url, max_size=None, open_timeout=30) as ws:
        msg_id = 0
        pending = {}
        events = {}

        async def send(method, params=None, session=None, timeout=25):
            nonlocal msg_id
            msg_id += 1
            m = {"id": msg_id, "method": method, "params": params or {}}
            if session:
                m["sessionId"] = session
            await ws.send(json.dumps(m))
            fut = asyncio.get_running_loop().create_future()
            pending[msg_id] = fut
            try:
                return await asyncio.wait_for(fut, timeout)
            except asyncio.TimeoutError:
                pending.pop(msg_id, None)
                raise RuntimeError("CDP send %s timed out" % method)

        async def reader():
            try:
                while True:
                    d = json.loads(await ws.recv())
                    if "id" in d and d["id"] in pending:
                        fut = pending.pop(d["id"])
                        if not fut.done():
                            fut.set_result(d.get("result", d.get("error")))
                    elif "method" in d:
                        events.setdefault(d["method"], []).append(d)
            except Exception as e:
                print("reader ended:", repr(e), file=sys.stderr)

        rt = asyncio.ensure_future(reader())
        target_id = None
        try:
            res = await send("Target.createTarget", {"url": "about:blank"})
            target_id = res["targetId"]
            session = (await send("Target.attachToTarget",
                                  {"targetId": target_id, "flatten": True}))["sessionId"]
            await send("Runtime.enable", session=session)
            liveness = (await send("Runtime.evaluate",
                                   {"expression": "1+1", "returnByValue": True},
                                   session=session))["result"]["value"]
            await send("Emulation.setDeviceMetricsOverride",
                       {"width": width, "height": height, "deviceScaleFactor": 1,
                        "mobile": False}, session=session)
            await send("Page.enable", session=session)
            await send("Network.enable", session=session)
            await send("Network.setCacheDisabled", {"cacheDisabled": True}, session=session)
            events.pop("Page.loadEventFired", None)
            await send("Page.navigate", {"url": url}, session=session)
            w = 0.0
            while not events.get("Page.loadEventFired"):
                await asyncio.sleep(0.2); w += 0.2
                if w > 30: break
            await asyncio.sleep(3.0)

            async def ev(expr):
                r = await send("Runtime.evaluate",
                               {"expression": expr, "returnByValue": True,
                                "awaitPromise": True}, session=session)
                if "exceptionDetails" in r:
                    raise RuntimeError("JS exception: %s" % json.dumps(r["exceptionDetails"])[:400])
                return r["result"].get("value")

            href = await ev("document.location.href")
            title = await ev("document.title")
            cookie = await ev("document.cookie")
            body_len = await ev("document.body ? document.body.innerText.length : -1")
            body_txt = await ev("document.body ? document.body.innerText.slice(0,1600) : ''")
            checks = {}
            for mk in KO_MARKERS:
                expr = ("document.body ? document.body.innerText.indexOf(%s) >= 0 : false"
                        % json.dumps(mk))
                checks[mk] = bool(await ev(expr))
            cookie_names = sorted(set(c.split("=")[0].strip()
                                      for c in cookie.split(";") if c.strip()))
            await send("Target.closeTarget", {"targetId": target_id})
            return {
                "url_requested": url,
                "liveness_1plus1": liveness,
                "final_href": href,
                "title": title,
                "redirected_to_sign_in": "auth/sign-in" in href,
                "has_session_jwt": "__session" in cookie,
                "cookie_names": cookie_names,
                "cookie_len": len(cookie),
                "body_len": body_len,
                "ko_markers_present": {k: v for k, v in checks.items() if v},
                "ko_markers_present_count": sum(1 for v in checks.values() if v),
                "body_excerpt": body_txt,
            }
        finally:
            rt.cancel()
            if target_id:
                try:
                    await send("Target.closeTarget", {"targetId": target_id}, timeout=5)
                except Exception:
                    pass


async def main():
    urls = sys.argv[1:] or [
        "https://higgsfield.ai/ko/me/settings",
        "https://higgsfield.ai/ko/generate/@exploringdonut1792/project-3",
    ]
    out = []
    for u in urls:
        try:
            out.append(await probe(u))
        except Exception as e:
            out.append({"url_requested": u, "error": repr(e)})
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
