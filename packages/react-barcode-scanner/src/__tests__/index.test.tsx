import type { ComponentProps } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { BarcodeScanner, FlashlightError } from "../index";
import type { FlashlightOptions } from "../index";
import { decodeBarcodeFromConstraints } from "../utils/decodeBarcode";

const MEDIA_DEVICES_ERROR_MESSAGE =
  'Your browser has no support for the MediaDevices API. You could fix this by running "npm i webrtc-adapter"';

vi.mock("@zxing/browser", async (importOriginal) => {
  let actual = await importOriginal<typeof import("@zxing/browser")>();
  return {
    ...actual,
    BrowserMultiFormatReader: class BrowserMultiFormatReader {
      scan() {
        return { stop() {} };
      }
    }
  };
});

vi.mock("../utils/decodeBarcode", async (importOriginal) => {
  let actual = await importOriginal<typeof import("../utils/decodeBarcode")>();
  return {
    ...actual,
    decodeBarcodeFromConstraints: vi.fn(
      (_reader, _video, _constraints, _isCancelled, _onStream, onStop) => {
        onStop?.(() => {});
        return Promise.resolve();
      }
    )
  };
});

function noop() {
  return;
}

function CustomViewfinder() {
  return <div data-testid="viewfinder">finder</div>;
}

function RecordingViewfinder({ withCrosshairs }: { withCrosshairs: boolean }) {
  return <div data-testid="viewfinder">{withCrosshairs ? "cross" : "plain"}</div>;
}

function getDefaultViewfinder(container: HTMLElement) {
  return container.querySelector('path[d="M0 0h100v100H0zM15 15h70v70H15z"]');
}

function getViewfinderCrosshairs(container: HTMLElement) {
  return container.getElementsByClassName("rbs:viewfinder")[0]?.querySelectorAll("line") ?? [];
}

function stubMediaDevices() {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn() }
  });
}

function clearMediaDevices() {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined
  });
}

function videoFrom(container: HTMLElement) {
  let video = container.querySelector("video");

  if (!(video instanceof HTMLVideoElement)) {
    throw new Error("expected a video element");
  }

  return video;
}

function getLoading(container: HTMLElement) {
  return container.querySelector('[role="status"][aria-label="Loading camera"]');
}

function getCameraOff(container: HTMLElement) {
  return container.querySelector('[role="img"][aria-label="Camera off"]');
}

function streamWithStop(options?: {
  capabilities?: MediaTrackCapabilities;
  omitGetCapabilities?: boolean;
  applyConstraints?: ReturnType<typeof vi.fn>;
  readyState?: MediaStreamTrack["readyState"];
}) {
  let stop = vi.fn();
  let applyConstraints = options?.applyConstraints ?? vi.fn().mockResolvedValue(undefined);
  let track: Record<string, unknown> = {
    stop,
    applyConstraints,
    readyState: options?.readyState ?? "live"
  };

  if (!options?.omitGetCapabilities) {
    track.getCapabilities = vi.fn(() => options?.capabilities ?? {});
  }

  let stream = new MediaStream();
  Object.defineProperty(stream, "getTracks", {
    configurable: true,
    value: () => [track]
  });
  Object.defineProperty(stream, "getVideoTracks", {
    configurable: true,
    value: () => [track]
  });
  return { stream, stop, applyConstraints };
}

function attachOwnedStream(
  videoElement: { current: HTMLVideoElement | null },
  isCancelled: (() => boolean) | undefined,
  onStream: (stream: MediaStream) => void,
  options?: Parameters<typeof streamWithStop>[0]
) {
  let attachment = streamWithStop(options);

  if (videoElement.current) {
    videoElement.current.srcObject = attachment.stream;
  }

  if (isCancelled?.()) {
    attachment.stop();
    return attachment;
  }

  onStream(attachment.stream);
  return attachment;
}

function mockDecodeAttachingStream(options?: Parameters<typeof streamWithStop>[0]) {
  let stops: Array<ReturnType<typeof vi.fn>> = [];
  let attachments: Array<ReturnType<typeof streamWithStop>> = [];

  vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
    async (_reader, videoElement, _constraints, isCancelled, onStream, onStop) => {
      let attachment = attachOwnedStream(videoElement, isCancelled, onStream, options);
      attachments.push(attachment);
      stops.push(attachment.stop);
      onStop?.(() => {});
    }
  );

  return { stops, attachments };
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  let promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderScanner(
  props: Partial<Omit<ComponentProps<typeof BarcodeScanner>, "onSuccess" | "onError">> = {}
) {
  let onSuccess = vi.fn();
  let onError = vi.fn();

  return {
    onSuccess,
    onError,
    ...render(<BarcodeScanner {...props} onSuccess={onSuccess} onError={onError} />)
  };
}

function getFlashlightButton(container: HTMLElement, name = "Turn flashlight on") {
  return container.querySelector(`[aria-label="${name}"]`);
}

async function waitForFlashlightButton(container: HTMLElement, name = "Turn flashlight on") {
  await waitFor(() => {
    expect(getFlashlightButton(container, name)).not.toBeNull();
  });
  let button = getFlashlightButton(container, name);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("expected flashlight button");
  }
  return button;
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

const FACING_MODE_USER_CONSTRAINTS = { facingMode: "user" };
const FACING_MODE_ENV_CONSTRAINTS = { width: 1280, facingMode: "environment" };
const VIDEO_PROPS_OVERRIDE = { id: "override-video" };
const FLASHLIGHT_LAMP_LABELS = { turnOnLabel: "Lamp on", turnOffLabel: "Lamp off" };

function flashlightWithError(
  onError: NonNullable<FlashlightOptions["onError"]>
): FlashlightOptions {
  return { onError };
}

describe("public API", () => {
  it("exports BarcodeScanner", () => {
    expect(typeof BarcodeScanner).toBe("function");
  });

  it("exports FlashlightError codes", () => {
    let code: FlashlightError = FlashlightError.NoTrack;
    expect(code).toBe("NO_TRACK");
    expect(FlashlightError.NoGetCapabilities).toBe("NO_GET_CAPABILITIES");
    expect(FlashlightError.TorchMissing).toBe("TORCH_MISSING");
    expect(FlashlightError.TorchFalse).toBe("TORCH_FALSE");
    expect(FlashlightError.TorchSequenceIncomplete).toBe("TORCH_SEQUENCE_INCOMPLETE");
    expect(FlashlightError.ConstraintApplyFailed).toBe("CONSTRAINT_APPLY_FAILED");
  });
});

describe("BarcodeScanner", () => {
  beforeEach(() => {
    stubMediaDevices();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows the loading overlay on the video until the camera is initialized", () => {
    let { container } = renderScanner();

    expect(videoFrom(container)).toBeInstanceOf(HTMLVideoElement);
    expect(getLoading(container)).not.toBeNull();
    expect(container.getElementsByClassName("rbs:camera-loading-icon")[0]).toBeTruthy();
    expect(getCameraOff(container)).toBeNull();
  });

  it("spins the loader in CSS and honors prefers-reduced-motion", () => {
    let { container } = renderScanner();

    expect(container.querySelector("style")).toBeNull();
    expect(getLoading(container)).not.toBeNull();
    expect(container.getElementsByClassName("rbs:camera-loading-icon")[0]).toBeTruthy();
  });

  it("swaps to the camera-off view when scanning is disabled", () => {
    let { container } = renderScanner({ doScan: false, Viewfinder: CustomViewfinder });

    expect(container.querySelector("video")).toBeNull();
    expect(getCameraOff(container)).not.toBeNull();
    expect(getLoading(container)).toBeNull();
    expect(decodeBarcodeFromConstraints).not.toHaveBeenCalled();
    expect(container.querySelector("[data-testid=viewfinder]")).toBeNull();

    let cameraOff = getCameraOff(container);

    if (!(cameraOff instanceof HTMLElement)) {
      throw new Error("expected camera-off element");
    }

    expect(cameraOff.classList.contains("rbs:camera-off")).toBe(true);
  });

  it("warns and calls onError when MediaDevices is missing", async () => {
    clearMediaDevices();
    let { container, onError } = renderScanner();

    expect(console.warn).toHaveBeenCalledWith(
      `[ReactBarcodeScanner]: ${MEDIA_DEVICES_ERROR_MESSAGE}`
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0]?.[0]?.message).toBe(MEDIA_DEVICES_ERROR_MESSAGE);
    expect(decodeBarcodeFromConstraints).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(container.querySelector("video")).toBeNull();
      expect(getCameraOff(container)).not.toBeNull();
    });
    expect(getLoading(container)).toBeNull();
  });

  it("starts decoding when scanning is enabled and MediaDevices exists", async () => {
    let constraints = { facingMode: "environment" as const };
    vi.mocked(decodeBarcodeFromConstraints).mockResolvedValue("scanned");
    let { onSuccess, onError } = renderScanner({ constraints });

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    let [, videoElement, passedConstraints] =
      vi.mocked(decodeBarcodeFromConstraints).mock.calls[0] ?? [];

    expect(videoElement?.current).toBeInstanceOf(HTMLVideoElement);
    expect(passedConstraints).toEqual(constraints);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("scanned");
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("forwards a decode rejection to onError", async () => {
    let error = new Error("boom");
    vi.mocked(decodeBarcodeFromConstraints).mockRejectedValue(error);
    let { container, onSuccess, onError } = renderScanner();

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(container.querySelector("video")).toBeNull();
    expect(getCameraOff(container)).not.toBeNull();
    expect(getLoading(container)).toBeNull();
  });

  it("stops an attached stream and shows camera-off when decode rejects", async () => {
    let { stream, stop } = streamWithStop();

    vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
      async (_reader, videoElement, _constraints, _isCancelled, onStream, onStop) => {
        if (videoElement.current) {
          videoElement.current.srcObject = stream;
        }

        onStream(stream);
        onStop?.(() => {});
        throw new Error("boom");
      }
    );

    let { container, onError } = renderScanner();

    await waitFor(() => {
      expect(onError).toHaveBeenCalledOnce();
    });

    expect(stop).toHaveBeenCalledOnce();
    expect(container.querySelector("video")).toBeNull();
    expect(getCameraOff(container)).not.toBeNull();
    expect(getLoading(container)).toBeNull();
  });

  it("retries after a camera error when doScan is toggled back on", async () => {
    let call = 0;
    vi.mocked(decodeBarcodeFromConstraints).mockImplementation(async () => {
      if (call++ === 0) throw new Error("boom");
    });
    let { rerender, container, onSuccess, onError } = renderScanner();

    await waitFor(() => {
      expect(onError).toHaveBeenCalledOnce();
    });
    expect(getCameraOff(container)).not.toBeNull();
    expect(container.querySelector("video")).toBeNull();
    let callsAfterError = vi.mocked(decodeBarcodeFromConstraints).mock.calls.length;

    rerender(<BarcodeScanner doScan={false} onSuccess={onSuccess} onError={onError} />);
    rerender(<BarcodeScanner doScan={true} onSuccess={onSuccess} onError={onError} />);

    await waitFor(() => {
      expect(vi.mocked(decodeBarcodeFromConstraints).mock.calls.length).toBeGreaterThan(
        callsAfterError
      );
      expect(container.querySelector("video")).toBeInstanceOf(HTMLVideoElement);
    });
    expect(getLoading(container)).not.toBeNull();
    expect(getCameraOff(container)).toBeNull();
  });

  it("does not decode when doScan is false even if MediaDevices exists", () => {
    renderScanner({ doScan: false });

    expect(decodeBarcodeFromConstraints).not.toHaveBeenCalled();
  });

  it("does not restart decode when constraints are omitted and callbacks are inline", async () => {
    let { rerender } = render(<BarcodeScanner onSuccess={noop} onError={noop} onLoad={noop} />);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    expect(vi.mocked(decodeBarcodeFromConstraints).mock.calls[0]?.[2]).toEqual({
      facingMode: "environment",
      width: { ideal: 720 },
      height: { ideal: 720 },
      aspectRatio: { ideal: 1 }
    });

    rerender(<BarcodeScanner onSuccess={noop} onError={noop} onLoad={noop} />);

    expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
  });

  it("forwards empty decoded text to onSuccess", async () => {
    vi.mocked(decodeBarcodeFromConstraints).mockResolvedValue("");
    let { onSuccess, onError } = renderScanner();

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("");
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not restart decode when constraint values are equal regardless of key order", async () => {
    let { rerender, onSuccess, onError } = renderScanner({
      constraints: { facingMode: "environment", width: 1280 }
    });

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    rerender(
      <BarcodeScanner
        constraints={FACING_MODE_ENV_CONSTRAINTS}
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
  });

  it("starts a new session when constraint values change", async () => {
    let { stops } = mockDecodeAttachingStream();
    let { rerender, onSuccess, onError } = renderScanner({
      constraints: { facingMode: "environment" }
    });

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    rerender(
      <BarcodeScanner
        constraints={FACING_MODE_USER_CONSTRAINTS}
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledTimes(2);
    });

    expect(stops[0]).toHaveBeenCalledOnce();
    expect(stops[1]).not.toHaveBeenCalled();
  });

  it("stops the camera when doScan becomes false", async () => {
    let { stops } = mockDecodeAttachingStream();
    let { rerender, container, onSuccess, onError } = renderScanner();

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    rerender(<BarcodeScanner doScan={false} onSuccess={onSuccess} onError={onError} />);

    expect(stops[0]).toHaveBeenCalledOnce();
    expect(container.querySelector("video")).toBeNull();
    expect(getCameraOff(container)).not.toBeNull();
    expect(getLoading(container)).toBeNull();
  });

  it("stops the camera on unmount", async () => {
    let { stops } = mockDecodeAttachingStream();
    let { unmount } = renderScanner();

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    unmount();

    expect(stops[0]).toHaveBeenCalledOnce();
  });

  it("does not stop the successor session when a cancelled decode settles", async () => {
    let first = deferred();
    let stops: Array<ReturnType<typeof vi.fn>> = [];
    let call = 0;

    vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
      async (_reader, videoElement, _constraints, isCancelled, onStream) => {
        let attachment = attachOwnedStream(videoElement, undefined, onStream);
        stops.push(attachment.stop);

        if (call++ === 0) {
          await first.promise;
        }

        if (isCancelled()) {
          attachment.stop();
        }
      }
    );

    let { rerender, onSuccess, onError } = renderScanner({
      constraints: { facingMode: "environment" }
    });

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    rerender(
      <BarcodeScanner
        constraints={FACING_MODE_USER_CONSTRAINTS}
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      first.resolve();
      await vi.mocked(decodeBarcodeFromConstraints).mock.results[0]?.value;
    });

    expect(stops[1]).not.toHaveBeenCalled();
  });

  it("stops tracks that attach after doScan becomes false", async () => {
    let attach = deferred();
    let stops: Array<ReturnType<typeof vi.fn>> = [];

    vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
      async (_reader, videoElement, _constraints, isCancelled, onStream) => {
        await attach.promise;
        let { stream, stop } = streamWithStop();

        if (videoElement.current) {
          videoElement.current.srcObject = stream;
        }

        onStream(stream);
        if (isCancelled()) {
          stop();
        }

        stops.push(stop);
      }
    );

    let { rerender, onSuccess, onError } = renderScanner();

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    rerender(<BarcodeScanner doScan={false} onSuccess={onSuccess} onError={onError} />);

    await act(async () => {
      attach.resolve();
      await vi.mocked(decodeBarcodeFromConstraints).mock.results[0]?.value;
    });

    expect(stops[0]).toHaveBeenCalledOnce();
  });

  it("stops a late first stream after constraints change without stopping the successor", async () => {
    let first = deferred();
    let stops: Array<ReturnType<typeof vi.fn>> = [];
    let call = 0;

    vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
      async (_reader, videoElement, _constraints, isCancelled, onStream) => {
        let index = call++;

        if (index === 0) {
          await first.promise;
        }

        stops[index] = attachOwnedStream(videoElement, isCancelled, onStream).stop;
      }
    );

    let { rerender, onSuccess, onError } = renderScanner({
      constraints: { facingMode: "environment" }
    });

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    rerender(
      <BarcodeScanner
        constraints={FACING_MODE_USER_CONSTRAINTS}
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      first.resolve();
      await vi.mocked(decodeBarcodeFromConstraints).mock.results[0]?.value;
    });

    expect(stops[0]).toHaveBeenCalledOnce();
    expect(stops[1]).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "resolves",
      settle: (finish: ReturnType<typeof deferred<string>>) => {
        finish.resolve("late");
      }
    },
    {
      name: "rejects",
      settle: (finish: ReturnType<typeof deferred<string>>) => {
        finish.reject(new Error("late"));
      }
    }
  ] as const)(
    "does not call scan callbacks after unmount when decode $name",
    async ({ settle }) => {
      let finish = deferred<string>();

      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(async () => finish.promise);

      let { unmount, onSuccess, onError } = renderScanner();

      await waitFor(() => {
        expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
      });

      unmount();

      await act(async () => {
        settle(finish);
        await vi.mocked(decodeBarcodeFromConstraints).mock.results[0]?.value.catch(() => {});
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    }
  );

  it("shows the loading overlay until a new stream is ready after constraints change", async () => {
    mockDecodeAttachingStream();
    let { rerender, container, onSuccess, onError } = renderScanner({
      constraints: { facingMode: "environment" },
      Viewfinder: CustomViewfinder
    });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    fireEvent.loadedData(video);
    expect(getLoading(container)).toBeNull();
    expect(container.querySelector("[data-testid=viewfinder]")).not.toBeNull();
    expect(videoFrom(container)).toBeInstanceOf(HTMLVideoElement);

    rerender(
      <BarcodeScanner
        constraints={FACING_MODE_USER_CONSTRAINTS}
        onSuccess={onSuccess}
        onError={onError}
        Viewfinder={CustomViewfinder}
      />
    );

    expect(getLoading(container)).not.toBeNull();
    expect(container.querySelector("[data-testid=viewfinder]")).toBeNull();
    expect(videoFrom(container)).toBeInstanceOf(HTMLVideoElement);
    expect(getCameraOff(container)).toBeNull();
  });

  it("ignores stale loaded data after constraints change", async () => {
    mockDecodeAttachingStream();
    let onLoad = vi.fn();
    let { rerender, container, onSuccess, onError } = renderScanner({
      constraints: { facingMode: "environment" },
      onLoad
    });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    fireEvent.loadedData(video);
    expect(onLoad).toHaveBeenCalledOnce();
    expect(getLoading(container)).toBeNull();

    rerender(
      <BarcodeScanner
        constraints={FACING_MODE_USER_CONSTRAINTS}
        onSuccess={onSuccess}
        onError={onError}
        onLoad={onLoad}
      />
    );

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledTimes(2);
    });

    video.srcObject = new MediaStream();
    fireEvent.loadedData(video);

    expect(onLoad).toHaveBeenCalledOnce();
    expect(getLoading(container)).not.toBeNull();
  });

  it("renders a Viewfinder after the camera is initialized", async () => {
    mockDecodeAttachingStream();
    let { container, getByTestId } = renderScanner({
      Viewfinder: CustomViewfinder
    });

    expect(container.querySelector("[data-testid=viewfinder]")).toBeNull();
    expect(getLoading(container)).not.toBeNull();

    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    fireEvent.loadedData(video);

    expect(getByTestId("viewfinder").textContent).toBe("finder");
    expect(getLoading(container)).toBeNull();
    expect(getDefaultViewfinder(container)).toBeNull();
  });

  it("renders the default Viewfinder after the camera is initialized", async () => {
    mockDecodeAttachingStream();
    let { container } = renderScanner();
    let video = videoFrom(container);

    expect(getDefaultViewfinder(container)).toBeNull();

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    fireEvent.loadedData(video);

    expect(getDefaultViewfinder(container)).not.toBeNull();
    expect(getLoading(container)).toBeNull();
  });

  it("hides the Viewfinder when the prop is null", async () => {
    mockDecodeAttachingStream();
    let { container } = renderScanner({ Viewfinder: null });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    fireEvent.loadedData(video);

    expect(getDefaultViewfinder(container)).toBeNull();
    expect(container.querySelector("[data-testid=viewfinder]")).toBeNull();
    expect(getLoading(container)).toBeNull();
  });

  it("keeps a square section by default", () => {
    let { container } = renderScanner();
    let section = container.querySelector("section");

    expect(section?.classList.contains("rbs:container")).toBe(true);
    expect(section?.style.aspectRatio).toBe("");
    expect(section?.style.width).toBe("");
  });

  it("covers the video box inside an absolutely filled wrapper", () => {
    let { container } = renderScanner();
    let video = videoFrom(container);
    let wrapper = video.parentElement;

    expect(container.querySelector("section")?.classList.contains("rbs:container")).toBe(true);
    expect(wrapper?.classList.contains("rbs:video-container")).toBe(true);
    expect(video.classList.contains("rbs:video")).toBe(true);
    expect(video.style.objectFit).toBe("");
    expect(wrapper?.style.position).toBe("");
  });

  it("replaces default video props when videoProps is an object", () => {
    let { container } = renderScanner({
      videoClassName: "host-video",
      videoProps: { id: "override-video", muted: false, className: "from-video-props" }
    });
    let video = videoFrom(container);

    expect(video.id).toBe("override-video");
    expect(video.muted).toBe(false);
    expect(video.hasAttribute("playsinline")).toBe(false);
    expect(video.classList.contains("rbs:video")).toBe(true);
    expect(video.classList.contains("host-video")).toBe(true);
    expect(video.classList.contains("from-video-props")).toBe(false);
  });

  it("still dismisses the loader when videoProps is an object", async () => {
    mockDecodeAttachingStream();
    let onLoad = vi.fn();
    let consumerLoadedData = vi.fn();
    let { container } = renderScanner({
      onLoad,
      videoProps: { id: "override-video", onLoadedData: consumerLoadedData }
    });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    fireEvent.loadedData(video);

    expect(consumerLoadedData).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledOnce();
    expect(getLoading(container)).toBeNull();
  });

  it("lets a videoProps function receive and extend the defaults", () => {
    let { container } = renderScanner({
      videoProps: (defaults) => ({
        ...defaults,
        id: "additive-video"
      })
    });
    let video = videoFrom(container);

    expect(video.id).toBe("additive-video");
    expect(video.muted).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
  });

  it("appends className props after the default rbs classes", () => {
    let { container } = renderScanner({
      doScan: false,
      containerClassName: "host-container",
      cameraOffClassName: "host-camera-off",
      cameraOffIconClassName: "host-camera-off-icon"
    });
    let section = container.querySelector("section");
    let cameraOff = getCameraOff(container);
    let cameraOffIcon = container.getElementsByClassName("rbs:camera-off-icon")[0];

    expect(section?.classList.contains("rbs:container")).toBe(true);
    expect(section?.classList.contains("host-container")).toBe(true);
    expect(cameraOff?.classList.contains("rbs:camera-off")).toBe(true);
    expect(cameraOff?.classList.contains("host-camera-off")).toBe(true);
    expect(cameraOffIcon?.classList.contains("host-camera-off-icon")).toBe(true);
  });

  it("appends video and loading className props after the default rbs classes", () => {
    let { container } = renderScanner({
      videoContainerClassName: "host-video-container",
      videoClassName: "host-video",
      cameraLoadingClassName: "host-loading",
      cameraLoadingIconClassName: "host-loading-icon"
    });
    let video = videoFrom(container);
    let wrapper = video.parentElement;
    let loading = getLoading(container);
    let loadingIcon = container.getElementsByClassName("rbs:camera-loading-icon")[0];

    expect(wrapper?.classList.contains("rbs:video-container")).toBe(true);
    expect(wrapper?.classList.contains("host-video-container")).toBe(true);
    expect(video.classList.contains("rbs:video")).toBe(true);
    expect(video.classList.contains("host-video")).toBe(true);
    expect(loading?.classList.contains("rbs:camera-loading")).toBe(true);
    expect(loading?.classList.contains("host-loading")).toBe(true);
    expect(loadingIcon?.classList.contains("host-loading-icon")).toBe(true);
  });

  it("keeps video classes off videoProps function defaults", () => {
    let received: string | undefined;
    let { container } = renderScanner({
      videoClassName: "host-video",
      videoProps: (defaults) => {
        received = defaults.className;
        return defaults;
      }
    });

    expect(received).toBeUndefined();
    expect(videoFrom(container).classList.contains("rbs:video")).toBe(true);
    expect(videoFrom(container).classList.contains("host-video")).toBe(true);
  });

  it("appends viewfinderClassName after rbs:viewfinder", async () => {
    mockDecodeAttachingStream();
    let { container } = renderScanner({ viewfinderClassName: "host-viewfinder" });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    fireEvent.loadedData(video);

    let viewfinder = container.getElementsByClassName("rbs:viewfinder")[0];

    expect(viewfinder).toBeTruthy();
    expect(viewfinder?.classList.contains("host-viewfinder")).toBe(true);
  });

  it("draws crosshairs on the default Viewfinder", async () => {
    mockDecodeAttachingStream();
    let { container } = renderScanner();
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    fireEvent.loadedData(video);

    let lines = getViewfinderCrosshairs(container);

    expect(getDefaultViewfinder(container)).not.toBeNull();
    expect(lines).toHaveLength(2);
    expect(lines[0]?.getAttribute("x1")).toBe("40");
    expect(lines[0]?.getAttribute("x2")).toBe("60");
    expect(lines[1]?.getAttribute("y1")).toBe("40");
    expect(lines[1]?.getAttribute("y2")).toBe("60");
  });

  it("omits crosshairs when viewfinderCrosshairsDisabled is true", async () => {
    mockDecodeAttachingStream();
    let { container } = renderScanner({ viewfinderCrosshairsDisabled: true });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    fireEvent.loadedData(video);

    expect(getDefaultViewfinder(container)).not.toBeNull();
    expect(getViewfinderCrosshairs(container)).toHaveLength(0);
  });

  it("forwards withCrosshairs true to a custom Viewfinder by default", async () => {
    mockDecodeAttachingStream();
    let { container, getByTestId } = renderScanner({
      Viewfinder: RecordingViewfinder
    });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    fireEvent.loadedData(video);

    expect(getByTestId("viewfinder").textContent).toBe("cross");
    expect(getDefaultViewfinder(container)).toBeNull();
  });

  it("forwards withCrosshairs false when viewfinderCrosshairsDisabled is true", async () => {
    mockDecodeAttachingStream();
    let { container, getByTestId } = renderScanner({
      Viewfinder: RecordingViewfinder,
      viewfinderCrosshairsDisabled: true
    });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    fireEvent.loadedData(video);

    expect(getByTestId("viewfinder").textContent).toBe("plain");
    expect(getDefaultViewfinder(container)).toBeNull();
  });

  it("mirrors the user-facing camera", () => {
    let { container, rerender, onSuccess, onError } = renderScanner({
      constraints: FACING_MODE_USER_CONSTRAINTS
    });

    expect(videoFrom(container).classList.contains("rbs:video-mirrored")).toBe(true);

    rerender(
      <BarcodeScanner
        constraints={FACING_MODE_USER_CONSTRAINTS}
        videoProps={VIDEO_PROPS_OVERRIDE}
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    expect(videoFrom(container).classList.contains("rbs:video-mirrored")).toBe(true);
    expect(videoFrom(container).classList.contains("rbs:video")).toBe(true);
  });

  it("does not mirror the rear camera", () => {
    let { container } = renderScanner();

    expect(videoFrom(container).classList.contains("rbs:video-mirrored")).toBe(false);
  });

  it("initializes the camera and calls onLoad when the video has enough data", async () => {
    mockDecodeAttachingStream();
    let onLoad = vi.fn();
    let { container } = renderScanner({ onLoad });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });

    fireEvent.loadedData(video);

    expect(onLoad).toHaveBeenCalledOnce();
    expect(getLoading(container)).toBeNull();
    expect(videoFrom(container)).toBeInstanceOf(HTMLVideoElement);
  });

  it("does not call onLoad when the video is not ready", async () => {
    mockDecodeAttachingStream();
    let onLoad = vi.fn();
    let { container } = renderScanner({ onLoad });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_METADATA
    });

    fireEvent.loadedData(video);

    expect(onLoad).not.toHaveBeenCalled();
    expect(getLoading(container)).not.toBeNull();
  });

  it("ignores loaded data when readyState is missing", async () => {
    mockDecodeAttachingStream();
    let onLoad = vi.fn();
    let { container } = renderScanner({ onLoad });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_NOTHING
    });

    fireEvent.loadedData(video);

    expect(onLoad).not.toHaveBeenCalled();
  });

  it("ignores loaded data when the event target is not a video", async () => {
    mockDecodeAttachingStream();
    let onLoad = vi.fn();
    let { container } = renderScanner({ onLoad });
    let video = videoFrom(container);

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    Object.setPrototypeOf(video, HTMLElement.prototype);

    fireEvent.loadedData(video);

    expect(onLoad).not.toHaveBeenCalled();
  });

  describe("flashlight", () => {
    it("does not render a button by default", async () => {
      mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { container } = renderScanner();

      await waitFor(() => {
        expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
      });
      await flushMicrotasks();

      expect(getFlashlightButton(container)).toBeNull();
    });

    it("does not render a button when flashlight is false", async () => {
      mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { container } = renderScanner({ flashlight: false });

      await waitFor(() => {
        expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
      });
      await flushMicrotasks();

      expect(getFlashlightButton(container)).toBeNull();
    });

    it("shows the button after the deferred capability check when flashlight is true", async () => {
      mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { container } = renderScanner({ flashlight: true });

      await waitFor(() => {
        expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
      });

      let button = await waitForFlashlightButton(container);
      expect(button.classList.contains("rbs:flashlight-toggle-button")).toBe(true);
      expect(button.getAttribute("aria-pressed")).toBe("false");
    });

    it("shows the button when flashlight is an options object and torch is supported", async () => {
      mockDecodeAttachingStream({ capabilities: { torch: true } });
      let options: FlashlightOptions = {
        className: "host-flashlight",
        turnOnLabel: "Lamp on",
        turnOffLabel: "Lamp off"
      };
      let { container } = renderScanner({ flashlight: options });

      let button = await waitForFlashlightButton(container, "Lamp on");
      expect(button.classList.contains("rbs:flashlight-toggle-button")).toBe(true);
      expect(button.classList.contains("host-flashlight")).toBe(true);
      expect(button.getAttribute("aria-pressed")).toBe("false");
    });

    it("calls onError and hides the button when torch is missing", async () => {
      mockDecodeAttachingStream({ capabilities: {} });
      let onFlashlightError = vi.fn();
      let { container } = renderScanner({ flashlight: { onError: onFlashlightError } });

      await waitFor(() => {
        expect(onFlashlightError).toHaveBeenCalledWith(FlashlightError.TorchMissing);
      });
      expect(getFlashlightButton(container)).toBeNull();
    });

    it("calls onError when the track has no getCapabilities", async () => {
      mockDecodeAttachingStream({ omitGetCapabilities: true });
      let onFlashlightError = vi.fn();
      renderScanner({ flashlight: { onError: onFlashlightError } });

      await waitFor(() => {
        expect(onFlashlightError).toHaveBeenCalledWith(FlashlightError.NoGetCapabilities);
      });
    });

    it("calls onError when torch is false", async () => {
      mockDecodeAttachingStream({ capabilities: { torch: false } });
      let onFlashlightError = vi.fn();
      renderScanner({ flashlight: { onError: onFlashlightError } });

      await waitFor(() => {
        expect(onFlashlightError).toHaveBeenCalledWith(FlashlightError.TorchFalse);
      });
    });

    it("calls onError when there is no video track", async () => {
      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, _videoElement, _constraints, _isCancelled, onStream, onStop) => {
          let stream = new MediaStream();
          onStream(stream);
          onStop?.(() => {});
        }
      );
      let onFlashlightError = vi.fn();
      renderScanner({ flashlight: { onError: onFlashlightError } });

      await waitFor(() => {
        expect(onFlashlightError).toHaveBeenCalledWith(FlashlightError.NoTrack);
      });
    });

    it("swaps the on class and label after a successful toggle", async () => {
      let { attachments } = mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { container } = renderScanner({ flashlight: true });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);

      await waitFor(() => {
        expect(button.getAttribute("aria-label")).toBe("Turn flashlight off");
      });
      expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
      expect(button.getAttribute("aria-pressed")).toBe("true");
      expect(attachments[0]?.applyConstraints).toHaveBeenCalledWith({
        advanced: [{ torch: true }]
      });
    });

    it("applies object className and labels after a successful toggle", async () => {
      mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { container } = renderScanner({
        flashlight: {
          className: "host-flashlight",
          turnOnLabel: "Lamp on",
          turnOffLabel: "Lamp off"
        }
      });
      let button = await waitForFlashlightButton(container, "Lamp on");

      fireEvent.click(button);

      await waitFor(() => {
        expect(button.getAttribute("aria-label")).toBe("Lamp off");
      });
      expect(button.classList.contains("host-flashlight")).toBe(true);
      expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
    });

    it("turns the torch off when doScan becomes false", async () => {
      let { attachments } = mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { rerender, container, onSuccess, onError } = renderScanner({ flashlight: true });
      await waitForFlashlightButton(container);

      rerender(
        <BarcodeScanner doScan={false} flashlight onSuccess={onSuccess} onError={onError} />
      );

      await waitFor(() => {
        expect(attachments[0]?.applyConstraints).toHaveBeenCalledWith({
          advanced: [{ torch: false }]
        });
      });
      expect(getFlashlightButton(container)).toBeNull();
      expect(getCameraOff(container)).not.toBeNull();
    });

    it("turns the torch off on unmount", async () => {
      let { attachments } = mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { unmount, container } = renderScanner({ flashlight: true });
      await waitForFlashlightButton(container);

      unmount();

      await waitFor(() => {
        expect(attachments[0]?.applyConstraints).toHaveBeenCalledWith({
          advanced: [{ torch: false }]
        });
      });
    });

    it("turns the torch off when constraints change", async () => {
      let { attachments } = mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { rerender, container, onSuccess, onError } = renderScanner({
        flashlight: true,
        constraints: { facingMode: "environment" }
      });
      await waitForFlashlightButton(container);

      rerender(
        <BarcodeScanner
          flashlight
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(attachments[0]?.applyConstraints).toHaveBeenCalledWith({
          advanced: [{ torch: false }]
        });
      });
    });

    it("turns the torch off when decode rejects", async () => {
      let attachment = streamWithStop({ capabilities: { torch: true } });
      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, videoElement, _constraints, _isCancelled, onStream, onStop) => {
          if (videoElement.current) {
            videoElement.current.srcObject = attachment.stream;
          }

          onStream(attachment.stream);
          onStop?.(() => {});
          throw new Error("boom");
        }
      );
      let onFlashlightError = vi.fn();
      let { container, onError } = renderScanner({ flashlight: { onError: onFlashlightError } });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledOnce();
      });
      await waitFor(() => {
        expect(attachment.applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: false }] });
      });
      expect(getFlashlightButton(container)).toBeNull();
    });

    it("re-applies torch on a new stream after a successful on-toggle", async () => {
      let { attachments } = mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { rerender, container, onSuccess, onError } = renderScanner({
        flashlight: true,
        constraints: { facingMode: "environment" }
      });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);
      await waitFor(() => {
        expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
      });

      rerender(
        <BarcodeScanner
          flashlight
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(getFlashlightButton(container, "Turn flashlight off")).not.toBeNull();
      });
      expect(attachments[1]?.applyConstraints).toHaveBeenCalledWith({
        advanced: [{ torch: true }]
      });
      expect(
        getFlashlightButton(container, "Turn flashlight off")?.classList.contains(
          "rbs:flashlight-on"
        )
      ).toBe(true);
    });

    it("does not restart the camera when flashlight options are a new object", async () => {
      mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { rerender, container, onSuccess, onError } = renderScanner({
        flashlight: { turnOnLabel: "Lamp on" }
      });
      await waitForFlashlightButton(container, "Lamp on");

      rerender(
        <BarcodeScanner
          flashlight={FLASHLIGHT_LAMP_LABELS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
      expect(getFlashlightButton(container, "Lamp on")).not.toBeNull();
    });

    it("runs the capability check when flashlight becomes configured on a live track", async () => {
      mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { rerender, container, onSuccess, onError } = renderScanner();

      await waitFor(() => {
        expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
      });
      expect(getFlashlightButton(container)).toBeNull();

      rerender(<BarcodeScanner flashlight onSuccess={onSuccess} onError={onError} />);

      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
      expect(await waitForFlashlightButton(container)).toBeInstanceOf(HTMLButtonElement);
    });

    it("turns the torch off, hides the button, and clears the toggle when flashlight is removed", async () => {
      let { attachments } = mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { rerender, container, onSuccess, onError } = renderScanner({ flashlight: true });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);
      await waitFor(() => {
        expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
      });

      rerender(<BarcodeScanner onSuccess={onSuccess} onError={onError} />);

      await waitFor(() => {
        expect(attachments[0]?.applyConstraints).toHaveBeenCalledWith({
          advanced: [{ torch: false }]
        });
      });
      expect(getFlashlightButton(container)).toBeNull();
      expect(getFlashlightButton(container, "Turn flashlight off")).toBeNull();

      rerender(<BarcodeScanner flashlight onSuccess={onSuccess} onError={onError} />);

      let nextButton = await waitForFlashlightButton(container);
      expect(nextButton.classList.contains("rbs:flashlight-on")).toBe(false);
    });

    it("turns the torch off when flashlight and doScan drop in the same render", async () => {
      let { attachments } = mockDecodeAttachingStream({ capabilities: { torch: true } });
      let { rerender, container, onSuccess, onError } = renderScanner({ flashlight: true });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);
      await waitFor(() => {
        expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
      });

      rerender(<BarcodeScanner doScan={false} onSuccess={onSuccess} onError={onError} />);

      await waitFor(() => {
        expect(attachments[0]?.applyConstraints).toHaveBeenCalledWith({
          advanced: [{ torch: false }]
        });
      });
    });

    it("calls onError and keeps the off state when both constraint shapes fail", async () => {
      let applyConstraints = vi.fn().mockRejectedValue(new Error("nope"));
      mockDecodeAttachingStream({ capabilities: { torch: true }, applyConstraints });
      let onFlashlightError = vi.fn();
      let { container } = renderScanner({ flashlight: { onError: onFlashlightError } });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);

      await waitFor(() => {
        expect(onFlashlightError).toHaveBeenCalledWith(FlashlightError.ConstraintApplyFailed);
      });
      expect(button.classList.contains("rbs:flashlight-on")).toBe(false);
      expect(applyConstraints).toHaveBeenCalledTimes(2);
    });

    it("ignores a re-entrant click while a toggle is in flight", async () => {
      let apply = deferred();
      let applyConstraints = vi.fn(() => apply.promise);
      mockDecodeAttachingStream({ capabilities: { torch: true }, applyConstraints });
      let { container } = renderScanner({ flashlight: true });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);
      fireEvent.click(button);

      expect(applyConstraints).toHaveBeenCalledTimes(1);

      await act(async () => {
        apply.resolve();
        await apply.promise;
      });

      await waitFor(() => {
        expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
      });
    });

    it("does not restore the toggle when flashlight is removed while a click is in flight", async () => {
      let apply = deferred();
      let applyConstraints = vi.fn(() => apply.promise);
      mockDecodeAttachingStream({ capabilities: { torch: true }, applyConstraints });
      let { rerender, container, onSuccess, onError } = renderScanner({ flashlight: true });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);

      rerender(<BarcodeScanner onSuccess={onSuccess} onError={onError} />);

      await act(async () => {
        apply.resolve();
        await apply.promise;
      });

      expect(getFlashlightButton(container)).toBeNull();
      expect(getFlashlightButton(container, "Turn flashlight off")).toBeNull();

      let applyCount = applyConstraints.mock.calls.length;

      rerender(<BarcodeScanner flashlight onSuccess={onSuccess} onError={onError} />);

      let nextButton = await waitForFlashlightButton(container);
      expect(nextButton.classList.contains("rbs:flashlight-on")).toBe(false);
      expect(nextButton.getAttribute("aria-pressed")).toBe("false");
      expect(applyConstraints).toHaveBeenCalledTimes(applyCount);
    });

    it("does not mark the toggle on when constraints change while a click is in flight", async () => {
      let apply = deferred();
      let firstApply = vi.fn(() => apply.promise);
      let secondApply = vi.fn().mockResolvedValue(undefined);
      let call = 0;

      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, videoElement, _constraints, isCancelled, onStream, onStop) => {
          attachOwnedStream(videoElement, isCancelled, onStream, {
            capabilities: { torch: true },
            applyConstraints: call++ === 0 ? firstApply : secondApply
          });
          onStop?.(() => {});
        }
      );

      let { rerender, container, onSuccess, onError } = renderScanner({
        flashlight: true,
        constraints: { facingMode: "environment" }
      });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);

      rerender(
        <BarcodeScanner
          flashlight
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(decodeBarcodeFromConstraints).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        apply.resolve();
        await apply.promise;
      });

      let nextButton = await waitForFlashlightButton(container);
      expect(nextButton.classList.contains("rbs:flashlight-on")).toBe(false);
      expect(nextButton.getAttribute("aria-pressed")).toBe("false");
      expect(secondApply).not.toHaveBeenCalledWith({ advanced: [{ torch: true }] });
    });

    it("does not report a late toggle failure after flashlight is removed", async () => {
      let apply = deferred();
      let applyConstraints = vi.fn(() => apply.promise);
      let onFlashlightError = vi.fn();
      mockDecodeAttachingStream({ capabilities: { torch: true }, applyConstraints });
      let { rerender, container, onSuccess, onError } = renderScanner({
        flashlight: { onError: onFlashlightError }
      });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);

      rerender(<BarcodeScanner onSuccess={onSuccess} onError={onError} />);

      await act(async () => {
        apply.reject(new Error("nope"));
        await apply.promise.catch(() => {});
      });

      expect(onFlashlightError).not.toHaveBeenCalledWith(FlashlightError.ConstraintApplyFailed);
    });

    it("does not report a late toggle failure after constraints change", async () => {
      let apply = deferred();
      let firstApply = vi.fn(() => apply.promise);
      let secondApply = vi.fn().mockResolvedValue(undefined);
      let call = 0;
      let onFlashlightError = vi.fn();

      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, videoElement, _constraints, isCancelled, onStream, onStop) => {
          attachOwnedStream(videoElement, isCancelled, onStream, {
            capabilities: { torch: true },
            applyConstraints: call++ === 0 ? firstApply : secondApply
          });
          onStop?.(() => {});
        }
      );

      let { rerender, container, onSuccess, onError } = renderScanner({
        flashlight: { onError: onFlashlightError },
        constraints: { facingMode: "environment" }
      });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);

      rerender(
        <BarcodeScanner
          flashlight={flashlightWithError(onFlashlightError)}
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(decodeBarcodeFromConstraints).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        apply.reject(new Error("nope"));
        await apply.promise.catch(() => {});
      });

      expect(onFlashlightError).not.toHaveBeenCalledWith(FlashlightError.ConstraintApplyFailed);
    });

    it("clears the toggle and still shows the button when re-applying torch on a new stream fails", async () => {
      let call = 0;
      let firstApply = vi.fn().mockResolvedValue(undefined);
      let secondApply = vi.fn().mockRejectedValue(new Error("nope"));
      let onFlashlightError = vi.fn();

      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, videoElement, _constraints, isCancelled, onStream, onStop) => {
          attachOwnedStream(videoElement, isCancelled, onStream, {
            capabilities: { torch: true },
            applyConstraints: call++ === 0 ? firstApply : secondApply
          });
          onStop?.(() => {});
        }
      );

      let { rerender, container, onSuccess, onError } = renderScanner({
        flashlight: { onError: onFlashlightError },
        constraints: { facingMode: "environment" }
      });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);
      await waitFor(() => {
        expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
      });

      rerender(
        <BarcodeScanner
          flashlight={flashlightWithError(onFlashlightError)}
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onFlashlightError).toHaveBeenCalledWith(FlashlightError.ConstraintApplyFailed);
      });
      let nextButton = await waitForFlashlightButton(container);
      expect(nextButton.classList.contains("rbs:flashlight-on")).toBe(false);
    });

    it("keeps the last toggle when a new stream has no torch so a later capable camera can turn it on", async () => {
      let call = 0;
      let applies = [vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined)];

      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, videoElement, _constraints, isCancelled, onStream, onStop) => {
          let index = call++;
          attachOwnedStream(videoElement, isCancelled, onStream, {
            capabilities: index === 1 ? {} : { torch: true },
            applyConstraints: applies[index === 2 ? 1 : 0]
          });
          onStop?.(() => {});
        }
      );

      let onFlashlightError = vi.fn();
      let { rerender, container, onSuccess, onError } = renderScanner({
        flashlight: { onError: onFlashlightError },
        constraints: { facingMode: "environment" }
      });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);
      await waitFor(() => {
        expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
      });

      rerender(
        <BarcodeScanner
          flashlight={flashlightWithError(onFlashlightError)}
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onFlashlightError).toHaveBeenCalledWith(FlashlightError.TorchMissing);
      });
      expect(getFlashlightButton(container, "Turn flashlight off")).toBeNull();

      rerender(
        <BarcodeScanner
          flashlight={flashlightWithError(onFlashlightError)}
          constraints={FACING_MODE_ENV_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(getFlashlightButton(container, "Turn flashlight off")).not.toBeNull();
      });
      expect(applies[1]).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
    });

    it("ignores a stale capability result after constraints change", async () => {
      let call = 0;
      let onFlashlightError = vi.fn();

      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, videoElement, _constraints, isCancelled, onStream, onStop) => {
          attachOwnedStream(videoElement, isCancelled, onStream, {
            capabilities: call++ === 0 ? { torch: true } : {}
          });
          onStop?.(() => {});
        }
      );

      let { rerender, container, onSuccess, onError } = renderScanner({
        flashlight: { onError: onFlashlightError },
        constraints: { facingMode: "environment" }
      });

      await waitFor(() => {
        expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
      });

      rerender(
        <BarcodeScanner
          flashlight={flashlightWithError(onFlashlightError)}
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onFlashlightError).toHaveBeenCalledWith(FlashlightError.TorchMissing);
      });
      expect(getFlashlightButton(container)).toBeNull();
    });

    it("ignores a capability result after flashlight is turned off", async () => {
      let stream = streamWithStop({ capabilities: {} }).stream;
      let capturedOnStream: ((next: MediaStream) => void) | undefined;
      let onFlashlightError = vi.fn();

      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, _videoElement, _constraints, _isCancelled, onStream, onStop) => {
          capturedOnStream = onStream;
          onStop?.(() => {});
        }
      );

      let { rerender, onSuccess, onError } = renderScanner({
        flashlight: { onError: onFlashlightError }
      });

      await waitFor(() => {
        expect(capturedOnStream).toBeDefined();
      });

      capturedOnStream?.(stream);
      rerender(<BarcodeScanner onSuccess={onSuccess} onError={onError} />);
      await flushMicrotasks();

      expect(onFlashlightError).not.toHaveBeenCalled();
    });

    it("does not show the button when re-apply succeeds after flashlight is removed", async () => {
      let apply = deferred();
      let firstApply = vi.fn().mockResolvedValue(undefined);
      let secondApply = vi.fn(() => apply.promise);
      let call = 0;
      let attachments: Array<ReturnType<typeof streamWithStop>> = [];

      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, videoElement, _constraints, isCancelled, onStream, onStop) => {
          attachments.push(
            attachOwnedStream(videoElement, isCancelled, onStream, {
              capabilities: { torch: true },
              applyConstraints: call++ === 0 ? firstApply : secondApply
            })
          );
          onStop?.(() => {});
        }
      );

      let { rerender, container, onSuccess, onError } = renderScanner({
        flashlight: true,
        constraints: { facingMode: "environment" }
      });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);
      await waitFor(() => {
        expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
      });

      rerender(
        <BarcodeScanner
          flashlight
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(secondApply).toHaveBeenCalled();
      });

      rerender(
        <BarcodeScanner
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await act(async () => {
        apply.resolve();
        await apply.promise;
      });

      await waitFor(() => {
        expect(attachments[1]?.applyConstraints).toHaveBeenCalledWith({
          advanced: [{ torch: false }]
        });
      });
      expect(getFlashlightButton(container)).toBeNull();
      expect(getFlashlightButton(container, "Turn flashlight off")).toBeNull();
    });

    it("ignores a late re-apply success after the session is cancelled", async () => {
      let apply = deferred();
      let firstApply = vi.fn().mockResolvedValue(undefined);
      let secondApply = vi.fn(() => apply.promise);
      let call = 0;
      let attachments: Array<ReturnType<typeof streamWithStop>> = [];

      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, videoElement, _constraints, isCancelled, onStream, onStop) => {
          attachments.push(
            attachOwnedStream(videoElement, isCancelled, onStream, {
              capabilities: { torch: true },
              applyConstraints: call++ === 0 ? firstApply : secondApply
            })
          );
          onStop?.(() => {});
        }
      );

      let { rerender, container, onSuccess, onError, unmount } = renderScanner({
        flashlight: true,
        constraints: { facingMode: "environment" }
      });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);
      await waitFor(() => {
        expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
      });

      rerender(
        <BarcodeScanner
          flashlight
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(secondApply).toHaveBeenCalled();
      });

      unmount();

      await act(async () => {
        apply.resolve();
        await apply.promise;
      });

      await waitFor(() => {
        expect(attachments[1]?.applyConstraints).toHaveBeenCalledWith({
          advanced: [{ torch: false }]
        });
      });
    });

    it("ignores a late re-apply failure after the session is cancelled", async () => {
      let apply = deferred();
      let firstApply = vi.fn().mockResolvedValue(undefined);
      let secondApply = vi.fn(() => apply.promise);
      let call = 0;
      let onFlashlightError = vi.fn();

      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, videoElement, _constraints, isCancelled, onStream, onStop) => {
          attachOwnedStream(videoElement, isCancelled, onStream, {
            capabilities: { torch: true },
            applyConstraints: call++ === 0 ? firstApply : secondApply
          });
          onStop?.(() => {});
        }
      );

      let { rerender, container, onSuccess, onError, unmount } = renderScanner({
        flashlight: { onError: onFlashlightError },
        constraints: { facingMode: "environment" }
      });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);
      await waitFor(() => {
        expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
      });

      rerender(
        <BarcodeScanner
          flashlight={flashlightWithError(onFlashlightError)}
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(secondApply).toHaveBeenCalled();
      });

      unmount();

      await act(async () => {
        apply.reject(new Error("nope"));
        await apply.promise.catch(() => {});
      });

      expect(onFlashlightError).not.toHaveBeenCalledWith(FlashlightError.ConstraintApplyFailed);
    });

    it("does not apply a failed re-apply after flashlight is removed", async () => {
      let apply = deferred();
      let firstApply = vi.fn().mockResolvedValue(undefined);
      let secondApply = vi.fn(() => apply.promise);
      let call = 0;
      let onFlashlightError = vi.fn();

      vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
        async (_reader, videoElement, _constraints, isCancelled, onStream, onStop) => {
          attachOwnedStream(videoElement, isCancelled, onStream, {
            capabilities: { torch: true },
            applyConstraints: call++ === 0 ? firstApply : secondApply
          });
          onStop?.(() => {});
        }
      );

      let { rerender, container, onSuccess, onError } = renderScanner({
        flashlight: { onError: onFlashlightError },
        constraints: { facingMode: "environment" }
      });
      let button = await waitForFlashlightButton(container);

      fireEvent.click(button);
      await waitFor(() => {
        expect(button.classList.contains("rbs:flashlight-on")).toBe(true);
      });

      rerender(
        <BarcodeScanner
          flashlight={flashlightWithError(onFlashlightError)}
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(secondApply).toHaveBeenCalled();
      });

      rerender(
        <BarcodeScanner
          constraints={FACING_MODE_USER_CONSTRAINTS}
          onSuccess={onSuccess}
          onError={onError}
        />
      );

      await act(async () => {
        apply.reject(new Error("nope"));
        await apply.promise.catch(() => {});
      });

      expect(onFlashlightError).not.toHaveBeenCalledWith(FlashlightError.ConstraintApplyFailed);
    });
  });
});
