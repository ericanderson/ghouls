import { describe, expect, it } from "vitest";
import { PullRequestReference } from "../OctokitPlus.js";
import { ownerAndRepoMatch } from "./ownerAndRepoMatch.js";

describe("ownerAndRepoMatch", () => {
  const createPullRequestReference = (owner: string, repo: string): PullRequestReference => ({
    label: `${owner}:branch`,
    ref: "branch",
    sha: "abc123",
    repo: {
      name: repo,
      owner: { login: owner },
      fork: false,
    },
  });

  it("should return true when owner and repo match", () => {
    const refA = createPullRequestReference("octocat", "hello-world");
    const refB = createPullRequestReference("octocat", "hello-world");

    expect(ownerAndRepoMatch(refA, refB)).toBeTruthy();
  });

  it("should return false when owners do not match", () => {
    const refA = createPullRequestReference("octocat", "hello-world");
    const refB = createPullRequestReference("github", "hello-world");

    expect(ownerAndRepoMatch(refA, refB)).toBeFalsy();
  });

  it("should return false when repos do not match", () => {
    const refA = createPullRequestReference("octocat", "hello-world");
    const refB = createPullRequestReference("octocat", "goodbye-world");

    expect(ownerAndRepoMatch(refA, refB)).toBeFalsy();
  });

  it("should return false when both owner and repo do not match", () => {
    const refA = createPullRequestReference("octocat", "hello-world");
    const refB = createPullRequestReference("github", "goodbye-world");

    expect(ownerAndRepoMatch(refA, refB)).toBeFalsy();
  });

  it("should return false when first reference has no repo", () => {
    const refA: PullRequestReference = {
      label: "octocat:branch",
      ref: "branch",
      sha: "abc123",
      repo: null,
    };
    const refB = createPullRequestReference("octocat", "hello-world");

    expect(ownerAndRepoMatch(refA, refB)).toBeFalsy();
  });

  it("should return false when second reference has no repo", () => {
    const refA = createPullRequestReference("octocat", "hello-world");
    const refB: PullRequestReference = {
      label: "octocat:branch",
      ref: "branch",
      sha: "abc123",
      repo: null,
    };

    expect(ownerAndRepoMatch(refA, refB)).toBeFalsy();
  });

  it("should return false when both references have no repo", () => {
    const refA: PullRequestReference = {
      label: "octocat:branch",
      ref: "branch",
      sha: "abc123",
      repo: null,
    };
    const refB: PullRequestReference = {
      label: "github:branch",
      ref: "branch",
      sha: "def456",
      repo: null,
    };

    expect(ownerAndRepoMatch(refA, refB)).toBeFalsy();
  });

  it("should handle case sensitivity correctly", () => {
    const refA = createPullRequestReference("OctoCat", "Hello-World");
    const refB = createPullRequestReference("octocat", "hello-world");

    // GitHub usernames and repo names are case-insensitive in URLs but
    // the API returns them with original casing, so exact match is expected
    expect(ownerAndRepoMatch(refA, refB)).toBeFalsy();
  });

  it("should handle special characters in owner and repo names", () => {
    const refA = createPullRequestReference("octo-cat_123", "hello.world-repo");
    const refB = createPullRequestReference("octo-cat_123", "hello.world-repo");

    expect(ownerAndRepoMatch(refA, refB)).toBeTruthy();
  });

  it("should handle empty strings in owner login", () => {
    const refA: PullRequestReference = {
      label: ":branch",
      ref: "branch",
      sha: "abc123",
      repo: {
        name: "hello-world",
        owner: { login: "" },
        fork: false,
      },
    };
    const refB = createPullRequestReference("octocat", "hello-world");

    expect(ownerAndRepoMatch(refA, refB)).toBeFalsy();
  });

  it("should handle empty strings in repo name", () => {
    const refA: PullRequestReference = {
      label: "octocat:branch",
      ref: "branch",
      sha: "abc123",
      repo: {
        name: "",
        owner: { login: "octocat" },
        fork: false,
      },
    };
    const refB = createPullRequestReference("octocat", "hello-world");

    expect(ownerAndRepoMatch(refA, refB)).toBeFalsy();
  });

  it("should work with forked repositories", () => {
    const refA: PullRequestReference = {
      label: "octocat:branch",
      ref: "branch",
      sha: "abc123",
      repo: {
        name: "hello-world",
        owner: { login: "octocat" },
        fork: true,
      },
    };
    const refB: PullRequestReference = {
      label: "octocat:branch",
      ref: "branch",
      sha: "def456",
      repo: {
        name: "hello-world",
        owner: { login: "octocat" },
        fork: false,
      },
    };

    // Fork status doesn't affect the match
    expect(ownerAndRepoMatch(refA, refB)).toBeTruthy();
  });
});
