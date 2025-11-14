// src/app/[locale]/(site)/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import React from "react";
import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";
import MainHeader from "@/components/MainHeader/MainHeader";
import MainFooter from "@/components/MainFooter/MainFooter";

const COOKIE_NAME = process.env.JWT_COOKIE_NAME || "qflow_token";
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is missing or too short (>=16).");
  }
  return new TextEncoder().encode(secret);
}

type AuthState = { authed: boolean; userLevel: number };

async function readAuthFromCookie(): Promise<AuthState> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return { authed: false, userLevel: 0 };

  try {
    const { payload } = await jwtVerify<JWTPayload>(token, getJwtSecret(), {
      issuer: JWT_ISSUER || undefined,
      audience: JWT_AUDIENCE || undefined,
    });
    const levelRaw = (payload as Record<string, unknown>)["level"];
    const userLevel =
      typeof levelRaw === "number"
        ? levelRaw
        : Number.isFinite(Number(levelRaw))
        ? Number(levelRaw)
        : 0;
    return { authed: true, userLevel };
  } catch {
    return { authed: false, userLevel: 0 };
  }
}

export default async function SiteLayout(props: { children: React.ReactNode }) {
  const { authed, userLevel } = await readAuthFromCookie();
  return (
    <div className="flex min-h-dvh flex-col bg-base-200 text-base-content">
      <MainHeader authed={authed} userLevel={userLevel} />
      <main
        id="main"
        className="container mx-auto flex-1 px-4 py-4 pb-[calc(64px+env(safe-area-inset-bottom))]"
        role="main"
      >
        {props.children}
      </main>
      <MainFooter />
    </div>
  );
}
