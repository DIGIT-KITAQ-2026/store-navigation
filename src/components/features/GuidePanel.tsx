import type { Product } from "@/types/product";

interface GuidePanelProps {
  product: Product;
  guideMessage: string | null;
  onStartGuide: () => void;
}

export default function GuidePanel({ product, guideMessage, onStartGuide }: GuidePanelProps) {
  return (
    <div className="w-full rounded-xl border border-outline-variant bg-surface p-5 shadow-xl">
      {product.category && (
        <p className="text-xs font-medium text-on-surface-variant">{product.category}</p>
      )}

      <div className="mt-1 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold leading-tight text-on-surface">{product.name}</h2>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-sm font-semibold text-on-primary-container">
          <span className="material-symbols-outlined text-[18px]">shelves</span>
          棚ID: {product.shelfId}
        </span>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-lg bg-surface-variant/60 p-3">
        <span className="material-symbols-outlined mt-0.5 text-primary">directions_walk</span>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          {product.name}は{product.category}コーナーの棚{product.shelfNumber}にあります
        </p>
      </div>

      <p className="mt-3 text-sm text-on-surface-variant">{product.description}</p>

      {guideMessage !== null && (
        <p
          role="status"
          className="animate-fade-in-up mt-3 rounded-lg bg-primary-container px-4 py-3 text-sm font-medium text-on-primary-container"
        >
          {guideMessage}
        </p>
      )}

      <button
        type="button"
        onClick={onStartGuide}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-on-primary shadow-md transition-[background-color,transform] duration-150 ease-out hover:bg-primary/90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <span className="material-symbols-outlined">navigation</span>
        3D案内を開始
      </button>
    </div>
  );
}
