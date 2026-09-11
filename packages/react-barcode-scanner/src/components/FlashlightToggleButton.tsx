import type { ReactElement } from "react";
import { LuFlashlight, LuFlashlightOff } from "react-icons/lu";
import { joinClassNames } from "../utils/joinClassNames";
import "./FlashlightToggleButton.css";

const DEFAULT_TURN_ON_LABEL = "Turn flashlight on";
const DEFAULT_TURN_OFF_LABEL = "Turn flashlight off";

interface Props {
  isOn: boolean;
  onToggle: () => Promise<void>;
  className?: string;
  turnOnLabel?: string;
  turnOffLabel?: string;
}

export function FlashlightToggleButton({
  isOn,
  onToggle,
  className,
  turnOnLabel = DEFAULT_TURN_ON_LABEL,
  turnOffLabel = DEFAULT_TURN_OFF_LABEL
}: Props): ReactElement {
  return (
    <button
      type="button"
      className={joinClassNames(
        "rbs:flashlight-toggle-button",
        isOn && "rbs:flashlight-on",
        className
      )}
      aria-label={isOn ? turnOffLabel : turnOnLabel}
      aria-pressed={isOn}
      onClick={onToggle}
    >
      {isOn ? (
        <LuFlashlight size={22} aria-hidden="true" />
      ) : (
        <LuFlashlightOff size={22} aria-hidden="true" />
      )}
    </button>
  );
}
