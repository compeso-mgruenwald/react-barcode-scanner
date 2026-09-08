import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BarcodeScanner as ReactBarcodeScanner } from "@thewirv/react-barcode-scanner";
import { useComponentDimensions } from "./useComponentDimensions";
import { Viewfinder } from "./Viewfinder";

interface Props {
  description?: ReactNode;
  onScan: (data: string) => void;
  onError?: () => void;
}

function BarcodeScannerComponent({ description, onScan, onError }: Props) {
  let [doScan, setDoScan] = useState(true);
  let [error, setError] = useState("");
  let containerRef = useRef<HTMLDivElement>(null);
  let { width: containerWidth } = useComponentDimensions(containerRef);

  let videoStyle = useMemo(
    () => ({
      width: 500,
      height: 375,
      margin: "0 auto"
    }),
    []
  );

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  useEffect(() => {
    return () => {
      setDoScan(false);
    };
  }, []);

  return (
    <>
      {description && <p>{description}</p>}
      <div ref={containerRef}>
        <ReactBarcodeScanner
          doScan={doScan}
          onSuccess={(text) => {
            setDoScan(false);
            onScan(text);
          }}
          onError={(scanError) => {
            if (!scanError) {
              return;
            }

            let errorMessage = "";

            if (scanError.name.includes("NotFoundError")) {
              errorMessage = "Camera not found!";
            } else if (scanError.name.includes("IndexSizeError")) {
              errorMessage = "Scanner error";
            }

            setDoScan(false);
            setError(errorMessage);
            onError?.();
          }}
          videoContainerStyle={{ ...videoStyle, paddingTop: 0 }}
          videoStyle={videoStyle}
          Viewfinder={() => (
            <Viewfinder containerWidth={containerWidth} containerHeight={videoStyle.height} />
          )}
        />
      </div>
      <button onMouseDown={() => setDoScan((prev) => !prev)} style={{ marginTop: 12 }}>
        Toggle
      </button>
    </>
  );
}

export const BarcodeScanner = memo(BarcodeScannerComponent);
