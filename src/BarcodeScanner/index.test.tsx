import type { ComponentProps } from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { BarcodeScanner, MEDIA_DEVICES_ERROR_MESSAGE } from "./index";
import { decodeBarcodeFromConstraints } from "./utils";

vi.mock("@zxing/browser", async (importOriginal) => {
  let actual = await importOriginal<typeof import("@zxing/browser")>();
  return {
    ...actual,
    BrowserMultiFormatReader: class BrowserMultiFormatReader {
      decodeOnceFromStream() {
        return Promise.resolve({ getText: () => "" });
      }
    }
  };
});

vi.mock("./utils", async (importOriginal) => {
  let actual = await importOriginal<typeof import("./utils")>();
  return {
    ...actual,
    decodeBarcodeFromConstraints: vi.fn(() => Promise.resolve())
  };
});

function Viewfinder() {
  return <div data-testid="viewfinder">finder</div>;
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
    async (_reader, videoElement, _constraints, isCancelled, onStream) => {
      stops.push(attachOwnedStream(videoElement, isCancelled, onStream));
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

describe("BarcodeScanner", () => {
  beforeEach(() => {
    clearMediaDevices();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("shows the camera-off overlay until the camera is initialized", () => {
    let { container } = renderScanner();

    expect(container.querySelector("svg")).not.toBeNull();
    expect(videoFrom(container).parentElement?.style.display).toBe("none");
  });

  it("keeps the overlay when scanning is disabled", () => {
    let { container } = renderScanner({ doScan: false });

    expect(container.querySelector("svg")).not.toBeNull();
    expect(decodeBarcodeFromConstraints).not.toHaveBeenCalled();
  });

  it("warns and calls onError when MediaDevices is missing", () => {
    let { onError } = renderScanner();

    expect(console.warn).toHaveBeenCalledWith(
      `[ReactBarcodeScanner]: ${MEDIA_DEVICES_ERROR_MESSAGE}`
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0]?.[0]?.message).toBe(MEDIA_DEVICES_ERROR_MESSAGE);
    expect(decodeBarcodeFromConstraints).not.toHaveBeenCalled();
  });

  it("starts decoding when scanning is enabled and MediaDevices exists", async () => {
    stubMediaDevices();
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
    stubMediaDevices();
    let error = new Error("boom");
    vi.mocked(decodeBarcodeFromConstraints).mockRejectedValue(error);
    let { onSuccess, onError } = renderScanner();

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not decode when doScan is false even if MediaDevices exists", () => {
    stubMediaDevices();
    renderScanner({ doScan: false });

    expect(decodeBarcodeFromConstraints).not.toHaveBeenCalled();
  });

  it("does not restart decode when constraints are omitted and callbacks are inline", async () => {
    stubMediaDevices();
    let { rerender } = render(
      <BarcodeScanner onSuccess={() => {}} onError={() => {}} onLoad={() => {}} />
    );

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    rerender(<BarcodeScanner onSuccess={() => {}} onError={() => {}} onLoad={() => {}} />);

    expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
  });

  it("forwards empty decoded text to onSuccess", async () => {
    stubMediaDevices();
    vi.mocked(decodeBarcodeFromConstraints).mockResolvedValue("");
    let { onSuccess, onError } = renderScanner();

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("");
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not restart decode when constraint values are equal regardless of key order", async () => {
    stubMediaDevices();
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
    stubMediaDevices();
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
    stubMediaDevices();
    let { stops } = mockDecodeAttachingStream();
    let { rerender, onSuccess, onError } = renderScanner();

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    rerender(<BarcodeScanner doScan={false} onSuccess={onSuccess} onError={onError} />);

    expect(stops[0]).toHaveBeenCalledOnce();
  });

  it("stops the camera on unmount", async () => {
    stubMediaDevices();
    let { stops } = mockDecodeAttachingStream();
    let { unmount } = renderScanner();

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    unmount();

    expect(stops[0]).toHaveBeenCalledOnce();
  });

  it("does not stop the successor session when a cancelled decode settles", async () => {
    stubMediaDevices();
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
    stubMediaDevices();
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
    stubMediaDevices();
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
      stubMediaDevices();
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

  it("hides the preview until a new stream is ready after constraints change", async () => {
    stubMediaDevices();
    mockDecodeAttachingStream();
    let { rerender, container, onSuccess, onError } = renderScanner({
      constraints: { facingMode: "environment" }
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
    expect(container.querySelector("svg")).toBeNull();

    rerender(
      <BarcodeScanner
        constraints={{ facingMode: "user" }}
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("ignores stale loaded data after constraints change", async () => {
    stubMediaDevices();
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
    expect(container.querySelector("svg")).toBeNull();

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
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders a Viewfinder and applies container styles", () => {
    let { container, getByTestId } = renderScanner({
      Viewfinder,
      containerStyle: { width: "321px" },
      videoContainerStyle: { height: "240px" }
    });

    expect(getByTestId("viewfinder").textContent).toBe("finder");
    expect(container.querySelector("section")?.style.width).toBe("321px");
    expect(videoFrom(container).parentElement?.style.height).toBe("240px");
  });

  it("replaces default video props when videoProps is an object", () => {
    let { container } = renderScanner({
      videoProps: { id: "override-video", muted: false }
    });
    let video = videoFrom(container);

    expect(video.id).toBe("override-video");
    expect(video.muted).toBe(false);
    expect(video.hasAttribute("playsinline")).toBe(false);
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

  it("mirrors the user-facing camera", () => {
    let { container } = renderScanner({
      constraints: { facingMode: "user" },
      videoStyle: { transform: "rotate(90deg)" }
    });
    let transform = videoFrom(container).style.transform;

    expect(transform).toContain("scaleX(-1)");
    expect(transform).toContain("rotate(90deg)");
  });

  it("initializes the camera and calls onLoad when the video has enough data", async () => {
    stubMediaDevices();
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
    expect(container.querySelector("svg")).toBeNull();
    expect(video.parentElement?.style.display).toBe("block");
  });

  it("does not call onLoad when the video is not ready", async () => {
    stubMediaDevices();
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
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("ignores loaded data when readyState is missing", async () => {
    stubMediaDevices();
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
    stubMediaDevices();
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
