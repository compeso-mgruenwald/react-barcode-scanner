import type { ReactElement } from "react";
import "./CameraLoading.css";

const ICON_SIZE = 72;

export function CameraLoading(): ReactElement {
  return (
    <div className="rbs:camera-loading" role="status" aria-label="Loading camera">
      <svg
        className="rbs:camera-loading-icon"
        width={ICON_SIZE}
        height={ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 3a9 9 0 1 1-6.36 2.64" />
      </svg>
    </div>
  );
}
