import { AdminHeader } from "@/components/ui/AdminHeader";
import InventoryImportFlow from "@/components/features/InventoryImportFlow";

export default function AdminInventoryPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader
        title="棚卸しCSV取込"
        subtitle="CSVを確認してからまとめて登録します"
        backHref="/admin"
        active="inventory"
        showLogout
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 md:px-8">
        <InventoryImportFlow />
      </main>
    </div>
  );
}
