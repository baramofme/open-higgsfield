#!/usr/bin/env python3
"""Concurrent HF<->OHF drill-down measurement at 1440x900.

Drives THREE tabs on the same CDP browser (:9222) so both apps are live in the
same instant with equalized metrics:
  - OHF app on the local dev server (:3013, serves commit 8b1997f) -> seeded into
    the drill-down, then driven through the three screens (assets/folders/trash).
  - HF public project page (/ko/@higgsfield.studio/projects/cully-hill-boys) ->
    folder panel + rail + breadcrumb + recommendation tiles ground truth.
  - HF /ko/community/projects -> the community-project-card grid that the OHF
    drill-grid card was actually built against (radius/bg/aspect/grid gap).

The OHF harvest reuses the proven HARVEST_JS from the parent render check verbatim
(so the OHF-side keys are apples-to-apples). The HF-side harvests mirror those keys.
Compares geometry (width/height only; absolute x/y differ because the two apps have
different page chrome) and computed styles element-by-element. Text content is a
placeholder difference (OHF is a static mock, HF shows real content) and is recorded
separately, NOT counted as a geometry/style FAIL.

Output: captures/drill-concurrent-report.json (per-element PASS/FAIL/DOC-DIFF/NV),
plus per-screen OHF screenshots and HF evidence screenshots."""
import asyncio, base64, json, os, sys, urllib.request
import websockets

APP   = "http://127.0.0.1:3013/"
HF_PROJ = "https://higgsfield.ai/ko/@higgsfield.studio/projects/cully-hill-boys"
HF_COMM = "https://higgsfield.ai/ko/community/projects"
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

# ── OHF harvest: copied VERBATIM from the parent render check (proven harness) ──
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
  const link = document.querySelector('.ohf-drill-crumb-link'); if (link) out.linkColor = cs(link).color;
  const ftitle = document.querySelector('.ohf-drill-folder-title'); if (ftitle) out.folderTitleColor = cs(ftitle).color;
  const ttitle = document.querySelector('.ohf-drill-tile-title'); if (ttitle) out.tileTitleColor = cs(ttitle).color;
  const cname = document.querySelector('.ohf-drill-card-name'); if (cname) out.cardNameColor = cs(cname).color;
  out.rows = document.querySelectorAll('.ohf-drill-row').length;
  out.tiles = document.querySelectorAll('.ohf-drill-tile').length;
  out.cards = document.querySelectorAll('.ohf-drill-card').length;
  out.expander = !!document.querySelector('.ohf-drill-row-expander');
  out.emptyTitle = (document.querySelector('.ohf-drill-empty-title') || {}).textContent;
  out.text = (document.querySelector('.ohf-drill') || {}).textContent || '';
  // extra keys this QA needs for the element-by-element compare:
  const list = document.querySelector('.ohf-drill-folder-list'); if (list) out.listGap = cs(list).gap;
  const crumbList = document.querySelector('.ohf-drill-crumb-list'); if (crumbList) out.crumbListGap = cs(crumbList).gap;
  const crumbNavEl = document.querySelector('.ohf-drill-crumb'); if (crumbNavEl) out.crumbNavColor = cs(crumbNavEl).color;
  const rowFs = document.querySelector('.ohf-drill-row'); if (rowFs) { const s = cs(rowFs); out.rowFs = s.fontSize; out.rowFw = s.fontWeight; out.rowLh = s.lineHeight; out.rowFg = s.color; out.rowBg = s.backgroundColor; }
  const ftitleFs = document.querySelector('.ohf-drill-folder-title'); if (ftitleFs) { const s = cs(ftitleFs); out.folderTitleFs = s.fontSize; out.folderTitleFw = s.fontWeight; out.folderTitleLh = s.lineHeight; }
  const countFw = document.querySelector('.ohf-drill-row-count'); if (countFw) { const s = cs(countFw); out.countFw = s.fontWeight; out.countLh = s.lineHeight; }
  const tmeta = document.querySelector('.ohf-drill-tile-meta'); if (tmeta) out.tileMetaColor = cs(tmeta).color;
  const ttitleFw = document.querySelector('.ohf-drill-tile-title'); if (ttitleFw) { const s = cs(ttitleFw); out.tileTitleFs = s.fontSize; out.tileTitleFw = s.fontWeight; out.tileTitleLh = s.lineHeight; }
  return out;
})()"""

# ── HF project page harvest (mirrors the OHF keys, robust quoted selectors) ──
HF_PROJ_JS = """(() => {
  const cs = (el) => getComputedStyle(el);
  const rect = (el) => { const r = el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const out = { href: location.href, title: document.title, cookieLen: document.cookie.length,
                hasSession: /__session/.test(document.cookie), bodyLen: (document.body.innerText||'').length,
                viewport: { iw: innerWidth, ih: innerHeight } };
  // folder panel: '폴더' text leaf -> climb to the border-right ~220px column
  const fLeaves = [...document.querySelectorAll('p,span,h2,h3,div')].filter(e =>
    e.children.length === 0 && (e.textContent || '').trim() === '폴더' && vis(e));
  let panel = null, label = null;
  if (fLeaves.length) {
    label = fLeaves[0];
    let e = fLeaves[0];
    for (let i = 0; i < 10 && e.parentElement; i++) {
      e = e.parentElement;
      const c = cs(e);
      if (parseFloat(c.borderRightWidth) >= 1 && parseFloat(c.width) <= 240 && parseFloat(c.width) >= 200) { panel = e; break; }
    }
  }
  if (panel) { const c = cs(panel); out.folderWidth = c.width; out.folderBorderRight = c.borderRightWidth + ' ' + c.borderRightColor; out.folderRect = rect(panel); }
  if (label) { const c = cs(label); out.folderTitleColor = c.color; out.folderTitleFs = c.fontSize; out.folderTitleFw = c.fontWeight; out.folderTitleLh = c.lineHeight; }
  // first folder row: a descendant ~36px tall, radius 12px, rounded-xl
  let row = null;
  if (panel) row = [...panel.querySelectorAll('div')].find(e => vis(e) && Math.round(rect(e).h) === 36 && cs(e).borderRadius === '12px' && /rounded-xl/.test(e.className || ''));
  if (row) {
    const c = cs(row);
    out.rowHeight = c.height; out.rowRadius = c.borderRadius; out.rowGap = c.gap;
    out.rowFs = c.fontSize; out.rowFw = c.fontWeight; out.rowLh = c.lineHeight; out.rowFg = c.color; out.rowBg = c.backgroundColor;
    out.rowRect = rect(row);
    const cnt = [...row.querySelectorAll('span')].find(s => /^[0-9]+$/.test((s.textContent || '').trim()));
    if (cnt) { const cc = cs(cnt); out.countColor = cc.color; out.countFontSize = cc.fontSize; out.countFw = cc.fontWeight; out.countLh = cc.lineHeight; out.countRect = rect(cnt); }
  }
  // folder list gap (the scroll inner flex-col list)
  if (row) { let p = row.parentElement; let best = null; for (let i = 0; i < 4 && p; i++) { if (p !== panel && cs(p).display === 'flex') best = p; p = p.parentElement; } if (best) out.listGap = cs(best).gap; }
  // breadcrumb
  const navs = [...document.querySelectorAll('nav[aria-label]')].filter(n => /경로|breadcrumb/i.test(n.getAttribute('aria-label') || ''));
  let crumb = navs.length ? (navs.find(vis) || navs[0]) : null;
  if (crumb) {
    const ol = crumb.querySelector('ol') || crumb;
    out.crumbListGap = cs(ol).gap; out.crumbRect = rect(crumb); out.crumbNavColor = cs(crumb).color;
    out.crumbText = (crumb.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 140);
    const link = crumb.querySelector('a'); if (link) { const c = cs(link); out.linkColor = c.color; out.crumbLinkFs = c.fontSize; out.crumbLinkFw = c.fontWeight; out.crumbLinkLh = c.lineHeight; }
  }
  // recommendation rail: a.group tiles; rail width == tile column width
  const tiles = [...document.querySelectorAll('a.group')].filter(a => { const r = a.getBoundingClientRect(); return r.width > 150 && r.height > 60 && vis(a); });
  if (tiles.length) {
    const t = tiles[0]; const c = cs(t);
    out.railWidth = c.width; out.tileGap = c.gap; out.tileAlignItems = c.alignItems; out.tileRect = rect(t); out.tileCount = tiles.length;
    const thumb = [...t.querySelectorAll('div')].find(d => /aspect-video/.test(d.className || '') && /rounded-xl/.test(d.className || '') && vis(d));
    if (thumb) { const cc = cs(thumb); out.thumbRadius = cc.borderRadius; out.thumbAspect = cc.aspectRatio; out.thumbRect = rect(thumb); out.thumbW = cc.width; }
    const title = [...t.querySelectorAll('span')].find(s => /line-clamp-3/.test(s.className || ''));
    if (title) { const cc = cs(title); out.tileTitleColor = cc.color; out.tileTitleFs = cc.fontSize; out.tileTitleFw = cc.fontWeight; out.tileTitleLh = cc.lineHeight; }
    const meta = [...t.querySelectorAll('span')].find(s => /text-q-text-secondary/.test(s.className || ''));
    if (meta) { const cc = cs(meta); out.tileMetaColor = cc.color; out.tileMetaFs = cc.fontSize; }
  }
  // trash row presence (does the public page expose a 휴지통 folder row at all?)
  const trashLeaves = [...document.querySelectorAll('p,span,div,button,a')].filter(e => vis(e) && (e.textContent || '').trim().replace(/\\s*[0-9]+$/, '').trim() === '휴지통');
  out.trashRowFound = trashLeaves.length;
  return out;
})()"""

# ── HF community grid harvest (the card ground-truth the OHF drill-grid was built on) ──
HF_COMM_JS = """(() => {
  const cs = (el) => getComputedStyle(el);
  const rect = (el) => { const r = el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const out = { href: location.href, title: document.title, viewport: { iw: innerWidth, ih: innerHeight } };
  const cards = [...document.querySelectorAll('.community-project-card')].filter(vis);
  out.cardCount = cards.length;
  if (cards.length) {
    const c0 = cards[0];
    out.cardRect = rect(c0); out.cardRadius = cs(c0).borderRadius; out.cardAspect = cs(c0).aspectRatio;
    const cover = c0.querySelector('.community-project-card-cover');
    if (cover) { out.cardBg = cs(cover).backgroundColor; out.coverRect = rect(cover); out.coverRadius = cs(cover).borderRadius; out.coverAspect = cs(cover).aspectRatio; }
  }
  let grid = cards.length ? cards[0].parentElement : null;
  for (let i = 0; i < 6 && grid && cs(grid).display !== 'grid'; i++) grid = grid.parentElement;
  if (grid && cs(grid).display === 'grid') { out.gridColGap = cs(grid).columnGap; out.gridRowGap = cs(grid).rowGap; out.gridCols = cs(grid).gridTemplateColumns; out.gridRect = rect(grid); }
  return out;
})()"""

ENTER_JS = """(() => {
  if (document.querySelector('.ohf-cinema-screen')) return 'already-cinema';
  const b = document.querySelector('.ohf-nav-item[aria-label*="enter the cinematic surface"]');
  if (b) { b.click(); return 'clicked-enter'; }
  return 'no-cinema-btn';
})()"""

GO_FOLDERS_JS = """(() => {
  const b = [...document.querySelectorAll('.ohf-drill-row-hit')].find(x => /비디오|이미지|오디오/.test(x.getAttribute('aria-label') || ''));
  if (b) { b.click(); return 'folder-clicked'; }
  return 'no-folder-hit';
})()"""

GO_TRASH_JS = """(() => {
  const b = [...document.querySelectorAll('.ohf-drill-folder button')].find(x => /휴지통/.test(x.getAttribute('aria-label') || ''));
  if (b) { b.click(); return 'trash-clicked'; }
  return 'no-trash-btn';
})()"""

GO_ASSETS_JS = """(() => {
  const b = [...document.querySelectorAll('.ohf-drill-row-hit')].find(x => /모든 에셋/.test(x.getAttribute('aria-label') || ''));
  if (b) { b.click(); return 'assets-clicked'; }
  return 'no-assets-hit';
})()"""


def browser_ws():
    with urllib.request.urlopen(CDP_HTTP + "/json/version", timeout=8) as r:
        return json.load(r)["webSocketDebuggerUrl"]


async def run():
    ws_url = browser_ws()
    async with websockets.connect(ws_url, max_size=None, open_timeout=30) as ws:
        msg_id = 0
        pending = {}
        events = {}

        async def send(method, params=None, session=None, timeout=30):
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
        made_targets = []

        async def new_session(url):
            res = await send("Target.createTarget", {"url": "about:blank"})
            tid = res["targetId"]
            made_targets.append(tid)
            session = (await send("Target.attachToTarget", {"targetId": tid, "flatten": True}))["sessionId"]
            await send("Runtime.enable", session=session)
            assert (await send("Runtime.evaluate", {"expression": "1+1", "returnByValue": True}, session=session))["result"]["value"] == 2, "wedge browser"
            await send("Emulation.setDeviceMetricsOverride",
                       {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}, session=session)
            await send("Page.enable", session=session)
            await send("Network.enable", session=session)
            await send("Network.setCacheDisabled", {"cacheDisabled": True}, session=session)
            return tid, session

        async def navigate(session, url):
            events.pop("Page.loadEventFired", None)
            await send("Page.navigate", {"url": url}, session=session)
            w = 0.0
            while not events.get("Page.loadEventFired"):
                await asyncio.sleep(0.2); w += 0.2
                if w > 30: break
            await asyncio.sleep(3.0)

        async def ev(session, expr):
            r = await send("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True}, session=session)
            if "exceptionDetails" in r:
                raise RuntimeError("JS exception: %s" % json.dumps(r["exceptionDetails"])[:400])
            return r["result"].get("value")

        async def shot(session, name):
            # captureScreenshot is a known flake (skill: retry up to 3, timeout=45).
            # Best-effort evidence only — never let it abort the measurement.
            for attempt in range(3):
                try:
                    s = await send("Page.captureScreenshot", {"format": "png"}, session=session, timeout=45)
                    with open(os.path.join(OUT_DIR, name + ".png"), "wb") as f:
                        f.write(base64.b64decode(s["data"]))
                    return True
                except Exception as e:
                    print("shot %s attempt %d failed: %r" % (name, attempt, e), file=sys.stderr)
                    await asyncio.sleep(1.5)
            print("shot %s: all 3 attempts failed (evidence omitted)" % name, file=sys.stderr)
            return False

        os.makedirs(OUT_DIR, exist_ok=True)

        # ---- create the three concurrent tabs ----
        ohf_tid, ohf = await new_session("about:blank")
        hf_proj_tid, hf_proj = await new_session("about:blank")
        hf_comm_tid, hf_comm = await new_session("about:blank")

        # bring HF pages up FIRST so they are live while we drive OHF
        await navigate(hf_proj, HF_PROJ)
        # dismiss a welcome/auth dialog if present (real users rarely get it)
        if await ev(hf_proj, "!!document.querySelector('[role=dialog]')"):
            await ev(hf_proj, """(()=>{const b=document.querySelector('[role=dialog] button[aria-label*=close], [role=dialog] button[data-dismiss], [role=dialog] [class*=close]'); if(b){b.click(); return 'clicked';} const x=[...document.querySelectorAll('[role=dialog] svg')].map(s=>s.closest('button')).filter(Boolean); if(x.length){x[0].click(); return 'clicked-x';} return 'no-btn';})()""")
            await asyncio.sleep(1.2)
        await navigate(hf_comm, HF_COMM)

        # ---- OHF: boot into the drill-down ----
        await navigate(ohf, APP)
        seeded = await ev(ohf, seed_js())
        print("seed:", seeded, file=sys.stderr)
        events.pop("Page.loadEventFired", None)
        await send("Page.reload", {"ignoreCache": True}, session=ohf)
        w = 0.0
        while not events.get("Page.loadEventFired"):
            await asyncio.sleep(0.2); w += 0.2
            if w > 30: break
        await asyncio.sleep(3.0)
        print("enter:", await ev(ohf, ENTER_JS), file=sys.stderr)
        await asyncio.sleep(1.8)
        print("enter2:", await ev(ohf, ENTER_JS), file=sys.stderr)
        await asyncio.sleep(1.0)

        # confirm the HF project page is REALLY rendered (auth gate check)
        hf_auth_check = await ev(hf_proj, """(() => {
          const drillish = !!(document.querySelector('nav[aria-label]') && /경로/.test(document.querySelector('nav[aria-label]').getAttribute('aria-label')||''));
          const folderLeaf = [...document.querySelectorAll('p,span')].some(e => (e.textContent||'').trim() === '폴더');
          return { href: location.href, title: document.title, hasSession: /__session/.test(document.cookie),
                   cookieLen: document.cookie.length, bodyLen: (document.body.innerText||'').length,
                   signIn: /sign-in|auth\\/sign-in/i.test(location.href) || /로그인/.test(document.title),
                   drillish: drillish, folderLeaf: folderLeaf };
        })()""")
        print("HF_AUTH_CHECK:", json.dumps(hf_auth_check, ensure_ascii=False), file=sys.stderr)

        # ---- harvest everything while all three are simultaneously live ----
        hf_proj_h = await ev(hf_proj, HF_PROJ_JS)
        hf_comm_h = await ev(hf_comm, HF_COMM_JS)
        ohf_assets  = await ev(ohf, HARVEST_JS)
        # drive OHF to folders then trash
        print("folders:", await ev(ohf, GO_FOLDERS_JS), file=sys.stderr)
        await asyncio.sleep(1.2)
        ohf_folders = await ev(ohf, HARVEST_JS)
        print("trash:", await ev(ohf, GO_TRASH_JS), file=sys.stderr)
        await asyncio.sleep(1.2)
        ohf_trash = await ev(ohf, HARVEST_JS)

        # drive HF project page to the folders state (click a real folder row) for a state delta read
        hf_proj_folders = await ev(hf_proj, """(() => {
          const rows=[...document.querySelectorAll('.ohf-drill-row')]; // (OHF selector, not HF) -> ignored
          const hits=[...document.querySelectorAll('[class*="rounded-xl"]')].filter(e=>{const r=e.getBoundingClientRect(); return r.height===36 && e.parentElement && /ACT|Regen|에셋/i.test(e.textContent||'');});
          if(!hits.length) return {clicked:false};
          const b=hits.find(e=>e.querySelector('button')) || hits[0];
          const btn=b.querySelector('button') || b; btn.click();
          return {clicked:true};
        })()""")
        await asyncio.sleep(1.2)
        hf_proj_after = await ev(hf_proj, HF_PROJ_JS)

        payload = {
            "hf_auth_check": hf_auth_check,
            "hf_proj": hf_proj_h,
            "hf_proj_after_folders": hf_proj_after,
            "hf_comm": hf_comm_h,
            "ohf": {"assets": ohf_assets, "folders": ohf_folders, "trash": ohf_trash},
        }
        # WRITE THE RAW HARVEST FIRST (screenshots are best-effort after this).
        with open(os.path.join(OUT_DIR, "drill-concurrent-raw.json"), "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=1)
        print("wrote drill-concurrent-raw.json", file=sys.stderr)

        # screenshots (best-effort evidence; failures are swallowed)
        shot_ok = {}
        shot_ok["qa-ohf-assets"] = await shot(ohf, "qa-ohf-assets")
        await ev(ohf, GO_FOLDERS_JS); await asyncio.sleep(1.0)
        shot_ok["qa-ohf-folders"] = await shot(ohf, "qa-ohf-folders")
        await ev(ohf, GO_TRASH_JS); await asyncio.sleep(1.0)
        shot_ok["qa-ohf-trash"] = await shot(ohf, "qa-ohf-trash")
        shot_ok["qa-hf-project"] = await shot(hf_proj, "qa-hf-project")
        shot_ok["qa-hf-community"] = await shot(hf_comm, "qa-hf-community")

        print(json.dumps({"auth": hf_auth_check, "panel": {
            "ohf_folderW": ohf_assets.get("folderWidth"), "hf_folderW": hf_proj_h.get("folderWidth"),
            "ohf_rowH": ohf_assets.get("rowHeight"), "hf_rowH": hf_proj_h.get("rowHeight"),
            "ohf_railW": ohf_assets.get("railWidth"), "hf_railW": hf_proj_h.get("railWidth")},
            "shots": shot_ok}, ensure_ascii=False))

        for tid in made_targets:
            try: await send("Target.closeTarget", {"targetId": tid}, timeout=5)
            except Exception: pass
        rt.cancel()

if __name__ == "__main__":
    asyncio.run(run())
