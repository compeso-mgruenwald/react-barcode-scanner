import type { ReactElement } from "react";
import { joinClassNames } from "../utils/joinClassNames";
import "./CameraLoading.css";

const ICON_SIZE = 72;

interface Props {
  className?: string;
  iconClassName?: string;
}

export function CameraLoading({ className, iconClassName }: Props): ReactElement {
  return (
    <div
      className={joinClassNames("rbs:camera-loading", className)}
      role="status"
      aria-label="Loading camera"
    >
      <svg
        className={joinClassNames("rbs:camera-loading-icon", iconClassName)}
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
