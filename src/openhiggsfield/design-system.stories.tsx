import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * 디자인 시스템 시각 갤러리.
 * 이 스토리 자체가 "토큰 사용법"의 살아있는 예다 — 색/그림자는 전부 `var()`로만 참조하고
 * (리터럴 하드코딩 없음), 칩·버튼·아바타·알림은 실제 클래스로 CSS에.paint를 맡긴다.
 * 모든 렌더는 preview.ts의 `.ohf` decorator 안에서 토큰을 해석한다.
 */

/** 한 칸의 표면 스와치 — 토큰 이름과 값을 눈으로 대응시킨다. */
function Swatch({ token, label }: { token: string; label: string }) {
  return (
    <div className="ds-swatch" style={{ background: `var(${token})` }}>
      <span className="ds-swatch-tok">{token}</span>
      <span className="ds-swatch-lbl">{label}</span>
    </div>
  );
}

const galleryStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  width: "min(46rem, 90vw)",
};

function DesignSystemGallery() {
  return (
    <div style={galleryStyle}>
      {/* 1. 표면 램프 — s1→s3은 15단계씩 밝아진다 */}
      <section>
        <div className="ds-sect-head">표면 램프(surfaces)</div>
        <div className="ds-row">
          <Swatch token="--bg" label="본체" />
          <Swatch token="--s1" label="표면 1단" />
          <Swatch token="--s2" label="표면 2단" />
          <Swatch token="--s3" label="표면 3단(호버)" />
          <Swatch token="--s4" label="하이라이트" />
        </div>
      </section>

      {/* 2. 헤어라인 테두리 */}
      <section>
        <div className="ds-sect-head">구조 = 헤어라인(line)</div>
        <div className="ds-row">
          <div className="ds-line-sample" style={{ borderColor: "var(--line)" }}>--line white/5</div>
          <div className="ds-line-sample" style={{ borderColor: "var(--line-2)" }}>--line-2 white/10</div>
        </div>
      </section>

      {/* 3. 텍스트 계층(스모크드 플레이트 위에) */}
      <section>
        <div className="ds-sect-head">텍스트 계층(on 스모크드 플레이트)</div>
        <div style={{ background: "var(--plate)", color: "var(--plate-ink)", padding: "1rem", borderRadius: "12px" }}>
          <div style={{ color: "var(--tx)" }}>--tx 본문(1차)</div>
          <div style={{ color: "var(--tx2)" }}>--tx2 2차 아이콘</div>
          <div style={{ color: "var(--tx3)" }}>--tx3 2차 텍스트</div>
          <div style={{ color: "var(--tx4)" }}>--tx4 3차</div>
          <div style={{ color: "var(--tx-off)" }}>--tx-off 비활성/오프</div>
        </div>
      </section>

      {/* 4. 액센트 — 예약된 초록과 그 알파 변형 */}
      <section>
        <div className="ds-sect-head">라임 액센트(선택·주 동작·라이브니스에 예약)</div>
        <div className="ds-row">
          <div style={{ background: "var(--accent)", color: "var(--accent-ink)", padding: "0.6rem 1rem", borderRadius: "10px", fontWeight: 600 }}>
            --accent / 위 --accent-ink
          </div>
          <div style={{ background: "var(--accent-08)", color: "var(--tx)", padding: "0.6rem 1rem", borderRadius: "10px" }}>--accent-08 (5%)</div>
          <div style={{ background: "var(--accent-14)", color: "var(--tx)", padding: "0.6rem 1rem", borderRadius: "10px" }}>--accent-14 (10%)</div>
          <div style={{ outline: "2px solid var(--accent-32)", outlineOffset: "2px", color: "var(--accent)", padding: "0.6rem 1rem", borderRadius: "6px" }}>--accent-32 포커스 링</div>
        </div>
      </section>

      {/* 5. 위험색 3종 */}
      <section>
        <div className="ds-sect-head">위험(danger)</div>
        <div className="ds-row">
          <div style={{ color: "var(--danger)", padding: "0.5rem 0.75rem" }}>--danger 텍스트</div>
          <div style={{ background: "var(--danger-bg)", color: "var(--tx)", padding: "0.5rem 0.75rem", borderRadius: "8px" }}>--danger-bg</div>
          <div className="ds-line-sample" style={{ borderColor: "var(--danger-line)" }}>--danger-line</div>
        </div>
      </section>

      {/* 6. 높이 = 오프셋 그림자 + 시heen */}
      <section>
        <div className="ds-sect-head">높이 = 오프셋 그림자(shadows)</div>
        <div className="ds-row">
          <div className="ds-elev" style={{ boxShadow: "var(--shadow-1)" }}>--shadow-1 raised-sm</div>
          <div className="ds-elev" style={{ boxShadow: "var(--shadow-2)" }}>--shadow-2 raised</div>
          <div className="ds-elev" style={{ boxShadow: "var(--shadow-3)" }}>--shadow-3 modal</div>
          <div className="ds-elev" style={{ boxShadow: "var(--glint)" }}>--glint 시heen</div>
        </div>
      </section>

      {/* 7. 버튼 3군 — 선택 규칙(판에 초록 하나) */}
      <section>
        <div className="ds-sect-head">버튼 3군(accent 주 / solid 2차 / quiet 기각)</div>
        <div className="ds-row">
          <button type="button" className="ohf-btn-accent">적용하기</button>
          <button type="button" className="ohf-btn-solid">표면 2차</button>
          <button type="button" className="ohf-btn-quiet">닫기</button>
        </div>
      </section>

      {/* 8. 칩 · 아바타 · 브랜드 글리프 */}
      <section>
        <div className="ds-sect-head">칩 · 아바타 · 브랜드</div>
        <div className="ds-row">
          <span className="ohf-chip ohf-chip--role">역할 칩</span>
          <span className="ohf-chip">평칩</span>
          <div className="ohf-avatar">BA</div>
          <div className="ohf-avatar ohf-avatar--lg">BA</div>
          <span className="ohf-brand ohf-brand--glyph" role="img" aria-label="OpenHiggsfield">OH</span>
        </div>
      </section>

      {/* 9. 알림 */}
      <section>
        <div className="ds-sect-head">알림(alert)</div>
        <div className="ohf-alert">
          <span className="ohf-alert-ic" aria-hidden>!</span>
          <span className="ohf-alert-text">이것은 스코프 내의 위험/에러 알림이다.</span>
        </div>
      </section>

      {/* 10. 타이포 — 헤드라인 uppercase + 측정값 tabular */}
      <section>
        <div className="ds-sect-head">타이포 — 헤드라인 uppercase · 측정값 tabular</div>
        <div style={{ fontSize: "40px", fontWeight: 700, textTransform: "uppercase", lineHeight: "48px" }}>
          STUDIO HEADLINE
        </div>
        <div style={{ fontSize: "20px", fontWeight: 700, textTransform: "uppercase", lineHeight: "28px" }}>
          SECTION HEAD
        </div>
        <div style={{ fontSize: "14px", lineHeight: "20px", color: "var(--tx2)" }}>
          스와치 값과 카운트는 이 자리에 tabular numerals를 켠다.
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof DesignSystemGallery> = {
  title: "Design System/Gallery",
  component: DesignSystemGallery,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof DesignSystemGallery>;

export const Gallery: Story = {};
