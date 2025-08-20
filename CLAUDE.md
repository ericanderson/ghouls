# CLAUDE.md

GitHub CLI tool for cleaning up merged PR branches.

## Commands

```bash
pnpm compile    # Build
pnpm test       # Test  
pnpm install    # Install deps

ghouls remote [--dry-run] [owner/repo]  # Clean remote branches
ghouls local [--dry-run] [owner/repo]   # Clean local branches  
ghouls all [--dry-run] [owner/repo]     # Clean both
```

Uses GitHub CLI auth (`gh auth login`). TypeScript/Node.js/pnpm project.

### AI Team Assignments

| Task                                    | Agent                    | Notes                                        |
| --------------------------------------- | ------------------------ | -------------------------------------------- |
| Code reviews and quality assurance      | code-reviewer            | Required for all PRs and feature changes     |
| Performance optimization and profiling  | performance-optimizer    | Essential for CLI tool responsiveness        |
| Backend development and API integration | backend-developer        | Handles GitHub API integration and CLI logic |
| API design and GitHub integration specs | api-architect            | Designs interfaces for GitHub API wrapper    |
| Documentation updates and maintenance   | documentation-specialist | Maintains README, API docs, and user guides  |
