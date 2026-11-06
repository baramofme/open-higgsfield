import type { Meta, StoryObj } from "@storybook/react-vite";

import { CameraDialog } from "./camera-dialog";
import { ReferenceFilmDialog } from "./reference-film-popover";
import { CropTool } from "./crop-tool";
import { ExpandCropEditor } from "./expand-crop";
import { InpaintPanel } from "./inpaint-panel";
import { PreviewLightbox } from "./preview-lightbox";
import { AssetPicker } from "./asset-picker";
import { AssetSidebar, type SidebarCounts } from "./asset-sidebar";
import { ElementForm } from "./element-form";
import { ElementPopover } from "./element-popover";
import { MediaStrip, StripTile } from "./media-tray";
import { SelectionBar } from "./selection-bar";
import { CinemaTileView } from "./cinema-tile-view";
import { type TileMenuActions } from "./gallery";
import { kling25 } from "../generation/catalog/kling-2.5";
import { SAMPLE_IMG, noop } from "./component-features-shared";

/* Surfaces and overlays registered into the design system. Several escape to
   document.body via portal; the preview decorator mirrors `.ohf` onto the iframe
   body so those overlays still resolve their tokens. Mock data is empty arrays plus
   a no-op action bag — an empty tray/history is the honest resting state, and the
   stub callbacks never run a real action. Story export names are kept distinct from
   the imported component names so the bindings never merge. */

const meta = {
  title: "Design System / Components / Features / Surfaces & Overlays",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* A no-op action bag for the tile/selection overflow menu. All void members accept
   the rest-arg noop (unknown absorbs every argument type); `projects` needs a real
   return shape so it hands back an empty list. */
const menuActions: TileMenuActions = {
  makeElement: noop,
  assignElement: noop,
  addEffect: noop,
  share: noop,
  moveToProject: noop,
  newProject: noop,
  projects: () => [],
};

const EMPTY_COUNTS: SidebarCounts = {
  assets: 0,
  projects: 0,
  favorites: 0,
  elements: 0,
  image: 0,
  video: 0,
  upscaled: 0,
};

/* Camera dialog. Portals to body; opens on the first tab via the store. */
export const CameraDialogPortal: Story = {
  render: () => <CameraDialog onClose={noop} onAddMovement={noop} />,
};

/* Reference-film dialog. Portals to body; reads the prompt-token store (empty by default). */
export const ReferenceFilmDialogBrowse: Story = {
  render: () => <ReferenceFilmDialog onClose={noop} />,
};

/* Crop tool. Portals a crop stage to body; the image is a deterministic inline SVG. */
export const CropToolImage: Story = {
  render: () => <CropTool url={SAMPLE_IMG} kind="image" onClose={noop} onApply={noop} />,
};

/* Outpaint editor: the crop stage with the generative "go beyond" button. */
export const ExpandCropEditorOutpaint: Story = {
  render: () => <ExpandCropEditor url={SAMPLE_IMG} onBack={noop} onClose={noop} />,
};

/* Localized inpaint. Wraps the MaskEditor brush tool over a real image source. */
export const InpaintPanelBrush: Story = {
  render: () => <InpaintPanel src={SAMPLE_IMG} busy={false} onInpaint={noop} />,
};

/* Full-screen media viewer. Portals to body; shows the inline SVG at rest. */
export const PreviewLightboxImage: Story = {
  render: () => <PreviewLightbox url={SAMPLE_IMG} kind="image" onClose={noop} />,
};

/* Asset picker sheet. Empty tray/history, a real model (Kling 2.5), no-op handlers. */
export const AssetPickerEmpty: Story = {
  render: () => (
    <AssetPicker
      model={kling25}
      items={[]}
      uploads={[]}
      history={[]}
      staged={null}
      uploading={false}
      onUpload={noop}
      onApply={noop}
      onForget={noop}
      onClose={noop}
    />
  ),
};

/* Left asset rail with zero counts on the assets scope. */
export const AssetSidebarZero: Story = {
  render: () => <AssetSidebar counts={EMPTY_COUNTS} scope="assets" onSelect={noop} />,
};

/* Element creation form. No editing record, empty tray, default project. */
export const ElementFormNew: Story = {
  render: () => <ElementForm projectId="default" trayItems={[]} onClose={noop} onSave={noop} />,
};

/* Elements popover. Store-backed (useElements); empty store shows the empty state. */
export const ElementPopoverEmpty: Story = {
  render: () => <ElementPopover trayItems={[]} mode="general" onMention={noop} onClose={noop} />,
};

/* Attached-input strip. It renders null when the model's tray is empty — the correct
   behaviour for a model with nothing attached; the StripTile story below shows a tile. */
export const MediaStripNullWhenEmpty: Story = {
  render: () => <MediaStrip model={kling25} />,
};

/* A single reference tile. A start-image item with the deterministic inline source. */
export const StripTileStartImage: Story = {
  render: () => <StripTile item={{ id: "sample-1", url: SAMPLE_IMG, role: "start" }} />,
};

/* Bulk selection bar with nothing selected (count 0) and a no-op action bag. */
export const SelectionBarZeroSelected: Story = {
  render: () => (
    <SelectionBar
      records={[]}
      saving={null}
      menuActions={menuActions}
      onOpen={noop}
      onReuse={noop}
      onDownload={noop}
      onFavorite={noop}
      onDelete={noop}
      onAddToFolder={noop}
      onClose={noop}
    />
  ),
};

/* Cinema tile grid. Empty generations history shows the "아직 아무것도 없어요" empty state. */
export const CinemaTileViewEmpty: Story = {
  render: () => <CinemaTileView view="generations" history={[]} />,
};
