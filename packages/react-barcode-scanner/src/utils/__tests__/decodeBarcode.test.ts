import { BrowserCodeReader, BrowserMultiFormatReader } from "@zxing/browser";
import {
  BarcodeFormat,
  ChecksumException,
  Exception,
  FormatException,
  NotFoundException,
  Result
} from "@zxing/library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  decodeBarcodeFromConstraints,
  stopVideoStream,
  UNKNOWN_SCAN_ERROR_MESSAGE
} from "../decodeBarcode";

const CONSTRAINTS: MediaTrackConstraints = { facingMode: "environment" };

type ScanFn = BrowserMultiFormatReader["scan"];

class TestReader extends BrowserMultiFormatReader {
  constructor(private readonly scanImpl: ScanFn) {
    super();
  }

  scan(...args: Parameters<ScanFn>) {
    return this.scanImpl(...args);
  }
}

function videoRef(current: HTMLVideoElement | null) {
  return { current };
}

function testReader(scan: ScanFn): BrowserMultiFormatReader {
  return new TestReader(scan);
}

function scanResult(text: string) {
  return new Result(text, new Uint8Array(), 0, [], BarcodeFormat.QR_CODE);
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

function ignoreStop(_stop: () => void) {}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  let promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function scanThatReturns(text: string) {
  let stop = vi.fn();
  return {
    stop,
    scan: vi.fn<ScanFn>((_video, callback) => {
      callback(scanResult(text), undefined, { stop });
      return { stop };
    })
  };
}

function scanThatCallbacksError(error: unknown) {
  let stop = vi.fn();
  return {
    stop,
    scan: vi.fn<ScanFn>((_video, callback) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- exercises runtime handling of non-Exception callback errors
      callback(undefined, error as Exception, { stop });
      return { stop };
    })
  };
}

function scanThatThrows(error: unknown) {
  return vi.fn<ScanFn>(() => {
    throw error;
  });
}

function pendingScan() {
  let stop = vi.fn();
  let emit!: (result?: Result, error?: Exception) => void;
  let scan = vi.fn<ScanFn>((_video, callback) => {
    emit = (result, error) => {
      callback(result, error, { stop });
    };
    return { stop };
  });
  return { stop, scan, emit: (...args: Parameters<typeof emit>) => emit(...args) };
}

describe("decodeBarcodeFromConstraints", () => {
  let tryPlayVideo: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined
    });
    tryPlayVideo = vi.spyOn(BrowserCodeReader, "tryPlayVideo").mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns without decoding when the video element is missing", async () => {
    let scan = vi.fn<ScanFn>();
    let getUserMedia = stubGetUserMedia(new MediaStream());

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scan),
        videoRef(null),
        CONSTRAINTS,
        () => false,
        ignoreStream,
        ignoreStop
      )
    ).resolves.toBeUndefined();

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(scan).not.toHaveBeenCalled();
  });

  it("returns the decoded text", async () => {
    let video = document.createElement("video");
    let { stream, stop } = streamWithStop();
    let getUserMedia = stubGetUserMedia(stream);
    let { scan } = scanThatReturns("scanned-value");
    let onStream = vi.fn();

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scan),
        videoRef(video),
        CONSTRAINTS,
        () => false,
        onStream,
        ignoreStop
      )
    ).resolves.toBe("scanned-value");

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: CONSTRAINTS,
      preferCurrentTab: true
    });
    expect(onStream).toHaveBeenCalledWith(stream);
    expect(scan).toHaveBeenCalledWith(video, expect.any(Function));
    expect(stop).not.toHaveBeenCalled();
    expect(video.srcObject).toBe(stream);
  });

  it("returns empty decoded text", async () => {
    stubGetUserMedia(new MediaStream());
    let { scan } = scanThatReturns("");

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scan),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream,
        ignoreStop
      )
    ).resolves.toBe("");
  });

  it.each([
    ["NotFoundException", new NotFoundException()],
    ["ChecksumException", new ChecksumException()],
    ["FormatException", new FormatException()]
  ] as const)("swallows %s thrown by scan setup", async (_name, error) => {
    stubGetUserMedia(new MediaStream());

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scanThatThrows(error)),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream,
        ignoreStop
      )
    ).resolves.toBeUndefined();
  });

  it("keeps scanning when ZXing reports an expected decode miss", async () => {
    stubGetUserMedia(new MediaStream());
    let pending = pendingScan();
    let stopScan: (() => void) | undefined;

    let finished = decodeBarcodeFromConstraints(
      testReader(pending.scan),
      videoRef(document.createElement("video")),
      CONSTRAINTS,
      () => false,
      ignoreStream,
      (stop) => {
        stopScan = stop;
      }
    );

    await vi.waitFor(() => {
      expect(pending.scan).toHaveBeenCalledOnce();
    });

    pending.emit(undefined, new NotFoundException());
    expect(stopScan).toBeDefined();
    stopScan?.();

    await expect(finished).resolves.toBeUndefined();
  });

  it("rethrows other Error instances", async () => {
    stubGetUserMedia(new MediaStream());
    let error = new Exception("camera failed");
    let { scan } = scanThatCallbacksError(error);

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scan),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream,
        ignoreStop
      )
    ).rejects.toBe(error);
  });

  it("wraps non-Error callback errors as an unknown scan error", async () => {
    stubGetUserMedia(new MediaStream());
    let { scan } = scanThatCallbacksError("boom");

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scan),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream,
        ignoreStop
      )
    ).rejects.toThrow(UNKNOWN_SCAN_ERROR_MESSAGE);
  });

  it("wraps non-Error throws as an unknown scan error", async () => {
    stubGetUserMedia(new MediaStream());

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scanThatThrows("boom")),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream,
        ignoreStop
      )
    ).rejects.toThrow(UNKNOWN_SCAN_ERROR_MESSAGE);
  });

  it("ignores a second stop after the scan already settled", async () => {
    stubGetUserMedia(new MediaStream());
    let stopScan: (() => void) | undefined;
    let { scan } = scanThatReturns("done");

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scan),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream,
        (stop) => {
          stopScan = stop;
        }
      )
    ).resolves.toBe("done");

    stopScan?.();
  });

  it("ignores falsy thrown values", async () => {
    stubGetUserMedia(new MediaStream());

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scanThatThrows(null)),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream,
        ignoreStop
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
    let scan = vi.fn<ScanFn>();

    let finished = decodeBarcodeFromConstraints(
      testReader(scan),
      ref,
      CONSTRAINTS,
      () => false,
      ignoreStream,
      ignoreStop
    );

    ref.current = null;
    grant.resolve(stream);
    await expect(finished).resolves.toBeUndefined();

    expect(scan).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("skips scan when cancelled while attaching the stream", async () => {
    let cancelled = false;
    let { stream, stop } = streamWithStop();
    stubGetUserMedia(stream);
    let scan = vi.fn<ScanFn>();
    tryPlayVideo.mockImplementation(async () => {
      cancelled = true;
      return true;
    });

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scan),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => cancelled,
        ignoreStream,
        ignoreStop
      )
    ).resolves.toBeUndefined();

    expect(scan).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("settles immediately when cancelled as scan starts", async () => {
    let cancelled = false;
    stubGetUserMedia(streamWithStop().stream);
    let stop = vi.fn();
    let scan = vi.fn<ScanFn>().mockImplementation(() => {
      cancelled = true;
      return { stop };
    });

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scan),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => cancelled,
        ignoreStream,
        ignoreStop
      )
    ).resolves.toBeUndefined();

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
    let scan = vi.fn<ScanFn>();
    let cancelled = false;
    let onStream = vi.fn();

    let finished = decodeBarcodeFromConstraints(
      testReader(scan),
      videoRef(document.createElement("video")),
      CONSTRAINTS,
      () => cancelled,
      onStream,
      ignoreStop
    );

    cancelled = true;
    grant.resolve(stream);
    await expect(finished).resolves.toBeUndefined();

    expect(onStream).not.toHaveBeenCalled();
    expect(scan).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("detaches the owned stream when cancelled after attach", async () => {
    let video = document.createElement("video");
    let { stream, stop } = streamWithStop();
    stubGetUserMedia(stream);
    let pending = pendingScan();
    let cancelled = false;

    let finished = decodeBarcodeFromConstraints(
      testReader(pending.scan),
      videoRef(video),
      CONSTRAINTS,
      () => cancelled,
      ignoreStream,
      ignoreStop
    );

    await vi.waitFor(() => {
      expect(pending.scan).toHaveBeenCalledOnce();
    });

    cancelled = true;
    pending.emit(scanResult("late"));
    await expect(finished).resolves.toBeUndefined();

    expect(stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });

  it("stops the scan loop when onStop is invoked", async () => {
    let video = document.createElement("video");
    stubGetUserMedia(streamWithStop().stream);
    let pending = pendingScan();
    let stopScan: (() => void) | undefined;

    let finished = decodeBarcodeFromConstraints(
      testReader(pending.scan),
      videoRef(video),
      CONSTRAINTS,
      () => false,
      ignoreStream,
      (stop) => {
        stopScan = stop;
      }
    );

    await vi.waitFor(() => {
      expect(pending.scan).toHaveBeenCalledOnce();
    });

    stopScan?.();
    await expect(finished).resolves.toBeUndefined();
    expect(pending.stop).toHaveBeenCalledOnce();
  });

  it("stops the owned stream without detaching a successor srcObject", async () => {
    let video = document.createElement("video");
    let predecessor = streamWithStop();
    let successor = streamWithStop();
    stubGetUserMedia(predecessor.stream);
    let pending = pendingScan();
    let cancelled = false;

    let finished = decodeBarcodeFromConstraints(
      testReader(pending.scan),
      videoRef(video),
      CONSTRAINTS,
      () => cancelled,
      ignoreStream,
      ignoreStop
    );

    await vi.waitFor(() => {
      expect(pending.scan).toHaveBeenCalledOnce();
    });

    cancelled = true;
    video.srcObject = successor.stream;
    pending.emit(scanResult("late"));
    await expect(finished).resolves.toBeUndefined();

    expect(predecessor.stop).toHaveBeenCalledOnce();
    expect(successor.stop).not.toHaveBeenCalled();
    expect(video.srcObject).toBe(successor.stream);
  });

  it("forwards each ZXing reader warn once per stream", async () => {
    stubGetUserMedia(new MediaStream());
    let warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let microQr = new NotFoundException("No Micro QR finder pattern found.");
    let format = new FormatException();
    let stop = vi.fn();
    let scan = vi.fn<ScanFn>().mockImplementation((_video, callback) => {
      console.warn("unrelated warning");
      console.warn("MultiFormatReader: non-ReaderException from reader:", microQr);
      console.warn("MultiFormatReader: non-ReaderException from reader:", microQr);
      console.warn("MultiFormatReader: non-ReaderException from reader:", format);
      console.warn("MultiFormatReader: non-ReaderException from reader:", format);
      console.warn("MultiFormatReader: non-ReaderException from reader:", "plain");
      console.warn("MultiFormatReader: non-ReaderException from reader:", "plain");
      callback(scanResult("ok"), undefined, { stop });
      return { stop };
    });

    await expect(
      decodeBarcodeFromConstraints(
        testReader(scan),
        videoRef(document.createElement("video")),
        CONSTRAINTS,
        () => false,
        ignoreStream,
        ignoreStop
      )
    ).resolves.toBe("ok");

    expect(warn).toHaveBeenCalledTimes(4);
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
