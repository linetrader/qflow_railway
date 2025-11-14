// src/app/admin/boards/announcements/new/view/NewAnnouncementView.tsx
"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useAnnouncementCreate } from "../hooks/useAnnouncementCreate";
import type { AdminPostFormInput } from "../../types";
import AnnouncementEditor from "./AnnouncementEditor";

export default function NewAnnouncementView() {
  const { createOne, creating } = useAnnouncementCreate();

  const [form, setForm] = useState<AdminPostFormInput>({
    title: "",
    bodyRaw: "",
    bodyHtml: "",
    visibility: "PUBLIC",
    isPublished: false,
  });

  // 공통 필드 업데이트
  const setField = useCallback(
    <K extends keyof AdminPostFormInput>(
      key: K,
      value: AdminPostFormInput[K]
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // ✅ 에디터 콜백을 useCallback으로 고정 (불필요한 재생성 방지)
  const onHtmlChange = useCallback((next: string) => {
    setForm((prev) => ({ ...prev, bodyHtml: next }));
  }, []);

  const onRawChange = useCallback((raw: string) => {
    setForm((prev) => ({ ...prev, bodyRaw: raw }));
  }, []);

  const onSubmitCreate = useCallback(async () => {
    const res = await createOne(form);
    if (res.ok) {
      window.location.href = "/admin/boards/announcements";
      return;
    }
    alert(`[생성 실패] ${res.error ?? "unknown error"}`);
  }, [createOne, form]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">공지 글쓰기</h1>
        <div className="flex gap-2">
          <Link href="/admin/boards/announcements" className="btn btn-sm">
            목록
          </Link>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          {/* 제목 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">제목</span>
            </label>
            <input
              className="input input-bordered"
              value={form.title}
              onChange={(e) => setField("title", e.currentTarget.value)}
              placeholder="제목을 입력하세요"
            />
          </div>

          {/* 본문(Tiptap) */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">본문(Tiptap)</span>
            </label>
            <AnnouncementEditor
              initialHtml={form.bodyHtml}
              onHtmlChange={onHtmlChange}
              onRawChange={onRawChange}
            />
            <label className="label">
              <span className="label-text-alt">
                붙여넣기 시 이미지 data-src/srcset 정규화 적용
              </span>
            </label>
          </div>

          {/* 가시성/발행 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text">가시성</span>
              </label>
              <select
                className="select select-bordered"
                value={form.visibility}
                onChange={(e) =>
                  setField(
                    "visibility",
                    e.currentTarget.value === "PRIVATE" ? "PRIVATE" : "PUBLIC"
                  )
                }
              >
                <option value="PUBLIC">PUBLIC</option>
                <option value="PRIVATE">PRIVATE</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">발행 여부</span>
              </label>
              <input
                type="checkbox"
                className="toggle"
                checked={form.isPublished}
                onChange={(e) =>
                  setField("isPublished", e.currentTarget.checked)
                }
              />
            </div>
          </div>

          {/* 액션 */}
          <div className="card-actions justify-end mt-2">
            <button
              className="btn btn-primary"
              onClick={onSubmitCreate}
              disabled={creating}
            >
              {creating ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
