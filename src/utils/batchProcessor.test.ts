import { describe, it, expect } from 'vitest';
import { processBatches, chunkArray } from './batchProcessor.js';

describe('batchProcessor', () => {
  describe('chunkArray', () => {
    it('should chunk array into specified sizes', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const chunks = chunkArray(array, 3);
      
      expect(chunks).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ]);
    });

    it('should handle arrays not evenly divisible by chunk size', () => {
      const array = [1, 2, 3, 4, 5];
      const chunks = chunkArray(array, 2);
      
      expect(chunks).toEqual([
        [1, 2],
        [3, 4],
        [5]
      ]);
    });

    it('should handle empty arrays', () => {
      const chunks = chunkArray([], 3);
      expect(chunks).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      const array = [1, 2];
      const chunks = chunkArray(array, 5);
      
      expect(chunks).toEqual([[1, 2]]);
    });
  });

  describe('processBatches', () => {
    it('should process items in batches successfully', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (batch: number[]) => 
        batch.map(n => n * 2);

      const result = await processBatches(items, processor, { batchSize: 2 });

      expect(result.processed).toEqual([2, 4, 6, 8, 10]);
      expect(result.errors).toEqual([]);
    });

    it('should handle individual item errors gracefully', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (batch: number[]) => {
        return batch.map(n => {
          if (n === 3) throw new Error(`Error processing ${n}`);
          return n * 2;
        });
      };

      const result = await processBatches(items, processor, { batchSize: 2 });

      expect(result.processed).toEqual([2, 4, 8, 10]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].item).toBe(3);
      expect(result.errors[0].error.message).toBe('Error processing 3');
    });

    it('should handle batch processing errors by falling back to individual processing', async () => {
      const items = [1, 2, 3];
      let callCount = 0;
      
      const processor = async (batch: number[]) => {
        callCount++;
        if (callCount === 1 && batch.length > 1) {
          throw new Error('Batch processing failed');
        }
        return batch.map(n => n * 2);
      };

      const result = await processBatches(items, processor, { batchSize: 3 });

      expect(result.processed).toEqual([2, 4, 6]);
      expect(result.errors).toEqual([]);
      expect(callCount).toBe(4); // 1 failed batch + 3 individual retries
    });

    it('should use default batch size when not specified', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      let batchCount = 0;
      
      const processor = async (batch: number[]) => {
        batchCount++;
        return batch.map(n => n * 2);
      };

      await processBatches(items, processor);

      expect(batchCount).toBe(2); // 100 items / 50 default batch size = 2 batches
    });
  });
});