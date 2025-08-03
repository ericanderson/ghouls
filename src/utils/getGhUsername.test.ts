import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execaSync } from 'execa';
import { getGhUsername } from './getGhUsername.js';
import { createMockExecaResult } from '../test/setup.js';

// Mock execa
vi.mock('execa');

const mockedExecaSync = vi.mocked(execaSync);

describe('getGhUsername', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return username when gh api user succeeds', () => {
    const mockUsername = 'awesome-dude';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: mockUsername,
      stderr: '',
      exitCode: 0,
      command: 'gh api user --jq .login'
    }));

    const result = getGhUsername();

    expect(result).toBe(mockUsername);
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['api', 'user', '--jq', '.login'], {
      timeout: 10000,
      reject: false
    });
  });

  it('should return trimmed username when stdout has whitespace', () => {
    const mockUsername = 'awesome-dude';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: `  ${mockUsername}  \n`,
      stderr: '',
      exitCode: 0,
      command: 'gh api user --jq .login'
    }));

    const result = getGhUsername();

    expect(result).toBe(mockUsername);
  });

  it('should return null when stdout is empty', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: '',
      exitCode: 0,
      command: 'gh api user --jq .login'
    }));

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should return null when stdout is only whitespace', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '   \n\t  ',
      stderr: '',
      exitCode: 0,
      command: 'gh api user --jq .login'
    }));

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should return null when stdout is undefined', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: undefined as any,
      stderr: '',
      exitCode: 0,
      command: 'gh api user --jq .login'
    }));

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should return null when gh command fails', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: 'gh: command not found',
      exitCode: 127,
      command: 'gh api user --jq .login',
      failed: true
    }));

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should return null when execaSync throws an exception', () => {
    mockedExecaSync.mockImplementation(() => {
      throw new Error('Command failed');
    });

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should return null when gh is not authenticated', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: 'gh: To get started with GitHub CLI, please run: gh auth login',
      exitCode: 1,
      command: 'gh api user --jq .login',
      failed: true
    }));

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should return null when API request fails', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: 'HTTP 401: Unauthorized (https://api.github.com/user)',
      exitCode: 1,
      command: 'gh api user --jq .login',
      failed: true
    }));

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should handle timeout correctly', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: '',
      exitCode: 124,
      command: 'gh api user --jq .login',
      failed: true,
      timedOut: true
    }));

    const result = getGhUsername();

    expect(result).toBe(null);
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['api', 'user', '--jq', '.login'], {
      timeout: 10000,
      reject: false
    });
  });

  it('should handle jq parsing errors', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: 'jq: error: Invalid JSON',
      exitCode: 1,
      command: 'gh api user --jq .login',
      failed: true
    }));

    const result = getGhUsername();

    expect(result).toBe(null);
  });
});