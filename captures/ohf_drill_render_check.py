#!/usr/bin/env python3
"""OHF render check: boot the drill-down screens in the local Next dev server
(:3013) by seeding the persisted stores in localStorage, then capture each of
the three screens (assets drill-down, folders, trash) with the .ohf-drill node
tree + key rects, so the port is proven to render and the token styling is
traceable. Drives CDP on the available headless endpoint (:9222 guest)."""
import asyncio, base64, json, os, sys, urllib.request
import websockets

APP = "http://127.0.0.1:3013/"
CDP_HTTP = "http://127.0.0.1:9222"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

PROJECT_ID = "proj-drill-test"
SEED_RECORDS = [
    {"id": "rec-1", "surface": "video", "modelId": "veo", "modelLabel": "Veo 3.1",
     "prompt": "해변의 golden hour 롱테이크", "ratio": "16 / 9", "meta": "16:9",
     "kind": "video", "urls": [], "status": "completed",
     "art": "linear-gradient(135deg,#3a1c5a,#0a0a12 70%)", "createdAt": 1, "projectId": PROJECT_ID},
    {"id": "rec-2", "surface": "video", "modelId": "sora", "modelLabel": "Sora 2",
     "prompt": "안개 낀 숲의 이동", "ratio": "16 / 9", "meta": "16:9",
     "kind": "video", "urls": [], "status": "completed",
     "art": "linear-gradient(135deg,#1c3a2a,#0a0a12 70%)", "createdAt": 2, "projectId": PROJECT_ID},
    {"id": "rec-3", "surface": "image", "modelId": "flux", "modelLabel": "Flux 2",
     "prompt": "도시 야경 스틸", "ratio": "1 / 1", "meta": "1:1",
     "kind": "image", "urls": [], "status": "completed",
     "art": "linear-gradient(135deg,#2a2a4a,#0a0a12 70%)", "createdAt": 3, "projectId": PROJECT_ID},
    {"id": "rec-4", "surface": "image", "modelId": "flux", "modelLabel": "Flux 2",
     "prompt": "사막의 적층", "ratio": "1 / 1", "meta": "1:1",
     "kind": "image", "urls": [], "status": "completed",
     "art": "linear-gradient(135deg,#5a3a1c,#0a0a12 70%)", "createdAt": 4, "projectId": PROJECT_ID},
    {"id": "rec-5", "surface": "audio", "modelId": "audio", "modelLabel": "오디오",
     "prompt": "잔잔한 앰비언스", "ratio": "1 / 1", "meta": "1:1",
     "kind": "audio", "urls": [], "status": "completed",
     "art": "linear-gradient(135deg,#1c3a5a,#0a0a12 70%)", "createdAt": 5, "projectId": PROJECT_ID},
    {"id": "rec-6", "surface": "video", "modelId": "veo", "modelLabel": "Veo 3.1",
     "prompt": "불꽃놀이 클로즈업", "ratio": "16 / 9", "meta": "16:9",
     "kind": "video", "urls": [], "status": "completed",
     "art": "linear-gradient(135deg,#5a1c2a,#0a0a12 70%)", "createdAt": 6, "projectId": PROJECT_ID},
]

def seed_js():
    return """(() => {
      const P = %PID%;
      const proj = { id: P, name: "드릴다운 테스트", private: true, createdAt: Date.now() };
      const recs = %RECS%;
      const wrap = (state) => JSON.stringify({ state: state, version: 0 });
      localStorage.setItem("openhiggsfield.studio-mode.v1", wrap({ mode: "cinema", cinemaMode: "image" }));
      localStorage.setItem("openhiggsfield.projectSurface.v1", wrap({ projectId: P, panel: "assets", cinemaView: null }));
      localStorage.setItem("openhiggsfield.projects.v1", wrap({ projects: [proj], activeProjectId: P }));
      localStorage.setItem("openhiggsfield.history.v1", JSON.stringify(recs));
      localStorage.setItem("openhiggsfield.projectView.v1", wrap({ open: false, projectId: null }));
      return "seeded " + localStorage.length;
    })()""".replace("%PID%", json.dumps(PROJECT_ID)).replace("%RECS%", json.dumps(SEED_RECORDS))

# harvest the drill-down tree + the key token-styled rects for traceability
HARVEST_JS = """(() => {
  const cs = (el) => getComputedStyle(el);
  const rect = (el) => { const r = el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
  const drill = document.querySelector('.ohf-drill');
  const out = { present: !!drill, view: drill ? drill.getAttribute('data-view') : null };
  if (!drill) return out;
  out.crumbNav = !!document.querySelector('.ohf-drill-crumb[aria-label="탐색 경로"]');
  const crumb = document.querySelector('.ohf-drill-crumb');
  if (crumb) out.crumbRect = rect(crumb);
  const folder = document.querySelector('.ohf-drill-folder');
  if (folder) { const s = cs(folder); out.folderRect = rect(folder); out.folderWidth = s.width; out.folderBorderRight = s.borderRightWidth + ' ' + s.borderRightColor; }
  const row = document.querySelector('.ohf-drill-row');
  if (row) { const s = cs(row); out.rowRect = rect(row); out.rowHeight = s.height; out.rowRadius = s.borderRadius; out.rowGap = s.gap; }
  const count = document.querySelector('.ohf-drill-row-count');
  if (count) { const s = cs(count); out.countRect = rect(count); out.countColor = s.color; out.countFontSize = s.fontSize; }
  const rail = document.querySelector('.ohf-drill-rail');
  if (rail) { out.railRect = rect(rail); out.railWidth = cs(rail).width; }
  const tile = document.querySelector('.ohf-drill-tile');
  if (tile) { out.tileRect = rect(tile); out.tileGap = cs(tile).gap; }
  const thumb = document.querySelector('.ohf-drill-tile-thumb');
  if (thumb) { const s = cs(thumb); out.thumbRect = rect(thumb); out.thumbRadius = s.borderRadius; out.thumbAspect = s.aspectRatio; }
  const card = document.querySelector('.ohf-drill-card');
  if (card) { const s = cs(card); out.cardRect = rect(card); out.cardRadius = s.borderRadius; out.cardBg = s.backgroundColor; out.cardAspect = s.aspectRatio; }
  const grid = document.querySelector('.ohf-drill-grid');
  if (grid) { out.gridGap = cs(grid).gap; }
  // text colours that must trace: link, folder title, tile title, card name
  const link = document.querySelector('.ohf-drill-crumb-link'); if (link) out.linkColor = cs(link).color;
  const ftitle = document.querySelector('.ohf-drill-folder-title'); if (ftitle) out.folderTitleColor = cs(ftitle).color;
  const ttitle = document.querySelector('.ohf-drill-tile-title'); if (ttitle) out.tileTitleColor = cs(ttitle).color;
  const cname = document.querySelector('.ohf-drill-card-name'); if (cname) out.cardNameColor = cs(cname).color;
  // structural counts
  out.rows = document.querySelectorAll('.ohf-drill-row').length;
  out.tiles = document.querySelectorAll('.ohf-drill-tile').length;
  out.cards = document.querySelectorAll('.ohf-drill-card').length;
  out.expander = !!document.querySelector('.ohf-drill-row-expander');
  out.emptyTitle = (document.querySelector('.ohf-drill-empty-title') || {}).textContent;
  out.text = (document.querySelector('.ohf-drill') || {}).textContent || '';
  return out;
})()"""


def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=8) as r:
        return json.load(r)["webSocketDebuggerUrl"]


async def run():
    async with websockets.connect(browser_ws(), max_size=None, open_timeout=30) as ws:
        mid = 0
        pending = {}
        events = {}

        async def send(method, params=None, session=None, timeout=25):
            nonlocal mid
            mid += 1
            m = {"id": mid, "method": method, "params": params or {}}
            if session: m["sessionId"] = session
            await ws.send(json.dumps(m))
            fut = asyncio.get_running_loop().create_future()
            pending[mid] = fut
            try:
                return await asyncio.wait_for(fut, timeout)
            except asyncio.TimeoutError:
                pending.pop(mid, None); raise RuntimeError("timeout " + method)

        async def reader():
            try:
                while True:
                    d = json.loads(await ws.recv())
                    if "id" in d and d["id"] in pending:
                        f = pending.pop(d["id"])
                        if not f.done(): f.set_result(d.get("result", d.get("error")))
                    elif "method" in d:
                        events.setdefault(d["method"], []).append(d)
            except Exception as e:
                print("reader:", repr(e), file=sys.stderr)

        rt = asyncio.ensure_future(reader())
        tid = None
        try:
            res = await send("Target.createTarget", {"url": "about:blank"})
            tid = res["targetId"]
            session = (await send("Target.attachToTarget", {"targetId": tid, "flatten": True}))["sessionId"]
            await send("Runtime.enable", session=session)
            assert (await send("Runtime.evaluate", {"expression": "1+1", "returnByValue": True}, session=session))["result"]["value"] == 2
            await send("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, session=session)
            await send("Page.enable", session=session)
            await send("Network.enable", session=session)

            async def ev(expr):
                r = await send("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True}, session=session)
                if "exceptionDetails" in r: raise RuntimeError("JS: " + json.dumps(r["exceptionDetails"])[:300])
                return r["result"].get("value")

            async def wait_load():
                events.pop("Page.loadEventFired", None)
                await send("Page.navigate", {"url": APP}, session=session)
                w = 0.0
                while not events.get("Page.loadEventFired"):
                    await asyncio.sleep(0.2); w += 0.2
                    if w > 30: break
                await asyncio.sleep(2.5)

            # first load (empty storage) then seed + reload so the app boots into the drill-down
            await wait_load()
            seeded = await ev(seed_js())
            print("seed:", seeded, file=sys.stderr)
            # HARD reload so the app boots fresh and rehydrates from localStorage
            events.pop("Page.loadEventFired", None)
            await send("Page.reload", {"ignoreCache": True}, session=session)
            w = 0.0
            while not events.get("Page.loadEventFired"):
                await asyncio.sleep(0.2); w += 0.2
                if w > 30: break
            await asyncio.sleep(3.0)

            # Enter cinema via the app's own toggle if rehydration didn't already.
            ENTER_JS = """(() => {
              if (document.querySelector('.ohf-cinema-screen')) return 'already-cinema';
              const b = document.querySelector('.ohf-nav-item[aria-label*="enter the cinematic surface"]');
              if (b) { b.click(); return 'clicked-enter'; }
              return 'no-cinema-btn';
            })()"""
            print("enter:", await ev(ENTER_JS), file=sys.stderr)
            await asyncio.sleep(1.8)
            print("enter2:", await ev(ENTER_JS), file=sys.stderr)
            await asyncio.sleep(1.0)

            DEBUG_JS = """(() => {
              const cls = {};
              document.querySelectorAll('*').forEach(e => {
                (e.className && typeof e.className === 'string' ? e.className.split(/\\s+/) : []).forEach(c => { if (/ohf-|next|cinema|studio|landing|welcome|sign|login|drill/.test(c)) cls[c] = (cls[c] || 0) + 1; });
              });
              return {
                url: location.href,
                title: document.title,
                bodyLen: (document.body && document.body.innerText || '').length,
                bodyHead: ((document.body && document.body.innerText || '').slice(0, 220)),
                cinemaScreen: !!document.querySelector('.ohf-cinema-screen'),
                cinemaSurface: !!document.querySelector('.ohf-cinebar--project'),
                topbar: !!document.querySelector('.ohf-topbar'),
                drill: !!document.querySelector('.ohf-drill'),
                storageKeys: Object.keys(localStorage),
                studioMode: (JSON.parse(localStorage.getItem('openhiggsfield.studio-mode.v1') || 'null') || {}).state,
                surfaceState: (JSON.parse(localStorage.getItem('openhiggsfield.projectSurface.v1') || 'null') || {}).state,
                reactRoots: document.getElementById('__next') ? 'pages-router' : (document.getElementById('root') ? 'root' : 'unknown')
              };
            })()"""
            print("DEBUG:", json.dumps(await ev(DEBUG_JS), ensure_ascii=False)[:1800], file=sys.stderr)

            async def snap(name):
                h = await ev(HARVEST_JS)
                s = await send("Page.captureScreenshot", {"format": "png"}, session=session, timeout=45)
                with open(os.path.join(OUT_DIR, name + ".png"), "wb") as f:
                    f.write(base64.b64decode(s["data"]))
                return h

            os.makedirs(OUT_DIR, exist_ok=True)
            results = {}
            results["assets"] = await snap("ohf-drill-assets")
            # navigate to trash via the folder-panel 휴지통 row
            clicked = await ev("(()=>{const b=[...document.querySelectorAll('.ohf-drill-folder button')].find(x=>/휴지통/.test(x.getAttribute('aria-label')||'')); if(b){b.click(); return 'trash-clicked';} return 'no-trash-btn';})()")
            await asyncio.sleep(1.2)
            results["trash"] = await snap("ohf-drill-trash")
            # navigate to folders via a folder hit row
            clicked2 = await ev("(()=>{const b=[...document.querySelectorAll('.ohf-drill-row-hit')].find(x=>/비디오|이미지|오디오/.test(x.getAttribute('aria-label')||'')); if(b){b.click(); return 'folder-clicked';} return 'no-folder-hit';})()")
            await asyncio.sleep(1.2)
            results["folders"] = await snap("ohf-drill-folders")

            with open(os.path.join(OUT_DIR, "ohf-drill-render-check.json"), "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=1)
            print(json.dumps(results, ensure_ascii=False)[:1500])
            await send("Target.closeTarget", {"targetId": tid})
        finally:
            rt.cancel()
            if tid:
                try: await send("Target.closeTarget", {"targetId": tid}, timeout=5)
                except Exception: pass


if __name__ == "__main__":
    asyncio.run(run())
