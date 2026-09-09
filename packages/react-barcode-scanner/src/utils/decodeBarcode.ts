import type { RefObject } from "react";
import { BrowserCodeReader } from "@zxing/browser";
import type { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { ChecksumException, FormatException, NotFoundException } from "@zxing/library";
import type { Exception } from "@zxing/library";

export const UNKNOWN_SCAN_ERROR_MESSAGE: string = "Unknown barcode scan error";

const ZXING_READER_WARN = "MultiFormatReader: non-ReaderException";

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

function isExpectedScanError(error: unknown) {
  return (
    error instanceof NotFoundException ||
    error instanceof ChecksumException ||
    error instanceof FormatException
  );
}

function zxingWarnKey(args: unknown[]) {
  let thrown = args[1];

  if (thrown instanceof Error) return `${thrown.name}:${thrown.message}`;

  return String(args[0]);
}

function suppressRepeatZxingWarns() {
  let originalWarn = console.warn;
  let seen = new Set<string>();

  console.warn = (...args: Parameters<typeof console.warn>) => {
    let first = args[0];

    if (typeof first === "string" && first.includes(ZXING_READER_WARN)) {
      let key = zxingWarnKey(args);

      if (seen.has(key)) return;

      seen.add(key);
    }

    originalWarn(...args);
  };

  return () => {
    console.warn = originalWarn;
  };
}

function scanUntilResult(
  codeReader: BrowserMultiFormatReader,
  video: HTMLVideoElement,
  isCancelled: () => boolean,
  onStop: (stop: () => void) => void
) {
  return new Promise<string | undefined>((resolve, reject) => {
    let settled = false;

    type SettleParams =
      | { stop: IScannerControls["stop"]; text: string; error?: never }
      | { stop: IScannerControls["stop"]; text?: never; error: Exception }
      | { stop: IScannerControls["stop"]; text?: never; error?: never };

    function settle({ stop, text, error }: SettleParams) {
      if (settled) return;

      settled = true;
      stop();

      if (error) {
        reject(error instanceof Error ? error : new Error(UNKNOWN_SCAN_ERROR_MESSAGE));
        return;
      }

      resolve(text);
    }

    let { stop } = codeReader.scan(video, (result, error, scannerControls) => {
      if (isCancelled()) {
        settle({ stop: scannerControls.stop });
        return;
      }

      if (result) {
        settle({ stop: scannerControls.stop, text: result.getText() });
        return;
      }

      if (error && !isExpectedScanError(error)) {
        settle({ stop: scannerControls.stop, error });
      }
    });

    onStop(() => {
      settle({ stop });
    });

    if (isCancelled()) settle({ stop });
  });
}

/**
 * Opens a camera session from `constraints`, decodes one barcode, and returns its text.
 *
 * This function owns the `MediaStream` it creates. After `getUserMedia` resolves, a cancelled
 * session stops that stream and does not attach it. On cleanup, tracks are stopped by stream
 * identity so a successor already on `video` is left alone. The ZXing scan loop is stopped via
 * `onStop` so it does not keep decoding after the camera is released.
 *
 * @param codeReader - ZXing reader used to decode from the attached stream
 * @param videoElement - Ref to the preview `<video>`; must be set before `getUserMedia` resolves
 * @param constraints - Camera constraints passed as the `video` field of `getUserMedia`
 * @param isCancelled - When true, skip attach / ignore a late result and stop this session's stream
 * @param onStream - Called with the live stream just before it is attached, if the session is still current
 * @param onStop - Receives a function that aborts the in-flight ZXing scan loop
 * @returns The decoded text, or `undefined` when there is no video, the session was cancelled, or ZXing reports not-found / checksum / format
 */
export async function decodeBarcodeFromConstraints(
  codeReader: BrowserMultiFormatReader,
  videoElement: RefObject<HTMLVideoElement | null>,
  constraints: MediaTrackConstraints,
  isCancelled: () => boolean,
  onStream: (stream: MediaStream) => void,
  onStop: (stop: () => void) => void
): Promise<string | undefined> {
  if (!videoElement.current) return undefined;

  let scanResult: string | undefined;
  let stream: MediaStream | undefined;
  let video = videoElement.current;
  let restoreWarn: (() => void) | undefined;

  mainBlock: {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: constraints,
        preferCurrentTab: true
      });

      video = videoElement.current;

      if (isCancelled()) break mainBlock;

      if (!video) {
        stopMediaStream(stream);
        break mainBlock;
      }

      onStream(stream);
      restoreWarn = suppressRepeatZxingWarns();

      BrowserCodeReader.addVideoSource(video, stream);
      await BrowserCodeReader.tryPlayVideo(video);

      if (isCancelled()) break mainBlock;

      scanResult = await scanUntilResult(codeReader, video, isCancelled, onStop);
    } catch (error) {
      if (error && !isExpectedScanError(error)) {
        throw error instanceof Error ? error : new Error(UNKNOWN_SCAN_ERROR_MESSAGE);
      }
    } finally {
      restoreWarn?.();

      if (isCancelled() && stream) {
        stopMediaStream(stream);

        if (video?.srcObject === stream) {
          BrowserCodeReader.cleanVideoSource(video);
        }
      }
    }
  }

  return scanResult;
}
