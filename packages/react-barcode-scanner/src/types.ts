import type { ComponentType, VideoHTMLAttributes } from "react";
import type { FlashlightError } from "./flashlightError";

export interface FlashlightOptions {
  /**
   * Appended after rbs:flashlight-toggle-button.
   */
  className?: string;
  /**
   * aria-label while the flashlight is off. Default is "Turn flashlight on".
   */
  turnOnLabel?: string;
  /**
   * aria-label while the flashlight is on. Default is "Turn flashlight off".
   */
  turnOffLabel?: string;
  /**
   * Called with a FlashlightError when the track has no usable torch, and when
   * both applyConstraints shapes fail on a click or on a re-apply to a new stream.
   */
  onError?: (error: FlashlightError) => void;
}

export interface BarcodeScannerProps {
  /**
   * Scan runs only while the host doScan and the library gate are both true.
   * Failure withdraws the library gate. The video unmounts. Camera-off stays
   * up if doScan remains true. A later attempt needs doScan false then true,
   * constraint values that deepEqual treats as different, or a remount. A new
   * constraints object with the same values does not retry.
   */
  doScan?: boolean;
  /**
   * Camera constraints passed to getUserMedia. Default is a rear camera at 720x720
   * ideal, aspectRatio 1. Passing this prop replaces the whole default.
   */
  constraints?: MediaTrackConstraints;
  /**
   * Callback for retrieving the result
   */
  onSuccess: (text: string) => void;
  /**
   * Called on failure. The library withdraws its gate, the video unmounts, the
   * stream stops, and the camera-off view is shown. Camera-off stays up if
   * doScan remains true. A later attempt needs doScan false then true,
   * constraint values that deepEqual treats as different, or a remount. A new
   * constraints object with the same values does not retry.
   */
  onError: (e?: Error) => void;
  /**
   * Called when the preview has HAVE_ENOUGH_DATA. The loader is then removed.
   */
  onLoad?: () => void;
  /**
   * Rendered over the video after HAVE_ENOUGH_DATA. Default is the built-in overlay.
   * Pass null to hide it. The default overlay joins rbs:viewfinder with
   * viewfinderClassName and draws center crosshairs unless
   * viewfinderCrosshairsDisabled is true. A custom component may take className
   * and withCrosshairs or ignore them.
   */
  Viewfinder?: ComponentType<{ className?: string; withCrosshairs: boolean }> | null;
  /**
   * Appended after rbs:container. Does not replace the default class.
   */
  containerClassName?: string;
  /**
   * Appended after rbs:video-container. Does not replace the default class.
   */
  videoContainerClassName?: string;
  /**
   * Appended after rbs:video. Does not replace the default class.
   */
  videoClassName?: string;
  /**
   * Appended after rbs:camera-loading. Does not replace the default class.
   */
  cameraLoadingClassName?: string;
  /**
   * Appended after rbs:camera-loading-icon. Does not replace the default class.
   */
  cameraLoadingIconClassName?: string;
  /**
   * Appended after rbs:camera-off. Does not replace the default class.
   */
  cameraOffClassName?: string;
  /**
   * Appended after rbs:camera-off-icon. Does not replace the default class.
   */
  cameraOffIconClassName?: string;
  /**
   * Passed to Viewfinder as className. The default overlay appends it after
   * rbs:viewfinder.
   */
  viewfinderClassName?: string;
  /**
   * Passed to Viewfinder as withCrosshairs={!viewfinderCrosshairsDisabled}.
   * The default overlay draws center crosshairs. true hides them. A custom
   * component may take withCrosshairs or ignore it.
   */
  viewfinderCrosshairsDisabled?: boolean;
  /**
   * Props to be passed to the used `<video />` element. An object replaces the default
   * attributes. Loaded-data handling stays with the library so the loader can clear.
   * A function receives the defaults and can extend them.
   *
   * Check `defaultVideoProps` inside `src/index.tsx` to see which props are passed by default.
   */
  videoProps?:
    | VideoHTMLAttributes<HTMLVideoElement>
    | ((
        defaultProps: VideoHTMLAttributes<HTMLVideoElement>
      ) => VideoHTMLAttributes<HTMLVideoElement>);
  /**
   * Opt-in flashlight control. Omit or false keeps the button off. true shows the
   * default button. An object sets class name, ARIA labels, and onError. This prop
   * does not turn the lamp on. The button shows only when the track reports torch
   * support.
   */
  flashlight?: boolean | FlashlightOptions;
}
