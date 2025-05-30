import { Metadata } from "next";
import AdminDashboard from "./components/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin dashboard for managing all hubs and users",
};

export default function AdminPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <AdminDashboard />
    </div>
  );
} 