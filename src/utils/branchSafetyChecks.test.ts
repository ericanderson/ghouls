import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PullRequest } from "../OctokitPlus.js";
import type { GhoulsConfig } from "../types/config.js";
import { filterSafeBranches, isBranchSafeToDelete } from "./branchSafetyChecks.js";
import type { LocalBranch } from "./localGitOperations.js";
import { getBranchStatus } from "./localGitOperations.js";

// Mock localGitOperations
vi.mock("../../src/utils/localGitOperations.js");
const mockedGetBranchStatus = vi.mocked(getBranchStatus);

describe("branchSafetyChecks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isBranchSafeToDelete", () => {
    const createLocalBranch = (
      name: string,
      sha: string,
      isCurrent: boolean = false
    ): LocalBranch => ({
      name,
      sha,
      isCurrent
    });

    const createPullRequest = (
      headSha: string,
      mergeCommitSha?: string
    ): PullRequest => ({
      id: 123,
      number: 1,
      user: { login: "user" },
      state: "closed",
      head: {
        label: "user:feature-branch",
        ref: "feature-branch",
        sha: headSha,
        repo: {
          name: "test-repo",
          owner: { login: "user" },
          fork: false
        }
      },
      base: {
        label: "user:main",
        ref: "main",
        sha: "base-sha",
        repo: {
          name: "test-repo",
          owner: { login: "user" },
          fork: false
        }
      },
      merge_commit_sha: mergeCommitSha || null
    });

    describe("current branch checks", () => {
      it("should not allow deleting current branch (isCurrent=true)", () => {
        const branch = createLocalBranch("main", "abc123", true);
        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

        const result = isBranchSafeToDelete(branch, "develop");

        expect(result).toEqual({
          safe: false,
          reason: "current branch"
        });
      });

      it("should not allow deleting branch matching current branch name", () => {
        const branch = createLocalBranch("main", "abc123", false);
        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

        const result = isBranchSafeToDelete(branch, "main");

        expect(result).toEqual({
          safe: false,
          reason: "current branch"
        });
      });
    });

    describe("protected branch checks", () => {
      const protectedBranches = [
        "main",
        "master",
        "develop",
        "dev",
        "staging",
        "production",
        "prod"
      ];

      protectedBranches.forEach(branchName => {
        it(`should not allow deleting protected branch: ${branchName}`, () => {
          const branch = createLocalBranch(branchName, "abc123");
          mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

          const result = isBranchSafeToDelete(branch, "other-branch");

          expect(result).toEqual({
            safe: false,
            reason: "protected branch"
          });
        });

        it(`should not allow deleting protected branch with different case: ${branchName.toUpperCase()}`, () => {
          const branch = createLocalBranch(branchName.toUpperCase(), "abc123");
          mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

          const result = isBranchSafeToDelete(branch, "other-branch");

          expect(result).toEqual({
            safe: false,
            reason: "protected branch"
          });
        });
      });

      it("should allow deleting non-protected branches", () => {
        const branch = createLocalBranch("feature/test", "abc123");
        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

        const result = isBranchSafeToDelete(branch, "main");

        expect(result).toEqual({ safe: true });
      });
    });

    describe("PR SHA matching checks", () => {
      it("should not allow deleting when PR head SHA does not match branch SHA", () => {
        const branch = createLocalBranch("feature-branch", "abc123");
        const pr = createPullRequest("different-sha", "merge-sha");
        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

        const result = isBranchSafeToDelete(branch, "main", pr);

        expect(result).toEqual({
          safe: false,
          reason: "SHA mismatch with PR head"
        });
      });

      it("should not allow deleting when PR was not merged", () => {
        const branch = createLocalBranch("feature-branch", "abc123");
        const pr = createPullRequest("abc123"); // No merge commit SHA
        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

        const result = isBranchSafeToDelete(branch, "main", pr);

        expect(result).toEqual({
          safe: false,
          reason: "PR was not merged"
        });
      });

      it("should allow deleting when PR head SHA matches and PR was merged", () => {
        const branch = createLocalBranch("feature-branch", "abc123");
        const pr = createPullRequest("abc123", "merge-sha");
        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

        const result = isBranchSafeToDelete(branch, "main", pr);

        expect(result).toEqual({ safe: true });
      });
    });

    describe("unpushed commits checks", () => {
      it("should not allow deleting when branch has unpushed commits", () => {
        const branch = createLocalBranch("feature-branch", "abc123");
        mockedGetBranchStatus.mockReturnValue({ ahead: 2, behind: 0 });

        const result = isBranchSafeToDelete(branch, "main");

        expect(result).toEqual({
          safe: false,
          reason: "2 unpushed commits"
        });
      });

      it("should handle singular unpushed commit message", () => {
        const branch = createLocalBranch("feature-branch", "abc123");
        mockedGetBranchStatus.mockReturnValue({ ahead: 1, behind: 0 });

        const result = isBranchSafeToDelete(branch, "main");

        expect(result).toEqual({
          safe: false,
          reason: "1 unpushed commit"
        });
      });

      it("should allow deleting when no unpushed commits", () => {
        const branch = createLocalBranch("feature-branch", "abc123");
        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 2 });

        const result = isBranchSafeToDelete(branch, "main");

        expect(result).toEqual({ safe: true });
      });

      it("should allow deleting when branch status is null", () => {
        const branch = createLocalBranch("feature-branch", "abc123");
        mockedGetBranchStatus.mockReturnValue(null);

        const result = isBranchSafeToDelete(branch, "main");

        expect(result).toEqual({ safe: true });
      });
    });

    describe("combined scenarios", () => {
      it("should prioritize current branch check over other checks", () => {
        const branch = createLocalBranch("main", "abc123", true);
        const pr = createPullRequest("abc123", "merge-sha");
        mockedGetBranchStatus.mockReturnValue({ ahead: 5, behind: 0 });

        const result = isBranchSafeToDelete(branch, "develop", pr);

        expect(result).toEqual({
          safe: false,
          reason: "current branch"
        });
      });

      it("should prioritize protected branch check over PR checks", () => {
        const branch = createLocalBranch("main", "abc123");
        const pr = createPullRequest("abc123", "merge-sha");
        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

        const result = isBranchSafeToDelete(branch, "develop", pr);

        expect(result).toEqual({
          safe: false,
          reason: "protected branch"
        });
      });

      it("should check PR SHA before unpushed commits", () => {
        const branch = createLocalBranch("feature-branch", "abc123");
        const pr = createPullRequest("different-sha", "merge-sha");
        mockedGetBranchStatus.mockReturnValue({ ahead: 2, behind: 0 });

        const result = isBranchSafeToDelete(branch, "main", pr);

        expect(result).toEqual({
          safe: false,
          reason: "SHA mismatch with PR head"
        });
      });

      it("should check merged status before unpushed commits", () => {
        const branch = createLocalBranch("feature-branch", "abc123");
        const pr = createPullRequest("abc123"); // Not merged
        mockedGetBranchStatus.mockReturnValue({ ahead: 2, behind: 0 });

        const result = isBranchSafeToDelete(branch, "main", pr);

        expect(result).toEqual({
          safe: false,
          reason: "PR was not merged"
        });
      });

      it("should allow deletion when all checks pass", () => {
        const branch = createLocalBranch("feature-branch", "abc123");
        const pr = createPullRequest("abc123", "merge-sha");
        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

        const result = isBranchSafeToDelete(branch, "main", pr);

        expect(result).toEqual({ safe: true });
      });

      it("should allow deletion without PR when all other checks pass", () => {
        const branch = createLocalBranch("feature-branch", "abc123");
        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

        const result = isBranchSafeToDelete(branch, "main");

        expect(result).toEqual({ safe: true });
      });
    });
  });

  describe("filterSafeBranches", () => {
    const createLocalBranch = (
      name: string,
      sha: string,
      isCurrent: boolean = false
    ): LocalBranch => ({
      name,
      sha,
      isCurrent
    });

    const createPullRequest = (
      headRef: string,
      headSha: string,
      mergeCommitSha?: string
    ): PullRequest => ({
      id: 123,
      number: 1,
      user: { login: "user" },
      state: "closed",
      head: {
        label: `user:${headRef}`,
        ref: headRef,
        sha: headSha,
        repo: {
          name: "test-repo",
          owner: { login: "user" },
          fork: false
        }
      },
      base: {
        label: "user:main",
        ref: "main",
        sha: "base-sha",
        repo: {
          name: "test-repo",
          owner: { login: "user" },
          fork: false
        }
      },
      merge_commit_sha: mergeCommitSha || null
    });

    it("should filter branches with safety checks", () => {
      const branches = [
        createLocalBranch("main", "abc123", true),
        createLocalBranch("feature-1", "def456"),
        createLocalBranch("feature-2", "ghi789")
      ];

      const mergedPRs = new Map([
        ["feature-1", createPullRequest("feature-1", "def456", "merge-sha-1")],
        ["feature-2", createPullRequest("feature-2", "ghi789", "merge-sha-2")]
      ]);

      mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

      const result = filterSafeBranches(branches, "main", mergedPRs);

      expect(result).toHaveLength(3);

      // Check main branch (unsafe - current)
      expect(result[0]).toEqual({
        branch: branches[0],
        safetyCheck: { safe: false, reason: "current branch" },
        matchingPR: undefined
      });

      // Check feature-1 (safe)
      expect(result[1]).toEqual({
        branch: branches[1],
        safetyCheck: { safe: true },
        matchingPR: mergedPRs.get("feature-1")
      });

      // Check feature-2 (safe)
      expect(result[2]).toEqual({
        branch: branches[2],
        safetyCheck: { safe: true },
        matchingPR: mergedPRs.get("feature-2")
      });
    });

    it("should handle branches without matching PRs", () => {
      const branches = [
        createLocalBranch("feature-1", "def456"),
        createLocalBranch("feature-2", "ghi789")
      ];

      const mergedPRs = new Map([
        ["feature-1", createPullRequest("feature-1", "def456", "merge-sha-1")]
      ]);

      mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

      const result = filterSafeBranches(branches, "main", mergedPRs);

      expect(result).toHaveLength(2);

      // Check feature-1 (has PR)
      expect(result[0]).toEqual({
        branch: branches[0],
        safetyCheck: { safe: true },
        matchingPR: mergedPRs.get("feature-1")
      });

      // Check feature-2 (no PR)
      expect(result[1]).toEqual({
        branch: branches[1],
        safetyCheck: { safe: true },
        matchingPR: undefined
      });
    });

    it("should handle empty branches array", () => {
      const result = filterSafeBranches([], "main", new Map());

      expect(result).toEqual([]);
    });

    it("should handle empty merged PRs map", () => {
      const branches = [
        createLocalBranch("feature-1", "def456")
      ];

      mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

      const result = filterSafeBranches(branches, "main");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        branch: branches[0],
        safetyCheck: { safe: true },
        matchingPR: undefined
      });
    });

    it("should handle mixed safe and unsafe branches", () => {
      const branches = [
        createLocalBranch("main", "abc123"),
        createLocalBranch("develop", "def456"),
        createLocalBranch("feature-safe", "ghi789"),
        createLocalBranch("feature-unpushed", "jkl012")
      ];

      const mergedPRs = new Map([
        [
          "feature-safe",
          createPullRequest("feature-safe", "ghi789", "merge-sha")
        ],
        [
          "feature-unpushed",
          createPullRequest("feature-unpushed", "jkl012", "merge-sha")
        ]
      ]);

      mockedGetBranchStatus.mockImplementation((branchName) => {
        if (branchName === "feature-unpushed") {
          return { ahead: 3, behind: 0 };
        }
        return { ahead: 0, behind: 0 };
      });

      const result = filterSafeBranches(branches, "other", mergedPRs);

      expect(result).toHaveLength(4);

      // main - protected
      expect(result[0].safetyCheck).toEqual({
        safe: false,
        reason: "protected branch"
      });

      // develop - protected
      expect(result[1].safetyCheck).toEqual({
        safe: false,
        reason: "protected branch"
      });

      // feature-safe - safe
      expect(result[2].safetyCheck).toEqual({ safe: true });

      // feature-unpushed - has unpushed commits
      expect(result[3].safetyCheck).toEqual({
        safe: false,
        reason: "3 unpushed commits"
      });
    });

    it("should call getBranchStatus for each branch", () => {
      const branches = [
        createLocalBranch("feature-1", "def456"),
        createLocalBranch("feature-2", "ghi789")
      ];

      mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

      filterSafeBranches(branches, "main", new Map());

      expect(mockedGetBranchStatus).toHaveBeenCalledTimes(2);
      expect(mockedGetBranchStatus).toHaveBeenCalledWith("feature-1");
      expect(mockedGetBranchStatus).toHaveBeenCalledWith("feature-2");
    });
  });

  describe("configuration support", () => {
    const createLocalBranch = (
      name: string,
      sha: string,
      isCurrent: boolean = false
    ): LocalBranch => ({
      name,
      sha,
      isCurrent
    });

    beforeEach(() => {
      mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });
    });

    describe("custom protected branches", () => {
      it("should use custom protected branch list", () => {
        const branch = createLocalBranch("custom-protected", "abc123");
        const config: GhoulsConfig = {
          protectedBranches: ["main", "custom-protected"]
        };

        const result = isBranchSafeToDelete(branch, "main", undefined, config);

        expect(result).toEqual({
          safe: false,
          reason: "protected branch"
        });
      });

      it("should not protect default branches when custom list provided", () => {
        const branch = createLocalBranch("develop", "abc123"); // normally protected
        const config: GhoulsConfig = {
          protectedBranches: ["main", "staging"] // develop not included
        };

        const result = isBranchSafeToDelete(branch, "main", undefined, config);

        expect(result).toEqual({ safe: true });
      });

      it("should be case-insensitive for custom protected branches", () => {
        const branch = createLocalBranch("CUSTOM-PROTECTED", "abc123");
        const config: GhoulsConfig = {
          protectedBranches: ["main", "custom-protected"]
        };

        const result = isBranchSafeToDelete(branch, "main", undefined, config);

        expect(result).toEqual({
          safe: false,
          reason: "protected branch"
        });
      });
    });

    describe("filterSafeBranches with configuration", () => {
      it("should pass configuration to isBranchSafeToDelete", () => {
        const branches = [
          createLocalBranch("custom-protected", "abc123"),
          createLocalBranch("release/v1.0.0", "def456"),
          createLocalBranch("safe-branch", "ghi789")
        ];
        const config: GhoulsConfig = {
          protectedBranches: ["custom-protected"]
        };

        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

        const result = filterSafeBranches(branches, "main", new Map(), config);

        expect(result).toHaveLength(3);
        expect(result[0].safetyCheck).toEqual({
          safe: false,
          reason: "protected branch"
        });

        expect(result[2].safetyCheck).toEqual({ safe: true });
      });

      it("should work without configuration (backward compatibility)", () => {
        const branches = [
          createLocalBranch("main", "abc123"),
          createLocalBranch("feature-branch", "def456")
        ];

        mockedGetBranchStatus.mockReturnValue({ ahead: 0, behind: 0 });

        const result = filterSafeBranches(branches, "develop", new Map());

        expect(result).toHaveLength(2);
        expect(result[0].safetyCheck).toEqual({
          safe: false,
          reason: "protected branch"
        });
        expect(result[1].safetyCheck).toEqual({ safe: true });
      });
    });

    describe("configuration precedence and merging", () => {
      it("should apply configuration rules in correct precedence order", () => {
        // Test that current branch check still has highest precedence
        const branch = createLocalBranch("custom-protected", "abc123", true);
        const config: GhoulsConfig = {
          protectedBranches: ["custom-protected"]
        };

        const result = isBranchSafeToDelete(
          branch,
          "custom-protected",
          undefined,
          config
        );

        expect(result).toEqual({
          safe: false,
          reason: "current branch"
        });
      });

      it("should check protected branches before patterns", () => {
        const branch = createLocalBranch("main", "abc123");
        const config: GhoulsConfig = {
          protectedBranches: ["main"]
        };

        const result = isBranchSafeToDelete(
          branch,
          "develop",
          undefined,
          config
        );

        // Should use protected branch reason, not pattern or custom rule
        expect(result).toEqual({
          safe: false,
          reason: "protected branch"
        });
      });
    });
  });
});
