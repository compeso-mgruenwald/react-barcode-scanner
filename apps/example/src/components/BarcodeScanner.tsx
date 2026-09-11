import { memo, useState, useCallback } from "react";
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

  let handleSuccess = useCallback(
    (text: string) => {
      setDoScan(false);
      onScan(text);
    },
    [onScan]
  );

  let handleError = useCallback(
    (scanError?: Error) => {
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
    },
    [onError]
  );

  let handleLoad = useCallback(() => {
    console.log("Video feed has loaded!");
  }, []);

  let handleScanAgain = useCallback(() => {
    setError("");
    setDoScan(true);
  }, []);

  let handleStop = useCallback(() => {
    setDoScan(false);
  }, []);

  return (
    <>
      {description && <p>{description}</p>}
      <ReactBarcodeScanner
        doScan={doScan}
        onSuccess={handleSuccess}
        onError={handleError}
        onLoad={handleLoad}
        flashlight
        videoClassName="rounded-xl"
        videoContainerClassName="rounded-xl"
        viewfinderClassName="stroke-indigo-800"
        cameraOffClassName="border-rose-900/30"
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
