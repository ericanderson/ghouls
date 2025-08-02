import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execaSync } from 'execa';
import { getGhBaseUrl } from './getGhBaseUrl.js';
import { createMockExecaResult } from '../test/setup.js';

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
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: '✓ Logged in to github.com account awesome-dude',
      exitCode: 0,
      command: 'gh auth status'
    }));

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['auth', 'status'], {
      timeout: 10000,
      reject: false
    });
  });

  it('should return enterprise API URL when logged in to enterprise host', () => {
    const enterpriseHost = 'github.enterprise.com';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: `✓ Logged in to ${enterpriseHost} account user`,
      exitCode: 0,
      command: 'gh auth status'
    }));

    const result = getGhBaseUrl();

    expect(result).toBe(`https://${enterpriseHost}/api/v3`);
  });

  it('should handle "Active account on" format', () => {
    const enterpriseHost = 'github.company.com';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: `Active account on ${enterpriseHost} (user123)`,
      exitCode: 0,
      command: 'gh auth status'
    }));

    const result = getGhBaseUrl();

    expect(result).toBe(`https://${enterpriseHost}/api/v3`);
  });

  it('should parse host from stdout when stderr is empty', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '✓ Logged in to github.com account awesome-dude',
      stderr: '',
      exitCode: 0,
      command: 'gh auth status'
    }));

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });

  it('should handle multiline output with host on separate line', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: `github.enterprise.com
  ✓ Logged in to github.enterprise.com account user`,
      exitCode: 0,
      command: 'gh auth status'
    }));

    const result = getGhBaseUrl();

    expect(result).toBe('https://github.enterprise.com/api/v3');
  });

  it('should default to github.com when no host match found', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: 'No auth status found',
      exitCode: 1,
      command: 'gh auth status',
      failed: true
    }));

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });

  it('should default to github.com when both stdout and stderr are empty', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: '',
      exitCode: 0,
      command: 'gh auth status'
    }));

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });

  it('should default to github.com when gh command is not found', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: 'gh: command not found',
      exitCode: 127,
      command: 'gh auth status',
      failed: true
    }));

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
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: '',
      exitCode: 124,
      command: 'gh auth status',
      failed: true,
      timedOut: true
    }));

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
    expect(mockedExecaSync).toHaveBeenCalledWith('gh', ['auth', 'status'], {
      timeout: 10000,
      reject: false
    });
  });

  it('should handle case insensitive host matching', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: '✓ LOGGED IN TO github.com account user',
      exitCode: 0,
      command: 'gh auth status'
    }));

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });

  it('should handle complex enterprise domain names', () => {
    const enterpriseHost = 'git.internal.company-name.co.uk';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: `✓ Logged in to ${enterpriseHost} account user`,
      exitCode: 0,
      command: 'gh auth status'
    }));

    const result = getGhBaseUrl();

    expect(result).toBe(`https://${enterpriseHost}/api/v3`);
  });

  it('should handle output with additional text after host', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: '✓ Logged in to github.com account awesome-dude (keyring)',
      exitCode: 0,
      command: 'gh auth status'
    }));

    const result = getGhBaseUrl();

    expect(result).toBe('https://api.github.com');
  });
});