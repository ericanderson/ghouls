import { describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod/v4";
import { GhoulsConfig } from "./GhoulsConfig.js";

// Define the inferred type locally since import might be having issues
type GhoulsConfigInferred = z.infer<typeof GhoulsConfig>;

describe("GhoulsConfig type compatibility", () => {
  it("ensures GhoulsConfigInferred is assignable to GhoulsConfig and vice versa", () => {
    // This test uses TypeScript's type system to verify assignability
    // If these assignments cause compilation errors, the types are incompatible

    // Test: GhoulsConfigInferred should be assignable to GhoulsConfig
    const _: (config: GhoulsConfigInferred) => GhoulsConfig = (config) => config;

    // Test: GhoulsConfig should be assignable to GhoulsConfigInferred
    const __: (config: GhoulsConfig) => GhoulsConfigInferred = (config) => config;

    // Prevent unused variable warnings
    void _;
    void __;
  });

  it("verifies type compatibility using expectTypeOf", () => {
    // Use Vitest's expectTypeOf for more explicit type testing
    expectTypeOf<GhoulsConfigInferred>().toExtend<GhoulsConfig>();
    expectTypeOf<GhoulsConfig>().toExtend<GhoulsConfigInferred>();

    // Test exact type equality (stricter than assignability)
    expectTypeOf<GhoulsConfigInferred>().toEqualTypeOf<GhoulsConfig>();
  });

  describe("schema validation", () => {
    it("should validate empty config", () => {
      const result = GhoulsConfig.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should validate valid safety config", () => {
      const config = {
        protectedBranches: ["main", "develop"],
      };

      const result = GhoulsConfig.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(config);
      }
    });

    it("should reject invalid protectedBranches", () => {
      const config = {
        protectedBranches: "not-an-array",
      };

      const result = GhoulsConfig.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject empty strings in protectedBranches", () => {
      const config = {
        protectedBranches: ["main", "", "develop"],
      };

      const result = GhoulsConfig.safeParse(config);
      expect(result.success).toBe(false);
    });
  });
});
