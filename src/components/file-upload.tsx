"use client";

import { useRef, useState } from "react";

type Kind = "audio" | "image";

interface Props {
  kind: Kind;
  /** Called with the final public URL after a successful upload */
  onUploaded: (publicUrl: string) => void;
  /** Called with the raw File as soon as the user picks it (before upload starts). */
  onFile?: (file: File) => void;
  accept?: string;
  label?: string;
  className?: string;
}

const DEFAULT_ACCEPT: Record<Kind, string> = {
  audio: ".mp3,.wav,.ogg,.flac,.aac,.m4a",
  image: ".jpg,.jpeg,.png,.webp,.gif",
};

type State = "idle" | "uploading" | "done" | "error";

export default function FileUpload({
  kind,
  onUploaded,
  onFile,
  accept,
  label,
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    onFile?.(file);

    setState("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      // 1. Request a presigned PUT URL from our API
      const metaRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          contentType: file.type,
          contentLength: file.size,
          fileName: file.name,
        }),
      });
      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Upload failed");
      }
      const { uploadUrl, publicUrl } = (await metaRes.json()) as {
        uploadUrl: string;
        publicUrl: string;
      };

      // 2. PUT directly to R2 using XHR so we can track progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) {
            setProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`R2 upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setState("done");
      onUploaded(publicUrl);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    }

    // Reset file input so the same file can be re-selected after an error
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="flex items-center gap-2 cursor-pointer">
        <span
          className={`btn-ghost btn text-xs ${state === "uploading" ? "opacity-50 pointer-events-none" : ""}`}
        >
          {state === "uploading"
            ? `Uploading… ${progress}%`
            : state === "done"
              ? "✓ Uploaded — choose another"
              : (label ?? `Upload ${kind}`)}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept ?? DEFAULT_ACCEPT[kind]}
          onChange={handleChange}
          className="sr-only"
          disabled={state === "uploading"}
        />
      </label>
      {state === "uploading" && (
        <div className="h-1 w-full rounded bg-[color:var(--color-border)]">
          <div
            className="h-1 rounded bg-[color:var(--color-accent)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {state === "error" && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
