import type { RefObject } from "react";
import { BrowserCodeReader } from "@zxing/browser";
import type { BrowserMultiFormatReader } from "@zxing/browser";
import { ChecksumException, FormatException, NotFoundException } from "@zxing/library";

export const UNKNOWN_SCAN_ERROR_MESSAGE: string = "Unknown barcode scan error";

function stopMediaStream(stream: MediaStream) {
  for (let track of stream.getTracks()) {
    track.stop();
  }
}

export function stopVideoStream(video: HTMLVideoElement | null): void {
  if (!video) return;

  let stream = video.srcObject;

  if (stream instanceof MediaStream) {
    stopMediaStream(stream);
  }

  BrowserCodeReader.cleanVideoSource(video);
}

/**
 * Opens a camera session from `constraints`, decodes one barcode, and returns its text.
 *
 * This function owns the `MediaStream` it creates. After `getUserMedia` resolves, a cancelled
 * session stops that stream and does not attach it. On cleanup, tracks are stopped by stream
 * identity so a successor already on `video` is left alone.
 *
 * @param codeReader - ZXing reader used to decode from the attached stream
 * @param videoElement - Ref to the preview `<video>`; must be set before `getUserMedia` resolves
 * @param constraints - Camera constraints passed as the `video` field of `getUserMedia`
 * @param isCancelled - When true, skip attach / ignore a late result and stop this session's stream
 * @param onStream - Called with the live stream just before it is attached, if the session is still current
 * @returns The decoded text, or `undefined` when there is no video, the session was cancelled, or ZXing reports not-found / checksum / format
 */
export async function decodeBarcodeFromConstraints(
  codeReader: Pick<BrowserMultiFormatReader, "decodeOnceFromStream">,
  videoElement: RefObject<HTMLVideoElement | null>,
  constraints: MediaTrackConstraints,
  isCancelled: () => boolean,
  onStream: (stream: MediaStream) => void
): Promise<string | undefined> {
  if (!videoElement.current) return undefined;

  let stream: MediaStream | undefined;
  let video = videoElement.current;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: constraints,
      preferCurrentTab: true
    });

    video = videoElement.current;

    if (isCancelled()) return undefined;

    if (!video) {
      stopMediaStream(stream);
      return undefined;
    }

    onStream(stream);

    let result = await codeReader.decodeOnceFromStream(stream, video);

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
  } finally {
    if (isCancelled() && stream) {
      stopMediaStream(stream);

      if (video?.srcObject === stream) {
        BrowserCodeReader.cleanVideoSource(video);
      }
    }
  }
}
