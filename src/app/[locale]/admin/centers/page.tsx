// src/app/admin/centers/page.tsx
"use client";

import CentersAdminView from "./view/CentersAdminView";
import { useCentersAdmin } from "./hooks/useCentersAdmin";

export default function CentersAdminPage() {
  const vm = useCentersAdmin();
  return <CentersAdminView {...vm} />;
}
