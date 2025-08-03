import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pruneAllCommand } from './PruneAll.js';
import { createOctokitPlus } from '../utils/createOctokitPlus.js';
import { getGitRemote } from '../utils/getGitRemote.js';
import { isGitRepository } from '../utils/localGitOperations.js';

// Mock all dependencies
vi.mock('../utils/createOctokitPlus.js');
vi.mock('../utils/getGitRemote.js');
vi.mock('../utils/localGitOperations.js');

// Mock the individual command modules
vi.mock('./PrunePullRequests.js', () => ({
  prunePullRequestsCommand: {
    handler: vi.fn()
  }
}));

vi.mock('./PruneLocalBranches.js', () => ({
  pruneLocalBranchesCommand: {
    handler: vi.fn()
  }
}));

const mockedCreateOctokitPlus = vi.mocked(createOctokitPlus);
const mockedGetGitRemote = vi.mocked(getGitRemote);
const mockedIsGitRepository = vi.mocked(isGitRepository);

// Import after mocking
import { prunePullRequestsCommand } from './PrunePullRequests.js';
import { pruneLocalBranchesCommand } from './PruneLocalBranches.js';

describe('PruneAll', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as any);
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mocks
    mockedIsGitRepository.mockReturnValue(true);
    mockedGetGitRemote.mockReturnValue({ owner: 'testowner', repo: 'testrepo', host: 'github.com' });
    mockedCreateOctokitPlus.mockReturnValue({} as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Repository Detection', () => {
    it('should use provided repo argument', async () => {
      const args = {
        repo: { owner: 'customowner', repo: 'customrepo' },
        dryRun: false,
        force: false
      };

      await pruneAllCommand.handler!(args);

      expect(prunePullRequestsCommand.handler).toHaveBeenCalledWith({
        ...args,
        repo: { owner: 'customowner', repo: 'customrepo' }
      });
      expect(pruneLocalBranchesCommand.handler).toHaveBeenCalledWith({
        ...args,
        repo: { owner: 'customowner', repo: 'customrepo' }
      });
    });

    it('should detect repo from git remote when no repo provided', async () => {
      const args = { dryRun: false, force: false };

      await pruneAllCommand.handler!(args);

      expect(mockedGetGitRemote).toHaveBeenCalled();
      expect(prunePullRequestsCommand.handler).toHaveBeenCalledWith({
        ...args,
        repo: { owner: 'testowner', repo: 'testrepo' }
      });
      expect(pruneLocalBranchesCommand.handler).toHaveBeenCalledWith({
        ...args,
        repo: { owner: 'testowner', repo: 'testrepo' }
      });
    });

    it('should throw error when not in git repo and no repo provided', async () => {
      mockedIsGitRepository.mockReturnValue(false);
      const args = { dryRun: false, force: false };

      await expect(pruneAllCommand.handler!(args)).rejects.toThrow(
        'This command must be run from within a git repository or specify owner/repo.'
      );
    });

    it('should throw error when git remote detection fails', async () => {
      mockedGetGitRemote.mockReturnValue(null);
      const args = { dryRun: false, force: false };

      await expect(pruneAllCommand.handler!(args)).rejects.toThrow(
        'No repo specified and unable to detect from git remote'
      );
    });
  });

  describe('Command Execution', () => {
    it('should execute both commands successfully', async () => {
      const args = { dryRun: false, force: false };

      await pruneAllCommand.handler!(args);

      expect(prunePullRequestsCommand.handler).toHaveBeenCalledTimes(1);
      expect(pruneLocalBranchesCommand.handler).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('All cleanup operations completed successfully!'));
    });

    it('should pass through dry-run flag to both commands', async () => {
      const args = { dryRun: true, force: false };

      await pruneAllCommand.handler!(args);

      expect(prunePullRequestsCommand.handler).toHaveBeenCalledWith(
        expect.objectContaining({ dryRun: true })
      );
      expect(pruneLocalBranchesCommand.handler).toHaveBeenCalledWith(
        expect.objectContaining({ dryRun: true })
      );
    });

    it('should pass through force flag to both commands', async () => {
      const args = { dryRun: false, force: true };

      await pruneAllCommand.handler!(args);

      expect(prunePullRequestsCommand.handler).toHaveBeenCalledWith(
        expect.objectContaining({ force: true })
      );
      expect(pruneLocalBranchesCommand.handler).toHaveBeenCalledWith(
        expect.objectContaining({ force: true })
      );
    });
  });

  describe('Error Handling', () => {
    it('should continue with local cleanup when remote fails', async () => {
      vi.mocked(prunePullRequestsCommand.handler!).mockRejectedValueOnce(new Error('Remote error'));
      const args = { dryRun: false, force: false };

      try {
        await pruneAllCommand.handler!(args);
      } catch (e) {
        // Expected process.exit
      }

      expect(pruneLocalBranchesCommand.handler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Remote cleanup failed: Remote error'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cleanup completed with some errors'));
    });

    it('should handle local cleanup failure', async () => {
      vi.mocked(pruneLocalBranchesCommand.handler!).mockRejectedValueOnce(new Error('Local error'));
      const args = { dryRun: false, force: false };

      try {
        await pruneAllCommand.handler!(args);
      } catch (e) {
        // Expected process.exit
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Local cleanup failed: Local error'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cleanup completed with some errors'));
    });

    it('should exit with error code 1 when both commands fail', async () => {
      vi.mocked(prunePullRequestsCommand.handler!).mockRejectedValueOnce(new Error('Remote error'));
      vi.mocked(pruneLocalBranchesCommand.handler!).mockRejectedValueOnce(new Error('Local error'));
      const args = { dryRun: false, force: false };

      try {
        await pruneAllCommand.handler!(args);
      } catch (e) {
        expect(e).toEqual(new Error('process.exit'));
      }

      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Both cleanup operations failed!'));
    });

    it('should exit with code 0 on partial success', async () => {
      vi.mocked(prunePullRequestsCommand.handler!).mockRejectedValueOnce(new Error('Remote error'));
      const args = { dryRun: false, force: false };

      try {
        await pruneAllCommand.handler!(args);
      } catch (e) {
        expect(e).toEqual(new Error('process.exit'));
      }

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('Command Configuration', () => {
    it('should have correct command definition', () => {
      expect(pruneAllCommand.command).toBe('all [--dry-run] [--force] [repo]');
      expect(pruneAllCommand.describe).toBe('Delete both remote and local merged branches');
    });

    it('should validate repo format correctly', () => {
      const builder = pruneAllCommand.builder as any;
      const yargsMock = {
        env: vi.fn().mockReturnThis(),
        option: vi.fn().mockReturnThis(),
        positional: vi.fn().mockReturnThis()
      };

      builder(yargsMock);

      const positionalCall = yargsMock.positional.mock.calls.find(
        (call: any[]) => call[0] === 'repo'
      );
      expect(positionalCall).toBeDefined();

      const coerce = positionalCall![1].coerce;

      // Test valid repo format
      expect(coerce('owner/repo')).toEqual({ owner: 'owner', repo: 'repo' });

      // Test invalid formats
      expect(() => coerce('invalid')).toThrow('Repository must be in the format');
      expect(() => coerce('owner/')).toThrow('Repository must be in the format');
      expect(() => coerce('/repo')).toThrow('Repository must be in the format');
      expect(() => coerce('-owner/repo')).toThrow('Invalid owner name');
      // Note: GitHub actually allows repos to start with hyphens, dots, or underscores
      expect(coerce('owner/-repo')).toEqual({ owner: 'owner', repo: '-repo' });
    });
  });
});