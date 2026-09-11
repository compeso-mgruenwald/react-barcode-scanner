import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, VideoHTMLAttributes } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { CameraLoading } from "./components/CameraLoading";
import { CameraOff } from "./components/CameraOff";
import { FlashlightToggleButton } from "./components/FlashlightToggleButton";
import { Viewfinder as DefaultViewfinder } from "./components/Viewfinder";
import { FlashlightError } from "./flashlightError";
import type { BarcodeScannerProps as Props } from "./types";
import { decodeBarcodeFromConstraints, stopVideoStream } from "./utils/decodeBarcode";
import { deepEqual } from "./utils/deepEqual";
import { joinClassNames } from "./utils/joinClassNames";
import { applyTorchConstraint, describeTorchCapability, turnOffLiveTorch } from "./utils/torch";
import "./index.css";

export type { BarcodeScannerProps, FlashlightOptions } from "./types";
export * from "./flashlightError";

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
  viewfinderCrosshairsDisabled,
  videoProps: passedVideoProps,
  flashlight
}: Props): ReactElement {
  let [isCameraInitialized, setIsCameraInitialized] = useState(false);
  let [isScanAllowed, setIsScanAllowed] = useState(true);
  let [stableConstraints, setStableConstraints] = useState(constraints);
  let [prevDoScan, setPrevDoScan] = useState(doScan);
  let [isFlashlightOn, setIsFlashlightOn] = useState(false);
  let [isTorchSupported, setIsTorchSupported] = useState(false);
  let codeReader = useMemo(() => new BrowserMultiFormatReader(), []);
  let videoElement = useRef<HTMLVideoElement>(null);
  let activeStreamRef = useRef<MediaStream | null>(null);
  let videoTrackRef = useRef<MediaStreamTrack | null>(null);
  let onSuccessRef = useRef(onSuccess);
  let onErrorRef = useRef(onError);
  let onLoadRef = useRef(onLoad);
  let withFlashlightRef = useRef(false);
  let onTorchErrorRef = useRef<((error: FlashlightError) => void) | undefined>(undefined);
  let isFlashlightOnRef = useRef(false);
  let isToggleInFlightRef = useRef(false);
  let constraintsChanged = !deepEqual(stableConstraints, constraints);
  let withFlashlight = flashlight === true || typeof flashlight === "object";
  let flashlightConfig = typeof flashlight === "object" ? flashlight : undefined;

  // oxlint-disable react/refs -- Latest callbacks must be visible to an in-flight decode without restarting the camera session
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  onLoadRef.current = onLoad;
  withFlashlightRef.current = withFlashlight;
  onTorchErrorRef.current = flashlightConfig?.onError;
  isFlashlightOnRef.current = isFlashlightOn;
  // oxlint-enable react/refs

  if (constraintsChanged) {
    setStableConstraints(constraints);
  }

  if (constraintsChanged || prevDoScan !== doScan) {
    setPrevDoScan(doScan);
    setIsCameraInitialized(false);
    setIsScanAllowed(true);
  }

  let checkTorchSupport = useCallback(
    async (track: MediaStreamTrack | undefined, isCancelled: () => boolean) => {
      let capability = await describeTorchCapability(track);
      if (isCancelled() || videoTrackRef.current !== track) return;
      if (!withFlashlightRef.current) return;

      if (!capability.isSupported) {
        setIsTorchSupported(false);
        onTorchErrorRef.current?.(capability.reason);
        return;
      }

      if (!isFlashlightOnRef.current) {
        setIsTorchSupported(true);
        return;
      }

      try {
        await applyTorchConstraint(capability.track, true);
        if (isCancelled() || videoTrackRef.current !== track || !withFlashlightRef.current) {
          turnOffLiveTorch(capability.track);
          return;
        }
        setIsTorchSupported(true);
      } catch {
        if (isCancelled() || videoTrackRef.current !== track) return;
        if (!withFlashlightRef.current) return;
        onTorchErrorRef.current?.(FlashlightError.ConstraintApplyFailed);
        isFlashlightOnRef.current = false;
        setIsFlashlightOn(false);
        setIsTorchSupported(true);
      }
    },
    []
  );

  let handleFlashlightToggle = useCallback(async () => {
    if (isToggleInFlightRef.current) return;

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The button only renders after a live track reported torch support
    let track = videoTrackRef.current as MediaStreamTrack;
    let isEnabled = !isFlashlightOnRef.current;
    isToggleInFlightRef.current = true;

    try {
      await applyTorchConstraint(track, isEnabled);
      isFlashlightOnRef.current = isEnabled;
      setIsFlashlightOn(isEnabled);
    } catch {
      onTorchErrorRef.current?.(FlashlightError.ConstraintApplyFailed);
    } finally {
      isToggleInFlightRef.current = false;
    }
  }, []);

  let releaseCamera = useCallback((video: HTMLVideoElement | null) => {
    if (withFlashlightRef.current) {
      turnOffLiveTorch(videoTrackRef.current);
    }

    stopVideoStream(video);
    activeStreamRef.current = null;
    videoTrackRef.current = null;
    setIsTorchSupported(false);
  }, []);

  useEffect(() => {
    if (!withFlashlight) {
      turnOffLiveTorch(videoTrackRef.current);
      // oxlint-disable-next-line react/set-state-in-effect -- Turning the prop off must hide the button and drop the last toggle without restarting the camera
      setIsTorchSupported(false);
      setIsFlashlightOn(false);
      isFlashlightOnRef.current = false;
      return;
    }

    let track = videoTrackRef.current;
    if (track) {
      void checkTorchSupport(track, () => false);
    }
  }, [withFlashlight, checkTorchSupport]);

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
              if (!cancelled) {
                activeStreamRef.current = stream;
                videoTrackRef.current = stream.getVideoTracks()[0];

                if (withFlashlightRef.current) {
                  void checkTorchSupport(videoTrackRef.current, () => cancelled);
                }
              }
            },
            (stop) => {
              stopScan = stop;
            }
          );

          if (!cancelled && text !== undefined) onSuccessRef.current(text);
        } catch (error) {
          if (cancelled) return;

          stopScan?.();
          releaseCamera(videoElement.current);
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
      releaseCamera(video);
    };
  }, [doScan, stableConstraints, codeReader, checkTorchSupport, releaseCamera]);

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
              stableConstraints.facingMode === "user" && "rbs:video-mirrored",
              videoClassName
            )}
            aria-invalid="false"
            onLoadedData={handleVideoLoadedData}
          />
          {isCameraInitialized ? (
            !!Viewfinder && (
              <Viewfinder
                className={viewfinderClassName}
                withCrosshairs={!viewfinderCrosshairsDisabled}
              />
            )
          ) : (
            <CameraLoading
              className={cameraLoadingClassName}
              iconClassName={cameraLoadingIconClassName}
            />
          )}
          {withFlashlight && isTorchSupported && (
            <FlashlightToggleButton
              isOn={isFlashlightOn}
              onToggle={handleFlashlightToggle}
              className={flashlightConfig?.className}
              turnOnLabel={flashlightConfig?.turnOnLabel}
              turnOffLabel={flashlightConfig?.turnOffLabel}
            />
          )}
        </div>
      ) : (
        <CameraOff className={cameraOffClassName} iconClassName={cameraOffIconClassName} />
      )}
    </section>
  );
}
