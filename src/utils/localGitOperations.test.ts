import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execaSync } from 'execa';
import {
  getLocalBranches,
  getCurrentBranch,
  getBranchStatus,
  deleteLocalBranch,
  isGitRepository
} from './localGitOperations.js';
import { createMockExecaResult, expectGitTimeout } from '../test/setup.js';

// Mock execa
vi.mock('execa');
const mockedExecaSync = vi.mocked(execaSync);

describe('localGitOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getLocalBranches', () => {
    it('should return local branches with correct format', () => {
      const mockOutput = 'main|abc123|*|2024-01-01 10:00:00 -0500\nfeature/test|def456||2024-01-02 11:00:00 -0500\ndevelop|ghi789||2024-01-03 12:00:00 -0500';
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: mockOutput,
        command: 'git branch -v --format=%(refname:short)|%(objectname)|%(HEAD)|%(committerdate:iso)'
      }));

      const result = getLocalBranches();

      expect(mockedExecaSync).toHaveBeenCalledWith(
        'git',
        ['branch', '-v', '--format=%(refname:short)|%(objectname)|%(HEAD)|%(committerdate:iso)'],
        {
          timeout: 10000,
          reject: false
        }
      );

      expect(result).toEqual([
        { name: 'main', sha: 'abc123', isCurrent: true, lastCommitDate: '2024-01-01 10:00:00 -0500' },
        { name: 'feature/test', sha: 'def456', isCurrent: false, lastCommitDate: '2024-01-02 11:00:00 -0500' },
        { name: 'develop', sha: 'ghi789', isCurrent: false, lastCommitDate: '2024-01-03 12:00:00 -0500' }
      ]);
    });

    it('should return empty array when no stdout', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: '',
        command: 'git branch -v --format=%(refname:short)|%(objectname)|%(HEAD)'
      }));

      const result = getLocalBranches();

      expect(result).toEqual([]);
    });

    it('should filter out empty lines', () => {
      const mockOutput = 'main|abc123|*|2024-01-01 10:00:00 -0500\n\n\nfeature/test|def456||2024-01-02 11:00:00 -0500\n\n';
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: mockOutput,
        command: 'git branch -v --format=%(refname:short)|%(objectname)|%(HEAD)|%(committerdate:iso)'
      }));

      const result = getLocalBranches();

      expect(result).toEqual([
        { name: 'main', sha: 'abc123', isCurrent: true, lastCommitDate: '2024-01-01 10:00:00 -0500' },
        { name: 'feature/test', sha: 'def456', isCurrent: false, lastCommitDate: '2024-01-02 11:00:00 -0500' }
      ]);
    });

    it('should handle branches with spaces in names', () => {
      const mockOutput = 'feature branch|abc123||2024-01-01 10:00:00 -0500\ntest-branch|def456|*|2024-01-02 11:00:00 -0500';
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: mockOutput,
        command: 'git branch -v --format=%(refname:short)|%(objectname)|%(HEAD)|%(committerdate:iso)'
      }));

      const result = getLocalBranches();

      expect(result).toEqual([
        { name: 'feature branch', sha: 'abc123', isCurrent: false, lastCommitDate: '2024-01-01 10:00:00 -0500' },
        { name: 'test-branch', sha: 'def456', isCurrent: true, lastCommitDate: '2024-01-02 11:00:00 -0500' }
      ]);
    });

    it('should throw error for malformed git output', () => {
      const mockOutput = 'invalid-format-line\nmain|abc123';
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: mockOutput,
        command: 'git branch -v --format=%(refname:short)|%(objectname)|%(HEAD)'
      }));

      expect(() => getLocalBranches()).toThrow('Unexpected git branch output format: invalid-format-line');
    });

    it('should throw error when git command fails', () => {
      mockedExecaSync.mockImplementation(() => {
        throw new Error('git command failed');
      });

      expect(() => getLocalBranches()).toThrow('Failed to get local branches: git command failed');
    });

    it('should handle non-Error exceptions', () => {
      mockedExecaSync.mockImplementation(() => {
        throw 'string error';
      });

      expect(() => getLocalBranches()).toThrow('Failed to get local branches: string error');
    });

    it('should use correct timeout for git command', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: 'main|abc123|*|2024-01-01 10:00:00 -0500',
        command: 'git branch -v --format=%(refname:short)|%(objectname)|%(HEAD)|%(committerdate:iso)'
      }));

      getLocalBranches();

      expectGitTimeout(mockedExecaSync, 10000);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: 'main',
        command: 'git branch --show-current'
      }));

      const result = getCurrentBranch();

      expect(mockedExecaSync).toHaveBeenCalledWith(
        'git',
        ['branch', '--show-current'],
        {
          timeout: 5000,
          reject: false
        }
      );

      expect(result).toBe('main');
    });

    it('should trim whitespace from branch name', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: '  feature/test  \n',
        command: 'git branch --show-current'
      }));

      const result = getCurrentBranch();

      expect(result).toBe('feature/test');
    });

    it('should return empty string when no current branch', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: '',
        command: 'git branch --show-current'
      }));

      const result = getCurrentBranch();

      expect(result).toBe('');
    });

    it('should throw error when git command fails', () => {
      mockedExecaSync.mockImplementation(() => {
        throw new Error('git command failed');
      });

      expect(() => getCurrentBranch()).toThrow('Failed to get current branch: git command failed');
    });

    it('should use correct timeout for git command', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: 'main',
        command: 'git branch --show-current'
      }));

      getCurrentBranch();

      expectGitTimeout(mockedExecaSync, 5000);
    });
  });

  describe('getBranchStatus', () => {
    it('should return branch status when upstream exists', () => {
      // Mock upstream check
      mockedExecaSync.mockReturnValueOnce(createMockExecaResult({
        stdout: 'origin/feature-branch',
        command: 'git rev-parse --abbrev-ref feature-branch@{upstream}'
      }));

      // Mock status check
      mockedExecaSync.mockReturnValueOnce(createMockExecaResult({
        stdout: '2\t3',
        command: 'git rev-list --count --left-right origin/feature-branch...feature-branch'
      }));

      const result = getBranchStatus('feature-branch');

      expect(mockedExecaSync).toHaveBeenCalledTimes(2);
      expect(mockedExecaSync).toHaveBeenNthCalledWith(1,
        'git',
        ['rev-parse', '--abbrev-ref', 'feature-branch@{upstream}'],
        {
          timeout: 5000,
          reject: false
        }
      );
      expect(mockedExecaSync).toHaveBeenNthCalledWith(2,
        'git',
        ['rev-list', '--count', '--left-right', 'origin/feature-branch...feature-branch'],
        {
          timeout: 5000,
          reject: false
        }
      );

      expect(result).toEqual({
        behind: 2,
        ahead: 3
      });
    });

    it('should return zero ahead/behind when no upstream', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: '',
        command: 'git rev-parse --abbrev-ref feature-branch@{upstream}'
      }));

      const result = getBranchStatus('feature-branch');

      expect(mockedExecaSync).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ahead: 0,
        behind: 0
      });
    });

    it('should handle malformed rev-list output', () => {
      mockedExecaSync.mockReturnValueOnce(createMockExecaResult({
        stdout: 'origin/feature-branch',
        command: 'git rev-parse --abbrev-ref feature-branch@{upstream}'
      }));

      mockedExecaSync.mockReturnValueOnce(createMockExecaResult({
        stdout: 'invalid-format',
        command: 'git rev-list --count --left-right origin/feature-branch...feature-branch'
      }));

      const result = getBranchStatus('feature-branch');

      expect(result).toBeNull();
    });

    it('should handle zero counts correctly', () => {
      mockedExecaSync.mockReturnValueOnce(createMockExecaResult({
        stdout: 'origin/feature-branch',
        command: 'git rev-parse --abbrev-ref feature-branch@{upstream}'
      }));

      mockedExecaSync.mockReturnValueOnce(createMockExecaResult({
        stdout: '0\t0',
        command: 'git rev-list --count --left-right origin/feature-branch...feature-branch'
      }));

      const result = getBranchStatus('feature-branch');

      expect(result).toEqual({
        behind: 0,
        ahead: 0
      });
    });

    it('should handle invalid number parsing', () => {
      mockedExecaSync.mockReturnValueOnce(createMockExecaResult({
        stdout: 'origin/feature-branch',
        command: 'git rev-parse --abbrev-ref feature-branch@{upstream}'
      }));

      mockedExecaSync.mockReturnValueOnce(createMockExecaResult({
        stdout: 'abc\tdef',
        command: 'git rev-list --count --left-right origin/feature-branch...feature-branch'
      }));

      const result = getBranchStatus('feature-branch');

      expect(result).toEqual({
        behind: 0,
        ahead: 0
      });
    });

    it('should return null when git command throws', () => {
      mockedExecaSync.mockImplementation(() => {
        throw new Error('git command failed');
      });

      const result = getBranchStatus('feature-branch');

      expect(result).toBeNull();
    });

    it('should handle upstream with special characters', () => {
      mockedExecaSync.mockReturnValueOnce(createMockExecaResult({
        stdout: 'origin/feature/special-chars',
        command: 'git rev-parse --abbrev-ref feature-branch@{upstream}'
      }));

      mockedExecaSync.mockReturnValueOnce(createMockExecaResult({
        stdout: '1\t2',
        command: 'git rev-list --count --left-right origin/feature/special-chars...feature-branch'
      }));

      const result = getBranchStatus('feature-branch');

      expect(result).toEqual({
        behind: 1,
        ahead: 2
      });
    });
  });

  describe('deleteLocalBranch', () => {
    it('should delete branch with -d flag by default', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        command: 'git branch -d feature-branch'
      }));

      deleteLocalBranch('feature-branch');

      expect(mockedExecaSync).toHaveBeenCalledWith(
        'git',
        ['branch', '-d', 'feature-branch'],
        {
          timeout: 10000
        }
      );
    });

    it('should delete branch with -D flag when force is true', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        command: 'git branch -D feature-branch'
      }));

      deleteLocalBranch('feature-branch', true);

      expect(mockedExecaSync).toHaveBeenCalledWith(
        'git',
        ['branch', '-D', 'feature-branch'],
        {
          timeout: 10000
        }
      );
    });

    it('should handle branch names with special characters', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        command: 'git branch -d feature/test-branch'
      }));

      deleteLocalBranch('feature/test-branch');

      expect(mockedExecaSync).toHaveBeenCalledWith(
        'git',
        ['branch', '-d', 'feature/test-branch'],
        {
          timeout: 10000
        }
      );
    });

    it('should throw error when git command fails', () => {
      mockedExecaSync.mockImplementation(() => {
        throw new Error('branch deletion failed');
      });

      expect(() => deleteLocalBranch('feature-branch')).toThrow(
        'Failed to delete branch feature-branch: branch deletion failed'
      );
    });

    it('should handle non-Error exceptions', () => {
      mockedExecaSync.mockImplementation(() => {
        throw 'string error';
      });

      expect(() => deleteLocalBranch('feature-branch')).toThrow(
        'Failed to delete branch feature-branch: string error'
      );
    });

    it('should use correct timeout for git command', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        command: 'git branch -d feature-branch'
      }));

      deleteLocalBranch('feature-branch');

      expect(mockedExecaSync).toHaveBeenCalledWith(
        'git',
        ['branch', '-d', 'feature-branch'],
        {
          timeout: 10000
        }
      );
    });
  });

  describe('isGitRepository', () => {
    it('should return true when in git repository', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: '.git',
        command: 'git rev-parse --git-dir'
      }));

      const result = isGitRepository();

      expect(mockedExecaSync).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--git-dir'],
        {
          timeout: 5000,
          reject: false
        }
      );

      expect(result).toBe(true);
    });

    it('should return false when not in git repository', () => {
      mockedExecaSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      const result = isGitRepository();

      expect(result).toBe(false);
    });

    it('should return false when git command fails for any reason', () => {
      mockedExecaSync.mockImplementation(() => {
        throw 'any error';
      });

      const result = isGitRepository();

      expect(result).toBe(false);
    });

    it('should use correct timeout for git command', () => {
      mockedExecaSync.mockReturnValue(createMockExecaResult({
        stdout: '.git',
        command: 'git rev-parse --git-dir'
      }));

      isGitRepository();

      expectGitTimeout(mockedExecaSync, 5000);
    });
  });
});
