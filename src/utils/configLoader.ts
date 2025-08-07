/**
 * Configuration file discovery and loading for Ghouls
 */

import { findUpSync } from "find-up";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { dirname, join, resolve } from "path";
import type { GhoulsConfig } from "../types/config.js";
import { CONFIG_FILE_NAMES, mergeConfigs } from "../types/config.js";
import { validateConfigWithZod } from "../types/configSchema.js";

/**
 * Configuration loading error
 */
export class ConfigLoadError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly cause?: Error,
    public readonly validationErrors?: string[]
  ) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

/**
 * Find git repository root by looking for .git directory
 */
function findGitRoot(startPath: string = process.cwd()): string | null {
  const gitDir = findUpSync(".git", { cwd: startPath, type: "directory" });
  return gitDir ? dirname(gitDir) : null;
}

/**
 * Load configuration from a JSON file with Zod validation
 */
function loadConfigFile(configPath: string): GhoulsConfig {
  try {
    const content = readFileSync(configPath, "utf8");
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(content);
    } catch (jsonError) {
      throw new ConfigLoadError(
        `Invalid JSON in configuration file: ${
          jsonError instanceof Error ? jsonError.message : String(jsonError)
        }`,
        configPath,
        jsonError instanceof Error ? jsonError : undefined
      );
    }

    // Validate with Zod
    const validationResult = validateConfigWithZod(parsedJson);

    if (!validationResult.success) {
      throw new ConfigLoadError(
        `Configuration validation failed: ${validationResult.errors.join(", ")}`,
        configPath,
        undefined,
        validationResult.errors
      );
    }

    return validationResult.data;
  } catch (error) {
    if (error instanceof ConfigLoadError) {
      throw error;
    }
    throw new ConfigLoadError(
      `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
      configPath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Find configuration files in order of precedence
 */
function findConfigFiles(): string[] {
  const configPaths: string[] = [];

  // 1. Environment variable
  if (process.env.GHOULS_CONFIG) {
    configPaths.push(resolve(process.env.GHOULS_CONFIG));
  }

  // 2. Repository-level config files (in git root)
  const gitRoot = findGitRoot();
  if (gitRoot) {
    for (const fileName of CONFIG_FILE_NAMES) {
      configPaths.push(join(gitRoot, fileName));
    }
  }

  // 3. User-level config
  const userConfigDir = join(homedir(), ".config", "ghouls");
  configPaths.push(join(userConfigDir, "config.json"));

  // 4. Current directory (fallback)
  for (const fileName of CONFIG_FILE_NAMES) {
    configPaths.push(resolve(fileName));
  }

  return configPaths;
}

/**
 * Load all available configuration files and merge them
 */
export function loadConfig(): GhoulsConfig {
  const configPaths = findConfigFiles();
  const loadedConfigs: GhoulsConfig[] = [];
  const errors: ConfigLoadError[] = [];

  for (const configPath of configPaths) {
    if (!existsSync(configPath)) {
      continue;
    }

    try {
      const config = loadConfigFile(configPath);
      loadedConfigs.push(config);
    } catch (error) {
      if (error instanceof ConfigLoadError) {
        errors.push(error);
      } else {
        errors.push(
          new ConfigLoadError(`Unexpected error loading config: ${String(error)}`, configPath)
        );
      }
    }
  }

  // If we have errors but no successful configs, throw the most relevant error
  if (errors.length > 0 && loadedConfigs.length === 0) {
    const firstError = errors[0];
    // If it's a validation error, provide more context
    if (firstError.validationErrors && firstError.validationErrors.length > 0) {
      throw new ConfigLoadError(
        `Configuration validation failed in ${firstError.path}:\n${
          firstError.validationErrors.map(e => `  - ${e}`).join("\n")
        }`,
        firstError.path,
        firstError.cause,
        firstError.validationErrors
      );
    }
    throw firstError;
  }

  // Merge all loaded configs (first config has highest precedence)
  return mergeConfigs(...loadedConfigs);
}

/**
 * Load configuration synchronously with error handling
 * Returns undefined if no config found or on error (with optional error logging)
 */
export function loadConfigSafe(
  logErrors: boolean = false
): GhoulsConfig | undefined {
  try {
    const config = loadConfig();
    return Object.keys(config).length > 0 ? config : undefined;
  } catch (error) {
    if (logErrors && error instanceof ConfigLoadError) {
      if (error.validationErrors && error.validationErrors.length > 0) {
        console.warn(`Warning: Configuration validation failed in ${error.path}:`);
        error.validationErrors.forEach(validationError => {
          console.warn(`  - ${validationError}`);
        });
      } else {
        console.warn(`Warning: Failed to load configuration from ${error.path}: ${error.message}`);
      }
    }
    return undefined;
  }
}

/**
 * Get discovered configuration file paths for debugging
 */
export function getConfigFilePaths(): Array<
  { path: string; exists: boolean; loaded?: boolean; error?: string }
> {
  const configPaths = findConfigFiles();

  return configPaths.map(path => {
    const exists = existsSync(path);
    let loaded = false;
    let error: string | undefined;

    if (exists) {
      try {
        loadConfigFile(path);
        loaded = true;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
    }

    return { path, exists, loaded, error };
  });
}
