// src/app/admin/boards/announcements/new/view/components/AnnouncementEditor.tsx
"use client";

import { useEffect, useState } from "react";
import { Editor, type JSONContent, Extension } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

import { Plugin } from "@tiptap/pm/state";
import { keymap } from "@tiptap/pm/keymap";
import { baseKeymap } from "@tiptap/pm/commands";
import { dropCursor } from "@tiptap/pm/dropcursor";
import { gapCursor } from "@tiptap/pm/gapcursor";

interface AnnouncementEditorProps {
  initialHtml: string;
  onHtmlChange: (nextHtml: string) => void;
  onRawChange?: (raw: string) => void;
}

/** 클라이언트 전용: 붙여넣기 HTML의 <img> 정규화 */
function normalizePastedHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("img").forEach((img) => {
    const dataSrc =
      img.getAttribute("data-src") || img.getAttribute("data-original");
    const srcset =
      img.getAttribute("srcset") || img.getAttribute("data-srcset");

    if (!img.getAttribute("src") && dataSrc) img.setAttribute("src", dataSrc);
    if (!img.getAttribute("src") && srcset) {
      const first = srcset.split(",")[0]?.trim().split(" ")[0];
      if (first) img.setAttribute("src", first);
    }
    ["data-src", "data-original", "data-srcset", "loading"].forEach((k) => {
      if (img.hasAttribute(k)) img.removeAttribute(k);
    });
  });
  return doc.body.innerHTML;
}

function pasteNormalizePlugin(editor: Editor): Plugin {
  return new Plugin({
    props: {
      handlePaste(_view, event) {
        const cd = event.clipboardData;
        if (!cd) return false;
        const html = cd.getData("text/html");
        if (!html) return false;
        const fixed = normalizePastedHtml(html);
        editor.commands.insertContent(fixed);
        return true;
      },
    },
  });
}

// 커스텀 확장(타입 안전): pm 플러그인 주입
const PmPlugins = Extension.create({
  name: "pm-plugins",
  addProseMirrorPlugins() {
    const e = this.editor;
    return [
      dropCursor(),
      gapCursor(),
      keymap({
        "Mod-b": () => e.commands.toggleBold(),
        "Mod-i": () => e.commands.toggleItalic(),
        "Shift-Ctrl-1": () => e.commands.toggleHeading({ level: 1 }),
      }),
      keymap(baseKeymap),
      pasteNormalizePlugin(e),
    ];
  },
});

export default function AnnouncementEditor(props: AnnouncementEditorProps) {
  const { initialHtml, onHtmlChange, onRawChange } = props;

  // 에디터 인스턴스는 클라이언트에서만 생성
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ed = new Editor({
      extensions: [
        StarterKit,
        Image.configure({ allowBase64: true }),
        PmPlugins,
      ],
      content:
        initialHtml && initialHtml.trim().length > 0 ? initialHtml : "<p></p>",
      onUpdate: ({ editor: e }) => {
        const html = e.getHTML();
        onHtmlChange(html);
        if (onRawChange) {
          const json = e.getJSON() as JSONContent;
          onRawChange(JSON.stringify(json));
        }
      },
    });

    setEditor(ed);
    return () => {
      ed.destroy();
      setEditor(null);
    };
    // initialHtml은 최초 생성 시에만 사용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onHtmlChange, onRawChange]);

  return (
    <div className="space-y-2">
      {/* 툴바: 모바일에서 줄바꿈 허용 */}
      <div className="flex flex-wrap gap-2">
        <button
          className="btn btn-xs"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={!editor}
        >
          Bold
        </button>
        <button
          className="btn btn-xs"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!editor}
        >
          Italic
        </button>
        <button
          className="btn btn-xs"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
          disabled={!editor}
        >
          H1
        </button>
        <button
          className="btn btn-xs"
          onClick={() => {
            const url =
              typeof window !== "undefined"
                ? window.prompt("이미지 URL")
                : null;
            if (url && editor)
              editor.chain().focus().setImage({ src: url.trim() }).run();
          }}
          disabled={!editor}
        >
          이미지
        </button>
      </div>

      {/* 편집 영역: 반응형 높이 + 뷰포트 상한 */}
      <div
        className={[
          "border rounded p-2 overflow-auto",
          "min-h-[40vh] md:min-h-[60vh] lg:min-h-[70vh]",
          "max-h-[80vh]",
        ].join(" ")}
      >
        {editor ? (
          <EditorContent
            editor={editor}
            className={[
              "prose max-w-none",
              "[&_.ProseMirror]:min-h-[36vh] md:[&_.ProseMirror]:min-h-[56vh] lg:[&_.ProseMirror]:min-h-[66vh]",
              "[&_.ProseMirror]:p-3",
              "[&_.ProseMirror]:outline-none",
            ].join(" ")}
          />
        ) : (
          <div className="text-sm opacity-70">에디터 준비 중…</div>
        )}
      </div>
    </div>
  );
}
