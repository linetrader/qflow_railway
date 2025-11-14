// src/components/tiptap-ui/image-upload-button/use-image-upload.ts
"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";

export interface UseImageUploadOptions {
  editor?: Editor | null;
  onPick: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  shortcut?: "mod+u" | null;
  maxSize?: number;
  onError?: (message: string) => void;
}

export interface UseImageUploadReturn {
  // ✅ null 허용으로 확장
  inputRef: React.RefObject<HTMLInputElement | null>;
  openPicker: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const DEFAULT_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

export function useImageUpload(
  options: UseImageUploadOptions
): UseImageUploadReturn {
  const {
    editor = null,
    onPick,
    accept = DEFAULT_ACCEPT,
    multiple = false,
    shortcut = "mod+u",
    maxSize = DEFAULT_MAX_SIZE,
    onError,
  } = options;

  // ✅ ref 타입을 HTMLInputElement | null 로 선언
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (!files || files.length === 0) return;

      for (const f of Array.from(files)) {
        if (f.size > maxSize) {
          const mb = Math.round((maxSize / (1024 * 1024)) * 10) / 10;
          onError?.(`File size exceeds maximum allowed (${mb}MB): ${f.name}`);
          e.currentTarget.value = "";
          return;
        }
      }

      onPick(files);
      e.currentTarget.value = "";
    },
    [maxSize, onPick, onError]
  );

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.accept = accept;
    inputRef.current.multiple = multiple;
  }, [accept, multiple]);

  useEffect(() => {
    if (!shortcut) return;

    const isMac =
      typeof navigator !== "undefined" &&
      navigator.platform.toLowerCase().includes("mac");

    const handler = (ev: KeyboardEvent) => {
      const editorFocused = editor ? Boolean(editor.isFocused) : true;
      const isMod = isMac ? ev.metaKey : ev.ctrlKey;
      const isKeyU = ev.key.toLowerCase() === "u";

      if (!editorFocused) return;
      if (!isMod || ev.altKey || ev.shiftKey || !isKeyU) return;

      ev.preventDefault();
      openPicker();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcut, editor, openPicker]);

  return { inputRef, openPicker, onInputChange };
}
