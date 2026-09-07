import type { RefObject } from "react";
import { BrowserCodeReader } from "@zxing/browser";
import type { BrowserMultiFormatReader } from "@zxing/browser";
import { ChecksumException, FormatException, NotFoundException } from "@zxing/library";

export const UNKNOWN_SCAN_ERROR_MESSAGE: string = "Unknown barcode scan error";

export function stopVideoStream(video: HTMLVideoElement | null): void {
  if (!video) return;

  let stream = video.srcObject;

  if (stream instanceof MediaStream) {
    for (let track of stream.getTracks()) {
      track.stop();
    }
  }

  BrowserCodeReader.cleanVideoSource(video);
}

export async function decodeBarcodeFromConstraints(
  codeReader: Pick<BrowserMultiFormatReader, "decodeOnceFromConstraints">,
  videoElement: RefObject<HTMLVideoElement | null>,
  constraints: MediaTrackConstraints
): Promise<string | undefined> {
  if (!videoElement.current) return undefined;

  try {
    let result = await codeReader.decodeOnceFromConstraints(
      { audio: false, video: constraints, preferCurrentTab: true },
      videoElement.current
    );

    return result.getText();
  } catch (error) {
    if (
      error &&
      !(
        error instanceof NotFoundException ||
        error instanceof ChecksumException ||
        error instanceof FormatException
      )
    ) {
      throw error instanceof Error ? error : new Error(UNKNOWN_SCAN_ERROR_MESSAGE);
    }

    return undefined;
  }
}
