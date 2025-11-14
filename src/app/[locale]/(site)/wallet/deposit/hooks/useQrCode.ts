// src/app/[locale]/(site)/wallet/deposit/hooks/useQrCode.ts
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export interface UseQrCodeOptions {
  width?: number;
  margin?: number;
  dark?: string;
  light?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

export interface UseQrCodeResult {
  dataUrl: string;
  error: string | null;
  generating: boolean;
}

export function useQrCode(
  text: string,
  opts?: UseQrCodeOptions
): UseQrCodeResult {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!text) {
        setDataUrl("");
        setError(null);
        return;
      }
      setGenerating(true);
      setError(null);
      try {
        const url = await QRCode.toDataURL(text, {
          width: opts?.width ?? 240,
          margin: opts?.margin ?? 1,
          color: {
            dark: opts?.dark ?? "#000000",
            light: opts?.light ?? "#ffffff",
          },
          errorCorrectionLevel: opts?.errorCorrectionLevel ?? "M",
        });
        if (!cancelled) setDataUrl(url);
      } catch (e) {
        if (!cancelled) {
          const msg =
            typeof e === "string"
              ? e
              : e instanceof Error
              ? e.message
              : "QR error";
          setError(msg);
          setDataUrl("");
        }
      } finally {
        if (!cancelled) setGenerating(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [
    text,
    opts?.width,
    opts?.margin,
    opts?.dark,
    opts?.light,
    opts?.errorCorrectionLevel,
  ]);

  return { dataUrl, error, generating };
}
