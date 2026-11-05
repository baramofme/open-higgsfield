/**
 * 플레이리스트 순회 키보드 가드 predicate.
 *
 * 타임라인 슬라이더의 ArrowRight가 뷰어 다이얼로그의 onKeyDown에 버블링되면
 * 플레이리스트가 순회되어 편집 탭이 언마운트된다. 슬라이더·입력란·비디오가
 * 자기 일을 위해 화살표를 필요로 하므로, 그 위에 발생한 키는 순회를 거절해야 한다.
 * (실결함 t_b10965bb: ArrowRight 시커 → 편집 탭 언마운트 → 가드 착지)
 */

/** 순회를 거절해야 하는 대상(화살표 키의 발생 지점)인지. */
export function arrowNavShouldSkip(target: EventTarget | null): boolean {
  // 비디오의 네이티브 재생/일시정지·UA 속도 메뉴가 화살표를 소비한다.
  if (target instanceof HTMLVideoElement) return true;
  // input/textarea: 캐럿이 화살표로 이동한다.
  // [role=slider] (ARIA 슬라이더): 시커가 화살표로 전진한다.
  if (target instanceof HTMLElement) {
    const tag = target.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") return true;
    if (target.closest('[role="slider"]')) return true;
  }
  return false;
}
