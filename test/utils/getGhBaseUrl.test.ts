import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execaSync } from 'execa';
import { getGhBaseUrl } from '../../src/utils/getGhBaseUrl.js';

// Mock execa
vi.mock('execa');

const mockedExecaSync = vi.mocked(execaSync);

describe('getGhBaseUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return GitHub.com API URL when logged in to github.com', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: '✓ Logged in to github.com account awesome-dude',
      exitCode: 0,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['auth', 'status'], {
      timeout: 10000,
      reject: false
    });
  });

  it('should return enterprise API URL when logged in to enterprise host', () => {
    const enterpriseHost = 'github.enterprise.com';
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: `✓ Logged in to ${enterpriseHost} account user`,
      exitCode: 0,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe(`https://${enterpriseHost}/api/v3`);
  });

  it('should handle "Active account on" format', () => {
    const enterpriseHost = 'github.company.com';
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: `Active account on ${enterpriseHost} (user123)`,
      exitCode: 0,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe(`https://${enterpriseHost}/api/v3`);
  });

  it('should parse host from stdout when stderr is empty', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '✓ Logged in to github.com account awesome-dude',
      stderr: '',
      exitCode: 0,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });

  it('should handle multiline output with host on separate line', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: `github.enterprise.com
  ✓ Logged in to github.enterprise.com account user`,
      exitCode: 0,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe('https://github.enterprise.com/api/v3');
  });

  it('should default to github.com when no host match found', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: 'No auth status found',
      exitCode: 1,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });

  it('should default to github.com when both stdout and stderr are empty', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });

  it('should default to github.com when gh command is not found', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: 'gh: command not found',
      exitCode: 127,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });

  it('should default to github.com when execaSync throws an exception', () => {
    mockedExecaSync.mockImplementation(() => {
      throw new Error('Command failed');
    });

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });

  it('should handle timeout correctly', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: '',
      exitCode: 124,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: true,
      timedOut: true,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['auth', 'status'], {
      timeout: 10000,
      reject: false
    });
  });

  it('should handle case insensitive host matching', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: '✓ LOGGED IN TO github.com account user',
      exitCode: 0,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });

  it('should handle complex enterprise domain names', () => {
    const enterpriseHost = 'git.internal.company-name.co.uk';
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: `✓ Logged in to ${enterpriseHost} account user`,
      exitCode: 0,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe(`https://${enterpriseHost}/api/v3`);
  });

  it('should handle output with additional text after host', () => {
    mockedExecaSync.mockReturnValue({
      stdout: '',
      stderr: '✓ Logged in to github.com account awesome-dude (keyring)',
      exitCode: 0,
      command: 'gh auth status',
      escapedCommand: 'gh auth status',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });
});