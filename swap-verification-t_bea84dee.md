# video-surface 요소 3: 드롭존·레퍼런스 콘텐츠 swap+placeholder 전환 — 검증 결과

## 판정: **PASS** (게이트 이슈 0)

## 실측 환경
- HF ground-truth: :9222 (HF live, 1440×900)
- OHF verification: :3115 (제 워크트리 서빙) ← 측정 chrome :9335
- 동시 라이브 CDP 실측, localStorage.clear OHF측만 적용 (HF측은 click으로 normalize)

## 상태 시퀀스
| 상태 | 트리거 | 게이트 이슈 | 잔차 |
|------|--------|------------|------|
| s0 | 프레임 normalize (초기) | 0 | 2 |
| s1 | 레퍼런스 탭 클릭 → 업로더+placeholder 전환 | 0 | 0 |
| s2 | 프레임 탭 복귀 → 드롭존+placeholder 복귀 | 0 | 2 |
| s3 | 레퍼런스 재클릭 (안정성) | 0 | 0 |

## 게이트 판정 근거 (라이브 DOM 실측)
- **콘텐츠 swap**: isUploader/isDropzone 불리언 HF↔OHF 전 상태 동등
- **placeholder 전환**: phText·edPh 문자열 HF↔OHF 전 상태 동등
- **업로더 텍스트**: "레퍼런스 추가하기" + "이미지와 요소 최대 9개, 동영상 3개, 오디오 파일 3개까지" 실재 확인
- **정상화**: HF localStorage persistence 대응 — 양쪽 프레임 normalize 후 시작

## 잔차 (게이트 면제 — 콘텐츠 지오메트리)
- s0: kidRect.w HF=0 OHF=302 Δ=302
- s0: kidRect.h HF=0 OHF=104 Δ=104
- s2: kidRect.w HF=0 OHF=302 Δ=302
- s2: kidRect.h HF=0 OHF=104 Δ=104

## fabrication 검사
모든 판정 근거는 라이브 DOM 실측만. 0 fabrication.
