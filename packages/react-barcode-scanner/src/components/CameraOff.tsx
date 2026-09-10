import type { ReactElement } from "react";
import { FiCameraOff } from "react-icons/fi";
import { joinClassNames } from "../utils/joinClassNames";
import "./CameraOff.css";

interface Props {
  className?: string;
  iconClassName?: string;
}

export function CameraOff({ className, iconClassName }: Props): ReactElement {
  return (
    <div className={joinClassNames("rbs:camera-off", className)} role="img" aria-label="Camera off">
      <FiCameraOff
        className={joinClassNames("rbs:camera-off-icon", iconClassName)}
        aria-hidden="true"
      />
    </div>
  );
}
