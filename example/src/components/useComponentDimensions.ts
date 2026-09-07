import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

export function useComponentDimensions<T extends HTMLElement>(
  target: RefObject<T | null> | T | null
) {
  let [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    let targetElement = target && "current" in target ? target.current : target;

    if (!targetElement) {
      return () => {};
    }

    let observer = new ResizeObserver((entries) => {
      let entry = entries[0];

      if (!entry) return;

      let newWidth = Math.round(entry.contentRect.width);
      let newHeight = Math.round(entry.contentRect.height);

      setDimensions((prevDimensions) => {
        if (newWidth !== prevDimensions.width || newHeight !== prevDimensions.height) {
          return { width: newWidth, height: newHeight };
        }

        return prevDimensions;
      });
    });

    observer.observe(targetElement);

    return () => {
      observer.disconnect();
    };
  }, [target]);

  return dimensions;
}
