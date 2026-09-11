import { describe, expect, it, vi } from "vite-plus/test";
import { FlashlightError } from "../../flashlightError";
import { applyTorchConstraint, describeTorchCapability, turnOffLiveTorch } from "../torch";

function asTrack(value: object): MediaStreamTrack {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double
  return value as MediaStreamTrack;
}

function createTrack(capabilities?: object, options?: { omitGetCapabilities?: boolean }) {
  if (options?.omitGetCapabilities) {
    return asTrack({});
  }

  return asTrack({
    getCapabilities: () => capabilities ?? {}
  });
}

describe("describeTorchCapability", () => {
  it("does not call getCapabilities until the promise turns", async () => {
    let getCapabilities = vi.fn(() => ({ torch: true }));
    let track = asTrack({ getCapabilities });
    let pending = describeTorchCapability(track);

    expect(getCapabilities).not.toHaveBeenCalled();

    await pending;

    expect(getCapabilities).toHaveBeenCalledOnce();
  });

  it("rejects a missing track with a distinct reason", async () => {
    expect(await describeTorchCapability()).toEqual({
      isSupported: false,
      reason: FlashlightError.NoTrack
    });
  });

  it("rejects a track without getCapabilities with a distinct reason", async () => {
    expect(
      await describeTorchCapability(createTrack(undefined, { omitGetCapabilities: true }))
    ).toEqual({
      isSupported: false,
      reason: FlashlightError.NoGetCapabilities
    });
  });

  it("rejects capabilities without a torch key with a distinct reason", async () => {
    expect(await describeTorchCapability(createTrack({}))).toEqual({
      isSupported: false,
      reason: FlashlightError.TorchMissing
    });
  });

  it("rejects torch === false with a distinct reason", async () => {
    expect(await describeTorchCapability(createTrack({ torch: false }))).toEqual({
      isSupported: false,
      reason: FlashlightError.TorchFalse
    });
  });

  it("allows torch === true", async () => {
    let track = createTrack({ torch: true });
    expect(await describeTorchCapability(track)).toEqual({ isSupported: true, track });
  });

  it("allows a sequence that includes both true and false", async () => {
    let both = createTrack({ torch: [true, false] });
    let reversed = createTrack({ torch: [false, true] });
    expect(await describeTorchCapability(both)).toEqual({ isSupported: true, track: both });
    expect(await describeTorchCapability(reversed)).toEqual({
      isSupported: true,
      track: reversed
    });
  });

  it("rejects a sequence missing true or false with a distinct reason", async () => {
    expect(await describeTorchCapability(createTrack({ torch: [true] }))).toEqual({
      isSupported: false,
      reason: FlashlightError.TorchSequenceIncomplete
    });
    expect(await describeTorchCapability(createTrack({ torch: [false] }))).toEqual({
      isSupported: false,
      reason: FlashlightError.TorchSequenceIncomplete
    });
  });

  it("uses a different reason for each isSupported:false case", async () => {
    let reasons = [
      (await describeTorchCapability()).reason,
      (await describeTorchCapability(createTrack(undefined, { omitGetCapabilities: true }))).reason,
      (await describeTorchCapability(createTrack({}))).reason,
      (await describeTorchCapability(createTrack({ torch: false }))).reason,
      (await describeTorchCapability(createTrack({ torch: [true] }))).reason
    ];

    expect(new Set(reasons).size).toBe(reasons.length);
  });
});

describe("applyTorchConstraint", () => {
  it("applies the advanced torch constraint when it succeeds", async () => {
    let applyConstraints = vi.fn().mockResolvedValue(undefined);
    let track = asTrack({ applyConstraints });

    await applyTorchConstraint(track, true);

    expect(applyConstraints).toHaveBeenCalledTimes(1);
    expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
  });

  it("falls back to a top-level torch constraint when advanced throws", async () => {
    let applyConstraints = vi
      .fn()
      .mockRejectedValueOnce(new Error("advanced failed"))
      .mockResolvedValueOnce(undefined);
    let track = asTrack({ applyConstraints });

    await applyTorchConstraint(track, false);

    expect(applyConstraints).toHaveBeenNthCalledWith(1, { advanced: [{ torch: false }] });
    expect(applyConstraints).toHaveBeenNthCalledWith(2, { torch: false });
  });

  it("throws when both constraint shapes fail", async () => {
    let applyConstraints = vi.fn().mockRejectedValue(new Error("nope"));
    let track = asTrack({ applyConstraints });

    await expect(applyTorchConstraint(track, true)).rejects.toThrow("nope");
    expect(applyConstraints).toHaveBeenCalledTimes(2);
  });
});

describe("turnOffLiveTorch", () => {
  it("turns the torch off when the track is live", async () => {
    let applyConstraints = vi.fn().mockResolvedValue(undefined);
    let track = asTrack({ readyState: "live", applyConstraints });

    turnOffLiveTorch(track);

    await vi.waitFor(() => {
      expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: false }] });
    });
  });

  it("does not apply a constraint when the track is not live", () => {
    let applyConstraints = vi.fn();
    let track = asTrack({ readyState: "ended", applyConstraints });

    turnOffLiveTorch(track);

    expect(applyConstraints).not.toHaveBeenCalled();
  });

  it("does not apply a constraint when there is no track", () => {
    expect(() => turnOffLiveTorch(null)).not.toThrow();
  });

  it("ignores apply failures when turning off a live track", async () => {
    let applyConstraints = vi.fn().mockRejectedValue(new Error("nope"));
    let track = asTrack({ readyState: "live", applyConstraints });

    turnOffLiveTorch(track);

    await vi.waitFor(() => {
      expect(applyConstraints).toHaveBeenCalledTimes(2);
    });
  });
});
