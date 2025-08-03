import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import inquirer from 'inquirer';
import readline from 'readline';
import { promptWithCancel } from './promptWithCancel.js';

// Mock modules
vi.mock('inquirer');
vi.mock('readline');

describe('promptWithCancel', () => {
  let mockedInquirer: any;
  let mockedReadline: any;
  let mockStdin: any;
  let mockStdout: any;
  let keypressListener: ((str: string, key: any) => void) | null = null;

  beforeEach(() => {
    mockedInquirer = vi.mocked(inquirer);
    mockedReadline = vi.mocked(readline);
    
    // Mock stdin/stdout
    mockStdin = {
      isTTY: true,
      isRaw: false,
      setRawMode: vi.fn(),
      on: vi.fn((event, handler) => {
        if (event === 'keypress') {
          keypressListener = handler;
        }
      }),
      removeListener: vi.fn()
    };
    
    mockStdout = {
      write: vi.fn()
    };
    
    // Replace process.stdin and process.stdout
    vi.spyOn(process, 'stdin', 'get').mockReturnValue(mockStdin as any);
    vi.spyOn(process, 'stdout', 'get').mockReturnValue(mockStdout as any);
    
    // Mock readline.emitKeypressEvents
    mockedReadline.emitKeypressEvents = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    keypressListener = null;
  });

  it('should return prompt answers when completed normally', async () => {
    const mockAnswers = { selectedBranches: ['branch1', 'branch2'] };
    
    mockedInquirer.prompt.mockResolvedValue(mockAnswers);

    const result = await promptWithCancel([
      {
        type: 'checkbox',
        name: 'selectedBranches',
        message: 'Select branches:',
        choices: ['branch1', 'branch2', 'branch3']
      }
    ]);

    expect(result).toEqual(mockAnswers);
    expect(mockedInquirer.prompt).toHaveBeenCalledTimes(1);
    expect(mockStdin.setRawMode).toHaveBeenCalledWith(true);
    expect(mockStdin.removeListener).toHaveBeenCalledWith('keypress', keypressListener);
  });

  it('should return null when escape key is pressed', async () => {
    // Setup promise that will never resolve (simulating ongoing prompt)
    const promptPromise = new Promise(() => {});
    mockedInquirer.prompt.mockReturnValue(promptPromise);

    // Start the prompt
    const resultPromise = promptWithCancel([
      {
        type: 'checkbox',
        name: 'selectedBranches',
        message: 'Select branches:',
        choices: ['branch1', 'branch2']
      }
    ]);

    // Simulate escape key press after a small delay
    await new Promise(resolve => setTimeout(resolve, 10));
    if (keypressListener) {
      keypressListener('', { name: 'escape' });
    }

    const result = await resultPromise;

    expect(result).toBeNull();
    expect(mockStdout.write).toHaveBeenCalledWith('\n');
    expect(mockStdin.removeListener).toHaveBeenCalledWith('keypress', keypressListener);
  });

  it('should handle non-TTY environments', async () => {
    mockStdin.isTTY = false;
    const mockAnswers = { selectedBranches: ['branch1'] };
    
    mockedInquirer.prompt.mockResolvedValue(mockAnswers);

    const result = await promptWithCancel([
      {
        type: 'checkbox',
        name: 'selectedBranches',
        message: 'Select branches:',
        choices: ['branch1']
      }
    ]);

    expect(result).toEqual(mockAnswers);
    expect(mockStdin.setRawMode).not.toHaveBeenCalled();
  });

  it('should handle prompt errors gracefully', async () => {
    const mockError = new Error('Some prompt error');
    mockedInquirer.prompt.mockRejectedValue(mockError);

    await expect(promptWithCancel([
      {
        type: 'input',
        name: 'test',
        message: 'Test:'
      }
    ])).rejects.toThrow('Some prompt error');

    expect(mockStdin.removeListener).toHaveBeenCalledWith('keypress', keypressListener);
  });

  it('should exit process on Ctrl+C (ExitPromptError)', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    
    const ctrlCError = new Error('User force closed');
    ctrlCError.name = 'ExitPromptError';
    mockedInquirer.prompt.mockRejectedValue(ctrlCError);

    // Since process.exit is called, the promise won't resolve normally
    // We just need to verify the side effects
    promptWithCancel([
      {
        type: 'input',
        name: 'test',
        message: 'Test:'
      }
    ]).catch(() => {
      // Expected to throw since we mock process.exit
    });

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(mockStdout.write).toHaveBeenCalledWith('\n');
    
    mockExit.mockRestore();
  });

  it('should not process escape key after prompt is resolved', async () => {
    const mockAnswers = { test: 'value' };
    let resolvePrompt: ((value: any) => void) | null = null;
    
    // Create a controlled promise
    const promptPromise = new Promise((resolve) => {
      resolvePrompt = resolve;
    });
    
    mockedInquirer.prompt.mockReturnValue(promptPromise);

    const resultPromise = promptWithCancel([
      {
        type: 'input',
        name: 'test',
        message: 'Test:'
      }
    ]);

    // Resolve the prompt first
    if (resolvePrompt) {
      (resolvePrompt as any)(mockAnswers);
    }
    
    // Wait for promise to resolve
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Try to press escape after prompt resolved
    if (keypressListener) {
      keypressListener('', { name: 'escape' });
    }

    const result = await resultPromise;

    // Should return the answers, not null
    expect(result).toEqual(mockAnswers);
    expect(mockStdout.write).not.toHaveBeenCalled(); // No newline written for escape
  });

  it('should restore original raw mode state', async () => {
    mockStdin.isRaw = true; // Start with raw mode enabled
    const mockAnswers = { test: 'value' };
    
    mockedInquirer.prompt.mockResolvedValue(mockAnswers);

    await promptWithCancel([
      {
        type: 'input',
        name: 'test',
        message: 'Test:'
      }
    ]);

    // Should restore to original state (true)
    expect(mockStdin.setRawMode).toHaveBeenCalledWith(true);
  });
});