// FILE: /src/app/admin/mining/policies/pageClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PoliciesTable from "./view/PoliciesTable";
import { useMiningPolicies } from "./hooks/useMiningPolicies";
import { useMiningPolicyMutations } from "./hooks/useMiningPolicyMutations";
import PolicyForm from "./view/PolicyForm";
import type { PolicyFormValue } from "./view/PolicyForm";
import { useToast } from "@/components/ui";
import type {
  MiningPolicyListItem,
  MiningPolicyDetailResponse,
} from "@/types/admin/mining-policies";

export default function PoliciesPageClient() {
  const { items, loading, error, refetch } = useMiningPolicies();
  const {
    loading: mutating,
    error: mutError,
    createPolicy,
    updatePolicy,
    deletePolicy,
  } = useMiningPolicyMutations();
  const { toast } = useToast();

  // 인라인 패널 상태
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [editing, setEditing] = useState<MiningPolicyListItem | null>(null);

  // 삭제 확인 상태(간단히 인라인 버튼로직 유지)
  const [deleting, setDeleting] = useState<MiningPolicyListItem | null>(null);

  // 폼 초기값 / 상세 로딩
  const [editingInitial, setEditingInitial] =
    useState<Partial<PolicyFormValue> | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // 인라인 패널 스크롤 포커스용 ref
  const panelRef = useRef<HTMLDivElement | null>(null);

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
    setIsCreating(true);
    // 패널 표시 후 스크롤
    setTimeout(
      () => panelRef.current?.scrollIntoView({ behavior: "smooth" }),
      0
    );
  };

  const onEdit = (item: MiningPolicyListItem) => {
    setIsCreating(false);
    setEditing(item);
    setDetailLoading(true);
    setEditingInitial(null);

    void (async () => {
      try {
        const r = await fetch(`/api/admin/mining/policies/${item.id}/detail`, {
          method: "GET",
          headers: { "content-type": "application/json" },
          cache: "no-store",
        });
        const json = (await r.json()) as MiningPolicyDetailResponse;
        if (!r.ok || !("ok" in json && json.ok)) {
          const msg = "error" in json ? json.error : `HTTP ${r.status}`;
          throw new Error(msg);
        }

        setEditingInitial({
          name: json.item.name,
          isActive: json.item.isActive,
          companyPct: json.item.companyPct,
          selfPct: json.item.selfPct,
          mlmPct: json.item.mlmPct,
          companyUserId: json.item.companyUserId,
          mlmReferralPlanId: json.item.mlmReferralPlanId,
          levelBonusPlanId: json.item.levelBonusPlanId,
          effectiveFrom: json.item.effectiveFrom,
          effectiveTo: json.item.effectiveTo,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast({
          title: "Failed to load detail",
          description: msg,
          variant: "error",
        });
        // fallback: 목록 값만
        setEditingInitial({
          name: item.name,
          isActive: item.isActive,
          companyPct: item.companyPct,
          selfPct: item.selfPct,
          mlmPct: item.mlmPct,
          effectiveFrom: item.effectiveFrom,
          effectiveTo: item.effectiveTo,
        });
      } finally {
        setDetailLoading(false);
        setTimeout(
          () => panelRef.current?.scrollIntoView({ behavior: "smooth" }),
          0
        );
      }
    })();
  };

  const onDelete = (item: MiningPolicyListItem) => {
    setDeleting(item);
  };

  const toolbar = useMemo(
    () => (
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mining Policies</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onCreateClick}
          disabled={mutating}
        >
          New Policy
        </button>
      </div>
    ),
    [mutating]
  );

  const handleSubmit = async (value: PolicyFormValue) => {
    if (editing) {
      await updatePolicy(editing.id, value);
      toast({
        title: "Updated",
        description: `Policy '${value.name}' updated.`,
      });
    } else {
      await createPolicy(value);
      toast({
        title: "Created",
        description: `Policy '${value.name}' created.`,
      });
    }
    // 패널 닫기 + 목록 갱신
    setIsCreating(false);
    setEditing(null);
    setEditingInitial(null);
    await refetch();
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditing(null);
    setEditingInitial(null);
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

  const showPanel = isCreating || Boolean(editing);

  return (
    <main className="p-4 md:p-6 space-y-4">
      {toolbar}

      <PoliciesTable
        items={items}
        loading={loading || mutating}
        onRefresh={refetch}
        actions={{ onEdit, onDelete }}
      />

      {/* 인라인 편집/생성 패널 */}
      {showPanel && (
        <div ref={panelRef} className="card bg-base-100 shadow-md">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h3 className="card-title text-lg">
                {editing ? "Edit Policy" : "New Policy"}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleCancel}
                  disabled={mutating}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="py-2">
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
                          companyPct: editing.companyPct,
                          selfPct: editing.selfPct,
                          mlmPct: editing.mlmPct,
                          effectiveFrom: editing.effectiveFrom,
                          effectiveTo: editing.effectiveTo,
                        }
                      : undefined
                  }
                  submitLabel={editing ? "Save" : "Create"}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  disabled={mutating}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 인라인 카드 (간단 버전) */}
      {deleting && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-lg">Delete Policy</h3>
            <p className="py-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleting.name}</span>?
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
        </div>
      )}
    </main>
  );
}
