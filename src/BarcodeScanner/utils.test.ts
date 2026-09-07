import type { BrowserMultiFormatReader } from "@zxing/browser";
import { ChecksumException, FormatException, NotFoundException } from "@zxing/library";
import { describe, expect, it, vi } from "vite-plus/test";
import { decodeBarcodeFromConstraints, UNKNOWN_SCAN_ERROR_MESSAGE } from "./utils";

function videoRef(current: HTMLVideoElement | null) {
  return { current };
}

function reader(decodeOnceFromConstraints: BrowserMultiFormatReader["decodeOnceFromConstraints"]) {
  return { decodeOnceFromConstraints };
}

describe("decodeBarcodeFromConstraints", () => {
  it("returns without decoding when the video element is missing", async () => {
    let decodeOnceFromConstraints = vi.fn();
    let onSuccess = vi.fn();
    let onError = vi.fn();

    await decodeBarcodeFromConstraints(reader(decodeOnceFromConstraints), videoRef(null), {
      constraints: { facingMode: "environment" },
      onSuccess,
      onError
    });

    expect(decodeOnceFromConstraints).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onSuccess with the decoded text", async () => {
    let video = document.createElement("video");
    let constraints = { facingMode: "environment" };
    let decodeOnceFromConstraints = vi.fn().mockResolvedValue({
      getText: () => "scanned-value"
    });
    let onSuccess = vi.fn();
    let onError = vi.fn();

    await decodeBarcodeFromConstraints(reader(decodeOnceFromConstraints), videoRef(video), {
      constraints,
      onSuccess,
      onError
    });

    expect(decodeOnceFromConstraints).toHaveBeenCalledWith(
      { audio: false, video: constraints, preferCurrentTab: true },
      video
    );
    expect(onSuccess).toHaveBeenCalledWith("scanned-value");
    expect(onError).not.toHaveBeenCalled();
  });

  it.each([
    ["NotFoundException", new NotFoundException()],
    ["ChecksumException", new ChecksumException()],
    ["FormatException", new FormatException()]
  ] as const)("swallows %s", async (_name, error) => {
    let decodeOnceFromConstraints = vi.fn().mockRejectedValue(error);
    let onSuccess = vi.fn();
    let onError = vi.fn();

    await decodeBarcodeFromConstraints(
      reader(decodeOnceFromConstraints),
      videoRef(document.createElement("video")),
      {
        constraints: { facingMode: "environment" },
        onSuccess,
        onError
      }
    );

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("forwards other Error instances to onError", async () => {
    let error = new Error("camera failed");
    let decodeOnceFromConstraints = vi.fn().mockRejectedValue(error);
    let onSuccess = vi.fn();
    let onError = vi.fn();

    await decodeBarcodeFromConstraints(
      reader(decodeOnceFromConstraints),
      videoRef(document.createElement("video")),
      {
        constraints: { facingMode: "environment" },
        onSuccess,
        onError
      }
    );

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("wraps non-Error throws as an unknown scan error", async () => {
    let decodeOnceFromConstraints = vi.fn().mockRejectedValue("boom");
    let onSuccess = vi.fn();
    let onError = vi.fn();

    await decodeBarcodeFromConstraints(
      reader(decodeOnceFromConstraints),
      videoRef(document.createElement("video")),
      {
        constraints: { facingMode: "environment" },
        onSuccess,
        onError
      }
    );

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0]?.[0]?.message).toBe(UNKNOWN_SCAN_ERROR_MESSAGE);
  });

  it("ignores falsy thrown values", async () => {
    let decodeOnceFromConstraints = vi.fn().mockRejectedValue(null);
    let onSuccess = vi.fn();
    let onError = vi.fn();

    await decodeBarcodeFromConstraints(
      reader(decodeOnceFromConstraints),
      videoRef(document.createElement("video")),
      {
        constraints: { facingMode: "environment" },
        onSuccess,
        onError
      }
    );

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
