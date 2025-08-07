import { describe, expect, it } from "vitest";
import { ghoulsConfigSchema, validateConfigWithZod } from "./configSchema.js";

describe("configSchema", () => {
  describe("ghoulsConfigSchema", () => {
    it("should validate empty config", () => {
      const result = ghoulsConfigSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should validate valid safety config", () => {
      const config = {
        protectedBranches: ["main", "develop"]
      };

      const result = ghoulsConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(config);
      }
    });

    it("should reject invalid protectedBranches", () => {
      const config = {
        protectedBranches: "not-an-array"
      };

      const result = ghoulsConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject empty strings in protectedBranches", () => {
      const config = {
        protectedBranches: ["main", "", "develop"]
      };

      const result = ghoulsConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("validateConfigWithZod", () => {
    it("should return success for valid config", () => {
      const config = {
        protectedBranches: ["main"]
      };

      const result = validateConfigWithZod(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(config);
      }
    });

    it("should return errors for invalid config", () => {
      const config = {
        protectedBranches: "invalid"
      };

      const result = validateConfigWithZod(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(error => error.includes("protectedBranches")))
          .toBe(true);
      }
    });
  });
});
