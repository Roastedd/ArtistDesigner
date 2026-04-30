"use client";

import { useRef } from "react";
import FileUpload from "@/components/file-upload";

export function CoverUploadField({ defaultValue }: { defaultValue: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      <div className="label mb-1">Cover image URL</div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          name="coverUrl"
          type="url"
          defaultValue={defaultValue}
          className="input flex-1"
          placeholder="https://… or upload →"
        />
        <FileUpload
          kind="image"
          label="Upload"
          onUploaded={(url) => {
            if (inputRef.current) inputRef.current.value = url;
          }}
        />
      </div>
    </div>
  );
}
