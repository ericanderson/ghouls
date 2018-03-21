# Ghouls

The ghouls can help you.

# Getting started

## Install

`yarn global add ghouls`

## Configure

Create `~/.config/ghouls.config.json`:

```json
{
    "username": "github-username",
    "token": "github-personal-access-token",
    "baseUrl": "https://ghe.local/api/v3"
}
```

# Prune pull request branches

Run: `ghouls prunePullRequests --dry-run myorg/myrepo`

```
$ ghouls prunePullRequests myorg/myrepo
#1871 - Deleting remote: heads/fix/fe-nits
#1821 - Deleting remote: heads/fix/collaborator-search
#1799 - Deleting remote: heads/fix-yarn-for-1.24
#1758 - Skipping remote: heads/ml/search-polish (mismatched refs)
...
```