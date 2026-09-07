import type { BrowserMultiFormatReader } from "@zxing/browser";
import { ChecksumException, FormatException, NotFoundException } from "@zxing/library";
import { describe, expect, it, vi } from "vite-plus/test";
import { decodeBarcodeFromConstraints, stopVideoStream, UNKNOWN_SCAN_ERROR_MESSAGE } from "./utils";

const CONSTRAINTS: MediaTrackConstraints = { facingMode: "environment" };

function videoRef(current: HTMLVideoElement | null) {
  return { current };
}

function reader(decodeOnceFromConstraints: BrowserMultiFormatReader["decodeOnceFromConstraints"]) {
  return { decodeOnceFromConstraints };
}

describe("decodeBarcodeFromConstraints", () => {
  it("returns without decoding when the video element is missing", async () => {
    let decodeOnceFromConstraints = vi.fn();

    await expect(
      decodeBarcodeFromConstraints(reader(decodeOnceFromConstraints), videoRef(null), CONSTRAINTS)
    ).resolves.toBeUndefined();

    expect(decodeOnceFromConstraints).not.toHaveBeenCalled();
  });

  it("returns the decoded text", async () => {
    let video = document.createElement("video");
    let decodeOnceFromConstraints = vi.fn().mockResolvedValue({
      getText: () => "scanned-value"
    });

    await expect(
      decodeBarcodeFromConstraints(reader(decodeOnceFromConstraints), videoRef(video), CONSTRAINTS)
    ).resolves.toBe("scanned-value");

    expect(decodeOnceFromConstraints).toHaveBeenCalledWith(
      { audio: false, video: CONSTRAINTS, preferCurrentTab: true },
      video
    );
  });

  it("returns empty decoded text", async () => {
    let decodeOnceFromConstraints = vi.fn().mockResolvedValue({
      getText: () => ""
    });

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromConstraints),
        videoRef(document.createElement("video")),
        CONSTRAINTS
      )
    ).resolves.toBe("");
  });

  it.each([
    ["NotFoundException", new NotFoundException()],
    ["ChecksumException", new ChecksumException()],
    ["FormatException", new FormatException()]
  ] as const)("swallows %s", async (_name, error) => {
    let decodeOnceFromConstraints = vi.fn().mockRejectedValue(error);

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromConstraints),
        videoRef(document.createElement("video")),
        CONSTRAINTS
      )
    ).resolves.toBeUndefined();
  });

  it("rethrows other Error instances", async () => {
    let error = new Error("camera failed");
    let decodeOnceFromConstraints = vi.fn().mockRejectedValue(error);

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromConstraints),
        videoRef(document.createElement("video")),
        CONSTRAINTS
      )
    ).rejects.toBe(error);
  });

  it("wraps non-Error throws as an unknown scan error", async () => {
    let decodeOnceFromConstraints = vi.fn().mockRejectedValue("boom");

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromConstraints),
        videoRef(document.createElement("video")),
        CONSTRAINTS
      )
    ).rejects.toThrow(UNKNOWN_SCAN_ERROR_MESSAGE);
  });

  it("ignores falsy thrown values", async () => {
    let decodeOnceFromConstraints = vi.fn().mockRejectedValue(null);

    await expect(
      decodeBarcodeFromConstraints(
        reader(decodeOnceFromConstraints),
        videoRef(document.createElement("video")),
        CONSTRAINTS
      )
    ).resolves.toBeUndefined();
  });
});

describe("stopVideoStream", () => {
  it("returns when the video element is missing", () => {
    expect(() => stopVideoStream(null)).not.toThrow();
  });

  it("stops MediaStream tracks and detaches the stream", () => {
    let video = document.createElement("video");
    let stop = vi.fn();
    let stream = new MediaStream();
    Object.defineProperty(stream, "getTracks", {
      configurable: true,
      value: () => [{ stop }]
    });
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
