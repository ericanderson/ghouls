import { describe, expect, it } from "vitest";
import { formatZodErrors } from "./formatZodErrors.js";
import { GhoulsConfig } from "./GhoulsConfig.js";

describe("formatZodErrors", () => {
  it("should format validation errors with field paths", () => {
    const config = {
      protectedBranches: "invalid",
    };

    const result = GhoulsConfig.safeParse(config);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes("protectedBranches")))
        .toBe(true);
    }
  });

  it("should format validation errors for empty branch names", () => {
    const config = {
      protectedBranches: ["main", "", "develop"],
    };

    const result = GhoulsConfig.safeParse(config);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes("Branch name cannot be empty")))
        .toBe(true);
    }
  });
});
