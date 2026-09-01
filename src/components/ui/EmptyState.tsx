import Image from "next/image";

interface EmptyStateProps {
  message: string;
  showImage?: boolean;
}

export default function EmptyState({ message, showImage = false }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="animate-fade-in-up flex flex-col items-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface px-6 py-10 text-center"
    >
      {showImage && (
        <Image
          src="/images/design-reference/store-search-empty.png"
          alt="水彩で描かれたスーパーマーケット"
          width={800}
          height={400}
          className="h-auto w-[240px] max-w-full object-contain md:w-[300px]"
        />
      )}
      <p className="text-base font-medium text-on-surface-variant">{message}</p>
    </div>
  );
}
