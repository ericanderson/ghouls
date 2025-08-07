import { findUpSync } from "find-up";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { dirname, join, resolve } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GhoulsConfig } from "../types/config.js";
import { ConfigLoadError, getConfigFilePaths, loadConfig, loadConfigSafe } from "./configLoader.js";

// Mock filesystem operations
vi.mock("fs");
vi.mock("path");
vi.mock("os");
vi.mock("find-up");

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);
const mockedResolve = vi.mocked(resolve);
const mockedJoin = vi.mocked(join);
const mockedDirname = vi.mocked(dirname);
const mockedHomedir = vi.mocked(homedir);
const mockedFindUpSync = vi.mocked(findUpSync);

describe("configLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behaviors
    mockedResolve.mockImplementation((path) => `/resolved/${path}`);
    mockedJoin.mockImplementation((...paths) => paths.join("/"));
    mockedDirname.mockImplementation((path) => {
      // Simple implementation for our test paths
      if (path === "/current/dir/.git") return "/current/dir";
      return path.split("/").slice(0, -1).join("/");
    });
    mockedHomedir.mockReturnValue("/home/user");
    mockedFindUpSync.mockReturnValue(undefined); // Default: no git found

    // Mock process.cwd()
    vi.spyOn(process, "cwd").mockReturnValue("/current/dir");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GHOULS_CONFIG;
  });

  describe("loadConfig", () => {
    it("should return empty config when no config files exist", () => {
      mockedExistsSync.mockReturnValue(false);

      const result = loadConfig();
      expect(result).toEqual({});
    });

    it("should load config from environment variable", () => {
      process.env.GHOULS_CONFIG = "/custom/config.json";

      const mockConfig: GhoulsConfig = {
        protectedBranches: ["main", "custom"]
      };

      mockedExistsSync.mockImplementation((path) => path === "/resolved//custom/config.json");
      mockedReadFileSync.mockImplementation((path) => {
        if (path === "/resolved//custom/config.json") {
          return JSON.stringify(mockConfig);
        }
        throw new Error("File not found");
      });

      const result = loadConfig();
      expect(result).toEqual(mockConfig);
    });

    it("should load config from git repository root", () => {
      // Mock find-up to find .git directory
      mockedFindUpSync.mockReturnValue("/current/dir/.git");

      mockedExistsSync.mockImplementation((path) => {
        if (path === "/current/dir/.config/ghouls.json") return true;
        return false;
      });

      const mockConfig: GhoulsConfig = {
        protectedBranches: ["main", "develop"]
      };

      mockedReadFileSync.mockImplementation((path) => {
        if (path === "/current/dir/.config/ghouls.json") {
          return JSON.stringify(mockConfig);
        }
        throw new Error("File not found");
      });

      const result = loadConfig();
      expect(result).toEqual(mockConfig);
    });

    it("should load config from user home directory", () => {
      mockedExistsSync.mockImplementation((path) => {
        if (path === "/home/user/.config/ghouls/config.json") return true;
        return false;
      });

      const mockConfig: GhoulsConfig = {};

      mockedReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = loadConfig();
      expect(result).toEqual(mockConfig);
    });

    it("should merge multiple config files with precedence", () => {
      const envConfig: GhoulsConfig = {
        protectedBranches: ["main", "env-branch"]
      };

      const repoConfig: GhoulsConfig = {
        protectedBranches: ["main", "repo-branch"] // Should be overridden by env
      };

      process.env.GHOULS_CONFIG = "/env/config.json";

      // Mock find-up to find .git directory
      mockedFindUpSync.mockReturnValue("/current/dir/.git");

      mockedExistsSync.mockImplementation((path) => {
        if (path === "/resolved//env/config.json") return true;
        if (path === "/current/dir/.config/ghouls.json") return true;
        return false;
      });

      mockedReadFileSync.mockImplementation((path) => {
        if (path === "/resolved//env/config.json") {
          return JSON.stringify(envConfig);
        }
        if (path === "/current/dir/.config/ghouls.json") {
          return JSON.stringify(repoConfig);
        }
        throw new Error("File not found");
      });

      const result = loadConfig();

      // Environment config should take precedence
      expect(result).toEqual({
        protectedBranches: ["main", "env-branch"] // From env config
      });
    });

    it("should throw ConfigLoadError for invalid JSON", () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue("invalid json {");

      expect(() => loadConfig()).toThrow(ConfigLoadError);
      expect(() => loadConfig()).toThrow("Invalid JSON");
    });

    it("should throw ConfigLoadError for config validation failures", () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify({
        protectedBranches: "invalid-type"
      }));

      expect(() => loadConfig()).toThrow(ConfigLoadError);
      expect(() => loadConfig()).toThrow("Configuration validation failed");
    });

    it("should throw ConfigLoadError with detailed validation errors", () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify({
        protectedBranches: ["", "valid"]
      }));

      try {
        loadConfig();
        expect.fail("Should have thrown ConfigLoadError");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigLoadError);
        const configError = error as ConfigLoadError;
        expect(configError.validationErrors).toBeDefined();
        expect(configError.validationErrors?.length).toBeGreaterThan(0);
        expect(configError.message).toContain(
          "Configuration validation failed"
        );
      }
    });

    it("should throw ConfigLoadError for file read errors", () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      expect(() => loadConfig()).toThrow(ConfigLoadError);
      expect(() => loadConfig()).toThrow("Permission denied");
    });

    it("should handle empty configs", () => {
      const emptyConfig: GhoulsConfig = {};

      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify(emptyConfig));

      const result = loadConfig();
      expect(result).toEqual({});
    });
  });

  describe("loadConfigSafe", () => {
    it("should return undefined when no config found", () => {
      mockedExistsSync.mockReturnValue(false);

      const result = loadConfigSafe();
      expect(result).toBeUndefined();
    });

    it("should return undefined on config load error", () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockImplementation(() => {
        throw new Error("File error");
      });

      const result = loadConfigSafe();
      expect(result).toBeUndefined();
    });

    it("should return config when loading succeeds", () => {
      const mockConfig: GhoulsConfig = {
        protectedBranches: ["main"]
      };

      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = loadConfigSafe();
      expect(result).toEqual(mockConfig);
    });

    it("should log errors when logErrors is true", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockImplementation(() => {
        throw new Error("Test error");
      });

      const result = loadConfigSafe(true);

      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Failed to load configuration")
      );

      consoleSpy.mockRestore();
    });

    it("should log validation errors when logErrors is true", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify({
        protectedBranches: 123
      }));

      const result = loadConfigSafe(true);

      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Configuration validation failed")
      );

      consoleSpy.mockRestore();
    });

    it("should not log errors when logErrors is false", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockImplementation(() => {
        throw new Error("Test error");
      });

      const result = loadConfigSafe(false);

      expect(result).toBeUndefined();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("getConfigFilePaths", () => {
    it("should return config file paths with existence status", () => {
      process.env.GHOULS_CONFIG = "/env/config.json";

      // Mock find-up to find .git directory
      mockedFindUpSync.mockReturnValue("/current/dir/.git");

      mockedExistsSync.mockImplementation((path) => {
        if (path === "/resolved//env/config.json") return true;
        if (path === "/current/dir/.config/ghouls.json") return true;
        return false;
      });

      mockedReadFileSync.mockImplementation((path) => {
        if (path === "/resolved//env/config.json") {
          return "{\"protectedBranches\": [\"main\"]}";
        }
        if (path === "/current/dir/.config/ghouls.json") {
          return "invalid json";
        }
        throw new Error("File not found");
      });

      const result = getConfigFilePaths();

      expect(result).toEqual(
        expect.arrayContaining([
          { path: "/resolved//env/config.json", exists: true, loaded: true },
          {
            path: "/current/dir/.config/ghouls.json",
            exists: true,
            loaded: false,
            error: expect.stringContaining("Invalid JSON")
          }
        ])
      );
    });

    it("should handle non-existent files", () => {
      mockedExistsSync.mockReturnValue(false);
      mockedFindUpSync.mockReturnValue(undefined);

      const result = getConfigFilePaths();

      result.forEach(entry => {
        expect(entry.exists).toBe(false);
        expect(entry.loaded).toBe(false);
        expect(entry.error).toBeUndefined();
      });
    });
  });

  describe("ConfigLoadError", () => {
    it("should create error with message and path", () => {
      const error = new ConfigLoadError("Test message", "/test/path");

      expect(error.message).toBe("Test message");
      expect(error.path).toBe("/test/path");
      expect(error.name).toBe("ConfigLoadError");
      expect(error.cause).toBeUndefined();
    });

    it("should create error with cause", () => {
      const cause = new Error("Original error");
      const error = new ConfigLoadError("Test message", "/test/path", cause);

      expect(error.cause).toBe(cause);
    });

    it("should create error with validation errors", () => {
      const validationErrors = ["Error 1", "Error 2"];
      const error = new ConfigLoadError(
        "Test message",
        "/test/path",
        undefined,
        validationErrors
      );

      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.message).toBe("Test message");
      expect(error.path).toBe("/test/path");
    });
  });
});
