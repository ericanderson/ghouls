# Ghouls

The ghouls can help you.

# Getting started

## Install

`pnpm add -g ghouls`

## Configure

### Option 1: GitHub CLI (Recommended)

If you have the GitHub CLI (`gh`) installed and authenticated, ghouls will automatically use your existing authentication. No configuration file needed!

```bash
# Authenticate with GitHub CLI if you haven't already
gh auth login
```

### Option 2: Configuration File

Create `~/.config/ghouls.config.json`:

```json
{
    "username": "github-username",
    "token": "github-personal-access-token",
    "baseUrl": "https://ghe.local/api/v3"
}
```

Note: The configuration file is now optional. If not present, ghouls will attempt to use GitHub CLI authentication.

# Prune pull request branches

Run from within a git repository (auto-detects repo):
```bash
ghouls prunePullRequests --dry-run
```

Or specify a repository explicitly:
```bash
ghouls prunePullRequests --dry-run myorg/myrepo
```

```
$ ghouls prunePullRequests myorg/myrepo
#1871 - Deleting remote: heads/fix/fe-nits
#1821 - Deleting remote: heads/fix/collaborator-search
#1799 - Deleting remote: heads/fix-yarn-for-1.24
#1758 - Skipping remote: heads/ml/search-polish (mismatched refs)
...
```