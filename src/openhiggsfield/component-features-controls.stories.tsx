import { useRef } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { CameraWheel, CharacterPopover } from "./cinema-popover";
import { LightingPopover } from "./lighting-popover";
import { CameraMovementPanel } from "./camera-movement-panel";
import { DirectorSettings } from "./director-settings";
import { ReferenceFilmButton } from "./reference-film-popover";
import { ReferenceUseNextPopover } from "./reference-use-next";
import { CinemaTiles } from "./cinema-popover";
import { PromptOptimizeButton } from "./prompt-optimize-button";
import { ModelPicker } from "./model-picker";
import { PromptTint } from "./prompt-tint";
import { MentionMenu } from "./mention-menu";
import { MoreMenu, type MenuItem } from "./context-menu";
import { EditToolsCard, EditShowcase } from "./edit-showcase";
import { KeyModal } from "./key-modal";
import { FailureModal } from "./failure-modal";
import { ProjectDialog } from "./project-dialog";
import { SAMPLE_IMG, noop } from "./component-features-shared";

/* Reusable composer-level controls registered into the design system. These render
   inside the `.ohf` scope decorator; store-driven ones (popovers, panel, picker)
   read their vanilla-zustand global defaults, which is exactly how the app seeds
   them, so a bare story is a faithful empty/resting state. Mock callbacks are no-ops
   — a design-system story never drives a real action. Story export names are kept
   distinct from the imported component names so the bindings never merge. */

const meta = {
  title: "Design System / Components / Features / Controls",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* A dial that scrolls a word list. The wheel is fully controlled by props, so the
   story supplies its own items and resting value. */
export const CameraWheelDial: Story = {
  render: () => (
    <CameraWheel
      items={["Auto", "35mm", "50mm", "85mm", "135mm"]}
      value="Auto"
      onChange={noop}
      label="렌즈 초점거리"
    />
  ),
};

/* Character popover. Store-backed (useElements/useProjects); with empty stores it
   shows the empty state inside a real popover frame. */
export const CharacterPopoverFrame: Story = {
  render: () => <CharacterPopover onClose={noop} />,
};

/* Lighting popover. Store-backed (camera); renders the lighting grid at defaults. */
export const LightingPopoverGrid: Story = {
  render: () => <LightingPopover onClose={noop} />,
};

/* Camera movement panel. No props at all — a pure store reader. */
export const CameraMovementPanelStore: Story = {
  render: () => <CameraMovementPanel />,
};

/* Full-screen director settings surface. Store-backed (useDirector). */
export const DirectorSettingsSurface: Story = {
  render: () => <DirectorSettings onExit={noop} />,
};

/* The composer's film tile — a button face that opens the reference dialog. */
export const ReferenceFilmButtonFace: Story = {
  render: () => <ReferenceFilmButton open={false} onOpen={noop} />,
};

/* "Use as next" role assignment popover. */
export const ReferenceUseNextPopoverRoles: Story = {
  render: () => (
    <ReferenceUseNextPopover currentRole={undefined} onPick={noop} onClose={noop} />
  ),
};

/* The cinema tile rail: two buttons wired from the cinema screen. */
export const CinemaTilesRail: Story = {
  render: () => (
    <CinemaTiles
      characterOpen={false}
      cameraOpen={false}
      onCharacter={noop}
      onCamera={noop}
    />
  ),
};

/* Prompt-optimize pill. Reads the image prompt store; empty prompt disables it, the
   honest resting state. */
export const PromptOptimizePill: Story = {
  render: () => <PromptOptimizeButton surface="image" onError={noop} disabled={false} />,
};

/* Model picker panel for the image surface. */
export const ModelPickerImage: Story = {
  render: () => <ModelPicker selectedId="" surface="image" onPick={noop} onClose={noop} />,
};

/* Prompt tint overlay. Needs a real textarea to mirror scroll from, so the story
   renders both the track and the tint on top of it. */
export const PromptTintOverTextarea: Story = {
  render: () => {
    const text = "A cinematic @Character walking through @Element neon streets at night";
    const namedNames = ["Character", "Element"];
    const trackRef = useRef<HTMLTextAreaElement | null>(null);
    return (
      <div style={{ position: "relative", width: 460 }}>
        <textarea
          ref={trackRef}
          defaultValue={text}
          style={{ width: "100%", height: 140, background: "var(--bg)", color: "var(--tx)" }}
        />
        <PromptTint text={text} namedNames={namedNames} trackRef={trackRef} />
      </div>
    );
  },
};

/* @ mention menu. Empty options render the no-candidates hint — a valid empty state. */
export const MentionMenuEmpty: Story = {
  render: () => <MentionMenu options={[]} activeIndex={0} onPick={noop} onHover={noop} />,
};

/* ⋯ overflow menu. Renders its trigger; opening is a real click interaction. */
export const MoreMenuOverflow: Story = {
  render: () => {
    const items: MenuItem[] = [
      { id: "open", label: "열기", onSelect: noop },
      { id: "reuse", label: "재사용", onSelect: noop },
      { id: "delete", label: "삭제", danger: true, onSelect: noop },
    ];
    return (
      <div style={{ width: 240 }}>
        <MoreMenu items={items} label="⋯" />
      </div>
    );
  },
};

/* Edit-mode tools card. The single button is optional; pass a no-op opener. */
export const EditToolsCardOnly: Story = {
  render: () => <EditToolsCard onOpenExpandCrop={noop} />,
};

/* Image edit showcase. The url is a deterministic inline SVG so the canvas box is
   real without a network round-trip. */
export const EditShowcaseImage: Story = {
  render: () => <EditShowcase url={SAMPLE_IMG} aspect={1} />,
};

/* API key modal (portals to body; the body `.ohf` scope keeps it styled). */
export const KeyModalEmpty: Story = {
  render: () => <KeyModal configured={false} onClose={noop} onSaved={noop} onCleared={noop} />,
};

/* Failure detail modal with no record — shows the generic "nothing to show" message. */
export const FailureModalGeneric: Story = {
  render: () => <FailureModal record={null} onClose={noop} />,
};

/* New-project dialog. */
export const ProjectDialogNew: Story = {
  render: () => <ProjectDialog onClose={noop} onCreate={noop} />,
};
