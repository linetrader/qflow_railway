// FILE: /src/app/admin/level/policies/pageClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import PoliciesTable from "./view/PoliciesTable";
import { useLevelPolicies } from "./hooks/useLevelPolicies";
import { usePolicyMutations } from "./hooks/usePolicyMutations";
import PolicyForm from "./view/PolicyForm";
import type { PolicyFormValue } from "./view/PolicyForm";
import { useToast } from "@/components/ui";
import type {
  LevelPolicyListItem,
  LevelPolicyDetailResponse,
} from "@/types/admin/level-policies";

export default function PoliciesPageClient() {
  const { items, loading, error, refetch } = useLevelPolicies();
  const {
    loading: mutating,
    error: mutError,
    createPolicy,
    updatePolicy,
    deletePolicy,
  } = usePolicyMutations();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LevelPolicyListItem | null>(null);
  const [deleting, setDeleting] = useState<LevelPolicyListItem | null>(null);

  // 편집 초기값(상세 구조 포함)
  const [editingInitial, setEditingInitial] = useState<PolicyFormValue | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  useEffect(() => {
    if (error) {
      toast({
        title: "Failed to load policies",
        description: error,
        variant: "error",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (mutError) {
      toast({
        title: "Operation failed",
        description: mutError,
        variant: "error",
      });
    }
  }, [mutError, toast]);

  const onCreateClick = () => {
    setEditing(null);
    setEditingInitial(null);
    setModalOpen(true);
  };

  const onEdit = (item: LevelPolicyListItem) => {
    setEditing(item);
    setModalOpen(true);
    setDetailLoading(true);
    setEditingInitial(null);

    void (async () => {
      try {
        const r = await fetch(`/api/admin/level/policies/${item.id}/detail`, {
          method: "GET",
          headers: { "content-type": "application/json" },
          cache: "no-store",
        });
        const json = (await r.json()) as LevelPolicyDetailResponse;
        if (!r.ok || !("ok" in json && json.ok)) {
          const msg = "error" in json ? json.error : `HTTP ${r.status}`;
          throw new Error(msg);
        }
        setEditingInitial({
          name: json.item.name,
          isActive: json.item.isActive,
          structure: json.item.structure,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast({
          title: "Failed to load detail",
          description: msg,
          variant: "error",
        });
        // 최소한 이름/활성만 프리필
        setEditingInitial({
          name: item.name,
          isActive: item.isActive,
        });
      } finally {
        setDetailLoading(false);
      }
    })();
  };

  const onDelete = (item: LevelPolicyListItem) => {
    setDeleting(item);
  };

  const toolbar = useMemo(
    () => (
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Policies</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onCreateClick}
        >
          New Policy
        </button>
      </div>
    ),
    []
  );

  const handleSubmit = async (value: PolicyFormValue) => {
    if (editing) {
      await updatePolicy(editing.id, {
        name: value.name,
        isActive: value.isActive,
        structure: value.structure,
      });
      toast({
        title: "Updated",
        description: `Policy '${value.name}' updated.`,
      });
    } else {
      await createPolicy({
        name: value.name,
        isActive: value.isActive,
        structure: value.structure,
      });
      toast({
        title: "Created",
        description: `Policy '${value.name}' created.`,
      });
    }
    setModalOpen(false);
    setEditingInitial(null);
    await refetch();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await deletePolicy(deleting.id);
    toast({
      title: "Deleted",
      description: `Policy '${deleting.name}' deleted.`,
    });
    setDeleting(null);
    await refetch();
  };

  return (
    <main className="p-4 md:p-6 space-y-4">
      {toolbar}

      <PoliciesTable
        items={items}
        loading={loading || mutating}
        onRefresh={refetch}
        actions={{ onEdit, onDelete }}
      />

      {/* Create/Edit Modal */}
      <input
        type="checkbox"
        className="modal-toggle"
        checked={modalOpen}
        readOnly
      />
      <div className="modal">
        <div className="modal-box max-w-4xl">
          <h3 className="font-bold text-lg">
            {editing ? "Edit Policy" : "New Policy"}
          </h3>
          <div className="py-4">
            {editing && detailLoading ? (
              <div className="flex items-center gap-2">
                <span className="loading loading-spinner" />
                <span>Loading...</span>
              </div>
            ) : (
              <PolicyForm
                initial={
                  editing
                    ? editingInitial ?? {
                        name: editing.name,
                        isActive: editing.isActive,
                      }
                    : undefined
                }
                submitLabel={editing ? "Save" : "Create"}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setModalOpen(false);
                  setEditingInitial(null);
                }}
                disabled={mutating}
              />
            )}
          </div>
        </div>
        <label
          className="modal-backdrop"
          onClick={() => {
            setModalOpen(false);
            setEditingInitial(null);
          }}
        >
          Close
        </label>
      </div>

      {/* Delete Confirm Modal */}
      <input
        type="checkbox"
        className="modal-toggle"
        checked={Boolean(deleting)}
        readOnly
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Delete Policy</h3>
          <p className="py-4">
            Are you sure you want to delete&nbsp;
            <span className="font-semibold">
              &ldquo;{deleting ? deleting.name : ""}&rdquo;
            </span>
            ?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDeleting(null)}
              disabled={mutating}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-error"
              onClick={handleDelete}
              disabled={mutating}
            >
              Delete
            </button>
          </div>
        </div>
        <label className="modal-backdrop" onClick={() => setDeleting(null)}>
          Close
        </label>
      </div>
    </main>
  );
}
