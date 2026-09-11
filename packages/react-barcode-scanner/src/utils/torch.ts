import { FlashlightError } from "../flashlightError";

export type TorchCapability =
  | { isSupported: false; reason: FlashlightError }
  | { isSupported: true; track: MediaStreamTrack; reason?: never };

function readTorchCapability(track?: MediaStreamTrack): TorchCapability {
  if (!track) {
    return { isSupported: false, reason: FlashlightError.NoTrack };
  }

  if (typeof track.getCapabilities !== "function") {
    return { isSupported: false, reason: FlashlightError.NoGetCapabilities };
  }

  let capabilities = track.getCapabilities();

  if (!("torch" in capabilities) || capabilities.torch === undefined) {
    return { isSupported: false, reason: FlashlightError.TorchMissing };
  }

  let torch = capabilities.torch;

  if (torch === false) {
    return { isSupported: false, reason: FlashlightError.TorchFalse };
  }

  if (torch === true) {
    return { isSupported: true, track };
  }

  if (torch.includes(true) && torch.includes(false)) {
    return { isSupported: true, track };
  }

  return { isSupported: false, reason: FlashlightError.TorchSequenceIncomplete };
}

export function describeTorchCapability(track?: MediaStreamTrack): Promise<TorchCapability> {
  return Promise.resolve().then(() => readTorchCapability(track));
}

export async function applyTorchConstraint(
  track: MediaStreamTrack,
  isEnabled: boolean
): Promise<void> {
  try {
    await track.applyConstraints({ advanced: [{ torch: isEnabled }] });
  } catch {
    await track.applyConstraints({ torch: isEnabled });
  }
}

export function turnOffLiveTorch(track: MediaStreamTrack | null): void {
  if (track?.readyState === "live") {
    applyTorchConstraint(track, false).catch(() => {});
  }
}
