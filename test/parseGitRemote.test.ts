import { describe, it, expect } from 'vitest';
import { parseGitRemote, type GitRemoteInfo } from '../src/utils/getGitRemote.js';

describe('parseGitRemote', () => {
  describe('HTTPS URL parsing', () => {
    it('should parse standard GitHub.com HTTPS URL with .git', () => {
      const result = parseGitRemote('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse standard GitHub.com HTTPS URL without .git', () => {
      const result = parseGitRemote('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse GitHub Enterprise HTTPS URL with .git', () => {
      const result = parseGitRemote('https://github.enterprise.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse GitHub Enterprise HTTPS URL without .git', () => {
      const result = parseGitRemote('https://github.enterprise.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse custom domain HTTPS URL', () => {
      const result = parseGitRemote('https://git.company.internal/team/project.git');
      expect(result).toEqual({ owner: 'team', repo: 'project' });
    });

    it('should handle repos with hyphens and underscores in HTTPS URLs', () => {
      const result = parseGitRemote('https://github.com/my-org/my_awesome-repo.git');
      expect(result).toEqual({ owner: 'my-org', repo: 'my_awesome-repo' });
    });

    it('should handle numeric owner and repo names in HTTPS URLs', () => {
      const result = parseGitRemote('https://github.com/user123/repo456.git');
      expect(result).toEqual({ owner: 'user123', repo: 'repo456' });
    });

    it('should handle subdomain with port in HTTPS URLs', () => {
      const result = parseGitRemote('https://git.company.com:8080/team/project.git');
      expect(result).toEqual({ owner: 'team', repo: 'project' });
    });
  });

  describe('SSH URL parsing', () => {
    it('should parse standard GitHub.com SSH URL with .git', () => {
      const result = parseGitRemote('git@github.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse standard GitHub.com SSH URL without .git', () => {
      const result = parseGitRemote('git@github.com:owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse GitHub Enterprise SSH URL with .git', () => {
      const result = parseGitRemote('git@github.enterprise.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse GitHub Enterprise SSH URL without .git', () => {
      const result = parseGitRemote('git@github.enterprise.com:owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse custom domain SSH URL', () => {
      const result = parseGitRemote('git@git.company.internal:team/project.git');
      expect(result).toEqual({ owner: 'team', repo: 'project' });
    });

    it('should handle repos with hyphens and underscores in SSH URLs', () => {
      const result = parseGitRemote('git@github.com:my-org/my_awesome-repo.git');
      expect(result).toEqual({ owner: 'my-org', repo: 'my_awesome-repo' });
    });

    it('should handle numeric owner and repo names in SSH URLs', () => {
      const result = parseGitRemote('git@github.com:user123/repo456.git');
      expect(result).toEqual({ owner: 'user123', repo: 'repo456' });
    });

    it('should return null for SSH URL with custom port (not supported format)', () => {
      // SSH URLs with ports use ssh://git@host:port/path format, not git@host:port/path
      const result = parseGitRemote('git@git.company.com:2222/team/project.git');
      expect(result).toBeNull();
    });
  });

  describe('edge cases and error handling', () => {
    it('should return null for empty string', () => {
      const result = parseGitRemote('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      const result = parseGitRemote('   ');
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = parseGitRemote(undefined as any);
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = parseGitRemote(null as any);
      expect(result).toBeNull();
    });

    it('should return null for non-string input', () => {
      const result = parseGitRemote(123 as any);
      expect(result).toBeNull();
    });

    it('should handle URLs with leading/trailing whitespace', () => {
      const result = parseGitRemote('  https://github.com/owner/repo.git  ');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should return null for invalid HTTPS URL format', () => {
      const result = parseGitRemote('https://github.com/owner');
      expect(result).toBeNull();
    });

    it('should return null for invalid SSH URL format', () => {
      const result = parseGitRemote('git@github.com:owner');
      expect(result).toBeNull();
    });

    it('should return null for malformed URL', () => {
      const result = parseGitRemote('not-a-valid-url');
      expect(result).toBeNull();
    });

    it('should return null for HTTP (not HTTPS) URL', () => {
      const result = parseGitRemote('http://github.com/owner/repo.git');
      expect(result).toBeNull();
    });

    it('should return null for FTP URL', () => {
      const result = parseGitRemote('ftp://github.com/owner/repo.git');
      expect(result).toBeNull();
    });

    it('should return null for URL with too many path segments', () => {
      const result = parseGitRemote('https://github.com/owner/repo/extra/path.git');
      expect(result).toBeNull();
    });

    it('should return null for SSH URL without colon', () => {
      const result = parseGitRemote('git@github.com/owner/repo.git');
      expect(result).toBeNull();
    });
  });

  describe('backwards compatibility', () => {
    it('should maintain compatibility with existing github.com URLs', () => {
      // These are the original test cases that should continue to work
      const githubHttps = parseGitRemote('https://github.com/facebook/react.git');
      expect(githubHttps).toEqual({ owner: 'facebook', repo: 'react' });

      const githubSsh = parseGitRemote('git@github.com:facebook/react.git');
      expect(githubSsh).toEqual({ owner: 'facebook', repo: 'react' });
    });

    it('should handle real-world repository examples', () => {
      const examples = [
        'https://github.com/microsoft/vscode.git',
        'git@github.com:nodejs/node.git',
        'https://github.com/vercel/next.js.git',
        'git@github.com:facebook/react.git'
      ];

      examples.forEach(url => {
        const result = parseGitRemote(url);
        expect(result).toBeTruthy();
        expect(result?.owner).toBeTruthy();
        expect(result?.repo).toBeTruthy();
      });
    });
  });

  describe('GitHub Enterprise specific tests', () => {
    it('should parse enterprise URLs with various domain patterns', () => {
      const enterpriseUrls = [
        'https://github.company.com/team/project.git',
        'git@github.enterprise.io:org/repo.git',
        'https://git.internal.corp/dev/app.git',
        'git@code.company.net:department/service.git'
      ];

      enterpriseUrls.forEach(url => {
        const result = parseGitRemote(url);
        expect(result).toBeTruthy();
        expect(result?.owner).toBeTruthy();
        expect(result?.repo).toBeTruthy();
      });
    });

    it('should correctly extract owner and repo from enterprise URLs', () => {
      const result1 = parseGitRemote('https://github.mycompany.com/platform-team/core-service.git');
      expect(result1).toEqual({ owner: 'platform-team', repo: 'core-service' });

      const result2 = parseGitRemote('git@git.enterprise.local:backend/user-api.git');
      expect(result2).toEqual({ owner: 'backend', repo: 'user-api' });
    });
  });
});