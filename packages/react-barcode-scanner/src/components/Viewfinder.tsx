import type { ReactElement } from "react";
import { joinClassNames } from "../utils/joinClassNames";
import "./Viewfinder.css";

interface Props {
  className?: string;
  withCrosshairs: boolean;
}

export function Viewfinder({ className, withCrosshairs }: Props): ReactElement {
  return (
    <svg
      className={joinClassNames("rbs:viewfinder", className)}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path
        className="rbs:viewfinder-mask"
        fillRule="evenodd"
        d="M0 0h100v100H0zM15 15h70v70H15z"
      />
      <path d="M27,15 L15,15 L15,27" />
      <path d="M15,73 L15,85 L27,85" />
      <path d="M73,85 L85,85 L85,73" />
      <path d="M85,27 L85,15 L73,15" />
      {withCrosshairs && (
        <g strokeWidth="0.5" stroke="rgba(0,0,0,0.3)">
          <line x1="40" x2="60" y1="50" y2="50" />
          <line x1="50" x2="50" y1="40" y2="60" />
        </g>
      )}
    </svg>
  );
}
