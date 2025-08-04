import { describe, it, expect, vi } from 'vitest';
import type { EnhancedChoice } from './enhancedPrompts.js';

// Mock inquirer since it's difficult to test interactive prompts
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

describe('enhancedPrompts', () => {
  describe('EnhancedChoice interface', () => {
    it('should define the correct structure', () => {
      const choice: EnhancedChoice = {
        name: 'test-branch (PR #123, last commit: 2023-01-01)',
        value: 'test-branch',
        checked: true,
        metadata: {
          prNumber: 123,
          lastCommit: '2023-01-01',
          safetyReason: 'merged'
        }
      };

      expect(choice.name).toBe('test-branch (PR #123, last commit: 2023-01-01)');
      expect(choice.value).toBe('test-branch');
      expect(choice.checked).toBe(true);
      expect(choice.metadata?.prNumber).toBe(123);
    });

    it('should allow optional properties', () => {
      const minimalChoice: EnhancedChoice = {
        name: 'minimal-branch',
        value: 'minimal-branch'
      };

      expect(minimalChoice.checked).toBeUndefined();
      expect(minimalChoice.metadata).toBeUndefined();
    });
  });

  // Note: Full testing of createPaginatedCheckboxPrompt would require complex mocking
  // of inquirer's interactive behavior. For now, we test the type definitions and
  // basic structure. Integration testing would be done manually or with e2e tests.
});