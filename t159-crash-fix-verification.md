# t_159e30db — OHF 프롬프트 contenteditable removeChild 크래시 수복 검증

## 근원(원인)
- n183 contenteditable 에디터가 `{text === "" ? <p><br /></p> : <p>{text}</p>}` 로 **controlled 재렌더**.
- 브라우저가 타이핑으로 contenteditable 내부 DOM 을 직접 변경한 뒤, React 가 `text` state 로 같은 DOM 을 재조정 → reconciler 가 브라우저가 이미 제거/재배치한 node 를 owner 로 가정하고 remove → `NotFoundError: removeChild`.
- 결과: 크래시 후 생성하기 버튼·폼이 언마운트(수용 게이트의 `ohf_tree_after_type.generatePresent=False` 의 실체). HF 는 같은 조작 후 True 유지 → 매칭 실패.

## 수복 설계
- **uncontrolled 전환**: n183 의 JSX children 을 제거 → React 가 contenteditable 내부 자식을 diff 하지 않는다. 브라우저가 내부 DOM 을 소유 → reconciler 와 브라우저 직접-변경이 경주하지 않아 removeChild 0.
- 타이핑 경로: `syncFromEditor` 가 `innerText` → store 만 동기화하고 `lastEditorTextRef` 에 "에디터에서 직접 나온 값" 을 표기 → 그 값과 store text 가 같으면 에디터 DOM 재서작성을 생략(React 가 브라우저 소유 노드를 건드리지 않음).
- 외부 setText(prompt-optimize·record 로드 등 비타이핑 경로)는 명령형 `innerText` 로만 반영(노드 단위 diff 아님 → 안전·반영 유지).
- n184 placeholder 조건부 마운트는 **유지**(React 가 소유한 plain div 제거는 안전·"타이핑 소진 → phShown None" 현행 통과 동작 보존).

## 라이브 실측(fabrication 0·제 worktree dev :3122 ↔ 측정 chrome :9335, HF ground-truth :9222)
집중 크래시 프로브(`crash_probe_t159.py`): 실제 키 이벤트 + CDP insertText 타이핑 결과
- `pboxTxt = "고양이 영상 테스트abc"`(입력 실배선)
- `form = true`, `generatePresent = true`(크래시 후에도 생성하기·폼 **생존**)
- `removeChildHits = 0`, `errs = []`(removeChild/NotFoundError 흔적 0)
- `phShown = null`(placeholder 타이핑 소진 유지), `counterCount = 0`(카운터 부재 유지)
→ VERDICT: FIXED(no-crash, tree alive)

동시 라이브 동등성 게이트(`gate_t159.py` — 요소5 게이트·OHF_URL→3122):
- OVERALL **PASS** — tier_A(판정잔존)=0 · mech_ok=True · disclosed 20(부모와 동일 버킷·본 수정과 무관)
- `ohf_tree_after_type = {form:True, generatePresent:True}` ↔ `hf_tree_after_type = {form:True, generatePresent:True}` → **HF 와 매칭**
- `type_ohf_after_phShown = None` · `type_ohf_counter = 0`
- focus 링 0=0 · generate hover lime 매칭·press-hold :active none·항상 enabled · frame hover/dragover no-transition · 레퍼런스 연동 refSelected true=true·dropEmpty 0=0(무회귀)

## tsc
- 신규 0. before=after=24건(모두 custom-property/중복-attr 등 pre-existing·본 편집 영역 밖). comm 차이는 전량 라인번호 이동(위쪽 코드 삽입으로 기존 오류가 재번호), 오류 종류·문구 동일.

## 카드 규칙 준수
- 토큰 3계층 재사용·재설계 없음. base = 요소 5 커밋 ed14a05(위 fast-forward).
- generate 실제 실행(과금 API 호출) 없음 — 타이핑으로 버튼 존재 확인까지만.
- 공유 HF live :9222 프로필 localStorage 비우지 않음(게이트/프로브는 127.0.0.1 OHF 격리만 clear).
- push 미실시(로컬 워크트리 커밋만·선례 t_bea84dee/t_9f4571a7·운영자 지시 사안).

## 커밋
- `204804a` fix(video-surface): OHF 프롬프트 contenteditable removeChild 크래시 수복 — t_159e30db
