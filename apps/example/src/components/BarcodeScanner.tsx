import { memo, useState } from "react";
import type { ReactNode } from "react";
import { BarcodeScanner as ReactBarcodeScanner } from "@thewirv/react-barcode-scanner";

interface Props {
  description?: ReactNode;
  onScan: (data: string) => void;
  onError?: () => void;
}

function BarcodeScannerComponent({ description, onScan, onError }: Props) {
  let [doScan, setDoScan] = useState(true);
  let [error, setError] = useState("");

  function handleScanAgain() {
    setError("");
    setDoScan(true);
  }

  function handleStop() {
    setDoScan(false);
  }

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
          } else {
            errorMessage = scanError.message;
          }

          setDoScan(false);
          setError(errorMessage);
          onError?.();
        }}
        onLoad={() => console.log("Video feed has loaded!")}
        containerStyle={{ width: "100%" }}
      />
      {error && <p role="alert">{error}</p>}
      {doScan ? (
        <button type="button" onClick={handleStop} style={{ marginTop: 12 }}>
          Stop
        </button>
      ) : (
        <button type="button" onClick={handleScanAgain} style={{ marginTop: 12 }}>
          {error ? "Retry" : "Scan again"}
        </button>
      )}
    </>
  );
}

export const BarcodeScanner = memo(BarcodeScannerComponent);
