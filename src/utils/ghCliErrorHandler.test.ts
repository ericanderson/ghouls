import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecaSyncError } from 'execa';
import {
  detectGhCliError,
  isGhNotInstalledError,
  isGhNotAuthenticatedError,
  getGhInstallationInstructions,
  getGhAuthenticationInstructions,
  formatGhCliError
} from './ghCliErrorHandler.js';

// Mock the os module
vi.mock('os', () => ({
  platform: vi.fn()
}));

import { platform } from 'os';
const mockedPlatform = vi.mocked(platform);

describe('ghCliErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isGhNotInstalledError', () => {
    it('should detect exit code 127 as not installed', () => {
      const error = {
        exitCode: 127,
        stderr: '',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotInstalledError(error)).toBe(true);
    });

    it('should detect "command not found" in stderr', () => {
      const error = {
        exitCode: 1,
        stderr: 'gh: command not found',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotInstalledError(error)).toBe(true);
    });

    it('should detect "not found" in stderr', () => {
      const error = {
        exitCode: 1,
        stderr: 'bash: gh: not found',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotInstalledError(error)).toBe(true);
    });

    it('should detect "cannot find" in stderr', () => {
      const error = {
        exitCode: 1,
        stderr: 'Cannot find gh executable',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotInstalledError(error)).toBe(true);
    });

    it('should detect ENOENT error code', () => {
      const error = {
        code: 'ENOENT',
        exitCode: undefined,
        stderr: '',
        stdout: ''
      } as ExecaSyncError & { code: string };

      expect(isGhNotInstalledError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = {
        exitCode: 1,
        stderr: 'Some other error',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotInstalledError(error)).toBe(false);
    });
  });

  describe('isGhNotAuthenticatedError', () => {
    it('should detect "gh auth login" message', () => {
      const error = {
        exitCode: 1,
        stderr: 'gh: To get started with GitHub CLI, please run: gh auth login',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotAuthenticatedError(error)).toBe(true);
    });

    it('should detect "not authenticated" message', () => {
      const error = {
        exitCode: 1,
        stderr: 'Error: Not authenticated',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotAuthenticatedError(error)).toBe(true);
    });

    it('should detect "no github token" message', () => {
      const error = {
        exitCode: 1,
        stderr: 'No GitHub token found',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotAuthenticatedError(error)).toBe(true);
    });

    it('should detect "please authenticate" message', () => {
      const error = {
        exitCode: 1,
        stderr: 'Please authenticate first',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotAuthenticatedError(error)).toBe(true);
    });

    it('should detect auth token command failure', () => {
      const error = {
        exitCode: 1,
        command: 'gh auth token',
        stderr: '',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotAuthenticatedError(error)).toBe(true);
    });

    it('should check both stdout and stderr', () => {
      const error = {
        exitCode: 1,
        stderr: '',
        stdout: 'Please run gh auth login'
      } as ExecaSyncError;

      expect(isGhNotAuthenticatedError(error)).toBe(true);
    });

    it('should be case insensitive', () => {
      const error = {
        exitCode: 1,
        stderr: 'GH AUTH LOGIN required',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotAuthenticatedError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = {
        exitCode: 1,
        stderr: 'Network timeout',
        stdout: ''
      } as ExecaSyncError;

      expect(isGhNotAuthenticatedError(error)).toBe(false);
    });
  });

  describe('detectGhCliError', () => {
    it('should detect not installed error', () => {
      // Mock the platform to ensure consistent test results
      mockedPlatform.mockReturnValue('linux');
      
      const error = {
        exitCode: 127,
        stderr: 'gh: command not found',
        stdout: ''
      } as ExecaSyncError;

      const result = detectGhCliError(error);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('not-installed');
      expect(result?.message).toBe('GitHub CLI (gh) is not installed.');
      expect(result?.instructions).toContain('To install GitHub CLI on Linux:');
    });

    it('should detect not authenticated error', () => {
      const error = {
        exitCode: 1,
        stderr: 'gh: To get started with GitHub CLI, please run: gh auth login',
        stdout: ''
      } as ExecaSyncError;

      const result = detectGhCliError(error);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('not-authenticated');
      expect(result?.message).toBe('GitHub CLI is not authenticated.');
      expect(result?.instructions).toContain('To authenticate with GitHub:');
    });

    it('should return null for unknown errors', () => {
      const error = {
        exitCode: 1,
        stderr: 'Some random error',
        stdout: ''
      } as ExecaSyncError;

      const result = detectGhCliError(error);
      expect(result).toBeNull();
    });

    it('should return null for non-object errors', () => {
      expect(detectGhCliError(null)).toBeNull();
      expect(detectGhCliError(undefined)).toBeNull();
      expect(detectGhCliError('string error')).toBeNull();
      expect(detectGhCliError(123)).toBeNull();
    });
  });

  describe('getGhInstallationInstructions', () => {
    it('should show Windows-specific instructions on Windows', () => {
      mockedPlatform.mockReturnValue('win32');
      const instructions = getGhInstallationInstructions();
      expect(instructions).toContain('To install GitHub CLI on Windows:');
      expect(instructions).toContain('winget install --id GitHub.cli');
      expect(instructions).toContain('choco install gh');
      expect(instructions).not.toContain('brew install');
      expect(instructions).not.toContain('apt install');
    });

    it('should show macOS-specific instructions on macOS', () => {
      mockedPlatform.mockReturnValue('darwin');
      const instructions = getGhInstallationInstructions();
      expect(instructions).toContain('To install GitHub CLI on macOS:');
      expect(instructions).toContain('brew install gh');
      expect(instructions).toContain('sudo port install gh');
      expect(instructions).not.toContain('winget install');
      expect(instructions).not.toContain('apt install');
    });

    it('should show Linux instructions on Linux', () => {
      mockedPlatform.mockReturnValue('linux');
      const instructions = getGhInstallationInstructions();
      expect(instructions).toContain('To install GitHub CLI on Linux:');
      expect(instructions).toContain('sudo apt install gh');
      expect(instructions).toContain('sudo dnf install gh');
      expect(instructions).toContain('sudo pacman -S github-cli');
      expect(instructions).not.toContain('winget install');
      expect(instructions).not.toContain('brew install');
    });

    it('should include link to README for other platforms', () => {
      mockedPlatform.mockReturnValue('linux');
      const instructions = getGhInstallationInstructions();
      expect(instructions).toContain('https://github.com/ericanderson/ghouls#installing-github-cli');
    });

    it('should include GitHub CLI website link', () => {
      mockedPlatform.mockReturnValue('darwin');
      const instructions = getGhInstallationInstructions();
      expect(instructions).toContain('https://cli.github.com/');
    });

    it('should handle unknown platforms', () => {
      mockedPlatform.mockReturnValue('freebsd' as any);
      const instructions = getGhInstallationInstructions();
      expect(instructions).toContain('To install GitHub CLI on your platform');
      expect(instructions).toContain('https://cli.github.com/');
    });
  });

  describe('getGhAuthenticationInstructions', () => {
    it('should include authentication steps', () => {
      const instructions = getGhAuthenticationInstructions();
      expect(instructions).toContain('gh auth login');
      expect(instructions).toContain('Choose GitHub.com or GitHub Enterprise Server');
      expect(instructions).toContain('Login with a web browser (recommended)');
      expect(instructions).toContain('Paste an authentication token');
    });

    it('should include documentation link', () => {
      const instructions = getGhAuthenticationInstructions();
      expect(instructions).toContain('https://cli.github.com/manual/gh_auth_login');
    });
  });

  describe('formatGhCliError', () => {
    it('should return instructions when available', () => {
      const error = {
        type: 'not-installed' as const,
        message: 'Not installed',
        instructions: 'Detailed instructions here'
      };

      expect(formatGhCliError(error)).toBe('Detailed instructions here');
    });

    it('should return message when instructions not available', () => {
      const error = {
        type: 'unknown' as const,
        message: 'Unknown error occurred'
      };

      expect(formatGhCliError(error)).toBe('Unknown error occurred');
    });
  });
});