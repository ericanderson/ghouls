/**
 * Centralized output formatting utility for CLI commands.
 * Manages verbose vs. quiet output modes and provides consistent formatting.
 */

export interface OutputOptions {
  verbose: boolean;
}

let globalOutputOptions: OutputOptions = { verbose: false };

export function setOutputOptions(options: OutputOptions): void {
  globalOutputOptions = options;
}

export function getOutputOptions(): OutputOptions {
  return globalOutputOptions;
}

export function isVerbose(): boolean {
  return globalOutputOptions.verbose;
}

/**
 * Always outputs the message regardless of verbose mode.
 * Use for critical information, errors, and final summaries.
 */
export function output(message: string): void {
  console.log(message);
}

/**
 * Only outputs in verbose mode.
 * Use for detailed progress information, debugging details, and intermediate steps.
 */
export function verboseOutput(message: string): void {
  if (globalOutputOptions.verbose) {
    console.log(message);
  }
}

/**
 * Outputs a section header with consistent formatting.
 * Always shown regardless of verbose mode.
 */
export function outputSection(title: string): void {
  console.log(`\n=== ${title} ===`);
}

/**
 * Outputs a summary with consistent formatting.
 * Always shown regardless of verbose mode.
 */
export function outputSummary(items: string[]): void {
  console.log('\nSummary:');
  for (const item of items) {
    console.log(`  ${item}`);
  }
}

/**
 * Outputs progress information.
 * Only shown in verbose mode.
 */
export function verboseProgress(message: string): void {
  if (globalOutputOptions.verbose) {
    console.log(message);
  }
}

/**
 * Outputs error messages.
 * Always shown regardless of verbose mode.
 */
export function outputError(message: string): void {
  console.error(message);
}

/**
 * Outputs warning messages.
 * Always shown regardless of verbose mode.
 */
export function outputWarning(message: string): void {
  console.log(`⚠️  ${message}`);
}

/**
 * Outputs success messages.
 * Always shown regardless of verbose mode.
 */
export function outputSuccess(message: string): void {
  console.log(`✅ ${message}`);
}