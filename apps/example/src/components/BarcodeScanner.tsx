import { memo, useState } from "react";
import type { ReactNode } from "react";
import { BarcodeScanner as ReactBarcodeScanner } from "@thewirv/react-barcode-scanner";
import { Button } from "./Button";

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
        videoClassName="rounded-xl"
        viewfinderClassName="stroke-lime-400"
        cameraOffClassName="border-indigo-400"
      />
      {error && <p role="alert">{error}</p>}
      {doScan ? (
        <Button onClick={handleStop}>Stop</Button>
      ) : (
        <Button onClick={handleScanAgain}>Stop</Button>
      )}
    </>
  );
}

export const BarcodeScanner = memo(BarcodeScannerComponent);
