"use client";

import { useRef, useState } from "react";

import { useProjects, projectLabel } from "@/generation/stores/projects";
import { useDirector } from "@/generation/stores/director";

import { ChevronLeftIcon, FolderIcon, SlidersIcon } from "./icons";
import { LOCAL_USER } from "./local-user";
import { DirectorSettings } from "./director-settings";

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

  /* AI Director settings surface: when true, the project body swaps to the
     full-width settings panel (cinema exit pattern). */
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="ohf-project-screen">
      <header className="ohf-project-top">
        <div className="ohf-project-top-left">
          <button
            type="button"
            className="ohf-project-exit"
            onClick={settingsOpen ? () => setSettingsOpen(false) : onExit}
            aria-label={settingsOpen ? "AI 디렉터로 돌아가기" : "대시보드로 돌아가기"}
            title={settingsOpen ? "Back to AI Director" : "Return to dashboard"}
          >
            <ChevronLeftIcon />
            <span>{settingsOpen ? "AI 디렉터" : "대시보드"}</span>
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
        {settingsOpen ? (
          /* settings full-swap: takes both columns, cinema exit pattern */
          <DirectorSettings onExit={() => setSettingsOpen(false)} />
        ) : (
          <>
            <DirectorPanel onOpenSettings={() => setSettingsOpen(true)} />
            <ProjectChat />
          </>
        )}
      </div>
    </div>
  );
}

/* --- AI Director tool slot: reads director store, calls OpenAI-compatible
       endpoint, shows response text in a log. No backend of its own. --- */
function DirectorPanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  const baseUrl = useDirector((s) => s.baseUrl);
  const modelId = useDirector((s) => s.modelId);
  const ctx = useDirector((s) => s.ctx);

  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    if (!baseUrl) {
      setError("AI 디렉터가 설정되지 않았습니다. ⚙ 설정에서 엔드포인트를 등록하세요.");
      return;
    }
    setSending(true);
    setError(null);
    setResponse(null);
    try {
      const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          max_tokens: ctx,
          messages: [{ role: "user", content: trimmed }],
        }),
      });
      if (!res.ok) {
        setError(
          `호출 실패 (${res.status}) — 모델과 엔드포인트가 올바른지 확인하세요.`,
        );
        return;
      }
      const data: unknown = await res.json();
      const text = extractResponseText(data);
      setResponse(text ?? "빈 응답을 받았습니다.");
    } catch (err: unknown) {
      setError(
        `네트워크 오류: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSending(false);
    }
  };

  /* Keep the log scrolled to the newest response. */
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  };

  const handleSend = () => {
    send().then(() => { if (!error) scrollToBottom(); });
  };

  const configured = !!(baseUrl && modelId);

  return (
    <div className="ohf-project-tool ohf-project-tool--director">
      <div className="ohf-project-tool-head">
        <span className="ohf-project-tool-title">AI 디렉터</span>
        <button
          type="button"
          className="ohf-director-gear"
          onClick={onOpenSettings}
          aria-label="AI 디렉터 설정"
          title="설정"
        >
          <SlidersIcon size={13} />
        </button>
        {configured && (
          <span className="ohf-director-model-badge">{modelId}</span>
        )}
      </div>

      {/* status: no config */}
      {!configured && (
        <div className="ohf-director-empty">
          <p className="ohf-director-empty-text">
            아직 AI 디렉터가 설정되지 않았습니다.
          </p>
          <p className="ohf-director-empty-sub">
            ⚙ 설정에서 로컬 API 엔드포인트를 등록하고 모델을 선택하세요.
          </p>
        </div>
      )}

      {/* response log */}
      <div className="ohf-director-log ohf-scroll" ref={logRef} role="log" aria-label="디렉터 응답">
        {response && (
          <div className="ohf-director-msg" aria-live="polite">
            <span className="ohf-director-msg-label">디렉터</span>
            <p className="ohf-director-msg-text">{response}</p>
          </div>
        )}
        {error && (
          <div className="ohf-director-error-inline" role="alert" aria-live="polite">
            {error}
          </div>
        )}
      </div>

      {/* prompt input */}
      <div className="ohf-director-input-row">
        <input
          className="ohf-director-prompt"
          value={prompt}
          placeholder={configured ? "디렉터에게 지시하세요…" : "먼저 설정에서 모델을 추가하세요"}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          aria-label="디렉터 프롬프트"
          disabled={sending}
        />
        <button
          type="button"
          className="ohf-director-send"
          onClick={handleSend}
          disabled={!prompt.trim() || sending}
          aria-label="전송"
        >
          {sending ? "전송 중…" : "전송"}
        </button>
      </div>

      {configured && (
        <div className="ohf-director-meta">
          <span>{modelId}</span>
          <span>ctx {ctx}</span>
        </div>
      )}
    </div>
  );
}

/* Extracts the text from the OpenAI-compatible chat completion response.
   Standard: { choices: [{ message: { content: "..." } }] }. Some local
   servers return { choices: [{ text: "..." } }. Falls through to null. */
function extractResponseText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const choices = d["choices"];
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as Record<string, unknown>;
  // message.content (chat format)
  const msg = first["message"];
  if (msg && typeof msg === "object") {
    const content = (msg as Record<string, unknown>)["content"];
    if (typeof content === "string") return content;
  }
  // direct text (legacy completion format)
  if (typeof first["text"] === "string") return first["text"] as string;
  return null;
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
