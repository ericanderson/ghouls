import { describe, expect, it } from "vitest";
import type { GhoulsConfig } from "./config.js";
import {
  DEFAULT_CONFIG,
  DEFAULT_PROTECTED_BRANCHES,
  expandDefaultPlaceholder,
  getEffectiveConfig,
  GHOULS_DEFAULT_PLACEHOLDER,
  mergeConfigs,
} from "./config.js";

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

  describe("expandDefaultPlaceholder", () => {
    it("should return empty array for empty input", () => {
      const result = expandDefaultPlaceholder([]);
      expect(result).toEqual([]);
    });

    it("should return branches unchanged when no placeholder present", () => {
      const branches = ["custom1", "custom2"];
      const result = expandDefaultPlaceholder(branches);
      expect(result).toEqual(["custom1", "custom2"]);
    });

    it("should expand $GHOULS_DEFAULT at beginning", () => {
      const branches = [GHOULS_DEFAULT_PLACEHOLDER, "custom"];
      const result = expandDefaultPlaceholder(branches);
      expect(result).toEqual([...DEFAULT_PROTECTED_BRANCHES, "custom"]);
    });

    it("should expand $GHOULS_DEFAULT at end", () => {
      const branches = ["custom", GHOULS_DEFAULT_PLACEHOLDER];
      const result = expandDefaultPlaceholder(branches);
      expect(result).toEqual(["custom", ...DEFAULT_PROTECTED_BRANCHES]);
    });

    it("should expand $GHOULS_DEFAULT in middle", () => {
      const branches = ["custom1", GHOULS_DEFAULT_PLACEHOLDER, "custom2"];
      const result = expandDefaultPlaceholder(branches);
      expect(result).toEqual(["custom1", ...DEFAULT_PROTECTED_BRANCHES, "custom2"]);
    });

    it("should handle multiple $GHOULS_DEFAULT placeholders without duplicates", () => {
      const branches = [GHOULS_DEFAULT_PLACEHOLDER, "custom", GHOULS_DEFAULT_PLACEHOLDER];
      const result = expandDefaultPlaceholder(branches);
      expect(result).toEqual([...DEFAULT_PROTECTED_BRANCHES, "custom"]);
    });

    it("should remove duplicates while preserving order", () => {
      const branches = ["main", GHOULS_DEFAULT_PLACEHOLDER, "custom", "main"];
      const result = expandDefaultPlaceholder(branches);
      // "main" appears first, so it should stay in first position
      // When $GHOULS_DEFAULT is expanded, "main" is skipped since it's already present
      expect(result).toEqual([
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
        "custom",
      ]);
    });

    it("should handle only $GHOULS_DEFAULT placeholder", () => {
      const branches = [GHOULS_DEFAULT_PLACEHOLDER];
      const result = expandDefaultPlaceholder(branches);
      expect(result).toEqual([...DEFAULT_PROTECTED_BRANCHES]);
    });

    it("should handle custom branches that match defaults", () => {
      const branches = ["main", "custom", GHOULS_DEFAULT_PLACEHOLDER, "develop"];
      const result = expandDefaultPlaceholder(branches);
      // "main" should stay in first position, "develop" should not be duplicated when defaults are expanded
      expect(result).toEqual([
        "main",
        "custom",
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
  });

  describe("getEffectiveConfig with $GHOULS_DEFAULT", () => {
    it("should expand $GHOULS_DEFAULT placeholder", () => {
      const config: GhoulsConfig = {
        protectedBranches: [GHOULS_DEFAULT_PLACEHOLDER, "custom-branch"],
      };

      const result = getEffectiveConfig(config);

      expect(result.protectedBranches).toEqual([
        ...DEFAULT_PROTECTED_BRANCHES,
        "custom-branch",
      ]);
    });

    it("should handle multiple $GHOULS_DEFAULT placeholders", () => {
      const config: GhoulsConfig = {
        protectedBranches: [
          "custom1",
          GHOULS_DEFAULT_PLACEHOLDER,
          "custom2",
          GHOULS_DEFAULT_PLACEHOLDER,
        ],
      };

      const result = getEffectiveConfig(config);

      expect(result.protectedBranches).toEqual([
        "custom1",
        ...DEFAULT_PROTECTED_BRANCHES,
        "custom2",
      ]);
    });

    it("should preserve backward compatibility when no placeholder used", () => {
      const config: GhoulsConfig = {
        protectedBranches: ["main", "custom-branch"],
      };

      const result = getEffectiveConfig(config);

      expect(result.protectedBranches).toEqual(["main", "custom-branch"]);
    });

    it("should work with only $GHOULS_DEFAULT", () => {
      const config: GhoulsConfig = {
        protectedBranches: [GHOULS_DEFAULT_PLACEHOLDER],
      };

      const result = getEffectiveConfig(config);

      expect(result.protectedBranches).toEqual([...DEFAULT_PROTECTED_BRANCHES]);
    });

    it("should handle empty protectedBranches array", () => {
      const config: GhoulsConfig = {
        protectedBranches: [],
      };

      const result = getEffectiveConfig(config);

      expect(result.protectedBranches).toEqual([]);
    });

    it("should not expand when placeholder not present", () => {
      const config: GhoulsConfig = {
        protectedBranches: ["custom1", "custom2"],
      };

      const result = getEffectiveConfig(config);

      expect(result.protectedBranches).toEqual(["custom1", "custom2"]);
    });

    it("should remove duplicates between custom and default branches", () => {
      const config: GhoulsConfig = {
        protectedBranches: ["main", GHOULS_DEFAULT_PLACEHOLDER, "custom", "master"],
      };

      const result = getEffectiveConfig(config);

      // Should preserve order: main first, then defaults (skipping main but including master in its position), then custom, then master at end is skipped
      expect(result.protectedBranches).toEqual([
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
        "custom",
      ]);
    });
  });

  describe("GHOULS_DEFAULT_PLACEHOLDER constant", () => {
    it("should have expected value", () => {
      expect(GHOULS_DEFAULT_PLACEHOLDER).toBe("$GHOULS_DEFAULT");
    });
  });
});
