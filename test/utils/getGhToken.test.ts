import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execaSync } from 'execa';
import { getGhToken } from '../../src/utils/getGhToken.js';

// Mock execa
vi.mock('execa');

const mockedExecaSync = vi.mocked(execaSync);

describe('getGhToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return token when gh auth token succeeds', () => {
    const mockToken = 'ghp_1234567890abcdef';
    mockedExecaSync.mockReturnValue({
      stdout: mockToken,
      stderr: '',
      exitCode: 0,
      command: 'gh auth token',
      escapedCommand: 'gh auth token',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhToken();

    expect(result).toBe(mockToken);
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['auth', 'token'], {
      timeout: 10000,
      reject: false
    });
  });

  it('should return trimmed token when stdout has whitespace', () => {
    const mockToken = 'ghp_1234567890abcdef';
    mockedExecaSync.mockReturnValue({
      stdout: `  ${mockToken}  \n`,
      stderr: '',
      exitCode: 0,
      command: 'gh auth token',
      escapedCommand: 'gh auth token',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhToken();

    expect(result).toBe(mockToken);
  });

  it('should return null when stdout is empty', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      command: 'gh auth token',
      escapedCommand: 'gh auth token',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhToken();

    expect(result).toBe(null);
  });

  it('should return null when stdout is only whitespace', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '   \n\t  ',
      stderr: '',
      exitCode: 0,
      command: 'gh auth token',
      escapedCommand: 'gh auth token',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhToken();

    expect(result).toBe(null);
  });

  it('should return null when stdout is undefined', () => {
    mockedExecaSync.mockReturnValue({
      stdout: undefined as any,
      stderr: '',
      exitCode: 0,
      command: 'gh auth token',
      escapedCommand: 'gh auth token',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhToken();

    expect(result).toBe(null);
  });

  it('should return null when gh command fails', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: 'gh: command not found',
      exitCode: 127,
      command: 'gh auth token',
      escapedCommand: 'gh auth token',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhToken();

    expect(result).toBe(null);
  });

  it('should return null when execaSync throws an exception', () => {
    mockedExecaSync.mockImplementation(() => {
      throw new Error('Command failed');
    });

    const result = getGhToken();

    expect(result).toBe(null);
  });

  it('should return null when gh is not authenticated', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: 'gh: To get started with GitHub CLI, please run: gh auth login',
      exitCode: 1,
      command: 'gh auth token',
      escapedCommand: 'gh auth token',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhToken();

    expect(result).toBe(null);
  });

  it('should handle timeout correctly', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: '',
      exitCode: 124,
      command: 'gh auth token',
      escapedCommand: 'gh auth token',
      failed: true,
      timedOut: true,
      isCanceled: false,
      killed: false
    });

    const result = getGhToken();

    expect(result).toBe(null);
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['auth', 'token'], {
      timeout: 10000,
      reject: false
    });
  });
});