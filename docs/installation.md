# Installation

## Prerequisites

1. **Claude Code** (CLI, desktop app, or IDE extension)
2. **panproto CLI** (`schema` command):
   ```sh
   # macOS
   brew install panproto/tap/panproto-cli

   # Linux / macOS (shell installer)
   curl --proto '=https' -LsSf https://github.com/panproto/panproto/releases/latest/download/panproto-cli-installer.sh | sh

   # From source
   cargo install panproto-cli
   ```
3. **SDK** (for your language of choice):
   - TypeScript: `npm install @panproto/core` (requires Node.js 22+)
   - Python: `pip install panproto` (requires Python 3.13+)
   - Rust: add `panproto-core` to your `Cargo.toml`

## Automated install

```sh
curl -sSf https://raw.githubusercontent.com/panproto/panproto-toolkit/main/install.sh | bash
```

This does three things:
1. Clones the repo to `~/.local/share/panproto-toolkit/`
2. Symlinks all skills into `~/.claude/skills/` (prefixed with `panproto-`)
3. Symlinks all agents into `~/.claude/agents/` (prefixed with `panproto-`)

Since the install uses symlinks, running `git pull` in the cloned repo updates all skills in place.

## Manual install

Clone the repo anywhere:
```sh
git clone https://github.com/panproto/panproto-toolkit.git
```

Then symlink specific skills you want:
```sh
ln -s /path/to/panproto-toolkit/skills/getting-started ~/.claude/skills/panproto-getting-started
ln -s /path/to/panproto-toolkit/agents/migration-advisor ~/.claude/agents/panproto-migration-advisor
```

## Per-project install

To make skills available only within a specific project, symlink into the project's `.claude/` directory:
```sh
mkdir -p .claude/skills .claude/agents
ln -s /path/to/panproto-toolkit/skills/define-schema .claude/skills/define-schema
```

## MCP server

Install globally:
```sh
npm install -g @panproto/mcp-server
```

Configure for Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
```json
{
  "mcpServers": {
    "panproto": {
      "command": "panproto-mcp-server"
    }
  }
}
```

For VS Code with the Claude extension, add to your workspace `.vscode/settings.json`:
```json
{
  "claude.mcpServers": {
    "panproto": {
      "command": "panproto-mcp-server"
    }
  }
}
```

## Verifying installation

After installing, run Claude Code and type `/panproto-` followed by Tab to see all available skills. You should see skills like:
- `/panproto-getting-started`
- `/panproto-define-schema`
- `/panproto-build-migration`
- etc.

## Updating

```sh
cd ~/.local/share/panproto-toolkit && git pull
```

Symlinks mean the update takes effect immediately.

## Uninstalling

```sh
# Remove symlinks
rm ~/.claude/skills/panproto-*
rm ~/.claude/agents/panproto-*

# Remove repo
rm -rf ~/.local/share/panproto-toolkit

# Remove MCP server
npm uninstall -g @panproto/mcp-server
```
