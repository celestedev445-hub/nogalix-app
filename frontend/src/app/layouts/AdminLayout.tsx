import { Outlet } from "react-router";
import { AdminShell } from "@/components/features/AdminShell";

/** Mise en page /admin — chargée à la demande (absente du bundle des pages publiques). */
export default function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
