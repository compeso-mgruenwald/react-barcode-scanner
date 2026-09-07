import { memo } from "react";

interface Props {
  containerWidth: number;
  containerHeight: number;
}

function ViewfinderComponent({ containerWidth, containerHeight }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      stroke="rgba(255, 0, 0, 0.5)"
      strokeWidth={5}
      style={{
        top: 0,
        left: 0,
        boxSizing: "border-box",
        borderWidth: `${Math.round(0.06666666 * containerHeight)}px ${Math.round(0.176 * containerWidth)}px`,
        borderStyle: "solid",
        borderColor: "rgba(0, 0, 0, 0.3)",
        position: "absolute",
        width: "100%",
        height: "100%"
      }}
    >
      <path d="M13,0 L0,0 L0,13" />
      <path d="M0,87 L0,100 L13,100" />
      <path d="M87,100 L100,100 L100,87" />
      <path d="M100,13 L100,0 87,0" />
    </svg>
  );
}

export const Viewfinder = memo(ViewfinderComponent);
