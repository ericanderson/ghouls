declare module 'yargs' {
  export interface CommandModule<T = any, U = any> {
    command?: string | string[];
    describe?: string | false;
    builder?: (args: any) => any;
    handler?: (args: any) => void | Promise<void>;
  }

  export interface Argv<T = {}> {
    (args: string[]): Argv<T>;
    usage(message: string): Argv<T>;
    demandCommand(): Argv<T>;
    command(module: CommandModule): Argv<T>;
    help(): Argv<T>;
    argv: T;
  }

  const yargs: Argv;
  export default yargs;
}

declare module 'yargs/helpers' {
  export function hideBin(argv: string[]): string[];
}