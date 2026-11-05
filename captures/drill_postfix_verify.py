#!/usr/bin/env python3
"""Post-fix concurrent re-verification of the drill-down tile-meta fix.

OHF now serves from :3111 (this worktree, AFTER patching .ohf-drill-tile-meta
color -> --drill-tertiary rgb(130,130,130)). HF project page is live again on
:9222 (guest, equalized 1440x900). Re-harvests the tile-meta colour plus the
persistent panel/rail/breadcrumb keys to confirm:
  1. tile-meta now matches HF (130,130,130) -> the single FAIL is resolved;
  2. no regression on the other matched elements.
Concurrent: both tabs are alive in the same instant on the same browser."""
import asyncio, base64, json, os, sys, urllib.request
import websockets

OHF   = "http://127.0.0.1:3111/"
HF    = "https://higgsfield.ai/ko/@higgsfield.studio/projects/cully-hill-boys"
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

seed_js = """(() => {
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

HARVEST_JS = """(() => {
  const cs = (el) => getComputedStyle(el);
  const drill = document.querySelector('.ohf-drill');
  const out = { present: !!drill, view: drill ? drill.getAttribute('data-view') : null };
  if (!drill) return out;
  const folder = document.querySelector('.ohf-drill-folder'); if (folder) { out.folderWidth = cs(folder).width; out.folderBorderRight = cs(folder).borderRightWidth + ' ' + cs(folder).borderRightColor; }
  const row = document.querySelector('.ohf-drill-row'); if (row) { out.rowHeight = cs(row).height; out.rowRadius = cs(row).borderRadius; out.rowGap = cs(row).gap; }
  const count = document.querySelector('.ohf-drill-row-count'); if (count) { out.countColor = cs(count).color; out.countFontSize = cs(count).fontSize; }
  const rail = document.querySelector('.ohf-drill-rail'); if (rail) out.railWidth = cs(rail).width;
  const tile = document.querySelector('.ohf-drill-tile'); if (tile) out.tileGap = cs(tile).gap;
  const thumb = document.querySelector('.ohf-drill-tile-thumb'); if (thumb) { out.thumbRadius = cs(thumb).borderRadius; out.thumbAspect = cs(thumb).aspectRatio; }
  const tmeta = document.querySelector('.ohf-drill-tile-meta'); if (tmeta) out.tileMetaColor = cs(tmeta).color;
  const ttitle = document.querySelector('.ohf-drill-tile-title'); if (ttitle) out.tileTitleColor = cs(ttitle).color;
  const link = document.querySelector('.ohf-drill-crumb-link'); if (link) out.linkColor = cs(link).color;
  const crumbList = document.querySelector('.ohf-drill-crumb-list'); if (crumbList) out.crumbListGap = cs(crumbList).gap;
  const ftitle = document.querySelector('.ohf-drill-folder-title'); if (ftitle) out.folderTitleColor = cs(ftitle).color;
  const grid = document.querySelector('.ohf-drill-grid'); if (grid) out.gridGap = cs(grid).gap;
  const card = document.querySelector('.ohf-drill-card'); if (card) { out.cardRadius = cs(card).borderRadius; out.cardBg = cs(card).backgroundColor; out.cardAspect = cs(card).aspectRatio; }
  return out;
})()"""

HF_JS = """(() => {
  const cs = (el) => getComputedStyle(el);
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const out = { href: location.href, hasSession: /__session/.test(document.cookie), bodyLen: (document.body.innerText||'').length };
  const fLeaves = [...document.querySelectorAll('p,span,h2,h3,div')].filter(e => e.children.length === 0 && (e.textContent||'').trim() === '폴더' && vis(e));
  let panel = null, label = null;
  if (fLeaves.length) { label = fLeaves[0]; let e = fLeaves[0]; for (let i=0;i<10&&e.parentElement;i++){e=e.parentElement; const c=cs(e); if(parseFloat(c.borderRightWidth)>=1 && parseFloat(c.width)<=240 && parseFloat(c.width)>=200){panel=e;break;} } }
  if (panel) out.folderWidth = cs(panel).width;
  if (label) out.folderTitleColor = cs(label).color;
  let row = panel ? [...panel.querySelectorAll('div')].find(e => vis(e) && Math.round(e.getBoundingClientRect().height)===36 && cs(e).borderRadius==='12px' && /rounded-xl/.test(e.className||'')) : null;
  if (row) { out.rowHeight = cs(row).height; out.rowRadius = cs(row).borderRadius; out.rowGap = cs(row).gap;
    const cnt=[...row.querySelectorAll('span')].find(s=>/^[0-9]+$/.test((s.textContent||'').trim())); if(cnt) out.countColor=cs(cnt).color; }
  const tiles=[...document.querySelectorAll('a.group')].filter(a=>{const r=a.getBoundingClientRect(); return r.width>150&&r.height>60&&vis(a);});
  if (tiles.length){ out.railWidth=cs(tiles[0]).width; out.tileGap=cs(tiles[0]).gap;
    const thumb=[...tiles[0].querySelectorAll('div')].find(d=>/aspect-video/.test(d.className||'')&&/rounded-xl/.test(d.className||'')&&vis(d)); if(thumb){out.thumbRadius=cs(thumb).borderRadius; out.thumbAspect=cs(thumb).aspectRatio;}
    const title=[...tiles[0].querySelectorAll('span')].find(s=>/line-clamp-3/.test(s.className||'')); if(title) out.tileTitleColor=cs(title).color;
    const meta=[...tiles[0].querySelectorAll('span')].find(s=>/text-q-text-secondary/.test(s.className||'')); if(meta) out.tileMetaColor=cs(meta).color; }
  const navs=[...document.querySelectorAll('nav[aria-label]')].filter(n=>/경로|breadcrumb/i.test(n.getAttribute('aria-label')||''));
  const crumb=navs.length?(navs.find(vis)||navs[0]):null;
  if(crumb){ const ol=crumb.querySelector('ol')||crumb; out.crumbListGap=cs(ol).gap; const a=crumb.querySelector('a'); if(a) out.linkColor=cs(a).color; }
  return out;
})()"""

ENTER_JS = """(() => { if (document.querySelector('.ohf-cinema-screen')) return 'already-cinema'; const b=document.querySelector('.ohf-nav-item[aria-label*="enter the cinematic surface"]'); if(b){b.click();return 'clicked';} return 'no-btn'; })()"""


def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=8) as r:
        return json.load(r)["webSocketDebuggerUrl"]

async def run():
    async with websockets.connect(browser_ws(), max_size=None, open_timeout=30) as ws:
        mid = 0; pending = {}; events = {}
        async def send(method, params=None, session=None, timeout=30):
            nonlocal mid; mid += 1
            m = {"id": mid, "method": method, "params": params or {}}
            if session: m["sessionId"] = session
            await ws.send(json.dumps(m))
            fut = asyncio.get_running_loop().create_future(); pending[mid] = fut
            try: return await asyncio.wait_for(fut, timeout)
            except asyncio.TimeoutError: pending.pop(mid, None); raise RuntimeError("timeout "+method)
        async def reader():
            try:
                while True:
                    d = json.loads(await ws.recv())
                    if "id" in d and d["id"] in pending: f = pending.pop(d["id"]); (f.done() or f.set_result(d.get("result", d.get("error"))))
                    elif "method" in d: events.setdefault(d["method"], []).append(d)
            except Exception as e: print("reader:", repr(e), file=sys.stderr)
        rt = asyncio.ensure_future(reader()); made = []
        async def new_session():
            res = await send("Target.createTarget", {"url": "about:blank"}); tid = res["targetId"]; made.append(tid)
            session = (await send("Target.attachToTarget", {"targetId": tid, "flatten": True}))["sessionId"]
            await send("Runtime.enable", session=session)
            assert (await send("Runtime.evaluate", {"expression":"1+1","returnByValue":True}, session=session))["result"]["value"]==2
            await send("Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False}, session=session)
            await send("Page.enable", session=session); await send("Network.enable", session=session)
            await send("Network.setCacheDisabled", {"cacheDisabled": True}, session=session)
            return session
        async def navigate(session, url):
            events.pop("Page.loadEventFired", None); await send("Page.navigate", {"url": url}, session=session)
            w=0.0
            while not events.get("Page.loadEventFired"): await asyncio.sleep(0.2); w+=0.2; (None if w<=30 else None)
            await asyncio.sleep(3.0)
        async def ev(session, expr):
            r = await send("Runtime.evaluate", {"expression":expr,"returnByValue":True,"awaitPromise":True}, session=session)
            if "exceptionDetails" in r: raise RuntimeError("JS: "+json.dumps(r["exceptionDetails"])[:300])
            return r["result"].get("value")
        async def shot(session, name):
            for a in range(3):
                try: s=await send("Page.captureScreenshot",{"format":"png"},session=session,timeout=45); open(os.path.join(OUT_DIR,name+".png"),"wb").write(base64.b64decode(s["data"])); return True
                except Exception as e: print("shot",name,"retry",a,repr(e),file=sys.stderr); await asyncio.sleep(1.5)
            return False
        os.makedirs(OUT_DIR, exist_ok=True)
        ohf = await new_session(); hf = await new_session()
        # HF up first (live ground truth)
        await navigate(hf, HF)
        if await ev(hf, "!!document.querySelector('[role=dialog]')"):
            await ev(hf, """(()=>{const b=document.querySelector('[role=dialog] button[aria-label*=close],[role=dialog] [class*=close]'); if(b){b.click();return 'c';} const x=[...document.querySelectorAll('[role=dialog] svg')].map(s=>s.closest('button')).filter(Boolean); if(x.length){x[0].click();return 'cx';} return 'no';})()""")
            await asyncio.sleep(1.2)
        # OHF boot on the FIXED build
        await navigate(ohf, OHF)
        await ev(ohf, seed_js)
        events.pop("Page.loadEventFired", None); await send("Page.reload", {"ignoreCache": True}, session=ohf)
        w=0.0
        while not events.get("Page.loadEventFired"): await asyncio.sleep(0.2); w+=0.2; (None if w<=30 else None)
        await asyncio.sleep(3.0)
        print("enter:", await ev(ohf, ENTER_JS), file=sys.stderr); await asyncio.sleep(1.8)
        print("enter2:", await ev(ohf, ENTER_JS), file=sys.stderr); await asyncio.sleep(1.0)

        hf_h = await ev(hf, HF_JS)
        ohf_h = await ev(ohf, HARVEST_JS)
        await shot(ohf, "qa-ohf-assets-postfix")
        await shot(hf, "qa-hf-project-postfix")

        # focused comparison
        checks = [
            ("tileMetaColor", ohf_h.get("tileMetaColor"), hf_h.get("tileMetaColor"), True),
            ("folderWidth", ohf_h.get("folderWidth"), hf_h.get("folderWidth"), True),
            ("rowHeight", ohf_h.get("rowHeight"), hf_h.get("rowHeight"), True),
            ("rowRadius", ohf_h.get("rowRadius"), hf_h.get("rowRadius"), True),
            ("rowGap", ohf_h.get("rowGap"), hf_h.get("rowGap"), True),
            ("countColor", ohf_h.get("countColor"), hf_h.get("countColor"), True),
            ("railWidth", ohf_h.get("railWidth"), hf_h.get("railWidth"), False),  # within 1px
            ("tileGap", ohf_h.get("tileGap"), hf_h.get("tileGap"), True),
            ("thumbRadius", ohf_h.get("thumbRadius"), hf_h.get("thumbRadius"), True),
            ("thumbAspect", ohf_h.get("thumbAspect"), hf_h.get("thumbAspect"), True),
            ("crumbListGap", ohf_h.get("crumbListGap"), hf_h.get("crumbListGap"), True),
            ("linkColor", ohf_h.get("linkColor"), hf_h.get("linkColor"), True),
            ("folderTitleColor", ohf_h.get("folderTitleColor"), hf_h.get("folderTitleColor"), True),
        ]
        import re
        def px(v):
            m=re.search(r"[-+]?\d*\.?\d+", str(v)); return float(m.group()) if m else None
        def eq_color(a,b): return re.sub(r"\s+"," ",str(a)).strip()==re.sub(r"\s+"," ",str(b)).strip()
        results = []
        for name, o, h, exact in checks:
            if o is None or h is None:
                st = "MISS"; d=None
            elif exact:
                d = eq_color(o,h) if "Color" in name else (px(o) is not None and px(h) is not None and abs(px(o)-px(h))<=1)
                st = "PASS" if d else "FAIL"
            else:
                a,b=px(o),px(h); d = a is not None and b is not None and abs(a-b)<=1; st="PASS" if d else "FAIL"
            results.append({"name":name,"ohf":o,"hf":h,"status":st})
        payload = {"hf":hf_h,"ohf":ohf_h,"checks":results,
                   "tileMeta_resolved": next((r["status"] for r in results if r["name"]=="tileMetaColor"), "MISS")}
        with open(os.path.join(OUT_DIR,"drill-concurrent-raw-postfix.json"),"w",encoding="utf-8") as f:
            json.dump(payload,f,ensure_ascii=False,indent=1)
        print(json.dumps({"tileMeta": [r for r in results if r["name"]=="tileMetaColor"],
                          "non_pass": [r["name"] for r in results if r["status"]!="PASS"]}, ensure_ascii=False))
        for tid in made:
            try: await send("Target.closeTarget",{"targetId":tid},timeout=5)
            except Exception: pass
        rt.cancel()

if __name__ == "__main__":
    asyncio.run(run())
