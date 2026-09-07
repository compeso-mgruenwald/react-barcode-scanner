import type { RefObject } from "react";
import type { BrowserMultiFormatReader } from "@zxing/browser";
import { ChecksumException, FormatException, NotFoundException } from "@zxing/library";
import type { BarcodeScannerProps } from "../types";

type DecodeBarcodeFromConstraintsProps = Pick<
  BarcodeScannerProps,
  "constraints" | "onSuccess" | "onError"
>;

export const UNKNOWN_SCAN_ERROR_MESSAGE: string = "Unknown barcode scan error";

export async function decodeBarcodeFromConstraints(
  codeReader: Pick<BrowserMultiFormatReader, "decodeOnceFromConstraints">,
  videoElement: RefObject<HTMLVideoElement | null>,
  { constraints, onSuccess, onError }: DecodeBarcodeFromConstraintsProps
): Promise<void> {
  if (!videoElement.current) return;

  try {
    let result = await codeReader.decodeOnceFromConstraints(
      { audio: false, video: constraints, preferCurrentTab: true },
      videoElement.current
    );

    onSuccess(result.getText());
  } catch (error) {
    if (
      error &&
      !(
        error instanceof NotFoundException ||
        error instanceof ChecksumException ||
        error instanceof FormatException
      )
    ) {
      onError(error instanceof Error ? error : new Error(UNKNOWN_SCAN_ERROR_MESSAGE));
    }
  }
}
