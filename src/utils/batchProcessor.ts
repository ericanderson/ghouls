/**
 * Utility functions for processing large datasets in batches
 * to optimize memory usage and performance
 */

export interface BatchProcessorOptions {
  batchSize: number;
  showProgress?: boolean;
}

export interface ProcessingResult<T> {
  processed: T[];
  errors: Array<{ item: any; error: Error }>;
}

/**
 * Processes an array of items in batches with optional progress reporting
 */
export async function processBatches<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: BatchProcessorOptions = { batchSize: 50 }
): Promise<ProcessingResult<R>> {
  const { batchSize } = options;
  const results: R[] = [];
  const errors: Array<{ item: T; error: Error }> = [];
  
  const totalBatches = Math.ceil(items.length / batchSize);
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const currentBatch = Math.floor(i / batchSize) + 1;
    
    if (options.showProgress) {
      console.log(`Processing batch ${currentBatch}/${totalBatches} (${batch.length} items)...`);
    }
    
    try {
      const batchResults = await processor(batch);
      results.push(...batchResults);
    } catch (error) {
      // Handle batch errors by processing items individually
      for (const item of batch) {
        try {
          const itemResults = await processor([item]);
          results.push(...itemResults);
        } catch (itemError) {
          errors.push({ 
            item, 
            error: itemError instanceof Error ? itemError : new Error(String(itemError)) 
          });
        }
      }
    }
  }
  
  return { processed: results, errors };
}

/**
 * Chunks an array into smaller arrays of specified size
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}