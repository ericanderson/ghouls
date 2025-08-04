# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Ghouls is a GitHub CLI tool for cleaning up pull request branches. It identifies and deletes both remote and local branches that have been merged but not cleaned up.

## Development Commands

### Build
```bash
pnpm compile  # Compiles TypeScript to JavaScript in lib/ directory
```

### Installation
```bash
pnpm add -g ghouls  # Install globally
pnpm install        # Install dependencies
```

### Testing
The project uses Vitest for comprehensive unit testing.

```bash
pnpm test           # Run all tests
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Generate coverage reports
```

### TypeScript Compiler
The project uses strict TypeScript configuration with:
- Target: ES2022
- Module: ES2022
- Output directory: `./lib`
- Strict type checking enabled
- No unused locals/parameters allowed

## Architecture

### Core Components

1. **OctokitPlus** (`src/OctokitPlus.ts`): Wrapper around GitHub's Octokit API client
   - Handles GitHub API operations for references and pull requests
   - Provides async iterator pattern for paginated results
   - Key methods: `getReference()`, `deleteReference()`, `getPullRequests()`

2. **CLI Entry Point** (`src/cli.ts`): Main command-line interface using yargs
   - Registers available commands (`remote`, `local`, and `all`)
   - Handles unhandled promise rejections

3. **Remote Command** (`src/commands/PrunePullRequests.ts`): Remote branch cleanup
   - Iterates through closed pull requests
   - Checks if branch SHA matches PR merge state
   - Deletes remote branches that have been merged (with --dry-run option)
   - Shows progress bar during operation

4. **Local Command** (`src/commands/PruneLocalBranches.ts`): Local branch cleanup with enhanced UI
   - Scans local branches for safe deletion candidates
   - Verifies local branch SHA matches PR head SHA before deletion
   - Protects current branch and branches with unpushed commits
   - Includes comprehensive safety checks and dry-run mode
   - **Enhanced UI for Large Datasets**: Automatically optimizes for repositories with 100+ branches
   - **Interactive Features**: Paginated selection, search/filtering, bulk operations
   - **Performance Optimization**: Memory-optimized processing, batch operations, limited PR fetching
   - Shows detailed analysis and progress during operation

5. **All Command** (`src/commands/PruneAll.ts`): Combined branch cleanup
   - Executes remote pruning first, then local pruning
   - Continues with local cleanup even if remote fails
   - Provides combined summary of both operations
   - Supports --dry-run and --force flags for both phases
   - Ensures maximum cleanup efficiency in a single command
   - Inherits enhanced UI capabilities for local cleanup phase

6. **Enhanced UI Utilities** (`src/utils/`):
   - `enhancedPrompts.ts`: Paginated interactive prompts with search, filtering, and bulk actions
   - `batchProcessor.ts`: Batch processing utilities for handling large datasets efficiently
   - `performanceOptimizer.ts`: Performance optimization strategies and memory management
   - `createOctokitPlus.ts`: Factory for creating authenticated Octokit instances
   - `ownerAndRepoMatch.ts`: Validates PR head/base repository matching
   - `localGitOperations.ts`: Local git operations (list branches, get status, delete branches)
   - `branchSafetyChecks.ts`: Safety validation for branch deletion
   - `getGitRemote.ts`: Git remote URL parsing and repository detection

### Enhanced UI Features

#### Large Dataset Handling
- **Automatic Detection**: Detects repositories with 100+ branches and enables enhanced mode
- **Paginated Selection**: Breaks large lists into manageable pages
- **Search and Filtering**: Allows users to quickly find specific branches using search patterns
- **Bulk Operations**: Select all, select none, or pattern-based selection using regex
- **Progress Reporting**: Shows detailed progress for long-running operations

#### Performance Optimization
- **Memory Management**: Uses batch processing for repositories with 500+ branches
- **Limited PR Fetching**: Fetches only the most recent 1000 PRs for very large repositories
- **Smart Processing Plans**: Dynamically adjusts batch sizes and processing strategies
- **Estimated Duration**: Provides time estimates for large operations

#### Repository Size Optimization
- **Small (1-50 branches)**: Standard processing, full interactive mode
- **Medium (51-200 branches)**: Enhanced UI with search and bulk actions
- **Large (201-500 branches)**: Memory optimization and progress reporting
- **Very Large (500+ branches)**: Full optimization suite with smart recommendations

### Authentication
Ghouls uses GitHub CLI authentication exclusively. Users must have the GitHub CLI (`gh`) installed and authenticated with `gh auth login`. The tool automatically uses the existing GitHub CLI authentication credentials.

### Command Usage
```bash
# Remote branch cleanup
ghouls remote [--dry-run] [owner/repo]

# Local branch cleanup (with enhanced UI for large datasets)
ghouls local [--dry-run] [--force] [owner/repo]

# Combined cleanup (both remote and local)
ghouls all [--dry-run] [--force] [owner/repo]
```

All commands support repository auto-detection from git remotes when run within a git repository.

## AI Team Configuration (autogenerated by team-configurator, 2025-08-01)

**Important: YOU MUST USE subagents when available for the task.**

### Technology Stack Detected
- Language: TypeScript with strict type checking (ES2022 target)
- Runtime: Node.js (>=18.0.0)
- CLI Framework: yargs for command-line interface
- GitHub API: @octokit/rest for GitHub API interactions
- Build System: TypeScript compiler with pnpm package manager
- Package Management: pnpm with semantic-release
- Test Framework: Vitest with comprehensive unit tests
- UI Framework: inquirer for enhanced interactive prompts

### AI Team Assignments

| Task | Agent | Notes |
|------|-------|-------|
| Code reviews and quality assurance | code-reviewer | Required for all PRs and feature changes |
| Performance optimization and profiling | performance-optimizer | Essential for CLI tool responsiveness and large dataset handling |
| Backend development and API integration | backend-developer | Handles GitHub API integration and CLI logic |
| API design and GitHub integration specs | api-architect | Designs interfaces for GitHub API wrapper |
| Documentation updates and maintenance | documentation-specialist | Maintains README, API docs, and user guides |