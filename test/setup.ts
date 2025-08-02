import { vi } from 'vitest';

// Global test setup and utilities

/**
 * Helper to create a mock execa result with default values
 */
export function createMockExecaResult(overrides: Partial<{
  stdout: string;
  stderr: string;
  exitCode: number;
  failed: boolean;
  timedOut: boolean;
  command: string;
}>) {
  return {
    stdout: '',
    stderr: '',
    exitCode: 0,
    command: overrides.command || 'mock-command',
    escapedCommand: overrides.command || 'mock-command',
    failed: false,
    timedOut: false,
    isCanceled: false,
    killed: false,
    ...overrides
  };
}

/**
 * Helper to create a mock convict config object
 */
export function createMockConvictConfig() {
  return {
    loadFile: vi.fn(),
    validate: vi.fn(),
    getProperties: vi.fn()
  };
}

/**
 * Common test assertions for GitHub CLI timeouts
 */
export function expectGhCliTimeout(mockFn: any, timeout: number) {
  expect(mockFn).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    expect.objectContaining({
      timeout,
      reject: false
    })
  );
}

/**
 * Common test assertions for Git command timeouts
 */
export function expectGitTimeout(mockFn: any, timeout: number) {
  expect(mockFn).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    expect.objectContaining({
      timeout,
      reject: false
    })
  );
}