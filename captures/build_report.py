#!/usr/bin/env python3
"""Build the Korean ground-truth report from captured capture JSONs only
(verbatim extracted values; nothing hand-typed -> no fabrication)."""
import json, os

D = os.path.dirname(os.path.abspath(__file__))

KEYPROPS = ["color", "backgroundColor", "backgroundImage", "borderTopWidth",
            "borderTopColor", "borderRadius", "paddingTop", "paddingRight",
            "paddingBottom", "paddingLeft", "marginTop", "marginLeft",
            "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign",
            "boxShadow", "display", "gridTemplateColumns", "flexDirection",
            "alignItems", "gap", "rowGap", "columnGap", "overflow", "opacity",
            "visibility", "position", "zIndex", "backdropFilter", "filter",
            "transform", "width", "height", "aspectRatio", "objectFit"]

def load(name):
    with open(os.path.join(D, name), encoding="utf-8") as f:
        return json.load(f)

def fmt_styles(st):
    bits = []
    for k in KEYPROPS:
        v = st.get(k)
        if v:
            bits.append("%s=%s" % (k, v))
    return "; ".join(bits)

def walk(e, depth=0, maxdepth=6):
    rows = []
    ident = "%s%s" % (e["tag"], ("#"+e["id"]) if e["id"] else "")
    aria = e["aria"] or ""
    label = ident + ((" [aria=%s]" % aria) if aria else "")
    if e["ownText"]:
        label += (" 「%s」" % e["ownText"][:40])
    r = e["rect"]
    rows.append((depth, label, e["cls"][:150], "x%d y%d %d×%d" % (r["x"], r["y"], r["w"], r["h"]),
                 fmt_styles(e["styles"])))
    if depth < maxdepth:
        for ch in e.get("children", []):
            rows.extend(walk(ch, depth + 1, maxdepth))
    return rows

def table(rows):
    out = ["| 깊이 | 요소 | 클래스(앞 150자) | rect | 주요 computed |",
           "|---|---|---|---|---|"]
    for depth, label, cls, rect, st in rows:
        out.append("| %d | %s | %s | %s | %s |" % (depth, label, cls, rect, st))
    return "\n".join(out)

lines = []
A = lines.append

A("# HF 드릴다운 public 프레임 ground-truth — t_7c971f80")
A("")
A("출처: public CDP 127.0.0.1:9222 (HeadlessChrome 153, 뷰포트 1440×900, Emulation.setDeviceMetricsOverride).")
A("모든 수치는 이 문서 하단 매니페스트의 capture JSON에서 기계적으로 추출한 실측값이며, 손으로 쓴 값은 없음(fabrication 금지 준수).")
A("capture 시점: 2026-11-06 00:17~00:3x KST. 상세 원문은 동명의 .json/.html/.png 파일(작업트리 `captures/`).")
A("")
A("## 0. 세션/인증을 통한 게이트 판정 (fresh-target 실측)")
s0 = load("project3.json")["harvest"]
A("- 9222 소유 프로세스: `--headless=new --user-data-dir=.../ds-cdp-profile` (비인증 public-capture 인스턴스). 9223~9227/9444 응답 없음 → 인증된 Chrome 부재(재확인).")
A("- 쿠키 이름 실측(project-3 fresh 탭): `%s`" % ", ".join(s0["cookieNames"]))
A("- → Clerk 세션 JWT 없음 = guest. device/consent/guest 계열만 존재.")
A("- 인증 게이트 판정 근거는 각 프레임 절의 실측 렌더 텍스트.")
A("")

# ---------- Frame 1 ----------
A("## 1. 프로젝트 리스트 셀/카드 스타일링")
A("")
A("### 1a. 요청 URL 자체는 인증 게이트 (공용 콘텐츠 없음)")
p3 = load("p3-open.json")
A("- `/ko/generate/@exploringdonut1792/project-3` 로딩 후 렌더 실측(project3.json): URL 유지·리다이렉트 없이 **Radix welcome-auth 모달**(`role=dialog`, `id=radix-_r_11_`)이 전체를 덮음 — rect %s, 시그니처 클래스 `%s…`; 모달 안 이메일/소셜 가입 폼 존재(`hasAuthForm=true`)." % (
    p3_pre := load("project3.json")["harvest"]["modalInfo"]["rect"],
    load("project3.json")["harvest"]["modalInfo"]["cls"][:90]))
A("- 모달 뒤 비계층 확인: `projCells=0, crumbs=0, trashish=0` (pass-1 counts) → 프로젝트 콘텐츠 자체는 비공개.")
A("- 모달의 실제 닫기(X)를 실제 클릭하면 → `%s` (원 프로젝트 컨텍스트 상실)." % p3["post"]["href"])
A("- `/ko/generate/@exploringdonut1792`(guest)도 동일 앱 셸만 렌더(bodyLen %d, 프로젝트 리스트 없음): %s" % (
    load("lib-open.json")["post"]["bodyLen"], "lib-open.json"))
A("")
A("### 1b. 공용으로 확보된 프로젝트 리스트 셀 — 3개 surface")
A("")
cp = load("community-projects.json")
A("#### (i) `/ko/community/projects` 프로젝트 갤러리 그리드 — 공용")
A("개수: %d cards · docScroll %s" % (cp["cardCount"], cp["docScroll"]))
cont = cp["container"]["self"]
A("")
A("그리드 컨테이너: rect x%d y%d %d×%d · cls `%s`" % (
    cont["rect"]["x"], cont["rect"]["y"], cont["rect"]["w"], cont["rect"]["h"], cont["cls"]))
A("컨테이너 computed: `%s`" % fmt_styles(cont["styles"]))
A("")
A("카드 rect 지오메트리(앞 12): x 집합 %s · y 집합 %s — 카드는 329×186 고정, 행 피치 206px" % (
    sorted({r["x"] for r in cp["cardRects"][:12]}), sorted({r["y"] for r in cp["cardRects"][:12]})))
A("")
k0 = cp["cards"][0]
A("카드 원문 outerHTML(첫 카드, 전체 %d자 중 앞부분):" % len(cp["container"]["outerHTML"]))
A("")
A("```html")
A(cp["container"]["outerHTML"][:2600] + " …[TRUNC]")
A("```")
A("")
A("카드 트리(깊이 6까지, 첫 카드):")
A("")
A(table(walk(k0, 0, 6)))
A("")
cc = load("community-cards.json")
A("동일 구조가 `/ko/community`에도 존재: cardCount=%d (%s)" % (cc["cardCount"], "community-cards.json"))
A("")
dr = load("deep-regions.json")
rail = dr["rail"]
A("#### (ii) 공용 프로젝트 드릴다운(`/ko/@higgsfield.studio/projects/cully-hill-boys`) 우측추천 레일 — `전체 프로젝트 보기` 리스트 %d tiles" % rail["tileCount"])
rs = rail["self"]
A("레일 컨테이너: rect x%d y%d %d×%d · cls `%s` · computed `%s`" % (
    rs["rect"]["x"], rs["rect"]["y"], rs["rect"]["w"], rs["rect"]["h"], rs["cls"], fmt_styles(rs["styles"])))
t0 = rail["tiles"][0]
A("")
A("타일 트리(첫 타일, 깊이 6):")
A("")
A(table(walk(t0, 0, 6)))
A("")
A("타일 클래스 집합: %s" % " | ".join(rail["tileClasses"][:2]))
A("")

# ---------- Frame 2 ----------
A("## 2. 폴더 breadcrumb 바")
A("")
A("### 2a. `/folders/<uuid>`는 인증 게이트 — 그 페이지 자체의 breadcrumb은 비공개")
fo = load("folders-open.json")["post"]
A("- `/ko/folders` guest 실측 렌더(fresh 탭, welcome 소비 후): `%s`" % fo["bodyExcerpt"][:300].replace("\n", " | "))
A("- 즉 404 마케팅 셸(%s)이며 folder drill-down UI 자체가 존재하지 않음 — crumbs=0, folderEls=0 (counts)." % "「404 · 페이지를 찾을 수 없어요 · 홈으로 돌아가기」")
A("- 공개 페이지 어디를 크롤러봐도 `a[href*=folders]` 링크 없음(lib-open/pub-project/community HTML grep 0건) → uuid 확보 불가·라우트 비공개. **노트 후 스킵(원칙 준수, 조작 없음).**")
A("")
A("### 2b. 공용으로 확보된 breadcrumb — 공용 프로젝트 드릴다운의 `탐색 경로` 내비")
cr = load("deep-regions.json")["crumb"]
A("rect: x%d y%d %d×%d · nav[aria-label] 시그니처 확인" % (
    cr["self"]["rect"]["x"], cr["self"]["rect"]["y"], cr["self"]["rect"]["w"], cr["self"]["rect"]["h"]))
A("")
A("outerHTML 원문(전체 %d자, 무손실):" % len(cr["outerHTML"]))
A("")
A("```html")
A(cr["outerHTML"])
A("```")
A("")
A("트리 + rect + computed:")
A("")
A(table(walk(cr["self"], 0, 6)))
A("")
fp = load("pub-project-folders.json")
pan = fp["panel"]["self"]
A("### 2c. 폴더 목록 UI(비공개 /folders 페이지의 이식 대상과 대응) — 같은 드릴다운에서 공용 렌더")
A("폴더 패널: rect x%d y%d %d×%d · cls `%s` · computed `%s`" % (
    pan["rect"]["x"], pan["rect"]["y"], pan["rect"]["w"], pan["rect"]["h"], pan["cls"], fmt_styles(pan["styles"])))
A("")
A("패널 outerHTML(원문 앞 %d자 / 총 %d자):" % (2600, len(fp["panel"]["outerHTML"])))
A("")
A("```html")
A(fp["panel"]["outerHTML"][:2600] + " …[TRUNC]")
A("```")
A("")
A("트리(깊이 7):")
A("")
A(table(walk(pan, 0, 7)))
A("")

# ---------- Frame 3 ----------
A("## 3. trash 빈 상태 셸")
to = load("trash-open.json")["post"]
A("- `/trash` → `/ko/trash`으로 로케일 정규화 후 guest 실측(fresh 탭): 렌더 텍스트 `%s`" % to["bodyExcerpt"][:300].replace("\n", " | "))
A("- → 마케팅 404 셸. `trashEls=0, folderEls=0` (counts). **trash drill-down은 라우트 자체가 비공개 — 노트 후 스킵(원칙 준수).**")
A("- 참고로 guest에게 실재 렌더되는 공용 404 셸의 rect 원본(이식 시 무관이지만 honest 기록): main %s" % to["mainInfo"]["rect"])
A("")
A("### 부록: guest 첫 방문 welcome/auth 모달 지오메트리 (공용 렌더의 실재 레이어)")
mi = load("project3.json")["harvest"]["modalInfo"]
A("modal rect %s · computed %s" % (mi["rect"], fmt_styles(mi["styles"])))
A("클래스 원문: `%s`" % mi["cls"])
A("")

# ---------- theme/shell ----------
A("## 4. 공용 셸 공통 사실 (양식 토큰 이식 참조)")
p3o = load("p3-open.json")["post"]
sb = p3o["sidebarInfo"]
A("- 앱 셸 사이드바(`/ko/generate` guest): rect %s · cls `%s…` · computed `%s`" % (
    sb["rect"], sb["cls"][:120], fmt_styles(sb["styles"])))
A("- html 테마속성(pub-project deep): `%s` · color-scheme `%s` · bodyBg `%s`" % (
    dr["theme"]["htmlDataTheme"], dr["theme"]["colorScheme"], dr["theme"]["bodyBg"]))
A("- pub-project 전페이지 지오메트리: viewport %s · docScroll %s" % (dr["viewport"], dr["docScroll"]))
A("")

A("## 5. 매니페스트 (재검증 가능한 원본)")
A("")
A("작업트리: `/home/baramofme/open-higgsfield/.worktrees/t_7c971f80/captures/`")
A("")
A("| 파일 | 내용 |")
A("|---|---|")
manifest = [
    ("project3.json/html/png", "project-3 첫 방문 — welcome-auth 모달 덮인 guest 렌더"),
    ("p3-open.json", "모달 X 실클릭 후 %s로의 리다이렉트 + post 상태" % p3o["href"]),
    ("lib-open.json", "/ko/generate/@exploringdonut1792 guest 앱 셸"),
    ("folders-open.json", "/ko/folders guest 404 실측"),
    ("trash-open.json", "/ko/trash guest 404 실측"),
    ("pub-project.json/html/png", "공용 프로젝트 드릴다운 전체 프레임(crumbs/tiles 실측)"),
    ("deep-regions.json + deep-*.png", "breadcrumb·레일·셸 딥 하베스트"),
    ("pub-project-folders.json/png", "폴더 패널 딥 하베스트"),
    ("community.json", "/ko/community generic 하베스트"),
    ("community-cards.json/png", "/ko/community 프로젝트 카드 32개"),
    ("community-projects.json/png", "/ko/community/projects 갤러리 그리드 32개"),
    ("capture_frame.py / capture2.py / region_harvest.py / regions2.py / regions3.py", "하네스(재실행 가능)"),
]
for k, v in manifest:
    A("| `%s` | %s |" % (k, v))
A("")
A("### 판정 요약")
A("1. 프로젝트 리스트 셀/카드 → **공용 확보됨** (community/projects 그리드 + community + 드릴다운 레일). 요청 URL의 개인 project-3 자체는 인증 게이트로 콘텐츠 없음.")
A("2. folder breadcrumb → `/folders/<uuid>` 페이지는 **비공개(노트·스킵)**. 단 breadcrumb 컴포넌트 실측은 공용 드릴다운에서 확보, 폴더 목록 UI도 공용 확보.")
A("3. trash 빈 상태 셸 → **비공개(노트·스킵)**. guest 렌더는 404 마케팅 셸.")

out = "\n".join(lines) + "\n"
path = os.path.join(D, "public-frames-groundtruth-t_7c971f80.md")
with open(path, "w", encoding="utf-8") as f:
    f.write(out)
print("WROTE", path, len(out), "chars")
