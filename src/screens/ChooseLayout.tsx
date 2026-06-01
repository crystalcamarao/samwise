import { LAYOUT_ORDER, LAYOUTS } from "../config/layouts";
import { useApp } from "../state";
import type { LayoutId } from "../types";

/** Mini grid preview of a layout's photo cells. */
function LayoutPreview({ id }: { id: LayoutId }) {
  const { rows, cols, count } = LAYOUTS[id];
  return (
    <div
      className="layout-preview"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="layout-cell" />
      ))}
    </div>
  );
}

export function ChooseLayout() {
  const { chooseLayout } = useApp();
  return (
    <div className="screen layout-screen">
      <h1 className="screen-title">Choose your layout</h1>
      <div className="layout-grid">
        {LAYOUT_ORDER.map((id) => (
          <button
            key={id}
            className="layout-card"
            onClick={() => chooseLayout(id)}
          >
            <LayoutPreview id={id} />
            <span className="layout-count">{id}</span>
            <span className="layout-label">
              {id === 1 ? "photo" : "photos"} · {LAYOUTS[id].label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
