import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pruneLocalBranchesCommand } from '../../src/commands/PruneLocalBranches.js';
import { getConfig } from '../../src/utils/getConfig.js';
import { createOctokitPlus } from '../../src/utils/createOctokitPlus.js';
import { getGitRemote } from '../../src/utils/getGitRemote.js';
import {
  getLocalBranches,
  getCurrentBranch,
  deleteLocalBranch,
  isGitRepository
} from '../../src/utils/localGitOperations.js';
import { filterSafeBranches } from '../../src/utils/branchSafetyChecks.js';
import type { LocalBranch } from '../../src/utils/localGitOperations.js';
import type { PullRequest, OctokitPlus } from '../../src/OctokitPlus.js';

// Mock all dependencies
vi.mock('../../src/utils/getConfig.js');
vi.mock('../../src/utils/createOctokitPlus.js');
vi.mock('../../src/utils/getGitRemote.js');
vi.mock('../../src/utils/localGitOperations.js');
vi.mock('../../src/utils/branchSafetyChecks.js');
vi.mock('progress');

const mockedGetConfig = vi.mocked(getConfig);
const mockedCreateOctokitPlus = vi.mocked(createOctokitPlus);
const mockedGetGitRemote = vi.mocked(getGitRemote);
const mockedGetLocalBranches = vi.mocked(getLocalBranches);
const mockedGetCurrentBranch = vi.mocked(getCurrentBranch);
const mockedDeleteLocalBranch = vi.mocked(deleteLocalBranch);
const mockedIsGitRepository = vi.mocked(isGitRepository);
const mockedFilterSafeBranches = vi.mocked(filterSafeBranches);

describe('PruneLocalBranches', () => {
  let mockOctokitPlus: jest.Mocked<OctokitPlus>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  const createLocalBranch = (name: string, sha: string, isCurrent: boolean = false): LocalBranch => ({
    name,
    sha,
    isCurrent
  });

  const createPullRequest = (number: number, headRef: string, headSha: string, mergeCommitSha?: string): PullRequest => ({
    id: 123 + number,
    number,
    title: `Test PR ${number}`,
    head: {
      ref: headRef,
      sha: headSha,
      user: { login: 'user' },
      repo: {
        id: 1,
        name: 'test-repo',
        full_name: 'user/test-repo',
        owner: { login: 'user' },
        private: false,
        html_url: 'https://github.com/user/test-repo',
        description: null,
        fork: false,
        url: 'https://api.github.com/repos/user/test-repo'
      }
    },
    base: {
      ref: 'main',
      sha: 'base-sha',
      user: { login: 'user' },
      repo: {
        id: 1,
        name: 'test-repo',
        full_name: 'user/test-repo',
        owner: { login: 'user' },
        private: false,
        html_url: 'https://github.com/user/test-repo',
        description: null,
        fork: false,
        url: 'https://api.github.com/repos/user/test-repo'
      }
    },
    merge_commit_sha: mergeCommitSha || null,
    merged: !!mergeCommitSha,
    state: 'closed' as const,
    draft: false,
    html_url: `https://github.com/user/test-repo/pull/${number}`,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    closed_at: '2023-01-02T00:00:00Z',
    merged_at: mergeCommitSha ? '2023-01-02T00:00:00Z' : null,
    user: { login: 'user' }
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock process.stderr.isTTY
    Object.defineProperty(process.stderr, 'isTTY', {
      value: false,
      configurable: true
    });

    // Setup mock OctokitPlus
    mockOctokitPlus = {
      getPullRequests: vi.fn(),
      getReference: vi.fn(),
      deleteReference: vi.fn()
    } as any;

    mockedCreateOctokitPlus.mockReturnValue(mockOctokitPlus);
    mockedGetConfig.mockReturnValue({
      token: 'test-token',
      username: 'test-user',
      baseUrl: 'https://api.github.com'
    });
    mockedIsGitRepository.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('command configuration', () => {
    it('should have correct command definition', () => {
      expect(pruneLocalBranchesCommand.command).toBe('pruneLocalBranches [--dry-run] [repo]');
      expect(pruneLocalBranchesCommand.describe).toBe('Prunes local branches that have been merged via pull requests');
    });

    it('should configure yargs builder correctly', () => {
      const mockYargs = {
        env: vi.fn().mockReturnThis(),
        boolean: vi.fn().mockReturnThis(),
        positional: vi.fn().mockReturnThis()
      };

      pruneLocalBranchesCommand.builder!(mockYargs as any);

      expect(mockYargs.env).toHaveBeenCalled();
      expect(mockYargs.boolean).toHaveBeenCalledWith('dry-run');
      expect(mockYargs.positional).toHaveBeenCalledWith('repo', expect.any(Object));
    });
  });

  describe('repo string validation', () => {
    it('should parse valid repo string', () => {
      const mockYargs = {
        env: vi.fn().mockReturnThis(),
        boolean: vi.fn().mockReturnThis(),
        positional: vi.fn((key, config) => {
          if (key === 'repo' && config.coerce) {
            const result = config.coerce('owner/repo');
            expect(result).toEqual({ owner: 'owner', repo: 'repo' });
          }
          return mockYargs;
        })
      };

      pruneLocalBranchesCommand.builder!(mockYargs as any);
    });

    it('should handle undefined repo string', () => {
      const mockYargs = {
        env: vi.fn().mockReturnThis(),
        boolean: vi.fn().mockReturnThis(),
        positional: vi.fn((key, config) => {
          if (key === 'repo' && config.coerce) {
            const result = config.coerce(undefined);
            expect(result).toBeUndefined();
          }
          return mockYargs;
        })
      };

      pruneLocalBranchesCommand.builder!(mockYargs as any);
    });

    it('should reject invalid repo format', () => {
      const mockYargs = {
        env: vi.fn().mockReturnThis(),
        boolean: vi.fn().mockReturnThis(),
        positional: vi.fn((key, config) => {
          if (key === 'repo' && config.coerce) {
            expect(() => config.coerce('invalid')).toThrow('Repository must be in the format \'owner/repo\'');
            expect(() => config.coerce('owner/')).toThrow('Repository must be in the format \'owner/repo\'');
            expect(() => config.coerce('/repo')).toThrow('Repository must be in the format \'owner/repo\'');
          }
          return mockYargs;
        })
      };

      pruneLocalBranchesCommand.builder!(mockYargs as any);
    });

    it('should validate owner name format', () => {
      const mockYargs = {
        env: vi.fn().mockReturnThis(),
        boolean: vi.fn().mockReturnThis(),
        positional: vi.fn((key, config) => {
          if (key === 'repo' && config.coerce) {
            expect(() => config.coerce('-invalid/repo')).toThrow('Invalid owner name');
            expect(() => config.coerce('invalid-/repo')).toThrow('Invalid owner name');
            expect(() => config.coerce('in@valid/repo')).toThrow('Invalid owner name');
          }
          return mockYargs;
        })
      };

      pruneLocalBranchesCommand.builder!(mockYargs as any);
    });

    it('should validate repo name format', () => {
      const mockYargs = {
        env: vi.fn().mockReturnThis(),
        boolean: vi.fn().mockReturnThis(),
        positional: vi.fn((key, config) => {
          if (key === 'repo' && config.coerce) {
            expect(() => config.coerce('owner/in@valid')).toThrow('Invalid repository name');
            expect(() => config.coerce('owner/in valid')).toThrow('Invalid repository name');
          }
          return mockYargs;
        })
      };

      pruneLocalBranchesCommand.builder!(mockYargs as any);
    });
  });

  describe('handler execution', () => {
    it('should throw error when not in git repository', async () => {
      mockedIsGitRepository.mockReturnValue(false);

      await expect(pruneLocalBranchesCommand.handler!({ dryRun: false })).rejects.toThrow(
        'This command must be run from within a git repository.'
      );
    });

    it('should use provided repo when available', async () => {
      const branches = [createLocalBranch('feature-1', 'abc123')];
      mockedGetLocalBranches.mockReturnValue(branches);
      mockedGetCurrentBranch.mockReturnValue('main');
      mockedFilterSafeBranches.mockReturnValue([
        { branch: branches[0], safetyCheck: { safe: true }, matchingPR: undefined }
      ]);

      // Mock async generator for getPullRequests
      const mockPullRequests = [createPullRequest(1, 'feature-1', 'abc123', 'merge-sha')];
      const asyncGenerator = (async function* () {
        for (const pr of mockPullRequests) {
          yield pr;
        }
      })();
      mockOctokitPlus.getPullRequests.mockReturnValue(asyncGenerator);

      const args = {
        repo: { owner: 'test-owner', repo: 'test-repo' },
        dryRun: true
      };

      await pruneLocalBranchesCommand.handler!(args);

      expect(mockOctokitPlus.getPullRequests).toHaveBeenCalledWith({
        repo: 'test-repo',
        owner: 'test-owner',
        per_page: 100,
        state: 'closed',
        sort: 'updated',
        direction: 'desc'
      });
    });

    it('should use git remote when repo not provided', async () => {
      mockedGetGitRemote.mockReturnValue({ owner: 'remote-owner', repo: 'remote-repo' });
      
      const branches = [createLocalBranch('feature-1', 'abc123')];
      mockedGetLocalBranches.mockReturnValue(branches);
      mockedGetCurrentBranch.mockReturnValue('main');
      mockedFilterSafeBranches.mockReturnValue([
        { branch: branches[0], safetyCheck: { safe: true }, matchingPR: undefined }
      ]);

      // Mock async generator for getPullRequests
      const mockPullRequests = [createPullRequest(1, 'feature-1', 'abc123', 'merge-sha')];
      const asyncGenerator = (async function* () {
        for (const pr of mockPullRequests) {
          yield pr;
        }
      })();
      mockOctokitPlus.getPullRequests.mockReturnValue(asyncGenerator);

      const args = { dryRun: false };

      await pruneLocalBranchesCommand.handler!(args);

      expect(mockedGetGitRemote).toHaveBeenCalled();
      expect(mockOctokitPlus.getPullRequests).toHaveBeenCalledWith({
        repo: 'remote-repo',
        owner: 'remote-owner',
        per_page: 100,
        state: 'closed',
        sort: 'updated',
        direction: 'desc'
      });
    });

    it('should throw error when no repo provided and no git remote', async () => {
      mockedGetGitRemote.mockReturnValue(null);

      await expect(pruneLocalBranchesCommand.handler!({ dryRun: false })).rejects.toThrow(
        'No repo specified and unable to detect from git remote. Please run from a git repository or specify owner/repo.'
      );
    });

    it('should handle empty local branches', async () => {
      mockedGetLocalBranches.mockReturnValue([]);
      mockedGetCurrentBranch.mockReturnValue('main');
      mockedGetGitRemote.mockReturnValue({ owner: 'owner', repo: 'repo' });

      // Mock async generator for getPullRequests
      const asyncGenerator = (async function* () {})();
      mockOctokitPlus.getPullRequests.mockReturnValue(asyncGenerator);

      await pruneLocalBranchesCommand.handler!({ dryRun: false });

      expect(consoleLogSpy).toHaveBeenCalledWith('No local branches found.');
    });

    it('should handle no safe branches to delete', async () => {
      const branches = [
        createLocalBranch('main', 'abc123', true),
        createLocalBranch('develop', 'def456')
      ];
      mockedGetLocalBranches.mockReturnValue(branches);
      mockedGetCurrentBranch.mockReturnValue('main');
      mockedGetGitRemote.mockReturnValue({ owner: 'owner', repo: 'repo' });

      // All branches are unsafe
      mockedFilterSafeBranches.mockReturnValue([
        { branch: branches[0], safetyCheck: { safe: false, reason: 'current branch' }, matchingPR: undefined },
        { branch: branches[1], safetyCheck: { safe: false, reason: 'protected branch' }, matchingPR: undefined }
      ]);

      // Mock async generator for getPullRequests
      const asyncGenerator = (async function* () {})();
      mockOctokitPlus.getPullRequests.mockReturnValue(asyncGenerator);

      await pruneLocalBranchesCommand.handler!({ dryRun: false });

      expect(consoleLogSpy).toHaveBeenCalledWith('\nNo branches are safe to delete.');
      expect(consoleLogSpy).toHaveBeenCalledWith('\nSkipping unsafe branches:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  - main (current branch)');
      expect(consoleLogSpy).toHaveBeenCalledWith('  - develop (protected branch)');
    });

    it('should delete safe branches in non-dry-run mode', async () => {
      const branches = [createLocalBranch('feature-1', 'abc123'), createLocalBranch('feature-2', 'def456')];
      const pr1 = createPullRequest(1, 'feature-1', 'abc123', 'merge-sha-1');
      const pr2 = createPullRequest(2, 'feature-2', 'def456', 'merge-sha-2');
      
      mockedGetLocalBranches.mockReturnValue(branches);
      mockedGetCurrentBranch.mockReturnValue('main');
      mockedGetGitRemote.mockReturnValue({ owner: 'owner', repo: 'repo' });

      mockedFilterSafeBranches.mockReturnValue([
        { branch: branches[0], safetyCheck: { safe: true }, matchingPR: pr1 },
        { branch: branches[1], safetyCheck: { safe: true }, matchingPR: pr2 }
      ]);

      // Mock async generator for getPullRequests
      const mockPullRequests = [pr1, pr2];
      const asyncGenerator = (async function* () {
        for (const pr of mockPullRequests) {
          yield pr;
        }
      })();
      mockOctokitPlus.getPullRequests.mockReturnValue(asyncGenerator);

      await pruneLocalBranchesCommand.handler!({ dryRun: false });

      expect(mockedDeleteLocalBranch).toHaveBeenCalledWith('feature-1');
      expect(mockedDeleteLocalBranch).toHaveBeenCalledWith('feature-2');
      expect(consoleLogSpy).toHaveBeenCalledWith('Deleted: feature-1 (#1)');
      expect(consoleLogSpy).toHaveBeenCalledWith('Deleted: feature-2 (#2)');
    });

    it('should simulate deletion in dry-run mode', async () => {
      const branches = [createLocalBranch('feature-1', 'abc123')];
      const pr1 = createPullRequest(1, 'feature-1', 'abc123', 'merge-sha-1');
      
      mockedGetLocalBranches.mockReturnValue(branches);
      mockedGetCurrentBranch.mockReturnValue('main');
      mockedGetGitRemote.mockReturnValue({ owner: 'owner', repo: 'repo' });

      mockedFilterSafeBranches.mockReturnValue([
        { branch: branches[0], safetyCheck: { safe: true }, matchingPR: pr1 }
      ]);

      // Mock async generator for getPullRequests
      const asyncGenerator = (async function* () {
        yield pr1;
      })();
      mockOctokitPlus.getPullRequests.mockReturnValue(asyncGenerator);

      await pruneLocalBranchesCommand.handler!({ dryRun: true });

      expect(mockedDeleteLocalBranch).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('[DRY RUN] Would delete: feature-1 (#1)');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Would delete: 1 branch');
    });

    it('should handle branches without matching PRs', async () => {
      const branches = [createLocalBranch('feature-no-pr', 'abc123')];
      
      mockedGetLocalBranches.mockReturnValue(branches);
      mockedGetCurrentBranch.mockReturnValue('main');
      mockedGetGitRemote.mockReturnValue({ owner: 'owner', repo: 'repo' });

      mockedFilterSafeBranches.mockReturnValue([
        { branch: branches[0], safetyCheck: { safe: true }, matchingPR: undefined }
      ]);

      // Mock async generator for getPullRequests (no PRs)
      const asyncGenerator = (async function* () {})();
      mockOctokitPlus.getPullRequests.mockReturnValue(asyncGenerator);

      await pruneLocalBranchesCommand.handler!({ dryRun: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('[DRY RUN] Would delete: feature-no-pr (no PR)');
    });

    it('should handle deletion errors', async () => {
      const branches = [createLocalBranch('feature-1', 'abc123')];
      const pr1 = createPullRequest(1, 'feature-1', 'abc123', 'merge-sha-1');
      
      mockedGetLocalBranches.mockReturnValue(branches);
      mockedGetCurrentBranch.mockReturnValue('main');
      mockedGetGitRemote.mockReturnValue({ owner: 'owner', repo: 'repo' });

      mockedFilterSafeBranches.mockReturnValue([
        { branch: branches[0], safetyCheck: { safe: true }, matchingPR: pr1 }
      ]);

      mockedDeleteLocalBranch.mockImplementation(() => {
        throw new Error('Git deletion failed');
      });

      // Mock async generator for getPullRequests
      const asyncGenerator = (async function* () {
        yield pr1;
      })();
      mockOctokitPlus.getPullRequests.mockReturnValue(asyncGenerator);

      await pruneLocalBranchesCommand.handler!({ dryRun: false });

      expect(consoleLogSpy).toHaveBeenCalledWith('Error deleting feature-1: Git deletion failed');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Successfully deleted: 0 branches');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Errors: 1');
    });

    it('should display progress information', async () => {
      const branches = [
        createLocalBranch('feature-1', 'abc123'),
        createLocalBranch('feature-2', 'def456'),
        createLocalBranch('main', 'ghi789', true)
      ];
      const pr1 = createPullRequest(1, 'feature-1', 'abc123', 'merge-sha-1');
      
      mockedGetLocalBranches.mockReturnValue(branches);
      mockedGetCurrentBranch.mockReturnValue('main');
      mockedGetGitRemote.mockReturnValue({ owner: 'owner', repo: 'repo' });

      mockedFilterSafeBranches.mockReturnValue([
        { branch: branches[0], safetyCheck: { safe: true }, matchingPR: pr1 },
        { branch: branches[1], safetyCheck: { safe: true }, matchingPR: undefined },
        { branch: branches[2], safetyCheck: { safe: false, reason: 'current branch' }, matchingPR: undefined }
      ]);

      // Mock async generator for getPullRequests
      const asyncGenerator = (async function* () {
        yield pr1;
      })();
      mockOctokitPlus.getPullRequests.mockReturnValue(asyncGenerator);

      await pruneLocalBranchesCommand.handler!({ dryRun: false });

      expect(consoleLogSpy).toHaveBeenCalledWith('Found 3 local branches');
      expect(consoleLogSpy).toHaveBeenCalledWith('Found 1 merged pull requests');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Safe to delete: 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Unsafe to delete: 1');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Skipped (unsafe): 1');
    });

    it('should only process merged PRs', async () => {
      const branches = [createLocalBranch('feature-1', 'abc123')];
      const mergedPR = createPullRequest(1, 'feature-1', 'abc123', 'merge-sha-1');
      const closedPR = createPullRequest(2, 'feature-2', 'def456'); // No merge commit SHA
      
      mockedGetLocalBranches.mockReturnValue(branches);
      mockedGetCurrentBranch.mockReturnValue('main');
      mockedGetGitRemote.mockReturnValue({ owner: 'owner', repo: 'repo' });

      mockedFilterSafeBranches.mockReturnValue([
        { branch: branches[0], safetyCheck: { safe: true }, matchingPR: mergedPR }
      ]);

      // Mock async generator for getPullRequests - includes both merged and closed PRs
      const asyncGenerator = (async function* () {
        yield mergedPR;
        yield closedPR;
      })();
      mockOctokitPlus.getPullRequests.mockReturnValue(asyncGenerator);

      await pruneLocalBranchesCommand.handler!({ dryRun: false });

      // Should only count the merged PR
      expect(consoleLogSpy).toHaveBeenCalledWith('Found 1 merged pull requests');
    });

    it('should use progress bar when TTY is available', async () => {
      // Mock TTY as true
      Object.defineProperty(process.stderr, 'isTTY', {
        value: true,
        configurable: true
      });

      const branches = [createLocalBranch('feature-1', 'abc123')];
      const pr1 = createPullRequest(1, 'feature-1', 'abc123', 'merge-sha-1');
      
      mockedGetLocalBranches.mockReturnValue(branches);
      mockedGetCurrentBranch.mockReturnValue('main');
      mockedGetGitRemote.mockReturnValue({ owner: 'owner', repo: 'repo' });

      mockedFilterSafeBranches.mockReturnValue([
        { branch: branches[0], safetyCheck: { safe: true }, matchingPR: pr1 }
      ]);

      // Mock async generator for getPullRequests
      const asyncGenerator = (async function* () {
        yield pr1;
      })();
      mockOctokitPlus.getPullRequests.mockReturnValue(asyncGenerator);

      await pruneLocalBranchesCommand.handler!({ dryRun: false });

      // When TTY is available, the code uses a progress bar
      // Verify the regular console.log calls still happen (for non-progress messages)
      expect(consoleLogSpy).toHaveBeenCalledWith('\nScanning for local branches that can be safely deleted...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Found 1 local branches');
      expect(consoleLogSpy).toHaveBeenCalledWith('\nDeleting 1 branch:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Successfully deleted: 1 branch');
    });
  });
});