import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, VideoHTMLAttributes } from "react";
import { FiCameraOff } from "react-icons/fi";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { BarcodeScannerProps as Props } from "../types";
import { deepEqual } from "./deepEqual";
import { STYLES } from "./styles";
import { decodeBarcodeFromConstraints, stopVideoStream } from "./utils";

const DEFAULT_CONSTRAINTS: MediaTrackConstraints = { facingMode: "environment" };
export const MEDIA_DEVICES_ERROR_MESSAGE: string =
  'Your browser has no support for the MediaDevices API. You could fix this by running "npm i webrtc-adapter"';
const CAMERA_OFF_ICON_SIZE = 300;

export function BarcodeScanner({
  doScan = true,
  constraints = DEFAULT_CONSTRAINTS,
  onSuccess,
  onError,
  onLoad,
  Viewfinder,
  containerStyle,
  videoContainerStyle,
  videoStyle,
  videoProps: passedVideoProps
}: Props): ReactElement {
  let [isCameraInitialized, setIsCameraInitialized] = useState(false);
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
  }

  let isShowingDisabledImage = !isCameraInitialized || !doScan;

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
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- We know for sure that this is an Error
          if (!cancelled) onErrorRef.current(error as Error);
        }
      }

      void decode();
    } else if (doScan) {
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
      muted: true,
      onLoadedData: ({ nativeEvent }) => {
        let eventTarget = nativeEvent.target;

        if (!(eventTarget instanceof HTMLVideoElement) || !eventTarget.readyState) return;

        if (!activeStreamRef.current || eventTarget.srcObject !== activeStreamRef.current) return;

        if (eventTarget.readyState === eventTarget.HAVE_ENOUGH_DATA) {
          setIsCameraInitialized(true);
          onLoadRef.current?.();
        }
      },
      style: {
        ...STYLES.video,
        ...videoStyle,
        transform: `${videoStyle?.transform ?? ""} ${stableConstraints.facingMode === "user" ? "scaleX(-1)" : ""}`
      }
    };

    if (!passedVideoProps) return defaultVideoProps;

    if (typeof passedVideoProps !== "function") return passedVideoProps;

    // oxlint-disable-next-line react/refs -- onLoadedData reads onLoadRef; passing defaults to videoProps is not a render-time ref read
    return passedVideoProps(defaultVideoProps);
  }, [stableConstraints.facingMode, passedVideoProps, videoStyle]);

  return (
    <section style={containerStyle}>
      {isShowingDisabledImage && (
        <div style={STYLES.barcodeScannerError}>
          <FiCameraOff size={CAMERA_OFF_ICON_SIZE} style={STYLES.barcodeScannerErrorSvg} />
        </div>
      )}
      <div
        style={{
          ...STYLES.container,
          ...(!isShowingDisabledImage ? STYLES.barcodeScannerVisible : {}),
          ...videoContainerStyle
        }}
      >
        <video ref={videoElement} {...videoProps} aria-invalid="false" />
        {!!Viewfinder && <Viewfinder />}
      </div>
    </section>
  );
}
