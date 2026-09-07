import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, VideoHTMLAttributes } from "react";
import { FiCameraOff } from "react-icons/fi";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { BarcodeScannerProps as Props } from "../types";
import { STYLES } from "./styles";
import { decodeBarcodeFromConstraints } from "./utils";

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
  let codeReader = useMemo(() => new BrowserMultiFormatReader(), []);
  let videoElement = useRef<HTMLVideoElement>(null);
  let isShowingDisabledImage = !isCameraInitialized || !doScan;

  useEffect(() => {
    if (!doScan) return;

    if (!navigator?.mediaDevices) {
      console.warn(`[ReactBarcodeScanner]: ${MEDIA_DEVICES_ERROR_MESSAGE}`);
      onError(new Error(MEDIA_DEVICES_ERROR_MESSAGE));
      return;
    }

    void decodeBarcodeFromConstraints(codeReader, videoElement, {
      constraints,
      onSuccess,
      onError
    });
  }, [onSuccess, onError, doScan, codeReader, constraints]);

  let videoProps = useMemo(() => {
    let defaultVideoProps: VideoHTMLAttributes<HTMLVideoElement> = {
      playsInline: true,
      disablePictureInPicture: true,
      muted: true,
      onLoadedData: ({ nativeEvent }) => {
        let eventTarget = nativeEvent.target;

        if (!(eventTarget instanceof HTMLVideoElement) || !eventTarget.readyState) return;

        if (eventTarget.readyState === eventTarget.HAVE_ENOUGH_DATA) {
          setIsCameraInitialized(true);
          onLoad?.();
        }
      },
      style: {
        ...STYLES.video,
        ...videoStyle,
        transform: `${videoStyle?.transform ?? ""} ${constraints.facingMode === "user" ? "scaleX(-1)" : ""}`
      }
    };

    if (!passedVideoProps) return defaultVideoProps;

    if (typeof passedVideoProps !== "function") return passedVideoProps;

    return passedVideoProps(defaultVideoProps);
  }, [constraints.facingMode, onLoad, passedVideoProps, videoStyle]);

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
