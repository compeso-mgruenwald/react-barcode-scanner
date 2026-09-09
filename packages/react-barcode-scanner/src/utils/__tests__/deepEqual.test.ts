import { describe, expect, it } from "vite-plus/test";
import { deepEqual } from "../deepEqual";

describe("deepEqual", () => {
  it("treats identical primitives as equal", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("environment", "environment")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
  });

  it("treats NaN as equal to NaN", () => {
    expect(deepEqual(Number.NaN, Number.NaN)).toBe(true);
  });

  it("rejects unequal primitives", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("environment", "user")).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(0, false)).toBe(false);
  });

  it("rejects object vs primitive and object vs null", () => {
    expect(deepEqual({ facingMode: "environment" }, "environment")).toBe(false);
    expect(deepEqual({ facingMode: "environment" }, null)).toBe(false);
  });

  it("compares arrays by index and nested value", () => {
    expect(deepEqual(["environment", "user"], ["environment", "user"])).toBe(true);
    expect(deepEqual(["environment"], ["user"])).toBe(false);
    expect(deepEqual(["environment"], ["environment", "user"])).toBe(false);
    expect(deepEqual([{ exact: "environment" }], [{ exact: "environment" }])).toBe(true);
  });

  it("rejects array vs plain object", () => {
    expect(deepEqual(["environment"], { 0: "environment" })).toBe(false);
  });

  it("compares plain objects by value regardless of key order", () => {
    expect(
      deepEqual(
        { facingMode: "environment", width: 1280 },
        { width: 1280, facingMode: "environment" }
      )
    ).toBe(true);
  });

  it("compares nested constraint objects", () => {
    expect(
      deepEqual({ facingMode: { exact: "environment" } }, { facingMode: { exact: "environment" } })
    ).toBe(true);
    expect(
      deepEqual({ facingMode: { exact: "environment" } }, { facingMode: { exact: "user" } })
    ).toBe(false);
  });

  it("rejects objects with different keys or missing properties", () => {
    expect(
      deepEqual({ facingMode: "environment" }, { facingMode: "environment", width: 1280 })
    ).toBe(false);
    expect(deepEqual({ facingMode: "environment" }, { width: 1280 })).toBe(false);
    expect(deepEqual({ facingMode: "environment" }, { facingMode: "user" })).toBe(false);
    expect(deepEqual("environment", { facingMode: "environment" })).toBe(false);
  });

  it("treats undefined object values as absent", () => {
    expect(
      deepEqual({ facingMode: "environment", width: undefined }, { facingMode: "environment" })
    ).toBe(true);
    expect(
      deepEqual({ facingMode: "environment" }, { facingMode: "environment", width: undefined })
    ).toBe(true);
    expect(
      deepEqual(
        { facingMode: { exact: "environment", ideal: undefined } },
        { facingMode: { exact: "environment" } }
      )
    ).toBe(true);
    expect(
      deepEqual(
        { facingMode: "environment", width: undefined },
        { facingMode: "environment", height: 720 }
      )
    ).toBe(false);
    expect(deepEqual([undefined], [])).toBe(false);
  });
});
