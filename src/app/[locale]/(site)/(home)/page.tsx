// src/app/[locale]/(site)/(home)/page.tsx
"use client";

import { HomeView } from "./views/HomeView";
import { useHomeData } from "./hooks/useHomeData";

export default function Home() {
  const data = useHomeData();
  return (
    <>
      <HomeView {...data} />
    </>
  );
}
