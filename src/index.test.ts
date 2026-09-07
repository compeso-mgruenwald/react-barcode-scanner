import { describe, expect, it } from "vite-plus/test";
import { BarcodeScanner } from "./index";

describe("public API", () => {
  it("exports BarcodeScanner", () => {
    expect(typeof BarcodeScanner).toBe("function");
  });
});
