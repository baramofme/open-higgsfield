"use client";

import {
  OpenGlyph,
  RegenerateGlyph,
  ReuseGlyph,
  ElementGlyph,
  AssignGlyph,
  AddGlyph,
  ShareGlyph,
  FolderGlyph,
  PublishGlyph,
  TrashGlyph,
  HeartGlyph,
  DownloadGlyph,
  ImageGlyph,
  VideoGlyph,
} from "./asset-icons";
import { DEFAULT_PROJECT_ID, DEFAULT_PROJECT_LABEL } from "@/generation/stores/projects";
import type { MenuItem } from "./context-menu";
import type { RunRecord } from "./history";
import type { TileMenuActions } from "./gallery";

/** The full Higgsfield "추가 작업" menu, in source order: open, regenerate,
 *  reuse, the two element rows, assign, the effect flyout, then a separator
 *  before keep / share / folder / publish, another before download, and the red
 *  delete last. Both the grid tile and the selection toolbar draw this same
 *  shape, so the menu stays identical wherever a ⋯ is pressed. The four rows
 *  that have no local path (3D, the other effects, publish) are shown but
 *  disabled; the rest reach the actions the app actually runs. */
export function buildAssetMenu(
  record: RunRecord,
  actions: TileMenuActions,
  handlers: {
    open: (id: string) => void;
    reuse: (record: RunRecord) => void;
    favorite: (record: RunRecord) => void;
    download: (record: RunRecord) => void;
    del: (record: RunRecord) => void;
  },
): MenuItem[] {
  return [
    { id: "open", label: "열기", icon: <OpenGlyph size={18} />, onSelect: () => handlers.open(record.id) },
    { id: "regen", label: "다시 생성하기", icon: <RegenerateGlyph size={18} />, onSelect: () => handlers.reuse(record) },
    { id: "reuse", label: "재사용", icon: <ReuseGlyph size={18} />, onSelect: () => handlers.reuse(record) },
    {
      id: "element",
      label: "요소 만들기",
      icon: <ElementGlyph size={18} />,
      onSelect: () => {},
      children: [
        { id: "el-img", label: "이미지 요소", icon: <ImageGlyph />, onSelect: () => actions.makeElement(record, "image") },
        { id: "el-vid", label: "동영상 요소", icon: <VideoGlyph />, onSelect: () => actions.makeElement(record, "video") },
      ],
    },
    { id: "assign", label: "요소에 할당하기", icon: <AssignGlyph size={18} />, onSelect: () => actions.assignElement(record) },
    {
      id: "add",
      label: "추가",
      icon: <AddGlyph size={18} />,
      onSelect: () => {},
      children: [
        { id: "3d", label: "3D 장면 만들기", disabled: true, onSelect: () => {} },
        { id: "hex", label: "Extract Hex", disabled: true, onSelect: () => {} },
        { id: "multishot", label: "멀티샷", disabled: true, onSelect: () => {} },
        { id: "inpaint", label: "인페인트", onSelect: () => actions.addEffect(record, "인페인트") },
        { id: "skin", label: "Skin Enhancer", disabled: true, onSelect: () => {} },
        { id: "relight", label: "Relight", disabled: true, onSelect: () => {} },
        { id: "upscale", label: "업스케일", disabled: true, onSelect: () => {} },
        { id: "angles", label: "Angles", disabled: true, onSelect: () => {} },
      ],
    },
    { id: "favorite", label: "좋아요", dividerBefore: true, icon: <HeartGlyph size={18} filled={record.favorite} />, onSelect: () => handlers.favorite(record) },
    {
      id: "share",
      label: "공유",
      icon: <ShareGlyph size={18} />,
      onSelect: () => {},
      children: [
        { id: "s-link", label: "링크 복사", onSelect: () => actions.share(record, "link") },
        { id: "s-x", label: "X에 공유", onSelect: () => actions.share(record, "x") },
        { id: "s-wa", label: "WhatsApp에 공유", onSelect: () => actions.share(record, "whatsapp") },
        { id: "s-pin", label: "Pinterest에 공유", onSelect: () => actions.share(record, "pinterest") },
        { id: "s-li", label: "Linkedin에 공유", onSelect: () => actions.share(record, "linkedin") },
      ],
    },
    {
      id: "folder",
      label: "폴더에 추가",
      icon: <FolderGlyph size={18} />,
      onSelect: () => {},
      children: [
        { id: DEFAULT_PROJECT_ID, label: DEFAULT_PROJECT_LABEL, onSelect: () => actions.moveToProject(record, DEFAULT_PROJECT_ID) },
        ...actions.projects().map((project) => ({
          id: project.id,
          label: project.label,
          onSelect: () => actions.moveToProject(record, project.id),
        })),
        { id: "new", label: "새 폴더 만들기", onSelect: () => actions.newProject(record) },
      ],
    },
    { id: "publish", label: "게시", icon: <PublishGlyph size={18} />, disabled: true, onSelect: () => {} },
    { id: "download", label: "다운로드", dividerBefore: true, icon: <DownloadGlyph size={18} />, onSelect: () => handlers.download(record) },
    { id: "delete", label: "삭제", danger: true, dividerBefore: true, icon: <TrashGlyph size={18} />, onSelect: () => handlers.del(record) },
  ];
}

/** The selection toolbar's OWN ⋯ menu — deliberately its own shape, never the
 *  per-asset menu a tile draws. Publish is the headline row: it only exists while
 *  the ⋯ is open and folds when the ⋯ closes, so it is never a button bolted onto
 *  the bar itself. There is no local publish path yet, so publish is shown but
 *  disabled; the rest reach the actions the app actually runs. */
export function buildSelectionMenu(
  lead: RunRecord,
  actions: TileMenuActions,
  handlers: {
    open: (id: string) => void;
    reuse: (record: RunRecord) => void;
    favorite: () => void;
    download: () => void;
    del: () => void;
  },
): MenuItem[] {
  return [
    { id: "publish", label: "게시", icon: <PublishGlyph size={18} />, disabled: true, onSelect: () => {} },
    { id: "open", label: "열기", dividerBefore: true, icon: <OpenGlyph size={18} />, onSelect: () => handlers.open(lead.id) },
    { id: "reuse", label: "재사용", icon: <ReuseGlyph size={18} />, onSelect: () => handlers.reuse(lead) },
    {
      id: "share",
      label: "공유",
      icon: <ShareGlyph size={18} />,
      onSelect: () => {},
      children: [
        { id: "s-link", label: "링크 복사", onSelect: () => actions.share(lead, "link") },
        { id: "s-x", label: "X에 공유", onSelect: () => actions.share(lead, "x") },
        { id: "s-wa", label: "WhatsApp에 공유", onSelect: () => actions.share(lead, "whatsapp") },
        { id: "s-pin", label: "Pinterest에 공유", onSelect: () => actions.share(lead, "pinterest") },
        { id: "s-li", label: "Linkedin에 공유", onSelect: () => actions.share(lead, "linkedin") },
      ],
    },
    { id: "favorite", label: "좋아요", dividerBefore: true, icon: <HeartGlyph size={18} filled={lead.favorite} />, onSelect: () => handlers.favorite() },
    { id: "download", label: "다운로드", icon: <DownloadGlyph size={18} />, onSelect: () => handlers.download() },
    { id: "delete", label: "삭제", danger: true, dividerBefore: true, icon: <TrashGlyph size={18} />, onSelect: () => handlers.del() },
  ];
}
