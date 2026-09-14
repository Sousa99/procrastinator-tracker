# Procrastinator Tracker — Agent Instructions

## GitHub operations

For any GitHub task — repositories, issues, pull requests, and Actions/CI runs — delegate to
the `github-helper` subagent (it has the GitHub MCP tools). Do not attempt GitHub API calls or
PR/issue mutations yourself unless delegated through `github-helper`.