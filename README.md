# Ghouls

The ghouls can help you.

# Breaking Changes

## v2.0.0
- **Command names have changed:**
  - `prunePullRequests` → `remote`
  - `pruneLocalBranches` → `local`
  
  If you have scripts using the old commands, please update them to use the new shorter names.

# Getting started

## Install

`pnpm add -g ghouls`

## Authentication

Ghouls uses GitHub CLI authentication. Make sure you have the GitHub CLI (`gh`) installed and authenticated:

```bash
# Install GitHub CLI if you haven't already
# See: https://cli.github.com/

# Authenticate with GitHub CLI
gh auth login
```

That's it! Ghouls will automatically use your existing GitHub CLI authentication.

# Commands

## Delete remote branches

Safely deletes remote branches that have been merged via pull requests.

Run from within a git repository (auto-detects repo):
```bash
ghouls remote --dry-run
```

The auto-detection feature works with both github.com and GitHub Enterprise repositories, automatically detecting the repository owner/name from the remote URL.

Or specify a repository explicitly:
```bash
ghouls remote --dry-run myorg/myrepo
```

```
$ ghouls remote myorg/myrepo
#1871 - Deleting remote: heads/fix/fe-nits
#1821 - Deleting remote: heads/fix/collaborator-search
#1799 - Deleting remote: heads/fix-yarn-for-1.24
#1758 - Skipping remote: heads/ml/search-polish (mismatched refs)
...
```

## Delete local branches

Safely deletes local branches that have been merged via pull requests. This command includes comprehensive safety checks to protect important branches and work in progress.

Run from within a git repository (auto-detects repo):
```bash
ghouls local --dry-run
```

Or specify a repository explicitly:
```bash
ghouls local --dry-run myorg/myrepo
```

### Safety Features

The `local` command includes several safety checks to prevent accidental deletion of important branches:

- **Current branch protection**: Never deletes the currently checked out branch
- **Protected branch names**: Automatically protects `main`, `master`, `develop`, `dev`, `staging`, `production`, and `prod` branches
- **SHA verification**: Only deletes branches where the local SHA matches the pull request head SHA
- **Merge verification**: Only considers pull requests that were actually merged (not just closed)
- **Unpushed commits protection**: Skips branches that have unpushed commits
- **Dry-run mode**: Use `--dry-run` to see what would be deleted without making changes

### Example Output

```
$ ghouls local --dry-run

Scanning for local branches that can be safely deleted...
Found 15 local branches
Fetching merged pull requests from GitHub...
Found 42 merged pull requests

Branch Analysis:
  Safe to delete: 3
  Unsafe to delete: 12

Skipping unsafe branches:
  - main (protected branch)
  - feature/wip-work (2 unpushed commits)
  - fix/critical-bug (current branch)
  - hotfix/emergency (SHA mismatch with PR head)

Would delete 3 branches:
[DRY RUN] Would delete: feature/user-auth (#123)
[DRY RUN] Would delete: fix/typo-fix (#124)
[DRY RUN] Would delete: refactor/cleanup (#125)

Summary:
  Would delete: 3 branches
  Skipped (unsafe): 12
```

## Delete both remote and local branches

The `all` command combines both remote and local branch cleanup in a single operation, running them in sequence for maximum efficiency.

Run from within a git repository (auto-detects repo):
```bash
ghouls all --dry-run
```

Or specify a repository explicitly:
```bash
ghouls all --dry-run myorg/myrepo
```

### Execution Order

The command executes in two phases:
1. **Remote cleanup**: Deletes merged remote branches first
2. **Local cleanup**: Then deletes corresponding local branches

Even if one phase encounters errors, the command will continue with the next phase to ensure maximum cleanup.

### Example Output

```
$ ghouls all

🚀 Starting combined branch cleanup...

=== Phase 1: Remote Branch Cleanup ===
Scanning for remote branches that can be safely deleted...
Found 5 branches that can be deleted.
Deleted: heads/feature/old-feature (PR #101)
Deleted: heads/fix/bug-123 (PR #102)
...

=== Phase 2: Local Branch Cleanup ===
Scanning for local branches that can be safely deleted...
Found 8 local branches
Branch Analysis:
  Safe to delete: 3
  Unsafe to delete: 5
Deleted: feature/old-feature (#101)
Deleted: fix/bug-123 (#102)
...

=== Combined Cleanup Summary ===
Remote cleanup: ✅ Success
Local cleanup: ✅ Success

✅ All cleanup operations completed successfully!
```

# Development

## Testing

The project uses Vitest for comprehensive unit testing.

### Run tests
```bash
pnpm test
```

### Run tests in watch mode
```bash
pnpm test:watch
```

### Generate coverage reports
```bash
pnpm test:coverage
```

The test suite includes comprehensive unit tests covering all core functionality, utilities, and edge cases.