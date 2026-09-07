import type { CSSProperties, ReactElement, VideoHTMLAttributes } from "react";

export interface BarcodeScannerProps {
  /**
   * Controls whether the scanner should be scanning or not
   */
  doScan?: boolean;
  /**
   * Media track constraints object, to specify which camera and capabilities to use.
   * By default, an object with `facingMode: 'environment'` is passed
   */
  constraints?: MediaTrackConstraints;
  /**
   * Callback for retrieving the result
   */
  onSuccess: (text: string) => void;
  /**
   * Callback for retrieving the error when one occurs
   */
  onError: (e?: Error) => void;
  /**
   * Callback for when the video feed has been loaded
   */
  onLoad?: () => void;
  /**
   * Property that represents the viewfinder component
   */
  Viewfinder?: () => ReactElement | null;
  /**
   * Property that represents a style for the wrapping container
   */
  containerStyle?: CSSProperties;
  /**
   * Property that represents a style for the video container
   */
  videoContainerStyle?: CSSProperties;
  /**
   * Property that represents a style for the video
   */
  videoStyle?: CSSProperties;
  /**
   * Props to be passed to the used `<video />` element. Can either be an object to completely override
   * the existing behavior, or a function to make the changes additive.
   *
   * Check `defaultVideoProps` inside `index.js` file to see which props are passed by default.
   */
  videoProps?:
    | VideoHTMLAttributes<HTMLVideoElement>
    | ((
        defaultProps: VideoHTMLAttributes<HTMLVideoElement>
      ) => VideoHTMLAttributes<HTMLVideoElement>);
}
