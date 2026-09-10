import type { MouseEventHandler, PropsWithChildren } from "react";

interface Props {
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export function Button({ onClick, children }: PropsWithChildren<Props>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-button light:bg-button-light hover:border-accent mt-3 cursor-pointer rounded-lg border border-transparent px-5 py-2.5 text-base font-medium transition-colors focus-visible:outline focus-visible:outline-4"
    >
      {children}
    </button>
  );
}
