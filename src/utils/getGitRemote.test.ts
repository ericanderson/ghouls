import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execaSync } from 'execa';
import { getGitRemote } from './getGitRemote.js';
import { createMockExecaResult } from '../test/setup.js';

// Mock execa
vi.mock('execa');

const mockedExecaSync = vi.mocked(execaSync);

describe('getGitRemote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse HTTPS GitHub URL correctly', () => {
    const httpsUrl = 'https://github.com/awesome-dude/ghouls.git';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: httpsUrl,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toEqual({
      owner: 'awesome-dude',
      repo: 'ghouls',
      host: 'github.com'
    });
    expect(mockedExecaSync).toHaveBeenCalledWith('git', ['remote', 'get-url', 'origin'], {
      timeout: 5000,
      reject: false
    });
  });

  it('should parse HTTPS GitHub URL without .git suffix', () => {
    const httpsUrl = 'https://github.com/awesome-dude/ghouls';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: httpsUrl,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toEqual({
      owner: 'awesome-dude',
      repo: 'ghouls',
      host: 'github.com'
    });
  });

  it('should parse SSH GitHub URL correctly', () => {
    const sshUrl = 'git@github.com:awesome-dude/ghouls.git';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: sshUrl,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toEqual({
      owner: 'awesome-dude',
      repo: 'ghouls',
      host: 'github.com'
    });
  });

  it('should parse SSH GitHub URL without .git suffix', () => {
    const sshUrl = 'git@github.com:awesome-dude/ghouls';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: sshUrl,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toEqual({
      owner: 'awesome-dude',
      repo: 'ghouls',
      host: 'github.com'
    });
  });

  it('should handle repository names with dashes and underscores', () => {
    const httpsUrl = 'https://github.com/some-user/my_awesome-repo.git';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: httpsUrl,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toEqual({
      owner: 'some-user',
      repo: 'my_awesome-repo',
      host: 'github.com'
    });
  });

  it('should handle organization names with dots', () => {
    const httpsUrl = 'https://github.com/some.org/repo.git';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: httpsUrl,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toEqual({
      owner: 'some.org',
      repo: 'repo',
      host: 'github.com'
    });
  });

  it('should trim whitespace from remote URL', () => {
    const httpsUrl = 'https://github.com/awesome-dude/ghouls.git';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: `  ${httpsUrl}  \n`,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toEqual({
      owner: 'awesome-dude',
      repo: 'ghouls',
      host: 'github.com'
    });
  });

  it('should return null when stdout is empty', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toBe(null);
  });

  it('should return null when stdout is only whitespace', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '   \n\t  ',
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toBe(null);
  });

  it('should return null when stdout is undefined', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: undefined as any,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toBe(null);
  });

  it('should parse non-GitHub URLs (e.g., GitLab)', () => {
    const gitlabUrl = 'https://gitlab.com/user/repo.git';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: gitlabUrl,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toEqual({
      owner: 'user',
      repo: 'repo',
      host: 'gitlab.com'
    });
  });

  it('should return null for malformed GitHub URLs', () => {
    const malformedUrl = 'https://github.com/incomplete';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: malformedUrl,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    expect(result).toBe(null);
  });

  it('should return null when git command fails', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: 'fatal: not a git repository',
      exitCode: 128,
      command: 'git remote get-url origin',
      failed: true
    }));

    const result = getGitRemote();

    expect(result).toBe(null);
  });

  it('should return null when origin remote does not exist', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: 'fatal: No such remote \'origin\'',
      exitCode: 128,
      command: 'git remote get-url origin',
      failed: true
    }));

    const result = getGitRemote();

    expect(result).toBe(null);
  });

  it('should return null when execaSync throws an exception', () => {
    mockedExecaSync.mockImplementation(() => {
      throw new Error('Command failed');
    });

    const result = getGitRemote();

    expect(result).toBe(null);
  });

  it('should handle timeout correctly', () => {
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: '',
      stderr: '',
      exitCode: 124,
      command: 'git remote get-url origin',
      failed: true,
      timedOut: true
    }));

    const result = getGitRemote();

    expect(result).toBe(null);
    expect(mockedExecaSync).toHaveBeenCalledWith('git', ['remote', 'get-url', 'origin'], {
      timeout: 5000,
      reject: false
    });
  });

  it('should handle URLs with additional path components', () => {
    const urlWithPath = 'https://github.com/awesome-dude/ghouls.git/some/path';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: urlWithPath,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    // Should not match because of additional path components
    expect(result).toBe(null);
  });

  it('should handle SSH URLs with different formats', () => {
    const sshUrl = 'ssh://git@github.com:22/awesome-dude/ghouls.git';
    mockedExecaSync.mockReturnValue(createMockExecaResult({
      stdout: sshUrl,
      stderr: '',
      exitCode: 0,
      command: 'git remote get-url origin'
    }));

    const result = getGitRemote();

    // Should not match the ssh:// format, only git@ format
    expect(result).toBe(null);
  });
});