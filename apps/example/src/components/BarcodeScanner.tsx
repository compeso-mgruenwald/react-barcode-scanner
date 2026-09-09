import { memo, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BarcodeScanner as ReactBarcodeScanner } from "@thewirv/react-barcode-scanner";

interface Props {
  description?: ReactNode;
  onScan: (data: string) => void;
  onError?: () => void;
}

const DIMENSIONS = {
  width: 500,
  height: 500
};

function BarcodeScannerComponent({ description, onScan, onError }: Props) {
  let [doScan, setDoScan] = useState(true);
  let [error, setError] = useState("");

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  return (
    <>
      {description && <p>{description}</p>}
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
        containerStyle={DIMENSIONS}
      />
      <button onMouseDown={() => setDoScan((prev) => !prev)} style={{ marginTop: 12 }}>
        Toggle
      </button>
    </>
  );
}

export const BarcodeScanner = memo(BarcodeScannerComponent);
