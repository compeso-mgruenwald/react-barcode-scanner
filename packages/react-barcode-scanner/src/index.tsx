import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, VideoHTMLAttributes } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { CameraLoading } from "./components/CameraLoading";
import { CameraOff } from "./components/CameraOff";
import { Viewfinder as DefaultViewfinder } from "./components/Viewfinder";
import type { BarcodeScannerProps as Props } from "./types";
import { decodeBarcodeFromConstraints, stopVideoStream } from "./utils/decodeBarcode";
import { deepEqual } from "./utils/deepEqual";
import { joinClassNames } from "./utils/joinClassNames";
import "./index.css";

export type { BarcodeScannerProps } from "./types";

const DEFAULT_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "environment",
  width: { ideal: 720 },
  height: { ideal: 720 },
  aspectRatio: { ideal: 1 }
};
const MEDIA_DEVICES_ERROR_MESSAGE =
  'Your browser has no support for the MediaDevices API. You could fix this by running "npm i webrtc-adapter"';

export function BarcodeScanner({
  doScan = true,
  constraints = DEFAULT_CONSTRAINTS,
  onSuccess,
  onError,
  onLoad,
  Viewfinder = DefaultViewfinder,
  containerClassName,
  videoContainerClassName,
  videoClassName,
  cameraLoadingClassName,
  cameraLoadingIconClassName,
  cameraOffClassName,
  cameraOffIconClassName,
  viewfinderClassName,
  videoProps: passedVideoProps
}: Props): ReactElement {
  let [isCameraInitialized, setIsCameraInitialized] = useState(false);
  let [isScanAllowed, setIsScanAllowed] = useState(true);
  let [stableConstraints, setStableConstraints] = useState(constraints);
  let [prevDoScan, setPrevDoScan] = useState(doScan);
  let codeReader = useMemo(() => new BrowserMultiFormatReader(), []);
  let videoElement = useRef<HTMLVideoElement>(null);
  let activeStreamRef = useRef<MediaStream | null>(null);
  let onSuccessRef = useRef(onSuccess);
  let onErrorRef = useRef(onError);
  let onLoadRef = useRef(onLoad);
  let constraintsChanged = !deepEqual(stableConstraints, constraints);

  // oxlint-disable react/refs -- Latest callbacks must be visible to an in-flight decode without restarting the camera session
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  onLoadRef.current = onLoad;
  // oxlint-enable react/refs

  if (constraintsChanged) {
    setStableConstraints(constraints);
  }

  if (constraintsChanged || prevDoScan !== doScan) {
    setPrevDoScan(doScan);
    setIsCameraInitialized(false);
    setIsScanAllowed(true);
  }

  useEffect(() => {
    let video = videoElement.current;
    let cancelled = false;
    let stopScan: (() => void) | undefined;

    if (doScan && navigator?.mediaDevices) {
      async function decode() {
        try {
          let text = await decodeBarcodeFromConstraints(
            codeReader,
            videoElement,
            stableConstraints,
            () => cancelled,
            (stream) => {
              if (!cancelled) activeStreamRef.current = stream;
            },
            (stop) => {
              stopScan = stop;
            }
          );

          if (!cancelled && text !== undefined) onSuccessRef.current(text);
        } catch (error) {
          if (cancelled) return;

          stopScan?.();
          stopVideoStream(videoElement.current);
          activeStreamRef.current = null;
          setIsScanAllowed(false);
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- We know for sure that this is an Error
          onErrorRef.current(error as Error);
        }
      }

      void decode();
    } else if (doScan) {
      // oxlint-disable-next-line react/set-state-in-effect -- MediaDevices is checked after mount so SSR and the client paint the same tree
      setIsScanAllowed(false);
      console.warn(`[ReactBarcodeScanner]: ${MEDIA_DEVICES_ERROR_MESSAGE}`);
      onErrorRef.current(new Error(MEDIA_DEVICES_ERROR_MESSAGE));
    }

    return () => {
      cancelled = true;
      stopScan?.();
      activeStreamRef.current = null;
      stopVideoStream(video);
    };
  }, [doScan, stableConstraints, codeReader]);

  let videoProps = useMemo(() => {
    let defaultVideoProps: VideoHTMLAttributes<HTMLVideoElement> = {
      playsInline: true,
      disablePictureInPicture: true,
      muted: true
    };

    if (!passedVideoProps) return defaultVideoProps;

    if (typeof passedVideoProps !== "function") return passedVideoProps;

    return passedVideoProps(defaultVideoProps);
  }, [passedVideoProps]);

  let passedOnLoadedData = videoProps.onLoadedData;
  let handleVideoLoadedData = useCallback<
    NonNullable<VideoHTMLAttributes<HTMLVideoElement>["onLoadedData"]>
  >(
    (event) => {
      passedOnLoadedData?.(event);

      let eventTarget = event.nativeEvent.target;

      if (!(eventTarget instanceof HTMLVideoElement) || !eventTarget.readyState) return;

      if (!activeStreamRef.current || eventTarget.srcObject !== activeStreamRef.current) return;

      if (eventTarget.readyState === eventTarget.HAVE_ENOUGH_DATA) {
        setIsCameraInitialized(true);
        onLoadRef.current?.();
      }
    },
    [passedOnLoadedData]
  );

  return (
    <section className={joinClassNames("rbs:container", containerClassName)}>
      {doScan && isScanAllowed ? (
        <div className={joinClassNames("rbs:video-container", videoContainerClassName)}>
          <video
            {...videoProps}
            ref={videoElement}
            className={joinClassNames(
              "rbs:video",
              stableConstraints.facingMode === "user" ? "rbs:video-mirrored" : undefined,
              videoClassName
            )}
            aria-invalid="false"
            onLoadedData={handleVideoLoadedData}
          />
          {isCameraInitialized ? (
            !!Viewfinder && <Viewfinder className={viewfinderClassName} />
          ) : (
            <CameraLoading
              className={cameraLoadingClassName}
              iconClassName={cameraLoadingIconClassName}
            />
          )}
        </div>
      ) : (
        <CameraOff className={cameraOffClassName} iconClassName={cameraOffIconClassName} />
      )}
    </section>
  );
}
