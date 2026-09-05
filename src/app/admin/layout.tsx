import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-1 flex-col bg-surface-variant">{children}</div>;
}
