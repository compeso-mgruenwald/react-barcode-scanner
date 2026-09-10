import type { ComponentProps } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { BarcodeScanner } from "../index";
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

function CustomViewfinder() {
  return <div data-testid="viewfinder">finder</div>;
}

function getDefaultViewfinder(container: HTMLElement) {
  return container.querySelector('path[d="M0 0h100v100H0zM10 10h80v80H10z"]');
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

function streamWithStop() {
  let stop = vi.fn();
  let stream = new MediaStream();
  Object.defineProperty(stream, "getTracks", {
    configurable: true,
    value: () => [{ stop }]
  });
  return { stream, stop };
}

function attachOwnedStream(
  videoElement: { current: HTMLVideoElement | null },
  isCancelled: (() => boolean) | undefined,
  onStream: (stream: MediaStream) => void
) {
  let { stream, stop } = streamWithStop();

  if (videoElement.current) {
    videoElement.current.srcObject = stream;
  }

  if (isCancelled?.()) {
    stop();
    return stop;
  }

  onStream(stream);
  return stop;
}

function mockDecodeAttachingStream() {
  let stops: Array<ReturnType<typeof vi.fn>> = [];

  vi.mocked(decodeBarcodeFromConstraints).mockImplementation(
    async (_reader, videoElement, _constraints, isCancelled, onStream, onStop) => {
      stops.push(attachOwnedStream(videoElement, isCancelled, onStream));
      onStop?.(() => {});
    }
  );

  return { stops };
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

describe("public API", () => {
  it("exports BarcodeScanner", () => {
    expect(typeof BarcodeScanner).toBe("function");
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
    let { rerender } = render(
      <BarcodeScanner onSuccess={() => {}} onError={() => {}} onLoad={() => {}} />
    );

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    expect(vi.mocked(decodeBarcodeFromConstraints).mock.calls[0]?.[2]).toEqual({
      facingMode: "environment",
      width: { ideal: 720 },
      height: { ideal: 720 },
      aspectRatio: { ideal: 1 }
    });

    rerender(<BarcodeScanner onSuccess={() => {}} onError={() => {}} onLoad={() => {}} />);

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
        constraints={{ width: 1280, facingMode: "environment" }}
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
        constraints={{ facingMode: "user" }}
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
        let stop = attachOwnedStream(videoElement, undefined, onStream);
        stops.push(stop);

        if (call++ === 0) {
          await first.promise;
        }

        if (isCancelled()) {
          stop();
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
        constraints={{ facingMode: "user" }}
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

        stops[index] = attachOwnedStream(videoElement, isCancelled, onStream);
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
        constraints={{ facingMode: "user" }}
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
        constraints={{ facingMode: "user" }}
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
        constraints={{ facingMode: "user" }}
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

  it("mirrors the user-facing camera", () => {
    let { container, rerender, onSuccess, onError } = renderScanner({
      constraints: { facingMode: "user" }
    });

    expect(videoFrom(container).classList.contains("rbs:video-mirrored")).toBe(true);

    rerender(
      <BarcodeScanner
        constraints={{ facingMode: "user" }}
        videoProps={{ id: "override-video" }}
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
});
