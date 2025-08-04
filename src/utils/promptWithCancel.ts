import inquirer from 'inquirer';
import readline from 'readline';

/**
 * Wrapper for inquirer prompts that adds escape key cancellation support.
 * Returns null if the user presses escape, otherwise returns the prompt answers.
 */
export async function promptWithCancel<T = any>(
  questions: any
): Promise<T | null> {
  let cleanupFunction: (() => void) | undefined;
  let promptResolved = false;

  const result = await new Promise<T | null>((resolve, reject) => {
    // Setup escape key handling
    const originalRawMode = process.stdin.isRaw;
    readline.emitKeypressEvents(process.stdin);
    
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const keypressHandler = (_str: string, key: any) => {
      if (key && key.name === 'escape' && !promptResolved) {
        promptResolved = true;
        // Emit newline to clean up the terminal display
        process.stdout.write('\n');
        resolve(null); // Return null to indicate cancellation
      }
    };

    process.stdin.on('keypress', keypressHandler);

    cleanupFunction = () => {
      process.stdin.removeListener('keypress', keypressHandler);
      if (process.stdin.isTTY && originalRawMode !== process.stdin.isRaw) {
        process.stdin.setRawMode(originalRawMode);
      }
    };

    // Start the actual prompt
    inquirer.prompt(questions)
      .then((answers) => {
        if (!promptResolved) {
          promptResolved = true;
          resolve(answers as T);
        }
      })
      .catch((error) => {
        if (!promptResolved) {
          promptResolved = true;
          // Handle Ctrl+C gracefully
          if (error.name === 'ExitPromptError' || error.message?.includes('User force closed')) {
            process.stdout.write('\n');
            process.exit(0);
          }
          reject(error);
        }
      });
  }).finally(() => {
    if (cleanupFunction) {
      cleanupFunction();
    }
  });

  return result;
}