type FlashlightErrorMap = {
  /**
   * No video track was available when the library asked the camera about torch.
   */
  readonly NoTrack: "NO_TRACK";
  /**
   * The track has no getCapabilities method, so torch cannot be queried.
   */
  readonly NoGetCapabilities: "NO_GET_CAPABILITIES";
  /**
   * getCapabilities() returned no torch field.
   */
  readonly TorchMissing: "TORCH_MISSING";
  /**
   * getCapabilities() reported torch as false. This camera cannot turn a lamp on.
   */
  readonly TorchFalse: "TORCH_FALSE";
  /**
   * getCapabilities() reported a torch list that is not both true and false.
   */
  readonly TorchSequenceIncomplete: "TORCH_SEQUENCE_INCOMPLETE";
  /**
   * Both applyConstraints shapes failed. The library tried { advanced: [{ torch }] }
   * then { torch }.
   */
  readonly ConstraintApplyFailed: "CONSTRAINT_APPLY_FAILED";
};

export const FlashlightError: FlashlightErrorMap = {
  NoTrack: "NO_TRACK",
  NoGetCapabilities: "NO_GET_CAPABILITIES",
  TorchMissing: "TORCH_MISSING",
  TorchFalse: "TORCH_FALSE",
  TorchSequenceIncomplete: "TORCH_SEQUENCE_INCOMPLETE",
  ConstraintApplyFailed: "CONSTRAINT_APPLY_FAILED"
};

export type FlashlightError = FlashlightErrorMap[keyof FlashlightErrorMap];
