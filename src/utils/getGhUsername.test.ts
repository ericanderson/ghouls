import { execaSync } from "execa";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockExecaResult } from "../test/setup.js";
import { getGhUsername } from "./getGhUsername.js";

// Mock execa
vi.mock("execa");

const mockedExecaSync = vi.mocked(execaSync);

describe("getGhUsername", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return username when gh api user succeeds", () => {
    const mockUsername = "awesome-dude";
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: mockUsername,
      stderr: "",
      exitCode: 0,
      command: "gh api user --jq .login",
    }));

    const result = getGhUsername();

    expect(result).toBe(mockUsername);
    expect(mockedExecaSync).toHaveBeenCalledWith("gh", ["api", "user", "--jq", ".login"], {
      timeout: 10000,
      reject: false,
    });
  });

  it("should return trimmed username when stdout has whitespace", () => {
    const mockUsername = "awesome-dude";
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: `  ${mockUsername}  \n`,
      stderr: "",
      exitCode: 0,
      command: "gh api user --jq .login",
    }));

    const result = getGhUsername();

    expect(result).toBe(mockUsername);
  });

  it("should return null when stdout is empty", () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: "",
      stderr: "",
      exitCode: 0,
      command: "gh api user --jq .login",
    }));

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it("should return null when stdout is only whitespace", () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: "   \n\t  ",
      stderr: "",
      exitCode: 0,
      command: "gh api user --jq .login",
    }));

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it("should return null when stdout is undefined", () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: undefined as any,
      stderr: "",
      exitCode: 0,
      command: "gh api user --jq .login",
    }));

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it("should throw when gh command fails", () => {
    const mockResult = createMockExecaResult({
      stdout: "",
      stderr: "gh: command not found",
      exitCode: 127,
      command: "gh api user --jq .login",
      failed: true,
    });
    mockedExecaSync.mockReturnValue(mockResult);

    expect(() => getGhUsername()).toThrow();
  });

  it("should throw when execaSync throws an exception", () => {
    mockedExecaSync.mockImplementation(() => {
      throw new Error("Command failed");
    });

    expect(() => getGhUsername()).toThrow("Command failed");
  });

  it("should throw when gh is not authenticated", () => {
    const mockResult = createMockExecaResult({
      stdout: "",
      stderr: "gh: To get started with GitHub CLI, please run: gh auth login",
      exitCode: 1,
      command: "gh api user --jq .login",
      failed: true,
    });
    mockedExecaSync.mockReturnValue(mockResult);

    expect(() => getGhUsername()).toThrow();
  });

  it("should throw when API request fails", () => {
    const mockResult = createMockExecaResult({
      stdout: "",
      stderr: "HTTP 401: Unauthorized (https://api.github.com/user)",
      exitCode: 1,
      command: "gh api user --jq .login",
      failed: true,
    });
    mockedExecaSync.mockReturnValue(mockResult);

    expect(() => getGhUsername()).toThrow();
  });

  it("should throw when timeout occurs", () => {
    const mockResult = createMockExecaResult({
      stdout: "",
      stderr: "",
      exitCode: 124,
      command: "gh api user --jq .login",
      failed: true,
      timedOut: true,
    });
    mockedExecaSync.mockReturnValue(mockResult);

    expect(() => getGhUsername()).toThrow();
    expect(mockedExecaSync).toHaveBeenCalledWith("gh", ["api", "user", "--jq", ".login"], {
      timeout: 10000,
      reject: false,
    });
  });

  it("should throw when jq parsing errors occur", () => {
    const mockResult = createMockExecaResult({
      stdout: "",
      stderr: "jq: error: Invalid JSON",
      exitCode: 1,
      command: "gh api user --jq .login",
      failed: true,
    });
    mockedExecaSync.mockReturnValue(mockResult);

    expect(() => getGhUsername()).toThrow();
  });
});
