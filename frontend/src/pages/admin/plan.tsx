import { AdminPlanDetailView } from "@/components/admin/AdminPlanDetailView";
import { useParams } from "@/platform/navigation";

export default function AdminPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <AdminPlanDetailView planId={Number(id)} />;
}
