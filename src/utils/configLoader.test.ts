import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { homedir } from 'os';
import { 
  loadSafetyConfig, 
  loadSafetyConfigSafe, 
  validateSafetyConfig, 
  getConfigFilePaths,
  ConfigLoadError 
} from './configLoader.js';
import type { SafetyConfig, GhoulsConfig } from '../types/config.js';

// Mock filesystem operations
vi.mock('fs');
vi.mock('path');
vi.mock('os');

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);
const mockedResolve = vi.mocked(resolve);
const mockedJoin = vi.mocked(join);
const mockedHomedir = vi.mocked(homedir);

describe('configLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock behaviors
    mockedResolve.mockImplementation((path) => `/resolved/${path}`);
    mockedJoin.mockImplementation((...paths) => paths.join('/'));
    mockedHomedir.mockReturnValue('/home/user');
    
    // Mock process.cwd()
    vi.spyOn(process, 'cwd').mockReturnValue('/current/dir');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GHOULS_CONFIG;
  });

  describe('loadSafetyConfig', () => {
    it('should return empty config when no config files exist', () => {
      mockedExistsSync.mockReturnValue(false);
      
      const result = loadSafetyConfig();
      expect(result).toEqual({});
    });

    it('should load config from environment variable', () => {
      process.env.GHOULS_CONFIG = '/custom/config.json';
      
      const mockConfig: GhoulsConfig = {
        safety: {
          protectedBranches: ['main', 'custom']
        }
      };
      
      mockedExistsSync.mockImplementation((path) => path === '/resolved//custom/config.json');
      mockedReadFileSync.mockImplementation((path) => {
        if (path === '/resolved//custom/config.json') {
          return JSON.stringify(mockConfig);
        }
        throw new Error('File not found');
      });
      
      const result = loadSafetyConfig();
      expect(result).toEqual(mockConfig.safety);
    });

    it('should load config from git repository root', () => {
      // Mock git root discovery
      mockedExistsSync.mockImplementation((path) => {
        if (path === '/current/dir/.git') return true;
        if (path === '/current/dir/.ghouls.json') return true;
        return false;
      });
      
      const mockConfig: GhoulsConfig = {
        safety: {
          protectedBranches: ['main', 'develop'],
          allowUnpushedCommits: true
        }
      };
      
      mockedReadFileSync.mockImplementation((path) => {
        if (path === '/current/dir/.ghouls.json') {
          return JSON.stringify(mockConfig);
        }
        throw new Error('File not found');
      });
      
      const result = loadSafetyConfig();
      expect(result).toEqual(mockConfig.safety);
    });

    it('should load config from user home directory', () => {
      mockedExistsSync.mockImplementation((path) => {
        if (path === '/home/user/.config/ghouls/config.json') return true;
        return false;
      });
      
      const mockConfig: GhoulsConfig = {
        safety: {
          requireMergedPR: false
        }
      };
      
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockConfig));
      
      const result = loadSafetyConfig();
      expect(result).toEqual(mockConfig.safety);
    });

    it('should merge multiple config files with precedence', () => {
      const envConfig: GhoulsConfig = {
        safety: {
          protectedBranches: ['main', 'env-branch'],
          allowUnpushedCommits: true
        }
      };
      
      const repoConfig: GhoulsConfig = {
        safety: {
          protectedBranches: ['main', 'repo-branch'], // Should be overridden by env
          requireMergedPR: false
        }
      };
      
      process.env.GHOULS_CONFIG = '/env/config.json';
      
      mockedExistsSync.mockImplementation((path) => {
        if (path === '/resolved//env/config.json') return true;
        if (path === '/current/dir/.git') return true;
        if (path === '/current/dir/.ghouls.json') return true;
        return false;
      });
      
      mockedReadFileSync.mockImplementation((path) => {
        if (path === '/resolved//env/config.json') {
          return JSON.stringify(envConfig);
        }
        if (path === '/current/dir/.ghouls.json') {
          return JSON.stringify(repoConfig);
        }
        throw new Error('File not found');
      });
      
      const result = loadSafetyConfig();
      
      // Environment config should take precedence
      expect(result).toEqual({
        protectedBranches: ['main', 'env-branch'], // From env config
        allowUnpushedCommits: true, // From env config
        requireMergedPR: false // From repo config
      });
    });

    it('should throw ConfigLoadError for invalid JSON', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue('invalid json {');
      
      expect(() => loadSafetyConfig()).toThrow(ConfigLoadError);
      expect(() => loadSafetyConfig()).toThrow('Invalid JSON');
    });

    it('should throw ConfigLoadError for file read errors', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => loadSafetyConfig()).toThrow(ConfigLoadError);
      expect(() => loadSafetyConfig()).toThrow('Permission denied');
    });

    it('should skip configs without safety section', () => {
      const configWithoutSafety: GhoulsConfig = {
        version: '1.0.0'
      };
      
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify(configWithoutSafety));
      
      const result = loadSafetyConfig();
      expect(result).toEqual({});
    });
  });

  describe('loadSafetyConfigSafe', () => {
    it('should return undefined when no config found', () => {
      mockedExistsSync.mockReturnValue(false);
      
      const result = loadSafetyConfigSafe();
      expect(result).toBeUndefined();
    });

    it('should return undefined on config load error', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('File error');
      });
      
      const result = loadSafetyConfigSafe();
      expect(result).toBeUndefined();
    });

    it('should return config when loading succeeds', () => {
      const mockConfig: GhoulsConfig = {
        safety: {
          protectedBranches: ['main']
        }
      };
      
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockConfig));
      
      const result = loadSafetyConfigSafe();
      expect(result).toEqual(mockConfig.safety);
    });

    it('should log errors when logErrors is true', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = loadSafetyConfigSafe(true);
      
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Failed to load configuration'));
      
      consoleSpy.mockRestore();
    });

    it('should not log errors when logErrors is false', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = loadSafetyConfigSafe(false);
      
      expect(result).toBeUndefined();
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('validateSafetyConfig', () => {
    it('should return no errors for valid config', () => {
      const config: SafetyConfig = {
        protectedBranches: ['main', 'develop'],
        additionalProtectedPatterns: ['feature/.*', 'hotfix/.*'],
        allowUnpushedCommits: false,
        requireMergedPR: true,
        customSafetyRules: [
          { name: 'temp', pattern: 'temp/.*', reason: 'temporary branch' }
        ]
      };
      
      const errors = validateSafetyConfig(config);
      expect(errors).toEqual([]);
    });

    it('should validate protectedBranches type', () => {
      const config = {
        protectedBranches: 'not-an-array'
      } as any;
      
      const errors = validateSafetyConfig(config);
      expect(errors).toContain('protectedBranches must be an array of strings');
    });

    it('should validate protectedBranches string content', () => {
      const config: SafetyConfig = {
        protectedBranches: ['main', '', 123 as any]
      };
      
      const errors = validateSafetyConfig(config);
      expect(errors).toContain('protectedBranches must contain non-empty strings');
    });

    it('should validate additionalProtectedPatterns regex', () => {
      const config: SafetyConfig = {
        additionalProtectedPatterns: ['valid/.*', '[invalid-regex']
      };
      
      const errors = validateSafetyConfig(config);
      expect(errors).toContain('Invalid regex pattern in additionalProtectedPatterns: [invalid-regex');
    });

    it('should validate boolean flags', () => {
      const config = {
        allowUnpushedCommits: 'not-boolean',
        requireMergedPR: 'also-not-boolean'
      } as any;
      
      const errors = validateSafetyConfig(config);
      expect(errors).toContain('allowUnpushedCommits must be a boolean');
      expect(errors).toContain('requireMergedPR must be a boolean');
    });

    it('should validate customSafetyRules structure', () => {
      const config: SafetyConfig = {
        customSafetyRules: [
          { name: '', pattern: 'valid', reason: 'test' },
          { name: 'valid', pattern: '', reason: 'test' },
          { name: 'valid', pattern: 'valid', reason: '' },
          { name: 'valid', pattern: '[invalid', reason: 'test' }
        ]
      };
      
      const errors = validateSafetyConfig(config);
      expect(errors).toContain('customSafetyRules entries must have a non-empty name');
      expect(errors).toContain('customSafetyRules entries must have a non-empty pattern');
      expect(errors).toContain('customSafetyRules entries must have a non-empty reason');
      expect(errors).toContain('Invalid regex pattern in customSafetyRules: [invalid');
    });

    it('should validate customSafetyRules is array', () => {
      const config = {
        customSafetyRules: 'not-an-array'
      } as any;
      
      const errors = validateSafetyConfig(config);
      expect(errors).toContain('customSafetyRules must be an array');
    });
  });

  describe('getConfigFilePaths', () => {
    it('should return config file paths with existence status', () => {
      process.env.GHOULS_CONFIG = '/env/config.json';
      
      mockedExistsSync.mockImplementation((path) => {
        if (path === '/resolved//env/config.json') return true;
        if (path === '/current/dir/.git') return true;
        if (path === '/current/dir/.ghouls.json') return true;
        return false;
      });
      
      mockedReadFileSync.mockImplementation((path) => {
        if (path === '/resolved//env/config.json') {
          return '{"safety": {"protectedBranches": ["main"]}}';
        }
        if (path === '/current/dir/.ghouls.json') {
          return 'invalid json';
        }
        throw new Error('File not found');
      });
      
      const result = getConfigFilePaths();
      
      expect(result).toEqual(
        expect.arrayContaining([
          { path: '/resolved//env/config.json', exists: true, loaded: true },
          { path: '/current/dir/.ghouls.json', exists: true, loaded: false, error: expect.stringContaining('Invalid JSON') }
        ])
      );
    });

    it('should handle non-existent files', () => {
      mockedExistsSync.mockReturnValue(false);
      
      const result = getConfigFilePaths();
      
      result.forEach(entry => {
        expect(entry.exists).toBe(false);
        expect(entry.loaded).toBeUndefined();
        expect(entry.error).toBeUndefined();
      });
    });
  });

  describe('ConfigLoadError', () => {
    it('should create error with message and path', () => {
      const error = new ConfigLoadError('Test message', '/test/path');
      
      expect(error.message).toBe('Test message');
      expect(error.path).toBe('/test/path');
      expect(error.name).toBe('ConfigLoadError');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with cause', () => {
      const cause = new Error('Original error');
      const error = new ConfigLoadError('Test message', '/test/path', cause);
      
      expect(error.cause).toBe(cause);
    });
  });
});