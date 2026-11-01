"use client";

import { useState } from "react";

import { useProjects, projectLabel } from "@/generation/stores/projects";

import { ChevronLeftIcon, FolderIcon } from "./icons";
import { LOCAL_USER } from "./local-user";

/* The project detail screen opens as its own surface, the way the Cinematic
   Studio replaced the dashboard shell while it was up: a full-screen layout
   around a project header and two tool slots. None of the general layout
   (topbar, feed header, masonry gallery) rides on top of it — no overlap. */

/** Placeholder peers — a local-only chat surface with no backend, seeded with
    names/initials so the member layer is visible. These are display-only. */
const SEED_PEERS: ReadonlyArray<{ name: string; initial: string }> = [
  { name: "이서연", initial: "이" },
  { name: "김도현", initial: "김" },
  { name: "박지현", initial: "박" },
];

type ChatMessage = {
  id: string;
  sender: string;
  initial: string;
  text: string;
  ts: number;
};

/** Pre-seeded messages so the chat screen is not empty on first mount. */
const SEED_MESSAGES: ReadonlyArray<ChatMessage> = [
  { id: "seed-1", sender: "이서연", initial: "이", text: "안녕하세요, 프로젝트 시작합니다!", ts: 0 },
  { id: "seed-2", sender: "김도현", initial: "김", text: "레퍼런스 이미지 공유할게요.", ts: 0 },
  { id: "seed-3", sender: LOCAL_USER.handle, initial: LOCAL_USER.initial, text: "네, 확인했습니다.", ts: 0 },
];

let msgCounter = 100;
function nextId(): string {
  return `msg-${msgCounter++}`;
}

export function ProjectScreen({
  onExit,
  projectId,
}: {
  /** Leaves the project surface and returns the dashboard. */
  onExit: () => void;
  projectId: string | null;
}) {
  const projects = useProjects((state) => state.projects);
  const label = projectId ? projectLabel(projects, projectId) : "프로젝트";

  /* --- canvas tool slot: 미구현, visible disabled button, no handler --- */
  const canvasSlot = (
    <div className="ohf-project-tool ohf-project-tool--canvas">
      <div className="ohf-project-tool-head">
        <span className="ohf-project-tool-title">Canvas</span>
      </div>
      <div className="ohf-project-tool-body">
        <button
          type="button"
          className="ohf-project-canvas-btn"
          aria-disabled
          title="이 도구는 아직 준비 중입니다."
        >
          미구현 (준비 중)
        </button>
      </div>
    </div>
  );

  return (
    <div className="ohf-project-screen">
      <header className="ohf-project-top">
        <div className="ohf-project-top-left">
          <button
            type="button"
            className="ohf-project-exit"
            onClick={onExit}
            aria-label="대시보드로 돌아가기"
            title="Return to dashboard"
          >
            <ChevronLeftIcon />
            <span>대시보드</span>
          </button>
          <span className="ohf-project-brand">
            <FolderIcon size={14} />
            {label}
          </span>
        </div>
        <div className="ohf-project-top-right">
          <span className="ohf-avatar" aria-hidden>
            {LOCAL_USER.initial}
          </span>
        </div>
      </header>

      <div className="ohf-project-body">
        {canvasSlot}
        <ProjectChat />
      </div>
    </div>
  );
}

/* --- chat tool slot: screen only, no backend, component-local state --- */
function ProjectChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([...SEED_MESSAGES]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        sender: LOCAL_USER.handle,
        initial: LOCAL_USER.initial,
        text: trimmed,
        ts: Date.now(),
      },
    ]);
    setInput("");
  };

  return (
    <div className="ohf-project-tool ohf-project-tool--chat">
      <div className="ohf-project-tool-head">
        <span className="ohf-project-tool-title">채팅</span>
        <div className="ohf-project-members" aria-label="프로젝트 멤버">
          <span className="ohf-project-member ohf-project-member--self">
            <span className="ohf-project-member-avatar">{LOCAL_USER.initial}</span>
            <span className="ohf-project-member-name">{LOCAL_USER.handle}</span>
          </span>
          {SEED_PEERS.map((peer) => (
            <span key={peer.name} className="ohf-project-member">
              <span className="ohf-project-member-avatar">{peer.initial}</span>
              <span className="ohf-project-member-name">{peer.name}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="ohf-project-messages" role="log" aria-label="채팅 메시지">
        {messages.map((msg) => (
          <div key={msg.id} className="ohf-project-msg">
            <span className="ohf-project-msg-avatar" aria-hidden>
              {msg.initial}
            </span>
            <div className="ohf-project-msg-body">
              <span className="ohf-project-msg-sender">{msg.sender}</span>
              <p className="ohf-project-msg-text">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="ohf-project-input-row">
        <input
          className="ohf-project-input"
          value={input}
          placeholder="메시지를 입력하세요…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button
          type="button"
          className="ohf-project-send"
          onClick={sendMessage}
          disabled={!input.trim()}
          aria-label="보내기"
        >
          전송
        </button>
      </div>
    </div>
  );
}
