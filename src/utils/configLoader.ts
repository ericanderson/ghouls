/**
 * Configuration file discovery and loading for Ghouls
 */

import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { homedir } from "os";
import type { GhoulsConfig, SafetyConfig } from "../types/config.js";
import { CONFIG_FILE_NAMES, mergeSafetyConfig } from "../types/config.js";

/**
 * Configuration loading error
 */
export class ConfigLoadError extends Error {
  constructor(message: string, public readonly path: string, public readonly cause?: Error) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

/**
 * Find git repository root by looking for .git directory
 */
function findGitRoot(startPath: string = process.cwd()): string | null {
  let currentPath = resolve(startPath);
  
  while (currentPath !== resolve(currentPath, "..")) {
    if (existsSync(join(currentPath, ".git"))) {
      return currentPath;
    }
    currentPath = resolve(currentPath, "..");
  }
  
  return null;
}

/**
 * Load configuration from a JSON file
 */
function loadConfigFile(configPath: string): GhoulsConfig {
  try {
    const content = readFileSync(configPath, "utf8");
    const config = JSON.parse(content) as GhoulsConfig;
    
    // Basic validation
    if (config && typeof config === "object") {
      return config;
    }
    
    throw new Error("Configuration must be a valid JSON object");
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ConfigLoadError(`Invalid JSON in configuration file: ${error.message}`, configPath, error);
    }
    throw new ConfigLoadError(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`, configPath, error instanceof Error ? error : undefined);
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
export function loadSafetyConfig(): SafetyConfig {
  const configPaths = findConfigFiles();
  const loadedConfigs: SafetyConfig[] = [];
  const errors: ConfigLoadError[] = [];
  
  for (const configPath of configPaths) {
    if (!existsSync(configPath)) {
      continue;
    }
    
    try {
      const config = loadConfigFile(configPath);
      if (config.safety) {
        loadedConfigs.push(config.safety);
      }
    } catch (error) {
      if (error instanceof ConfigLoadError) {
        errors.push(error);
      } else {
        errors.push(new ConfigLoadError(`Unexpected error loading config: ${String(error)}`, configPath));
      }
    }
  }
  
  // If we have errors but no successful configs, throw the first error
  if (errors.length > 0 && loadedConfigs.length === 0) {
    throw errors[0];
  }
  
  // Merge all loaded configs (first config has highest precedence)
  return mergeSafetyConfig(...loadedConfigs);
}

/**
 * Load configuration synchronously with error handling
 * Returns undefined if no config found or on error (with optional error logging)
 */
export function loadSafetyConfigSafe(logErrors: boolean = false): SafetyConfig | undefined {
  try {
    const config = loadSafetyConfig();
    return Object.keys(config).length > 0 ? config : undefined;
  } catch (error) {
    if (logErrors && error instanceof ConfigLoadError) {
      console.warn(`Warning: Failed to load configuration from ${error.path}: ${error.message}`);
    }
    return undefined;
  }
}

/**
 * Validate safety configuration
 */
export function validateSafetyConfig(config: SafetyConfig): string[] {
  const errors: string[] = [];
  
  // Validate protected branches
  if (config.protectedBranches && !Array.isArray(config.protectedBranches)) {
    errors.push("protectedBranches must be an array of strings");
  } else if (config.protectedBranches) {
    for (const branch of config.protectedBranches) {
      if (typeof branch !== "string" || branch.trim() === "") {
        errors.push("protectedBranches must contain non-empty strings");
        break;
      }
    }
  }
  
  // Validate additional protected patterns
  if (config.additionalProtectedPatterns && !Array.isArray(config.additionalProtectedPatterns)) {
    errors.push("additionalProtectedPatterns must be an array of strings");
  } else if (config.additionalProtectedPatterns) {
    for (const pattern of config.additionalProtectedPatterns) {
      if (typeof pattern !== "string" || pattern.trim() === "") {
        errors.push("additionalProtectedPatterns must contain non-empty strings");
        break;
      }
      
      // Test if pattern is valid regex
      try {
        new RegExp(pattern);
      } catch {
        errors.push(`Invalid regex pattern in additionalProtectedPatterns: ${pattern}`);
      }
    }
  }
  
  // Validate boolean flags
  if (config.allowUnpushedCommits !== undefined && typeof config.allowUnpushedCommits !== "boolean") {
    errors.push("allowUnpushedCommits must be a boolean");
  }
  
  if (config.requireMergedPR !== undefined && typeof config.requireMergedPR !== "boolean") {
    errors.push("requireMergedPR must be a boolean");
  }
  
  // Validate custom safety rules
  if (config.customSafetyRules && !Array.isArray(config.customSafetyRules)) {
    errors.push("customSafetyRules must be an array");
  } else if (config.customSafetyRules) {
    for (const rule of config.customSafetyRules) {
      if (!rule || typeof rule !== "object") {
        errors.push("customSafetyRules must contain objects");
        continue;
      }
      
      if (!rule.name || typeof rule.name !== "string") {
        errors.push("customSafetyRules entries must have a non-empty name");
      }
      
      if (!rule.pattern || typeof rule.pattern !== "string") {
        errors.push("customSafetyRules entries must have a non-empty pattern");
      } else {
        try {
          new RegExp(rule.pattern);
        } catch {
          errors.push(`Invalid regex pattern in customSafetyRules: ${rule.pattern}`);
        }
      }
      
      if (!rule.reason || typeof rule.reason !== "string") {
        errors.push("customSafetyRules entries must have a non-empty reason");
      }
    }
  }
  
  return errors;
}

/**
 * Get discovered configuration file paths for debugging
 */
export function getConfigFilePaths(): Array<{ path: string; exists: boolean; loaded?: boolean; error?: string }> {
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