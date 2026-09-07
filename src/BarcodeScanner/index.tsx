import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactEventHandler, VideoHTMLAttributes } from "react";
import { FiCameraOff } from "react-icons/fi";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { BarcodeScannerProps as Props } from "../types";
import { styles } from "./styles";
import { decodeBarcodeFromConstraints } from "./utils";

export function BarcodeScanner({
  doScan = true,
  constraints = { facingMode: "environment" },
  onSuccess,
  onError,
  onLoad,
  Viewfinder,
  containerStyle,
  videoContainerStyle,
  videoStyle,
  videoProps: passedVideoProps
}: Props): ReactElement {
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const codeReader = useMemo(() => new BrowserMultiFormatReader(), []);
  const videoElement = useRef<HTMLVideoElement>(null);
  const isShowingDisabledImage = !isCameraInitialized || !doScan;

  useEffect(() => {
    if (!doScan) return;

    if (!navigator?.mediaDevices) {
      const message =
        'Your browser has no support for the MediaDevices API. You could fix this by running "npm i webrtc-adapter"';

      console.warn(`[ReactBarcodeScanner]: ${message}`);
      onError(new Error(message));
      return;
    }

    void decodeBarcodeFromConstraints(codeReader, videoElement, {
      constraints,
      onSuccess,
      onError
    });
  }, [onSuccess, onError, doScan, codeReader, constraints]);

  const videoProps = useMemo(() => {
    const onLoadedData: ReactEventHandler<HTMLVideoElement> = ({ nativeEvent }) => {
      const eventTarget = nativeEvent.target;

      if (!(eventTarget instanceof HTMLVideoElement) || !eventTarget.readyState) return;

      if (eventTarget.readyState === eventTarget.HAVE_ENOUGH_DATA) {
        setIsCameraInitialized(true);
        onLoad?.();
      }
    };

    const defaultVideoProps: VideoHTMLAttributes<HTMLVideoElement> = {
      playsInline: true,
      disablePictureInPicture: true,
      muted: true,
      onLoadedData,
      style: {
        ...styles.video,
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
        <div style={styles.barcodeScannerError}>
          <FiCameraOff size={300} style={styles.barcodeScannerErrorSvg} />
        </div>
      )}
      <div
        style={{
          ...styles.container,
          ...(!isShowingDisabledImage ? styles.barcodeScannerVisible : {}),
          ...videoContainerStyle
        }}
      >
        <video ref={videoElement} {...videoProps} aria-invalid="false" />
        {!!Viewfinder && <Viewfinder />}
      </div>
    </section>
  );
}
