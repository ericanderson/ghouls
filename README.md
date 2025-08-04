# Ghouls

<img src="logo.webp" alt="Ghouls Logo" width="200">


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
# Authenticate with GitHub CLI
gh auth login
```

That's it! Ghouls will automatically use your existing GitHub CLI authentication.

## Installing GitHub CLI

If you don't have GitHub CLI installed, here are the installation instructions for all platforms:

### Windows

```bash
# Using winget (recommended)
winget install --id GitHub.cli

# Using Chocolatey
choco install gh

# Using Scoop
scoop install gh
```

### macOS

```bash
# Using Homebrew (recommended)
brew install gh

# Using MacPorts
sudo port install gh

# Using Conda
conda install gh --channel conda-forge
```

### Linux

#### Ubuntu/Debian

```bash
# Add GitHub CLI repository
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

#### Fedora/CentOS/RHEL

```bash
sudo dnf install gh
```

#### Arch Linux

```bash
sudo pacman -S github-cli
```

#### openSUSE/SUSE

```bash
sudo zypper install gh
```

For other platforms and more installation options, visit: https://cli.github.com/

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

### Enhanced UI for Large Repositories

The `local` command now includes enhanced UI capabilities that automatically optimize for repositories with many branches:

#### Automatic Performance Optimization
- **Large Dataset Detection**: Automatically detects when you have 100+ branches and enables optimized processing
- **Memory Management**: Uses batch processing and memory optimization for repositories with 500+ branches
- **Progress Reporting**: Shows detailed progress and estimated completion times for long-running operations
- **Smart Recommendations**: Provides context-aware tips for better performance in large repositories

#### Interactive Features for 100+ Branches
When working with large numbers of branches, Ghouls provides enhanced interactive features:

- **Search and Filtering**: Quickly find specific branches using search patterns
- **Bulk Operations**: Select all, select none, or select branches matching regex patterns
- **Paginated Selection**: Navigate through large lists without overwhelming your terminal
- **Smart Defaults**: Pre-selects safe branches while showing detailed information

### Example with Large Dataset

```bash
$ ghouls local --dry-run

Scanning for local branches that can be safely deleted...
Found 347 local branches
📊 Large dataset detected - using optimized processing
🔍 Consider using search/filtering to narrow down results
⚡ Use --force flag to skip interactive mode for faster processing

🔧 Using memory-optimized processing (estimated duration: 2 minutes)
Fetching merged pull requests from GitHub...
Found 89 merged pull requests

Branch Analysis:
  Safe to delete: 67
  Unsafe to delete: 280

Skipping unsafe branches:
  - main (protected branch)
  - develop (protected branch)
  - feature/active-work (2 unpushed commits)
  - hotfix/critical-fix (current branch)
  ... and 276 more

Found 67 items. Using enhanced selection mode for large datasets.

Current selection: 67/67 items

What would you like to do?
> 🔍 Search/filter items
  📦 Bulk actions
  ✏️  Individual selection
  📋 Review selected items (67)
  ✅ Continue with current selection
```

#### Search and Filter Example

```bash
# Using search to filter branches
? Enter search term (branch name pattern): feature/old
Found 23 matches for "feature/old"

Current selection: 23/23 items
Search filter: "feature/old" (23 matches)
```

#### Bulk Actions Example

```bash
# Using regex patterns for bulk selection
? Choose bulk action: Select by pattern - Select items matching a regex pattern
? Enter regex pattern (e.g., "^feature/", ".*-old$"): ^hotfix/.*-2023$
Selected 8 items matching pattern "^hotfix/.*-2023$"
```

### Performance Characteristics

- **Small repositories (1-50 branches)**: Standard processing, interactive mode
- **Medium repositories (51-200 branches)**: Batched processing, enhanced UI
- **Large repositories (201-500 branches)**: Memory optimization, limited PR fetching
- **Very large repositories (500+ branches)**: Full optimization suite with performance recommendations

### Safety Features

The `local` command includes several safety checks to prevent accidental deletion of important branches:

- **Current branch protection**: Never deletes the currently checked out branch
- **Protected branch names**: Automatically protects `main`, `master`, `develop`, `dev`, `staging`, `production`, and `prod` branches
- **Release and hotfix branch protection**: Automatically protects release branches (`release/*`, `release-*`) and hotfix branches (`hotfix/*`)
- **SHA verification**: Only deletes branches where the local SHA matches the pull request head SHA
- **Merge verification**: Only considers pull requests that were actually merged (not just closed)
- **Unpushed commits protection**: Skips branches that have unpushed commits
- **Dry-run mode**: Use `--dry-run` to see what would be deleted without making changes

### Force Mode for Automation

For automated workflows or when you trust the safety checks completely:

```bash
# Skip interactive mode and delete all safe branches automatically
ghouls local --force
```

This is particularly useful for:
- CI/CD cleanup jobs
- Automated maintenance scripts
- Large repositories where manual selection isn't practical

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
2. **Local cleanup**: Then deletes corresponding local branches (with enhanced UI for large datasets)

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

# Performance Tips for Large Repositories

When working with repositories that have hundreds or thousands of branches:

## Memory and Performance Optimization
- Ghouls automatically detects large datasets and enables optimized processing
- Batch processing reduces memory usage and improves performance
- Limited PR fetching (most recent 1000 PRs) prevents API rate limiting

## Interactive Mode Efficiency
- Use search/filtering to narrow down results before making selections
- Leverage bulk actions for pattern-based selections (e.g., all branches from 2023)
- Consider using `--force` flag for automated cleanup of safe branches

## Best Practices
- Run cleanup during off-peak hours for very large repositories (1000+ branches)
- Use `--dry-run` first to understand the scope of changes
- Consider running `git remote prune origin` before using Ghouls to clean up stale remote references

## Repository Size Guidelines
- **Small (1-50 branches)**: Standard processing, full interactive mode
- **Medium (51-200 branches)**: Enhanced UI with search and bulk actions
- **Large (201-500 branches)**: Memory optimization and progress reporting
- **Very Large (500+ branches)**: Full optimization suite with smart recommendations

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