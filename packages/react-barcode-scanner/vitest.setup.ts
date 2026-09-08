/**
 * jsdom does not provide MediaStream. Runtime uses `instanceof MediaStream`, which
 * throws if the binding is missing, so tests install a minimal stand-in.
 */
Object.defineProperty(globalThis, "MediaStream", {
  configurable: true,
  writable: true,
  value: class MediaStream {
    getTracks(): MediaStreamTrack[] {
      return [];
    }
  }
});
