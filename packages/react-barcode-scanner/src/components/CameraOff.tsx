import type { ReactElement } from "react";
import { FiCameraOff } from "react-icons/fi";
import "./CameraOff.css";

export function CameraOff(): ReactElement {
  return (
    <div className="rbs:camera-off" role="img" aria-label="Camera off">
      <FiCameraOff className="rbs:camera-off-icon" aria-hidden="true" />
    </div>
  );
}
