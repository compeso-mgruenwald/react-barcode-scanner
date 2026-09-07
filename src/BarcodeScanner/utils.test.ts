import type { BrowserMultiFormatReader } from "@zxing/browser";
import { ChecksumException, FormatException, NotFoundException } from "@zxing/library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { decodeBarcodeFromConstraints, stopVideoStream, UNKNOWN_SCAN_ERROR_MESSAGE } from "./utils";

const CONSTRAINTS: MediaTrackConstraints = { facingMode: "environment" };

function videoRef(current: HTMLVideoElement | null) {
  return { current };
}

function reader(decodeOnceFromStream: BrowserMultiFormatReader["decodeOnceFromStream"]) {
  return { decodeOnceFromStream };
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

function stubGetUserMedia(stream: MediaStream) {
  let getUserMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia }
  });
  return getUserMedia;
}

function ignoreStream(_stream: MediaStream) {}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  let promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("decodeBarcodeFromConstraints", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns without decoding when the video element is missing", async () => {
    let decodeOnceFromStream = vi.fn();
    let getUserMedia = stubGetUserMedia(new MediaStream());

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromStream),
        videoRef(null),
        CONSTRAINTS,
        () => false,
        ignoreStream
      )
    ).resolves.toBeUndefined();

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(decodeOnceFromStream).not.toHaveBeenCalled();
  });

  it("returns the decoded text", async () => {
    let video = document.createElement("video");
    let { stream, stop } = streamWithStop();
    let getUserMedia = stubGetUserMedia(stream);
    let decodeOnceFromStream = vi.fn().mockResolvedValue({
      getText: () => "scanned-value"
    });
    let onStream = vi.fn();

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromStream),
        videoRef(video),
        CONSTRAINTS,
        () => false,
        onStream
      )
    ).resolves.toBe("scanned-value");

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: CONSTRAINTS,
      preferCurrentTab: true
    });
    expect(onStream).toHaveBeenCalledWith(stream);
    expect(decodeOnceFromStream).toHaveBeenCalledWith(stream, video);
    expect(stop).not.toHaveBeenCalled();
  });

  it("returns empty decoded text", async () => {
    stubGetUserMedia(new MediaStream());
    let decodeOnceFromStream = vi.fn().mockResolvedValue({
      getText: () => ""
    });

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromStream),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream
      )
    ).resolves.toBe("");
  });

  it.each([
    ["NotFoundException", new NotFoundException()],
    ["ChecksumException", new ChecksumException()],
    ["FormatException", new FormatException()]
  ] as const)("swallows %s", async (_name, error) => {
    stubGetUserMedia(new MediaStream());
    let decodeOnceFromStream = vi.fn().mockRejectedValue(error);

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromStream),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream
      )
    ).resolves.toBeUndefined();
  });

  it("rethrows other Error instances", async () => {
    stubGetUserMedia(new MediaStream());
    let error = new Error("camera failed");
    let decodeOnceFromStream = vi.fn().mockRejectedValue(error);

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromStream),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream
      )
    ).rejects.toBe(error);
  });

  it("wraps non-Error throws as an unknown scan error", async () => {
    stubGetUserMedia(new MediaStream());
    let decodeOnceFromStream = vi.fn().mockRejectedValue("boom");

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromStream),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream
      )
    ).rejects.toThrow(UNKNOWN_SCAN_ERROR_MESSAGE);
  });

  it("ignores falsy thrown values", async () => {
    stubGetUserMedia(new MediaStream());
    let decodeOnceFromStream = vi.fn().mockRejectedValue(null);

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromStream),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream
      )
    ).resolves.toBeUndefined();
  });

  it("stops the stream when the video element is gone after getUserMedia", async () => {
    let video = document.createElement("video");
    let ref = videoRef(video);
    let { stream, stop } = streamWithStop();
    let grant = deferred<MediaStream>();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockReturnValue(grant.promise) }
    });
    let decodeOnceFromStream = vi.fn();

    let finished = decodeBarcodeFromConstraints(
      reader(decodeOnceFromStream),
      ref,
      CONSTRAINTS,
      () => false,
      ignoreStream
    );

    ref.current = null;
    grant.resolve(stream);
    await expect(finished).resolves.toBeUndefined();

    expect(decodeOnceFromStream).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("stops the stream and skips decode when cancelled after getUserMedia", async () => {
    let { stream, stop } = streamWithStop();
    let grant = deferred<MediaStream>();
    let getUserMedia = vi.fn().mockReturnValue(grant.promise);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia }
    });
    let decodeOnceFromStream = vi.fn();
    let cancelled = false;
    let onStream = vi.fn();

    let finished = decodeBarcodeFromConstraints(
      reader(decodeOnceFromStream),
      videoRef(document.createElement("video")),
      CONSTRAINTS,
      () => cancelled,
      onStream
    );

    cancelled = true;
    grant.resolve(stream);
    await expect(finished).resolves.toBeUndefined();

    expect(onStream).not.toHaveBeenCalled();
    expect(decodeOnceFromStream).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("detaches the owned stream when cancelled after attach", async () => {
    let video = document.createElement("video");
    let { stream, stop } = streamWithStop();
    stubGetUserMedia(stream);
    let scan = deferred<{ getText: () => string }>();
    let decodeOnceFromStream = vi.fn().mockImplementation(async (owned: MediaStream) => {
      video.srcObject = owned;
      return scan.promise;
    });
    let cancelled = false;

    let finished = decodeBarcodeFromConstraints(
      reader(decodeOnceFromStream),
      videoRef(video),
      CONSTRAINTS,
      () => cancelled,
      ignoreStream
    );

    await vi.waitFor(() => {
      expect(decodeOnceFromStream).toHaveBeenCalledOnce();
    });

    cancelled = true;
    scan.resolve({ getText: () => "late" });
    await expect(finished).resolves.toBe("late");

    expect(stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });

  it("stops the owned stream without detaching a successor srcObject", async () => {
    let video = document.createElement("video");
    let predecessor = streamWithStop();
    let successor = streamWithStop();
    stubGetUserMedia(predecessor.stream);
    let scan = deferred<{ getText: () => string }>();
    let decodeOnceFromStream = vi.fn().mockImplementation(async (stream: MediaStream) => {
      video.srcObject = stream;
      return scan.promise;
    });
    let cancelled = false;

    let finished = decodeBarcodeFromConstraints(
      reader(decodeOnceFromStream),
      videoRef(video),
      CONSTRAINTS,
      () => cancelled,
      ignoreStream
    );

    await vi.waitFor(() => {
      expect(decodeOnceFromStream).toHaveBeenCalledOnce();
    });

    cancelled = true;
    video.srcObject = successor.stream;
    scan.resolve({ getText: () => "late" });
    await expect(finished).resolves.toBe("late");

    expect(predecessor.stop).toHaveBeenCalledOnce();
    expect(successor.stop).not.toHaveBeenCalled();
    expect(video.srcObject).toBe(successor.stream);
  });
});

describe("stopVideoStream", () => {
  it("returns when the video element is missing", () => {
    expect(() => stopVideoStream(null)).not.toThrow();
  });

  it("stops MediaStream tracks and detaches the stream", () => {
    let video = document.createElement("video");
    let { stream, stop } = streamWithStop();
    video.srcObject = stream;

    stopVideoStream(video);

    expect(stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });

  it("detaches a non-MediaStream srcObject without throwing", () => {
    let video = document.createElement("video");
    video.srcObject = new Blob();

    stopVideoStream(video);

    expect(video.srcObject).toBeNull();
  });
});
