// src/app/[locale]/(site)/packages/page.tsx
"use client";

import { useMemo, useState, type FormEvent } from "react";
import { formatAmount } from "@/lib/format";
import { usePackagesData } from "./hooks/usePackagesData";
import { usePurchaseCalc } from "./hooks/usePurchaseCalc";
import PackagePurchaseView from "./view/PackagePurchaseView";
import PurchaseHistoryView from "./view/PurchaseHistoryView";
import type { PackageQtyMap } from "@/types/packages";
import { useToast } from "@/components/ui";
import { useTranslations } from "next-intl";

export default function PackagesPage() {
  const t = useTranslations("packages");

  const {
    qaiPrice,
    apiLoading,
    apiErr,
    packages,
    history,
    usdtBalance,
    fetchPackages,
  } = usePackagesData();

  const { toast } = useToast();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [qtyById, setQtyById] = useState<PackageQtyMap>({});

  useMemo(() => {
    setQtyById((prev) => {
      const next: PackageQtyMap = {};
      for (const p of packages) next[p.id] = prev[p.id] ?? "";
      return next;
    });
  }, [packages]);

  const { totalUSD, estQai, canBuy, insufficient } = usePurchaseCalc({
    packages,
    qtyById,
    submitting,
    usdtBalance,
    qaiPrice,
  });

  function onChangeQty(id: string, v: string) {
    setQtyById((prev) => ({ ...prev, [id]: v }));
  }

  async function onBuy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canBuy) {
      toast({
        title: t("toast.cannotBuy.title"),
        description: insufficient
          ? t("toast.cannotBuy.insufficient")
          : t("toast.cannotBuy.inputQty"),
        variant: insufficient ? "warning" : "info",
        position: "top-right",
        duration: 2200,
        closable: true,
      });
      return;
    }

    const items: Array<{ packageId: string; units: number }> = [];
    const lines: string[] = [t("toast.summary.title")];

    for (const p of packages) {
      const n = Number(String(qtyById[p.id] ?? "").replace(/\D/g, "")) || 0;
      if (n <= 0) continue;
      const price = Number(p.price || 0);
      lines.push(
        t("toast.summary.line", {
          name: p.name,
          units: formatAmount(n),
          price: price,
          subtotal: formatAmount(n * price),
        })
      );
      items.push({ packageId: p.id, units: n });
    }

    const rateLine =
      typeof qaiPrice === "number" && qaiPrice > 0
        ? t("toast.summary.totalWithRate", {
            total: formatAmount(totalUSD),
            estQai: formatAmount(estQai),
            price: qaiPrice,
          })
        : t("toast.summary.totalNoRate", { total: formatAmount(totalUSD) });
    lines.push(rateLine);

    setSubmitting(true);
    try {
      const r = await fetch("/api/packages/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ items }),
      });
      const j = (await r.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;

      if (!r.ok || !j?.ok) {
        const msg = j?.message || t("toast.fail.http", { status: r.status });
        throw new Error(msg);
      }

      setQtyById(() => {
        const next: PackageQtyMap = {};
        for (const p of packages) next[p.id] = "";
        return next;
      });

      await fetchPackages();

      toast({
        title: t("toast.success.title"),
        description: lines.join("\n"),
        variant: "success",
        position: "top-right",
        duration: 2600,
        closable: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toast.fail.generic");
      toast({
        title: t("toast.fail.title"),
        description: msg,
        variant: "error",
        position: "top-right",
        duration: 2600,
        closable: true,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (apiLoading) {
    return (
      <main className="mx-auto max-w-screen-md px-4 pt-4 pb-24">
        <div className="card bg-base-100 border">
          <div className="card-body">
            <div className="text-sm opacity-70">{t("loading.fetching")}</div>
            <progress className="progress w-full mt-2" />
          </div>
        </div>
      </main>
    );
  }

  if (apiErr) {
    return (
      <main className="mx-auto max-w-screen-md px-4 pt-4 pb-24">
        <div className="card bg-base-100 border">
          <div className="card-body space-y-3">
            <div className="alert alert-error">
              <span>{apiErr}</span>
            </div>
            <button className="btn" onClick={() => void fetchPackages()}>
              {t("loading.retry")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-screen-md px-4 pt-4 pb-24 space-y-6">
      <div className="card">
        <div className="card-body">
          <PackagePurchaseView
            packages={packages}
            qtyById={qtyById}
            onChangeQty={onChangeQty}
            onBuy={onBuy}
            submitting={submitting}
            qaiPrice={qaiPrice}
            usdtBalance={usdtBalance}
            totalUSD={totalUSD}
            estQai={estQai}
            canBuy={canBuy}
            insufficient={insufficient}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <PurchaseHistoryView
            rows={history ?? []}
            total={(history ?? []).reduce(
              (s, x) => s + x.unitPrice * x.units,
              0
            )}
            nextCursorExists={false}
            loading={false}
            err={null}
            onLoadMore={() => {}}
          />
        </div>
      </div>
    </main>
  );
}
