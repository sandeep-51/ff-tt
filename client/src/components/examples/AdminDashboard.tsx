import AdminDashboard from "../AdminDashboard";
import type { Registration } from "../RegistrationsTable";

// TODO: Remove mock functionality
export default function AdminDashboardExample() {
  return (
    <AdminDashboard
      onLogout={() => console.log("Logout")}
    />
  );
}
