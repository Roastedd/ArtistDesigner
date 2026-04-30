"use client";

import { useRef } from "react";
import FileUpload from "@/components/file-upload";

/** Sits next to the Audio URL text input and fills it on successful upload. */
export function AudioUploadField({ defaultValue }: { defaultValue: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      <div className="label mb-1">Audio</div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          name="audioUrl"
          type="url"
          defaultValue={defaultValue}
          className="input flex-1"
          placeholder="https://…/demo.mp3  or upload →"
        />
        <FileUpload
          kind="audio"
          label="Upload file"
          onUploaded={(url) => {
            if (inputRef.current) inputRef.current.value = url;
          }}
        />
      </div>
    </div>
  );
}
