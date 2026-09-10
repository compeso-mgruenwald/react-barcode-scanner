import { describe, expect, it } from "vite-plus/test";
import { joinClassNames } from "../joinClassNames";

describe("joinClassNames", () => {
  it("joins defined class names and drops empty parts", () => {
    expect(joinClassNames("rbs:container", "host-container")).toBe("rbs:container host-container");
    expect(joinClassNames("rbs:container", undefined)).toBe("rbs:container");
    expect(joinClassNames("rbs:container", "")).toBe("rbs:container");
  });
});
