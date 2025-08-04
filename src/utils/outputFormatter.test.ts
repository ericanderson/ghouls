import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setOutputOptions,
  getOutputOptions,
  isVerbose,
  output,
  verboseOutput,
  outputSection,
  outputSummary,
  verboseProgress,
  outputError,
  outputWarning,
  outputSuccess
} from './outputFormatter.js';

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('outputFormatter', () => {
  beforeEach(() => {
    // Reset output options to default before each test
    setOutputOptions({ verbose: false });
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe('setOutputOptions and getOutputOptions', () => {
    it('should set and get output options correctly', () => {
      const options = { verbose: true };
      setOutputOptions(options);
      expect(getOutputOptions()).toEqual(options);
    });

    it('should default to non-verbose mode', () => {
      expect(getOutputOptions()).toEqual({ verbose: false });
    });
  });

  describe('isVerbose', () => {
    it('should return false by default', () => {
      expect(isVerbose()).toBe(false);
    });

    it('should return true when verbose is enabled', () => {
      setOutputOptions({ verbose: true });
      expect(isVerbose()).toBe(true);
    });
  });

  describe('output', () => {
    it('should always output messages regardless of verbose mode', () => {
      output('test message');
      expect(mockConsoleLog).toHaveBeenCalledWith('test message');

      mockConsoleLog.mockClear();
      setOutputOptions({ verbose: true });
      output('verbose message');
      expect(mockConsoleLog).toHaveBeenCalledWith('verbose message');
    });
  });

  describe('verboseOutput', () => {
    it('should not output in non-verbose mode', () => {
      verboseOutput('verbose message');
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should output in verbose mode', () => {
      setOutputOptions({ verbose: true });
      verboseOutput('verbose message');
      expect(mockConsoleLog).toHaveBeenCalledWith('verbose message');
    });
  });

  describe('outputSection', () => {
    it('should format section headers correctly', () => {
      outputSection('Test Section');
      expect(mockConsoleLog).toHaveBeenCalledWith('\n=== Test Section ===');
    });

    it('should always output sections regardless of verbose mode', () => {
      outputSection('Section 1');
      expect(mockConsoleLog).toHaveBeenCalledWith('\n=== Section 1 ===');

      mockConsoleLog.mockClear();
      setOutputOptions({ verbose: true });
      outputSection('Section 2');
      expect(mockConsoleLog).toHaveBeenCalledWith('\n=== Section 2 ===');
    });
  });

  describe('outputSummary', () => {
    it('should format summary items correctly', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      outputSummary(items);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('\nSummary:');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Item 1');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Item 2');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Item 3');
    });

    it('should handle empty summary', () => {
      outputSummary([]);
      expect(mockConsoleLog).toHaveBeenCalledWith('\nSummary:');
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    });
  });

  describe('verboseProgress', () => {
    it('should not output in non-verbose mode', () => {
      verboseProgress('progress message');
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should output in verbose mode', () => {
      setOutputOptions({ verbose: true });
      verboseProgress('progress message');
      expect(mockConsoleLog).toHaveBeenCalledWith('progress message');
    });
  });

  describe('outputError', () => {
    it('should output errors to stderr', () => {
      outputError('error message');
      expect(mockConsoleError).toHaveBeenCalledWith('error message');
    });

    it('should always output errors regardless of verbose mode', () => {
      outputError('error 1');
      expect(mockConsoleError).toHaveBeenCalledWith('error 1');

      mockConsoleError.mockClear();
      setOutputOptions({ verbose: true });
      outputError('error 2');
      expect(mockConsoleError).toHaveBeenCalledWith('error 2');
    });
  });

  describe('outputWarning', () => {
    it('should format warnings with emoji', () => {
      outputWarning('warning message');
      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️  warning message');
    });

    it('should always output warnings regardless of verbose mode', () => {
      outputWarning('warning 1');
      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️  warning 1');

      mockConsoleLog.mockClear();
      setOutputOptions({ verbose: true });
      outputWarning('warning 2');
      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️  warning 2');
    });
  });

  describe('outputSuccess', () => {
    it('should format success messages with emoji', () => {
      outputSuccess('success message');
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ success message');
    });

    it('should always output success messages regardless of verbose mode', () => {
      outputSuccess('success 1');
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ success 1');

      mockConsoleLog.mockClear();
      setOutputOptions({ verbose: true });
      outputSuccess('success 2');
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ success 2');
    });
  });

  describe('integration tests', () => {
    it('should handle verbose and non-verbose outputs correctly in mixed scenarios', () => {
      // Non-verbose mode
      output('always shown');
      verboseOutput('hidden');
      outputError('error shown');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('always shown');
      expect(mockConsoleLog).not.toHaveBeenCalledWith('hidden');
      expect(mockConsoleError).toHaveBeenCalledWith('error shown');

      // Switch to verbose mode
      mockConsoleLog.mockClear();
      mockConsoleError.mockClear();
      setOutputOptions({ verbose: true });

      output('still shown');
      verboseOutput('now shown');
      outputError('error still shown');

      expect(mockConsoleLog).toHaveBeenCalledWith('still shown');
      expect(mockConsoleLog).toHaveBeenCalledWith('now shown');
      expect(mockConsoleError).toHaveBeenCalledWith('error still shown');
    });
  });
});