import type { ComponentProps } from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { BarcodeScanner, MEDIA_DEVICES_ERROR_MESSAGE } from "./index";
import { decodeBarcodeFromConstraints } from "./utils";

vi.mock("@zxing/browser", () => {
  return {
    BrowserMultiFormatReader: class BrowserMultiFormatReader {
      decodeOnceFromConstraints() {
        return Promise.resolve({ getText: () => "" });
      }
    }
  };
});

vi.mock("./utils", () => {
  return {
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
    let { onSuccess, onError } = renderScanner({ constraints });

    await waitFor(() => {
      expect(decodeBarcodeFromConstraints).toHaveBeenCalledOnce();
    });

    let [, videoElement, options] = vi.mocked(decodeBarcodeFromConstraints).mock.calls[0] ?? [];

    expect(videoElement?.current).toBeInstanceOf(HTMLVideoElement);
    expect(options).toEqual({ constraints, onSuccess, onError });
  });

  it("does not decode when doScan is false even if MediaDevices exists", () => {
    stubMediaDevices();
    renderScanner({ doScan: false });

    expect(decodeBarcodeFromConstraints).not.toHaveBeenCalled();
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

  it("initializes the camera and calls onLoad when the video has enough data", () => {
    let onLoad = vi.fn();
    let { container } = renderScanner({ onLoad });
    let video = videoFrom(container);

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });

    fireEvent.loadedData(video);

    expect(onLoad).toHaveBeenCalledOnce();
    expect(container.querySelector("svg")).toBeNull();
    expect(video.parentElement?.style.display).toBe("block");
  });

  it("does not call onLoad when the video is not ready", () => {
    let onLoad = vi.fn();
    let { container } = renderScanner({ onLoad });
    let video = videoFrom(container);

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_METADATA
    });

    fireEvent.loadedData(video);

    expect(onLoad).not.toHaveBeenCalled();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("ignores loaded data when readyState is missing", () => {
    let onLoad = vi.fn();
    let { container } = renderScanner({ onLoad });
    let video = videoFrom(container);

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_NOTHING
    });

    fireEvent.loadedData(video);

    expect(onLoad).not.toHaveBeenCalled();
  });

  it("ignores loaded data when the event target is not a video", () => {
    let onLoad = vi.fn();
    let { container } = renderScanner({ onLoad });
    let video = videoFrom(container);

    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA
    });
    Object.setPrototypeOf(video, HTMLElement.prototype);

    fireEvent.loadedData(video);

    expect(onLoad).not.toHaveBeenCalled();
  });
});
