import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-theme flex min-h-dvh flex-1 flex-col font-admin">
      {children}
    </div>
  );
}
