#!/usr/bin/env python3
"""OHF 이미지 surface 하베스트 — HF 하베스트(t_38d43cc9)와 동일한 HARVEST_JS를 쓴다.

동일 viewport(1440×900)·동일 스타일 키프레임으로 OHF 렌더를 수확해
HF ground-truth와 1:1 비교 가능한 형태로 산출한다.
"""
import asyncio, json, sys, time, base64, urllib.request, pathlib
import websockets

CDP_HTTP = "http://127.0.0.1:9360"
TARGET_URL = "http://127.0.0.1:3014/"
WIDTH, HEIGHT = 1440, 900
OUT_DIR = pathlib.Path("/home/baramofme/open-higgsfield/.worktrees/t_f3de705e/landing_verify")

# 이미지 surface + soul-cinema 모델로 부팅한다(useActive persist 시드).
SEED_JS = r"""(() => {
  try {
    localStorage.setItem("openhiggsfield.active.v2", JSON.stringify({
      state: { surface: "image", model: "soul-cinema", batch: 1 },
      version: 0
    }));
  } catch (e) {}
})()"""

HARVEST_JS = r"""(() => {
    function isVisible(el) {
        try {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            if (parseFloat(cs.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        } catch (e) { return false; }
    }
    const STYLE_KEYS = [
        "color","backgroundColor","borderRadius","fontSize","fontWeight",
        "fontFamily","lineHeight","letterSpacing","textAlign","textDecoration",
        "display","position","overflow","opacity","visibility",
        "padding","margin","borderWidth","borderColor","borderStyle",
        "width","height","maxWidth","minWidth","maxHeight","minHeight",
        "flexDirection","justifyContent","alignItems","flexWrap","flexGrow",
        "gap","gridTemplateColumns","gridTemplateRows",
        "boxShadow","textShadow","cursor",
        "backgroundImage","backgroundSize","backgroundRepeat","backgroundPosition",
        "zIndex","transform",
        "borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius"
    ];
    function elPath(el) {
        let s = el.tagName.toLowerCase();
        if (el.id) s += '#' + el.id;
        if (el.className && typeof el.className === 'string') {
            const cls = el.className.trim().split(/\s+/).filter(c => !c.startsWith('data-'));
            if (cls.length) s += '.' + cls.slice(0, 10).join('.');
        }
        return s;
    }
    function directText(el) {
        let t = '';
        for (const n of el.childNodes) {
            if (n.nodeType === Node.TEXT_NODE) t += n.textContent;
        }
        return t.trim().slice(0, 120);
    }
    function attrs(el) {
        const a = {};
        for (const attr of el.attributes) {
            if (attr.name === 'class' || attr.name === 'style' || attr.name === 'id') continue;
            a[attr.name] = attr.value;
        }
        return a;
    }
    function depth(el) {
        let d = 0, p = el;
        while (p && p !== document.body) { d++; p = p.parentElement; }
        return d;
    }
    const out = [];
    const all = document.querySelectorAll('body *');
    let visibleCount = 0;
    for (const el of all) {
        if (!isVisible(el)) continue;
        visibleCount++;
        try {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            const styles = {};
            for (const k of STYLE_KEYS) {
                const v = cs[k];
                if (!v) continue;
                if (v === 'none' || v === 'normal' || v === 'auto') continue;
                if (v === 'rgba(0, 0, 0, 0)' || v === '0px') continue;
                styles[k] = v;
            }
            out.push({
                selector: elPath(el),
                tag: el.tagName.toLowerCase(),
                id: el.id || null,
                classes: (el.className && typeof el.className === 'string')
                    ? el.className.trim().split(/\s+/) : [],
                rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
                text: directText(el),
                attrs: attrs(el),
                styles: styles,
                depth: depth(el)
            });
        } catch (e) {}
    }
    return JSON.stringify({visibleCount, elementCount: out.length, total: all.length, elements: out});
})()"""

def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=5) as r:
        return json.load(r)["webSocketDebuggerUrl"]

async def main():
    ws_url = browser_ws()
    async with websockets.connect(ws_url, max_size=None) as ws:
        msg_id=0; pending={}; events={}
        async def send(method, params=None, session=None):
            nonlocal msg_id; msg_id+=1
            m={"id":msg_id,"method":method,"params":params or {}}
            if session: m["sessionId"]=session
            await ws.send(json.dumps(m))
            fut=asyncio.get_event_loop().create_future(); pending[msg_id]=fut
            return await asyncio.wait_for(fut, timeout=30)
        async def reader():
            while True:
                try:
                    d=json.loads(await ws.recv())
                    if "id" in d and d["id"] in pending:
                        pending.pop(d["id"]).set_result(d.get("result",d.get("error")))
                    elif "method" in d: events.setdefault(d["method"],[]).append(d)
                except: break
        async def ev(sid, expr):
            r=await send("Runtime.evaluate",{"expression":expr,"returnByValue":True,"awaitPromise":True},session=sid)
            if isinstance(r,dict):
                ro=r.get("result",r); rem=ro.get("result",ro)
                if isinstance(rem,dict):
                    if "value" in rem: return rem["value"]
                    if "description" in rem: return rem["description"]
            if isinstance(r,dict):
                if "exceptionDetails" in r: print(f"JS err: {r['exceptionDetails'].get('text','')}",file=sys.stderr)
                if "code" in r: print(f"CDP err: {r}",file=sys.stderr)
            return None
        rt=asyncio.ensure_future(reader())
        try:
            tid=(await send("Target.createTarget",{"url":"about:blank"}))["targetId"]
            sid=(await send("Target.attachToTarget",{"targetId":tid,"flatten":True}))["sessionId"]
            await send("Runtime.enable",session=sid)
            await send("Page.enable",session=sid)
            await send("Network.enable",session=sid)
            await send("Network.setCacheDisabled",{"cacheDisabled":True},session=sid)
            await send("Emulation.setDeviceMetricsOverride",{"width":WIDTH,"height":HEIGHT,"deviceScaleFactor":1,"mobile":False},session=sid)
            # 시드는 새 문서의 스크립트보다 먼저 돈다.
            scr=await send("Page.addScriptToEvaluateOnNewDocument",{"source":SEED_JS},session=sid)
            events.pop("Page.loadEventFired",None)
            await send("Page.navigate",{"url":TARGET_URL},session=sid)
            t0=time.time()
            while not events.get("Page.loadEventFired"):
                if time.time()-t0>25: break
                await asyncio.sleep(0.2)
            for attempt in range(40):
                info_raw = await ev(sid, HARVEST_JS)
                if info_raw and isinstance(info_raw, str):
                    try:
                        d = json.loads(info_raw)
                        vc = d.get("visibleCount", 0)
                        has_form = await ev(sid, "!!document.querySelector('[data-ohf-image=\"form\"]')")
                        has_img = await ev(sid, "!!document.querySelector('[data-ohf-image=\"generate\"]')")
                        print(f"attempt {attempt}: visible={vc}, elementCount={d.get('elementCount')}, total={d.get('total')}, has_form={has_form}, has_generate={has_img}")
                        if vc > 50 and has_form and has_img:
                            elements = d.get("elements", [])
                            href = await ev(sid, "document.location.href")
                            title = await ev(sid, "document.title")
                            body_len = await ev(sid, "document.body ? document.body.innerText.length : -1")
                            try:
                                ss = await send("Page.captureScreenshot", {"format": "png"}, session=sid)
                                ss_path = OUT_DIR / "ohf_image_surface_ss.png"
                                ss_path.write_bytes(base64.b64decode(ss["data"]))
                                print(f"Screenshot: {ss_path} ({len(base64.b64decode(ss['data']))} bytes)")
                            except Exception as e:
                                print(f"Screenshot: {e}")
                            scroll_w = await ev(sid, "document.documentElement.scrollWidth")
                            scroll_h = await ev(sid, "document.documentElement.scrollHeight")
                            await send("Target.closeTarget", {"targetId": tid})
                            result = {
                                "url_requested": TARGET_URL,
                                "final_href": href,
                                "title": title,
                                "body_len": body_len,
                                "viewport": {"width": WIDTH, "height": HEIGHT},
                                "page_scroll": {"scrollWidth": scroll_w, "scrollHeight": scroll_h},
                                "visible_count_at_harvest": vc,
                                "element_count": len(elements),
                                "elements": elements,
                            }
                            out_path = OUT_DIR / "ohf_image_surface_harvest.json"
                            with open(out_path, "w", encoding="utf-8") as f:
                                json.dump(result, f, ensure_ascii=False, indent=2)
                            print(f"Wrote {out_path} — {len(elements)} elements")
                            return
                    except json.JSONDecodeError:
                        print(f"JSON parse err: {repr(info_raw[:200])}")
                await asyncio.sleep(1.5)
            print("No image surface after 40 attempts", file=sys.stderr)
            await send("Target.closeTarget", {"targetId": tid})
        finally:
            rt.cancel()

asyncio.run(main())
