import Image from "next/image";
import Link from "next/link";

const FALLBACK_STORE_NAME = "Smart Store Navi";

interface StoreHeaderProps {
  storeName: string | null;
}

export default function StoreHeader({ storeName }: StoreHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface shadow-sm">
      <Link
        href="/"
        className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-8"
      >
        <Image
          src="/images/design-reference/logo.png"
          alt="ロゴ"
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
        />
        <p className="min-w-0 truncate text-xl font-bold text-on-surface">
          {storeName ?? FALLBACK_STORE_NAME}
        </p>
      </Link>
    </header>
  );
}
