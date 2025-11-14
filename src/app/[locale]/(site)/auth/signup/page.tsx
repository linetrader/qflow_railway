// src/app/[locale]/(site)/auth/signup/page.tsx
"use client";

import dynamic from "next/dynamic";

const SignupView = dynamic(() => import("./view/SignupView"), { ssr: false });

export default function Page() {
  return <SignupView />;
}
