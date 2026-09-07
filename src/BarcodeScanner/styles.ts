import type { CSSProperties } from "react";

export const styles = {
  barcodeScannerError: {
    border: "8px #eee solid",
    borderRadius: "10px",
    padding: "2rem"
  } as CSSProperties,
  barcodeScannerErrorSvg: {
    width: "75%",
    height: "75%",
    display: "block",
    opacity: 0.2,
    margin: "0 auto"
  } as CSSProperties,
  container: {
    width: "100%",
    paddingTop: "100%",
    overflow: "hidden",
    position: "relative",
    display: "none"
  } as CSSProperties,
  barcodeScannerVisible: {
    display: "block"
  } as CSSProperties,
  video: {
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "block",
    overflow: "hidden",
    position: "absolute",
    transform: undefined
  } as CSSProperties
};
