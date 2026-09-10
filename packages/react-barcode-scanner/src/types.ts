import type { ComponentType, VideoHTMLAttributes } from "react";

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
   * viewfinderClassName. A custom component may take className or ignore it.
   */
  Viewfinder?: ComponentType<{ className?: string }> | null;
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
}
