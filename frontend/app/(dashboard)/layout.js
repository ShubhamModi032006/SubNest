import { DashboardLayoutWrapper } from "@/components/layout/DashboardLayoutWrapper";

export const metadata = {
  title: "Dashboard Workspace | SubNest",
  description: "Manage your subscriptions securely.",
};

export default function DashboardLayout({ children }) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
