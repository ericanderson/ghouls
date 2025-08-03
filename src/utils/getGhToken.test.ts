import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execaSync } from 'execa';
import { getGhToken } from './getGhToken.js';
import { createMockExecaResult } from '../test/setup.js';

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
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: mockToken,
      stderr: '',
      exitCode: 0,
      command: 'gh auth token'
    }));

    const result = getGhToken();

    expect(result).toBe(mockToken);
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['auth', 'token'], {
      timeout: 10000,
      reject: false
    });
  });

  it('should return trimmed token when stdout has whitespace', () => {
    const mockToken = 'ghp_1234567890abcdef';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: `  ${mockToken}  \n`,
      stderr: '',
      exitCode: 0,
      command: 'gh auth token'
    }));

    const result = getGhToken();

    expect(result).toBe(mockToken);
  });

  it('should return null when stdout is empty', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: '',
      exitCode: 0,
      command: 'gh auth token'
    }));

    const result = getGhToken();

    expect(result).toBe(null);
  });

  it('should return null when stdout is only whitespace', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '   \n\t  ',
      stderr: '',
      exitCode: 0,
      command: 'gh auth token'
    }));

    const result = getGhToken();

    expect(result).toBe(null);
  });

  it('should return null when stdout is undefined', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: undefined as any,
      stderr: '',
      exitCode: 0,
      command: 'gh auth token'
    }));

    const result = getGhToken();

    expect(result).toBe(null);
  });

  it('should throw when gh command fails', () => {
    const mockResult = createMockExecaResult({
      stdout: '',
      stderr: 'gh: command not found',
      exitCode: 127,
      command: 'gh auth token',
      failed: true
    });
    mockedExecaSync.mockReturnValue(mockResult);

    expect(() => getGhToken()).toThrow();
  });

  it('should throw when execaSync throws an exception', () => {
    mockedExecaSync.mockImplementation(() => {
      throw new Error('Command failed');
    });

    expect(() => getGhToken()).toThrow('Command failed');
  });

  it('should throw when gh is not authenticated', () => {
    const mockResult = createMockExecaResult({
      stdout: '',
      stderr: 'gh: To get started with GitHub CLI, please run: gh auth login',
      exitCode: 1,
      command: 'gh auth token',
      failed: true
    });
    mockedExecaSync.mockReturnValue(mockResult);

    expect(() => getGhToken()).toThrow();
  });

  it('should throw when timeout occurs', () => {
    const mockResult = createMockExecaResult({
      stdout: '',
      stderr: '',
      exitCode: 124,
      command: 'gh auth token',
      failed: true,
      timedOut: true
    });
    mockedExecaSync.mockReturnValue(mockResult);

    expect(() => getGhToken()).toThrow();
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['auth', 'token'], {
      timeout: 10000,
      reject: false
    });
  });
});