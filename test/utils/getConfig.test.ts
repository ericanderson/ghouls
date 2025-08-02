import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import untildify from 'untildify';
import convict from 'convict';
import { getConfig } from '../../src/utils/getConfig.js';
import { getGhToken } from '../../src/utils/getGhToken.js';
import { getGhUsername } from '../../src/utils/getGhUsername.js';
import { getGhBaseUrl } from '../../src/utils/getGhBaseUrl.js';

// Mock all dependencies
vi.mock('fs');
vi.mock('untildify');
vi.mock('convict');
vi.mock('../../src/utils/getGhToken.js');
vi.mock('../../src/utils/getGhUsername.js');
vi.mock('../../src/utils/getGhBaseUrl.js');

const mockedExistsSync = vi.mocked(existsSync);
const mockedUntildify = vi.mocked(untildify);
const mockedConvict = vi.mocked(convict);
const mockedGetGhToken = vi.mocked(getGhToken);
const mockedGetGhUsername = vi.mocked(getGhUsername);
const mockedGetGhBaseUrl = vi.mocked(getGhBaseUrl);

describe('getConfig', () => {
  let mockConfig: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock convict config object
    mockConfig = {
      loadFile: vi.fn(),
      validate: vi.fn(),
      getProperties: vi.fn()
    };

    mockedConvict.mockReturnValue(mockConfig);
    mockedUntildify.mockImplementation((path) => path.replace('~', '/home/user'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load config from file when it exists', () => {
    const configPath = '/home/user/.config/ghouls.config.json';
    const mockConfigData = {
      token: 'file_token',
      username: 'file_user',
      baseUrl: 'https://api.github.com'
    };

    mockedExistsSync.mockReturnValue(true);
    mockedUntildify.mockReturnValue(configPath);
    mockConfig.getProperties.mockReturnValue(mockConfigData);

    const result = getConfig();

    expect(mockedUntildify).toHaveBeenCalledWith('~/.config/ghouls.config.json');
    expect(mockedExistsSync).toHaveBeenCalledWith(configPath);
    expect(mockConfig.loadFile).toHaveBeenCalledWith(configPath);
    expect(mockConfig.validate).toHaveBeenCalledWith({ allowed: 'strict' });
    expect(result).toEqual(mockConfigData);
  });

  it('should use custom config file path', () => {
    const customPath = '~/custom/config.json';
    const expandedPath = '/home/user/custom/config.json';
    const mockConfigData = {
      token: 'custom_token',
      username: 'custom_user',
      baseUrl: 'https://api.github.com'
    };

    mockedExistsSync.mockReturnValue(true);
    mockedUntildify.mockReturnValue(expandedPath);
    mockConfig.getProperties.mockReturnValue(mockConfigData);

    const result = getConfig(customPath);

    expect(mockedUntildify).toHaveBeenCalledWith(customPath);
    expect(mockedExistsSync).toHaveBeenCalledWith(expandedPath);
    expect(mockConfig.loadFile).toHaveBeenCalledWith(expandedPath);
    expect(result).toEqual(mockConfigData);
  });

  it('should not load file when it does not exist', () => {
    const configPath = '/home/user/.config/ghouls.config.json';
    const mockConfigData = {
      token: '',
      username: '',
      baseUrl: ''
    };

    mockedExistsSync.mockReturnValue(false);
    mockedUntildify.mockReturnValue(configPath);
    mockConfig.getProperties.mockReturnValue(mockConfigData);
    mockedGetGhToken.mockReturnValue('gh_token');
    mockedGetGhUsername.mockReturnValue('gh_user');
    mockedGetGhBaseUrl.mockReturnValue('https://api.github.com');

    const result = getConfig();

    expect(mockedExistsSync).toHaveBeenCalledWith(configPath);
    expect(mockConfig.loadFile).not.toHaveBeenCalled();
    expect(mockConfig.validate).not.toHaveBeenCalled();
    expect(mockedGetGhToken).toHaveBeenCalled();
    expect(mockedGetGhUsername).toHaveBeenCalled();
    expect(mockedGetGhBaseUrl).toHaveBeenCalled();
    expect(result).toEqual({
      token: 'gh_token',
      username: 'gh_user',
      baseUrl: 'https://api.github.com'
    });
  });

  it('should fill missing token from gh CLI', () => {
    const mockConfigData = {
      token: '',
      username: 'file_user',
      baseUrl: 'https://api.github.com'
    };

    mockedExistsSync.mockReturnValue(true);
    mockConfig.getProperties.mockReturnValue(mockConfigData);
    mockedGetGhToken.mockReturnValue('gh_token');

    const result = getConfig();

    expect(mockedGetGhToken).toHaveBeenCalled();
    expect(result.token).toBe('gh_token');
    expect(result.username).toBe('file_user');
    expect(result.baseUrl).toBe('https://api.github.com');
  });

  it('should fill missing username from gh CLI', () => {
    const mockConfigData = {
      token: 'file_token',
      username: '',
      baseUrl: 'https://api.github.com'
    };

    mockedExistsSync.mockReturnValue(true);
    mockConfig.getProperties.mockReturnValue(mockConfigData);
    mockedGetGhUsername.mockReturnValue('gh_user');

    const result = getConfig();

    expect(mockedGetGhUsername).toHaveBeenCalled();
    expect(result.token).toBe('file_token');
    expect(result.username).toBe('gh_user');
    expect(result.baseUrl).toBe('https://api.github.com');
  });

  it('should fill missing baseUrl from gh CLI', () => {
    const mockConfigData = {
      token: 'file_token',
      username: 'file_user',
      baseUrl: ''
    };

    mockedExistsSync.mockReturnValue(true);
    mockConfig.getProperties.mockReturnValue(mockConfigData);
    mockedGetGhBaseUrl.mockReturnValue('https://enterprise.github.com/api/v3');

    const result = getConfig();

    expect(mockedGetGhBaseUrl).toHaveBeenCalled();
    expect(result.token).toBe('file_token');
    expect(result.username).toBe('file_user');
    expect(result.baseUrl).toBe('https://enterprise.github.com/api/v3');
  });

  it('should handle null values from gh CLI functions', () => {
    const mockConfigData = {
      token: '',
      username: '',
      baseUrl: ''
    };

    mockedExistsSync.mockReturnValue(false);
    mockConfig.getProperties.mockReturnValue(mockConfigData);
    mockedGetGhToken.mockReturnValue(null);
    mockedGetGhUsername.mockReturnValue(null);
    mockedGetGhBaseUrl.mockReturnValue('https://api.github.com');

    const result = getConfig();

    expect(result).toEqual({
      token: undefined,
      username: undefined,
      baseUrl: 'https://api.github.com'
    });
  });

  it('should create convict schema with correct structure', () => {
    const mockConfigData = {
      token: '',
      username: '',
      baseUrl: ''
    };

    mockedExistsSync.mockReturnValue(false);
    mockConfig.getProperties.mockReturnValue(mockConfigData);
    mockedGetGhToken.mockReturnValue('token');
    mockedGetGhUsername.mockReturnValue('user');
    mockedGetGhBaseUrl.mockReturnValue('https://api.github.com');

    getConfig();

    expect(mockedConvict).toHaveBeenCalledWith({
      token: {
        doc: 'github oauth key',
        default: ''
      },
      username: {
        doc: 'github username',
        default: ''
      },
      baseUrl: {
        doc: 'github api baseurl',
        default: ''
      }
    });
  });

  it('should preserve existing config values when they are present', () => {
    const mockConfigData = {
      token: 'existing_token',
      username: 'existing_user',
      baseUrl: 'https://existing.api.com'
    };

    mockedExistsSync.mockReturnValue(true);
    mockConfig.getProperties.mockReturnValue(mockConfigData);

    const result = getConfig();

    // Should not call gh CLI functions when values are present
    expect(mockedGetGhToken).not.toHaveBeenCalled();
    expect(mockedGetGhUsername).not.toHaveBeenCalled();
    expect(mockedGetGhBaseUrl).not.toHaveBeenCalled();

    expect(result).toEqual(mockConfigData);
  });

  it('should handle mixed scenario with some values from file and some from gh CLI', () => {
    const mockConfigData = {
      token: 'file_token',
      username: '',
      baseUrl: 'file_baseUrl'
    };

    mockedExistsSync.mockReturnValue(true);
    mockConfig.getProperties.mockReturnValue(mockConfigData);
    mockedGetGhUsername.mockReturnValue('gh_user');

    const result = getConfig();

    expect(mockedGetGhToken).not.toHaveBeenCalled();
    expect(mockedGetGhUsername).toHaveBeenCalled();
    expect(mockedGetGhBaseUrl).not.toHaveBeenCalled();

    expect(result).toEqual({
      token: 'file_token',
      username: 'gh_user',
      baseUrl: 'file_baseUrl'
    });
  });

  it('should handle untildify transformation correctly', () => {
    const inputPath = '~/some/path/config.json';
    const expandedPath = '/home/user/some/path/config.json';
    const mockConfigData = {
      token: 'token',
      username: 'user',
      baseUrl: 'https://api.github.com'
    };

    mockedUntildify.mockReturnValue(expandedPath);
    mockedExistsSync.mockReturnValue(true);
    mockConfig.getProperties.mockReturnValue(mockConfigData);

    getConfig(inputPath);

    expect(mockedUntildify).toHaveBeenCalledWith(inputPath);
    expect(mockedExistsSync).toHaveBeenCalledWith(expandedPath);
    expect(mockConfig.loadFile).toHaveBeenCalledWith(expandedPath);
  });

  it('should handle config validation failure gracefully', () => {
    const mockConfigData = {
      token: 'invalid_token',
      username: 'user',
      baseUrl: 'https://api.github.com'
    };

    mockedExistsSync.mockReturnValue(true);
    mockConfig.getProperties.mockReturnValue(mockConfigData);
    mockConfig.validate.mockImplementation(() => {
      throw new Error('Validation failed');
    });

    // Should not throw, but the test framework should handle the error
    expect(() => getConfig()).toThrow('Validation failed');
  });

  it('should handle file loading errors gracefully', () => {
    const mockConfigData = {
      token: '',
      username: '',
      baseUrl: ''
    };

    mockedExistsSync.mockReturnValue(true);
    mockConfig.getProperties.mockReturnValue(mockConfigData);
    mockConfig.loadFile.mockImplementation(() => {
      throw new Error('File loading failed');
    });
    mockedGetGhToken.mockReturnValue('backup_token');
    mockedGetGhUsername.mockReturnValue('backup_user');
    mockedGetGhBaseUrl.mockReturnValue('https://api.github.com');

    // Should not throw, but the test framework should handle the error
    expect(() => getConfig()).toThrow('File loading failed');
  });

  it('should handle empty string values as missing', () => {
    const mockConfigData = {
      token: '',  // Empty string is falsy
      username: '',  // Empty string is falsy
      baseUrl: ''
    };

    mockedExistsSync.mockReturnValue(true);
    mockConfig.getProperties.mockReturnValue(mockConfigData);
    mockedGetGhToken.mockReturnValue('gh_token');
    mockedGetGhUsername.mockReturnValue('gh_user');
    mockedGetGhBaseUrl.mockReturnValue('https://api.github.com');

    const result = getConfig();

    // Should call all gh CLI functions because config values are empty strings
    expect(mockedGetGhToken).toHaveBeenCalled();
    expect(mockedGetGhUsername).toHaveBeenCalled();
    expect(mockedGetGhBaseUrl).toHaveBeenCalled();

    expect(result).toEqual({
      token: 'gh_token',
      username: 'gh_user',
      baseUrl: 'https://api.github.com'
    });
  });

  it('should preserve whitespace-only values from config file', () => {
    const mockConfigData = {
      token: '   ',  // Whitespace is truthy, so it should be preserved
      username: '\t\n',  // More whitespace, also truthy
      baseUrl: '  https://api.github.com  '
    };

    mockedExistsSync.mockReturnValue(true);
    mockConfig.getProperties.mockReturnValue(mockConfigData);

    const result = getConfig();

    // Should NOT call gh CLI functions because whitespace values are truthy
    expect(mockedGetGhToken).not.toHaveBeenCalled();
    expect(mockedGetGhUsername).not.toHaveBeenCalled();
    expect(mockedGetGhBaseUrl).not.toHaveBeenCalled();

    expect(result).toEqual({
      token: '   ',
      username: '\t\n',
      baseUrl: '  https://api.github.com  '
    });
  });
});