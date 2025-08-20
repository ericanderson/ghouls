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
