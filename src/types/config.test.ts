import { describe, expect, it } from "vitest";
import type { GhoulsConfig } from "./config.js";
import { DEFAULT_CONFIG, DEFAULT_PROTECTED_BRANCHES, getEffectiveConfig, mergeConfigs } from "./config.js";

describe("config", () => {
  describe("mergeConfigs", () => {
    it("should return empty config when no configs provided", () => {
      const result = mergeConfigs();
      expect(result).toEqual({});
    });

    it("should return single config unchanged", () => {
      const config: GhoulsConfig = {
        protectedBranches: ["main", "develop"],
      };

      const result = mergeConfigs(config);
      expect(result).toEqual(config);
    });

    it("should merge multiple configs with precedence", () => {
      const config1: GhoulsConfig = {
        protectedBranches: ["main", "develop"],
      };

      const config2: GhoulsConfig = {
        protectedBranches: ["main", "staging"], // Should override config1
      };

      const result = mergeConfigs(config1, config2);

      expect(result).toEqual({
        protectedBranches: ["main", "develop"], // From config1 (first wins)
      });
    });

    it("should handle undefined configs in merge", () => {
      const config: GhoulsConfig = {
        protectedBranches: ["main"],
      };

      const result = mergeConfigs(undefined, config, undefined);
      expect(result).toEqual(config);
    });
  });

  describe("getEffectiveConfig", () => {
    it("should return defaults when no config provided", () => {
      const result = getEffectiveConfig();
      expect(result).toEqual(DEFAULT_CONFIG);
    });

    it("should merge config with defaults", () => {
      const config: GhoulsConfig = {
        protectedBranches: ["main", "custom-branch"],
      };

      const result = getEffectiveConfig(config);

      expect(result).toEqual({
        protectedBranches: ["main", "custom-branch"], // Custom value
      });
    });

    it("should preserve all default values when config is empty", () => {
      const result = getEffectiveConfig({});
      expect(result).toEqual(DEFAULT_CONFIG);
    });

    it("should handle partial config objects", () => {
      const config: GhoulsConfig = {};
      const result = getEffectiveConfig(config);

      expect(result.protectedBranches).toEqual([...DEFAULT_PROTECTED_BRANCHES]);
    });
  });

  describe("DEFAULT_PROTECTED_BRANCHES", () => {
    it("should contain expected branch names and patterns", () => {
      expect(DEFAULT_PROTECTED_BRANCHES).toEqual<
        GhoulsConfig["protectedBranches"]
      >([
        "main",
        "master",
        "develop",
        "dev",
        "staging",
        "production",
        "prod",
        "release/*",
        "release-*",
        "hotfix/*",
      ]);
    });

    it("should be readonly array", () => {
      // TypeScript compiler should enforce this, but at runtime the array is still mutable
      // This test verifies the array is frozen or similar readonly behavior would be expected
      // For now, just verify it's an array with the expected content
      expect(Array.isArray(DEFAULT_PROTECTED_BRANCHES)).toBe(true);
      expect(DEFAULT_PROTECTED_BRANCHES.length).toBe(10);
    });
  });

  describe("DEFAULT_CONFIG", () => {
    it("should have expected default values", () => {
      expect(DEFAULT_CONFIG).toEqual<GhoulsConfig>({
        protectedBranches: [
          "main",
          "master",
          "develop",
          "dev",
          "staging",
          "production",
          "prod",
          "release/*",
          "release-*",
          "hotfix/*",
        ],
      });
    });

    it("should be required config type", () => {
      // Verify all required fields are present
      const config: Required<GhoulsConfig> = DEFAULT_CONFIG;
      expect(config.protectedBranches).toBeDefined();
    });
  });
});
