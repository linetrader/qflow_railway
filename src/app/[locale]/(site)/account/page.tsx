// src/app/[locale]/(site)/account/page.tsx
"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { usePasswordChange } from "./hooks/usePasswordChange";
import { useOtpSetup } from "./hooks/useOtpSetup";
import { useWalletUpdate } from "./hooks/useWalletUpdate";
import { ReferralCodeView } from "./view/ReferralCodeView";
import { AccountInfoCard } from "./view/AccountInfoCard";
import { OtpView } from "./view/OtpView";
import { WalletView } from "./view/WalletView";
import { ChangePasswordView } from "./view/ChangePasswordView";
import { useToast } from "@/components/ui/feedback/Toast-provider";

export default function AccountPage() {
  const t = useTranslations("account.page");
  const tRef = useTranslations("account.referral");
  const tWallet = useTranslations("account.wallet");
  const { profile, setProfile, loading, error } = useAccountProfile();
  const { toast } = useToast();

  const refLink = useMemo(() => {
    const code = profile.refCode?.trim();
    if (!code) return "";
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_ORIGIN || "";
    return `${base}/auth/signup?ref=${encodeURIComponent(code)}`;
  }, [profile.refCode]);

  async function copyRefLink(): Promise<void> {
    if (!refLink) return;
    try {
      await navigator.clipboard.writeText(refLink);
      toast({
        title: tRef("copyToastTitle.success"),
        description: tRef("copyToastDesc.success"),
        variant: "success",
        position: "top-right",
        duration: 1800,
        closable: true,
      });
    } catch {
      toast({
        title: tRef("copyToastTitle.error"),
        description: tRef("copyToastDesc.error"),
        variant: "error",
        position: "top-right",
        duration: 2200,
        closable: true,
      });
    }
  }

  const pw = usePasswordChange();
  const otp = useOtpSetup(profile.email, profile.otpEnabled);
  const wallet = useWalletUpdate(profile.wallet, profile.otpEnabled);

  async function onWalletCopied(): Promise<void> {
    if (!profile.wallet) return;
    try {
      await navigator.clipboard.writeText(profile.wallet);
      toast({
        title: tWallet("copyTitle.success"),
        description: tWallet("copyDesc.success"),
        variant: "success",
        position: "top-right",
        duration: 1800,
        closable: true,
      });
    } catch {
      toast({
        title: tWallet("copyTitle.error"),
        description: tWallet("copyDesc.error"),
        variant: "error",
        position: "top-right",
        duration: 2200,
        closable: true,
      });
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-screen-md px-4 pt-4 pb-24">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{t("title")}</h2>
            <div className="badge badge-info">{t("badgeLoading")}</div>
          </div>
          <div className="card">
            <div className="card-body">
              <p className="text-sm text-base-content/60">{t("loading")}</p>
              <progress className="progress w-full mt-2" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-screen-md px-4 pt-4 pb-24">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{t("title")}</h2>
            <div className="badge badge-error">{t("badgeError")}</div>
          </div>
        </section>
        <section>
          <div className="card">
            <div className="card-body">
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-screen-md px-4 pt-4 pb-24 space-y-6">
      <ReferralCodeView refLink={refLink} onCopy={copyRefLink} />

      <AccountInfoCard
        username={profile.username}
        email={profile.email}
        name={profile.name}
        countryLabel={
          profile.countryName && profile.countryCode
            ? `${profile.countryName} (${profile.countryCode})`
            : profile.countryCode || "-"
        }
      />

      <OtpView
        enabled={profile.otpEnabled}
        secret={otp.secret}
        qr={otp.qr}
        code={otp.code}
        setCode={otp.setCode}
        onRegister={async () => {
          const ok = await otp.register();
          if (ok) setProfile((prev) => ({ ...prev, otpEnabled: true }));
          return ok;
        }}
      />

      <WalletView
        state={{ ...wallet.state, addr: profile.wallet || wallet.state.addr }}
        setters={{
          setAddr: (v) => wallet.setters.setAddr(v),
          setShowOtp: wallet.setters.setShowOtp,
          setOtpCode: wallet.setters.setOtpCode,
        }}
        actions={{
          startSubmit: wallet.actions.startSubmit,
          confirmSubmit: async () => {
            const res = await wallet.actions.confirmSubmit();
            if (res.ok && res.value)
              setProfile((prev) => ({ ...prev, wallet: res.value }));
            return res;
          },
        }}
        copyCurrent={onWalletCopied}
      />

      <ChangePasswordView
        values={pw.values}
        setters={pw.setters}
        flags={{
          newPwAllOk: pw.flags.newPwAllOk,
          confirmOk: pw.flags.confirmOk,
          canChangePwd: pw.flags.canChangePwd,
        }}
        rules={pw.rules}
        onSubmit={() => pw.submit()}
      />
    </main>
  );
}
