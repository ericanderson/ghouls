import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execaSync } from 'execa';
import { getGhUsername } from '../../src/utils/getGhUsername.js';

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
    mockedExecaSync.mockReturnValue({
      stdout: mockUsername,
      stderr: '',
      exitCode: 0,
      command: 'gh api user --jq .login',
      escapedCommand: 'gh api user --jq .login',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhUsername();

    expect(result).toBe(mockUsername);
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['api', 'user', '--jq', '.login'], {
      timeout: 10000,
      reject: false
    });
  });

  it('should return trimmed username when stdout has whitespace', () => {
    const mockUsername = 'awesome-dude';
    mockedExecaSync.mockReturnValue({
      stdout: `  ${mockUsername}  \n`,
      stderr: '',
      exitCode: 0,
      command: 'gh api user --jq .login',
      escapedCommand: 'gh api user --jq .login',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhUsername();

    expect(result).toBe(mockUsername);
  });

  it('should return null when stdout is empty', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      command: 'gh api user --jq .login',
      escapedCommand: 'gh api user --jq .login',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should return null when stdout is only whitespace', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '   \n\t  ',
      stderr: '',
      exitCode: 0,
      command: 'gh api user --jq .login',
      escapedCommand: 'gh api user --jq .login',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should return null when stdout is undefined', () => {
    mockedExecaSync.mockReturnValue({
      stdout: undefined as any,
      stderr: '',
      exitCode: 0,
      command: 'gh api user --jq .login',
      escapedCommand: 'gh api user --jq .login',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should return null when gh command fails', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: 'gh: command not found',
      exitCode: 127,
      command: 'gh api user --jq .login',
      escapedCommand: 'gh api user --jq .login',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

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
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: 'gh: To get started with GitHub CLI, please run: gh auth login',
      exitCode: 1,
      command: 'gh api user --jq .login',
      escapedCommand: 'gh api user --jq .login',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should return null when API request fails', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: 'HTTP 401: Unauthorized (https://api.github.com/user)',
      exitCode: 1,
      command: 'gh api user --jq .login',
      escapedCommand: 'gh api user --jq .login',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhUsername();

    expect(result).toBe(null);
  });

  it('should handle timeout correctly', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: '',
      exitCode: 124,
      command: 'gh api user --jq .login',
      escapedCommand: 'gh api user --jq .login',
      failed: true,
      timedOut: true,
      isCanceled: false,
      killed: false
    });

    const result = getGhUsername();

    expect(result).toBe(null);
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['api', 'user', '--jq', '.login'], {
      timeout: 10000,
      reject: false
    });
  });

  it('should handle jq parsing errors', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: 'jq: error: Invalid JSON',
      exitCode: 1,
      command: 'gh api user --jq .login',
      escapedCommand: 'gh api user --jq .login',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhUsername();

    expect(result).toBe(null);
  });
});