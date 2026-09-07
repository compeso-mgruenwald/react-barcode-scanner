import type { RefObject } from "react";
import type { BrowserMultiFormatReader } from "@zxing/browser";
import { ChecksumException, FormatException, NotFoundException } from "@zxing/library";
import type { BarcodeScannerProps } from "../types";

type DecodeBarcodeFromConstraintsProps = Pick<
  BarcodeScannerProps,
  "constraints" | "onSuccess" | "onError"
>;

export async function decodeBarcodeFromConstraints(
  codeReader: BrowserMultiFormatReader,
  videoElement: RefObject<HTMLVideoElement | null>,
  { constraints, onSuccess, onError }: DecodeBarcodeFromConstraintsProps
): Promise<void> {
  if (!videoElement.current) return;

  try {
    const result = await codeReader.decodeOnceFromConstraints(
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
      onError(error instanceof Error ? error : new Error("Unknown barcode scan error"));
    }
  }
}
