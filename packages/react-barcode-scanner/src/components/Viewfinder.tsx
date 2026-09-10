import type { ReactElement } from "react";
import { joinClassNames } from "../utils/joinClassNames";
import "./Viewfinder.css";

interface Props {
  className?: string;
}

export function Viewfinder({ className }: Props): ReactElement {
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
        d="M0 0h100v100H0zM10 10h80v80H10z"
      />
      <path d="M23,10 L10,10 L10,23" />
      <path d="M10,77 L10,90 L23,90" />
      <path d="M77,90 L90,90 L90,77" />
      <path d="M90,23 L90,10 L77,10" />
    </svg>
  );
}
