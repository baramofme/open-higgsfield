"use client";

/* Higgsfield's /asset/all canonical left sidebar, mirrored. Every row is an
   icon chip + a label + an optional count badge, laid on a [auto 1fr auto]
   grid; the active row carries data-active="true" and aria-current="page" the
   way the source does. Each SVG path is lifted verbatim from the harvested DOM
   so the rail carries HF's own silhouettes. The 도구 section is a real <section>
   with an h3 heading, and the two tools HF never badges (휴지통, 오디오) render an
   empty count wrapper — no inner pill — exactly as captured. */

export type AssetScope =
  | "assets"
  | "projects"
  | "favorites"
  | "elements"
  | "trash"
  | "image"
  | "video"
  | "audio"
  | "upscaled";

export type SidebarCounts = {
  assets: number;
  projects: number;
  favorites: number;
  elements: number;
  image: number;
  video: number;
  upscaled: number;
};

type Path = { d: string; evenodd?: boolean };
type Icon = { paths: Path[]; stroke?: boolean };

/* fill="currentColor" glyphs (evenodd where the source declares it). */
const ASSET_ICON: Icon = {
  paths: [
    {
      d: "M11 12.288a.5.5 0 0 1 .25.433v9.096a.5.5 0 0 1-.75.433l-7.252-4.187a1.75 1.75 0 0 1-.875-1.516V8.174a.5.5 0 0 1 .75-.433zM21.627 16.547a1.75 1.75 0 0 1-.875 1.516L13.5 22.25a.5.5 0 0 1-.75-.433V12.72a.5.5 0 0 1 .25-.433l7.877-4.547a.5.5 0 0 1 .75.433zM20.126 5.576a.5.5 0 0 1 0 .866l-7.876 4.547a.5.5 0 0 1-.5 0L3.873 6.443a.5.5 0 0 1 0-.866l7.252-4.187a1.75 1.75 0 0 1 1.75 0z",
    },
  ],
};
const PROJECT_ICON: Icon = {
  paths: [
    {
      d: "M21.74 11a1.75 1.75 0 0 1 1.705 2.148l-1.283 5.5A1.75 1.75 0 0 1 20.457 20H3.545a1.75 1.75 0 0 1-1.705-1.352l-1.284-5.5A1.75 1.75 0 0 1 2.26 11zM9.539 3c.455 0 .894.178 1.22.496l1.473 1.433c.047.045.11.071.175.071h7.844c.966 0 1.75.784 1.75 1.75V9.5H2V4.75C2 3.784 2.784 3 3.75 3z",
    },
  ],
};
const FAVORITE_ICON: Icon = {
  paths: [
    {
      d: "M12 4.328A7.021 7.021 0 0 1 16.111 3c1.487 0 2.972.598 4.081 1.785C21.305 5.975 22 7.715 22 9.938c0 3.316-2.351 6.087-4.607 7.957a22 22 0 0 1-3.257 2.233c-.47.26-.887.467-1.22.611q-.252.109-.456.174A1.6 1.6 0 0 1 12 21a1.6 1.6 0 0 1-.46-.087 5 5 0 0 1-.455-.174c-.334-.144-.752-.35-1.22-.611a22 22 0 0 1-3.258-2.233C4.351 16.025 2 13.254 2 9.938c0-2.223.695-3.962 1.808-5.153A5.57 5.57 0 0 1 7.888 3 7.02 7.02 0 0 1 12 4.328",
    },
  ],
};
/* 요소 is the only stroke glyph the rail draws. */
const ELEMENT_ICON: Icon = {
  stroke: true,
  paths: [
    {
      d: "M16.868 19.867A9.25 9.25 0 1 1 21.25 12c0 1.98-.984 4.024-3.279 3.816a3.31 3.31 0 0 1-2.978-3.767l.53-3.646m-.585 4.077c-.308 2.188-2.109 3.744-4.023 3.474-1.914-.269-3.217-2.26-2.91-4.448.308-2.187 2.11-3.743 4.023-3.474 1.914.27 3.217 2.26 2.91 4.448Z",
    },
  ],
};
const TRASH_ICON: Icon = {
  paths: [
    {
      evenodd: true,
      d: "M7.868 5H3.25a.75.75 0 0 0 0 1.5H4q0 .026.002.053l.97 13.82A1.75 1.75 0 0 0 6.718 22h10.564a1.75 1.75 0 0 0 1.746-1.627l.97-13.82L20 6.5h.75a.75.75 0 0 0 0-1.5h-4.619a4.251 4.251 0 0 0-8.263 0m1.57 0h5.125a2.752 2.752 0 0 0-5.126 0",
    },
  ],
};
const IMAGE_ICON: Icon = {
  paths: [{ d: "M9.941 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" }, {
    evenodd: true,
    d: "M22.781 18.34a8 8 0 0 0-.24-.82v-.03c-.82-2.5-1.67-4.46-2.54-5.81-.44-.67-.9-1.22-1.4-1.6-.51-.38-1.09-.62-1.72-.56-1.86.15-3.12 1.68-4.01 2.84-.12.16-.24.32-.35.46-.33.43-.61.81-.89 1.11-.39.42-.6.49-.69.49-.19 0-.41-.06-.72-.22-.27-.14-.55-.33-.88-.54-.04-.03-.09-.06-.13-.09-.72-.47-1.68-1.1-2.84-1.1-.61 0-1.14.27-1.57.62-.42.35-.78.82-1.09 1.31-.62.98-1.1 2.2-1.43 3.18v.03c-.1.27-.19.53-.24.75-.06.25-.08.52 0 .82.1.42.39.82.76 1.05.26.17.54.23.8.25.24.02.52.02.83.02h15.92c.33 0 .63 0 .88-.02.26-.02.55-.08.82-.25.37-.24.65-.62.76-1.04.08-.31.04-.59-.01-.85z",
  }],
};
const VIDEO_ICON: Icon = {
  paths: [{
    evenodd: true,
    d: "M2 5.75C2 4.784 2.784 4 3.75 4h10.5c.966 0 1.75.784 1.75 1.75v3.037l4.191-2.096A1.25 1.25 0 0 1 22 7.81v8.382a1.25 1.25 0 0 1-1.809 1.118L16 15.214v3.036A1.75 1.75 0 0 1 14.25 20H3.75A1.75 1.75 0 0 1 2 18.25zm14 7.787 4.5 2.25V8.214l-4.5 2.25z",
  }],
};
const AUDIO_ICON: Icon = {
  paths: [
    {
      d: "M19.184 3.835a.25.25 0 0 1 .318.24v9.075a4.2 4.2 0 0 0-2.25-.65c-1.937 0-3.75 1.333-3.75 3.25S15.315 19 17.252 19s3.75-1.333 3.75-3.25V4.076a1.75 1.75 0 0 0-2.23-1.683l-8.503 2.429A1.75 1.75 0 0 0 9 6.504v9.646a4.2 4.2 0 0 0-2.25-.65C4.813 15.5 3 16.833 3 18.75S4.813 22 6.75 22s3.75-1.333 3.75-3.25V6.504a.25.25 0 0 1 .181-.24z",
    },
  ],
};
const UPSCALED_ICON: Icon = {
  paths: [
    {
      evenodd: true,
      d: "M17.512 2.927a1.75 1.75 0 0 1 2.475 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474L6.487 21.073a1.75 1.75 0 0 1-2.475 0l-1.085-1.086a1.75 1.75 0 0 1 0-2.474zm1.415 1.06a.25.25 0 0 0-.354 0L15.31 7.25l1.44 1.44 3.262-3.263a.25.25 0 0 0 0-.354z",
    },
    {
      d: "M9.85 2.075a.5.5 0 0 0 .223-.224l.479-.957a.5.5 0 0 1 .894 0l.479.957a.5.5 0 0 0 .223.224l.957.478a.5.5 0 0 1 0 .894l-.957.478a.5.5 0 0 0-.223.224l-.479.957a.5.5 0 0 1-.894 0l-.479-.957a.5.5 0 0 0-.223-.224l-.957-.478a.5.5 0 0 1 0-.894zM18.85 13.075a.5.5 0 0 0 .223-.224l.479-.957a.5.5 0 0 1 .894 0l.478.957a.5.5 0 0 0 .224.223l.957.479a.5.5 0 0 1 0 .894l-.957.479a.5.5 0 0 0-.224.223l-.478.957a.5.5 0 0 1-.894 0l-.479-.957a.5.5 0 0 0-.223-.223l-.957-.479a.5.5 0 0 1 0-.894zM4.85 7.075a.5.5 0 0 0 .224-.224l.478-.957a.5.5 0 0 1 .894 0l.479.957a.5.5 0 0 0 .223.224l.957.478a.5.5 0 0 1 0 .894l-.957.478a.5.5 0 0 0-.223.224l-.479.957a.5.5 0 0 1-.894 0l-.478-.957a.5.5 0 0 0-.224-.224l-.957-.478a.5.5 0 0 1 0-.894z",
    },
  ],
};

function RailIcon({ icon }: { icon: Icon }) {
  return (
    <span className="ohf-asset-rail-icon">
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {icon.paths.map((path, i) =>
          icon.stroke ? (
            <path
              key={i}
              d={path.d}
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth={1.5}
            />
          ) : (
            <path
              key={i}
              d={path.d}
              fill="currentColor"
              fillRule={path.evenodd ? "evenodd" : undefined}
              clipRule={path.evenodd ? "evenodd" : undefined}
            />
          ),
        )}
      </svg>
    </span>
  );
}

type Row = {
  scope: AssetScope;
  label: string;
  icon: Icon;
  /* HF draws a count pill only for these rows; 휴지통 and 오디오 render an
     empty count wrapper with no inner pill. */
  showCount: boolean;
  tool?: boolean;
};

const NAV_ROWS: Row[] = [
  { scope: "assets", label: "에셋", icon: ASSET_ICON, showCount: true },
  { scope: "projects", label: "프로젝트", icon: PROJECT_ICON, showCount: true },
  { scope: "favorites", label: "즐겨찾기", icon: FAVORITE_ICON, showCount: true },
  { scope: "elements", label: "요소", icon: ELEMENT_ICON, showCount: true },
  { scope: "trash", label: "휴지통", icon: TRASH_ICON, showCount: false },
];

const TOOL_ROWS: Row[] = [
  { scope: "image", label: "이미지", icon: IMAGE_ICON, showCount: true, tool: true },
  { scope: "video", label: "비디오", icon: VIDEO_ICON, showCount: true, tool: true },
  { scope: "audio", label: "오디오", icon: AUDIO_ICON, showCount: false, tool: true },
  { scope: "upscaled", label: "업스케일됨", icon: UPSCALED_ICON, showCount: true, tool: true },
];

function RailButton({
  row,
  count,
  active,
  onSelect,
}: {
  row: Row;
  count: number;
  active: boolean;
  onSelect: (scope: AssetScope) => void;
}) {
  return (
    <button
      type="button"
      aria-disabled="false"
      data-active={active ? "true" : "false"}
      aria-current={active ? "page" : undefined}
      className={`ohf-asset-rail-btn${row.tool ? " ohf-asset-rail-btn--tool" : ""}`}
      onClick={() => onSelect(row.scope)}
    >
      <RailIcon icon={row.icon} />
      <p className="ohf-asset-rail-label">{row.label}</p>
      <span className="ohf-asset-rail-countwrap">
        {row.showCount ? <span className="ohf-asset-rail-count">{count}</span> : null}
      </span>
    </button>
  );
}

export function AssetSidebar({
  counts,
  scope,
  onSelect,
}: {
  counts: SidebarCounts;
  scope: AssetScope;
  onSelect: (scope: AssetScope) => void;
}) {
  const countFor = (row: Row): number => {
    switch (row.scope) {
      case "assets":
        return counts.assets;
      case "projects":
        return counts.projects;
      case "favorites":
        return counts.favorites;
      case "elements":
        return counts.elements;
      case "image":
        return counts.image;
      case "video":
        return counts.video;
      case "upscaled":
        return counts.upscaled;
      default:
        return 0;
    }
  };

  return (
    <div className="ohf-asset-rail-wrap">
      <aside data-asset-sidebar="true" className="ohf-asset-rail">
        <div className="ohf-asset-rail-scroll">
          <div className="ohf-asset-rail-group">
            {NAV_ROWS.map((row) => (
              <RailButton
                key={row.scope}
                row={row}
                count={countFor(row)}
                active={scope === row.scope}
                onSelect={onSelect}
              />
            ))}
          </div>
          <section className="ohf-asset-rail-tools">
            <h3 className="ohf-asset-rail-tools-head">도구</h3>
            <div className="ohf-asset-rail-tools-group">
              {TOOL_ROWS.map((row) => (
                <RailButton
                  key={row.scope}
                  row={row}
                  count={countFor(row)}
                  active={scope === row.scope}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
