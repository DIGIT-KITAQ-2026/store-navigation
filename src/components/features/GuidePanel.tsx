import type { Product } from "@/types/product";

interface GuidePanelProps {
  product: Product;
  /** 案内先の売り場名(青果、加工食品など)。棚IDが未登録/未登録値の場合はnull */
  destinationLabel: string | null;
  guideMessage: string | null;
  /** 「3D案内を開始」が押され、3D側に経路・矢印・目的地マーカーを表示している状態か */
  guideStarted: boolean;
  onStartGuide: () => void;
}

export default function GuidePanel({
  product,
  destinationLabel,
  guideMessage,
  guideStarted,
  onStartGuide,
}: GuidePanelProps) {
  return (
    <div className="w-full rounded-xl border border-outline-variant bg-surface p-5 shadow-xl">
      {product.category && (
        <p className="text-xs font-medium text-on-surface-variant">{product.category}</p>
      )}

      {/*
        商品名と棚IDバッジは横一列に並べない(狭い幅を取り合うと「カレールー(中辛)」のような
        商品名が1〜2文字ずつ縦に折り返されてしまうため)。商品名はカード横幅いっぱいで
        通常のワードラップ(word-break: normal相当)にまかせ、バッジは商品名の下に独立して置く
      */}
      <h2 className="mt-1 min-w-0 break-normal text-2xl font-bold leading-tight text-on-surface [overflow-wrap:normal]">
        {product.name}
      </h2>
      {destinationLabel !== null && (
        <span className="mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-sm font-semibold text-on-primary-container">
          <span className="material-symbols-outlined text-[18px]">shelves</span>
          棚ID: {product.shelfId}
        </span>
      )}

      {destinationLabel !== null ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-surface-variant/60 p-3">
          <span className="material-symbols-outlined mt-0.5 text-primary">directions_walk</span>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            {product.name}は{product.category}コーナーの棚{product.shelfNumber}にあります
          </p>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-surface-variant/60 p-3">
          <span className="material-symbols-outlined mt-0.5 text-on-surface-variant">info</span>
          <p className="text-sm leading-relaxed text-on-surface-variant">この商品の売り場情報は現在準備中です</p>
        </div>
      )}

      <p className="mt-3 text-sm text-on-surface-variant">{product.description}</p>

      {guideMessage !== null && (
        <p
          role="status"
          className="animate-fade-in-up mt-3 rounded-lg bg-primary-container px-4 py-3 text-sm font-medium text-on-primary-container"
        >
          {guideMessage}
        </p>
      )}

      {destinationLabel !== null && (
        <button
          type="button"
          onClick={onStartGuide}
          aria-pressed={guideStarted}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold shadow-md transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 motion-reduce:transition-none motion-reduce:active:scale-100 ${
            guideStarted
              ? "bg-primary-container text-on-primary-container hover:bg-primary-container/90"
              : "bg-primary text-on-primary hover:bg-primary/90"
          }`}
        >
          <span className="material-symbols-outlined">{guideStarted ? "check_circle" : "navigation"}</span>
          {guideStarted ? "3D案内を表示中" : "3D案内を開始"}
        </button>
      )}
    </div>
  );
}
