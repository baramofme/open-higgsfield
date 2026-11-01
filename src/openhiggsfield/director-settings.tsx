"use client";

import { useState } from "react";

import { useDirector } from "@/generation/stores/director";

import { Field, OptionList } from "./ui";
import { CheckIcon, CloseIcon } from "./icons";

/* The AI Director settings surface: register a local OpenAI-compatible endpoint,
   fetch its model list, select one, set the context size, and commit. This is
   the only way to add a model to the director store — once committed, the
   director call and any picker read the store's modelId as the single truth.
   Follows the cinema header/exit pattern: a full-width surface with its own
   exit, replacing the project body while open. */

type ModelItem = {
  id: string;
  owned_by?: string;
};

export function DirectorSettings({
  onExit,
}: {
  /** Leaves the settings surface and returns the director panel. */
  onExit: () => void;
}) {
  const config = useDirector();
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [models, setModels] = useState<ModelItem[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [selectedModel, setSelectedModel] = useState(config.modelId);
  const [ctx, setCtx] = useState(config.ctx);
  const [saved, setSaved] = useState(false);

  const fetchModels = async () => {
    if (!baseUrl.trim()) {
      setFetchError("엔드포인트 URL을 입력하세요.");
      return;
    }
    setFetching(true);
    setFetchError(null);
    setModels(null);
    try {
      const url = `${baseUrl.trim().replace(/\/+$/, "")}/v1/models`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        setFetchError(
          `조회 실패 (${res.status}) — URL을 확인하거나 서버가 열려 있는지 확인하세요.`,
        );
        return;
      }
      const data: unknown = await res.json();
      const list = extractModels(data);
      if (!list.length) {
        setFetchError("이 엔드포인트가 모델 목록을 반환하지 않았습니다.");
        return;
      }
      setModels(list);
    } catch (err: unknown) {
      setFetchError(
        `네트워크 오류: ${err instanceof Error ? err.message : String(err)} — URL을 확인하세요.`,
      );
    } finally {
      setFetching(false);
    }
  };

  const handleSave = () => {
    if (!baseUrl.trim()) return;
    if (!selectedModel) return;
    config.setConfig(baseUrl.trim().replace(/\/+$/, ""), selectedModel, ctx);
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  return (
    <div className="ohf-director-settings" role="dialog" aria-label="AI 디렉터 설정">
      {/* header: cinema exit pattern */}
      <div className="ohf-director-settings-top">
        <button
          type="button"
          className="ohf-director-exit"
          onClick={onExit}
          aria-label="설정 닫기"
          title="AI Director 패널로 돌아가기"
        >
          <CloseIcon />
          <span>닫기</span>
        </button>
        <span className="ohf-director-brand">AI 디렉터 설정</span>
      </div>

      <div className="ohf-director-settings-body">
        {/* Step 1: baseUrl */}
        <Field label="로컬 API 엔드포인트 URL">
          <input
            className="ohf-director-input"
            type="text"
            value={baseUrl}
            placeholder="http://localhost:9500"
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setModels(null);
              setFetchError(null);
              setSaved(false);
            }}
            aria-label="엔드포인트 URL"
          />
          <button
            type="button"
            className="ohf-director-fetch-btn"
            onClick={fetchModels}
            disabled={fetching}
            aria-label="모델 조회"
          >
            {fetching ? "조회 중…" : "모델 조회"}
          </button>
        </Field>

        {/* fetch error (no paper-over) */}
        {fetchError && (
          <div className="ohf-director-error" role="alert" aria-live="polite">
            {fetchError}
          </div>
        )}

        {/* Step 2: model list after successful fetch */}
        {models && models.length > 0 && (
          <Field label="사용할 모델 선택">
            <OptionList
              options={models.map((m) => ({ value: m.id, label: m.id }))}
              value={selectedModel}
              onChange={setSelectedModel}
            />
          </Field>
        )}

        {/* Step 3: ctx */}
        <Field label="컨텍스트 크기 (ctx)" value={String(ctx)}>
          <input
            className="ohf-director-ctx-input"
            type="number"
            min={128}
            max={200000}
            step={256}
            value={ctx}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) setCtx(v);
            }}
            aria-label="컨텍스트 크기"
          />
        </Field>

        {/* Step 4: save */}
        <div className="ohf-director-save-row">
          <button
            type="button"
            className="ohf-director-save-btn"
            onClick={handleSave}
            disabled={!baseUrl.trim() || !selectedModel}
            aria-label="설정 저장"
          >
            추가 / 저장
          </button>
          {saved && (
            <span className="ohf-director-saved" aria-live="polite">
              <CheckIcon size={12} />
              <span>저장되었습니다</span>
            </span>
          )}
        </div>

        {/* current config display */}
        {config.baseUrl && config.modelId && (
          <div className="ohf-director-current">
            <span className="ohf-director-current-label">현재 설정</span>
            <code className="ohf-director-current-url">{config.baseUrl}</code>
            <code className="ohf-director-current-model">{config.modelId}</code>
            <code className="ohf-director-current-ctx">ctx {config.ctx}</code>
          </div>
        )}

        {config.baseUrl && (
          <button
            type="button"
            className="ohf-director-clear-btn"
            onClick={() => {
              config.clear();
              setBaseUrl("");
              setModels(null);
              setSelectedModel("");
              setCtx(4096);
            }}
            aria-label="설정 초기화"
          >
            설정 초기화
          </button>
        )}
      </div>
    </div>
  );
}

/* Extracts the OpenAI-style model array from the response body. OpenAI
   /v1/models returns { data: [{ id, owned_by }] }. Some local servers
   return { models: [...] } directly. Accepts either shape; a bare array
   is also handled. */
function extractModels(data: unknown): ModelItem[] {
  if (Array.isArray(data)) return data as ModelItem[];
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d["data"])) return d["data"] as ModelItem[];
    if (Array.isArray(d["models"])) return d["models"] as ModelItem[];
  }
  return [];
}
