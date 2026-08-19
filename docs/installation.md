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
   - Haskell: cabal package `panproto` (full parity as of v0.55.0); build `libpanproto_c` from source via `bindings/haskell/bootstrap/dev-link.sh`, then `cabal build`. See `/panproto-sdk-haskell`.
   - Swift: SwiftPM package `panproto` (added in v0.70.0; requires Swift 6.1, since the manifest declares `swift-tools-version: 6.1` and gates its parse, project, and git tiers behind package traits). Targets macOS 14 and iOS 17, and builds in Swift 6 language mode. SwiftPM looks for `Package.swift` at a repository's root and takes no subpath, so `bindings/swift/` of the panproto repository is not resolvable as a dependency; depend on the [`panproto-swift`](https://github.com/panproto/panproto-swift) mirror, whose `v0.71.0` tag pins the published `panproto_c.xcframework` for that release:

     ```swift
     .package(url: "https://github.com/panproto/panproto-swift.git", .upToNextMinor(from: "0.71.0"))
     ```

     The engine and every binding share one version, and panproto is pre-1.0, so a minor bump can move the C ABI under the package. `from:` admits everything below 1.0.0, which is wider than that; `.upToNextMinor` is the requirement to write until 1.0.

     To build the package out of a panproto checkout instead, stage the C library first: `bindings/swift/bootstrap/dev-link.sh` builds `panproto-c` from the workspace and needs a Rust toolchain, `bootstrap/fetch-bindist.sh` downloads a prebuilt library for the host, and `bootstrap/fetch-bindist.sh --xcframework` gets the XCFramework iOS builds need. Then `swift build`. See `/panproto-sdk-swift`.

## Automated install

```sh
curl -sSf https://raw.githubusercontent.com/panproto/panproto-toolkit/main/install.sh | bash
```

This does four things:
1. Clones the repo to `~/.local/share/panproto-toolkit/`
2. Symlinks every directory under `skills/` into `~/.claude/skills/` (prefixed with `panproto-`)
3. Symlinks every directory under `ci-integrations/` into the same place, so `github-actions`, `pre-commit-hooks`, and `breaking-change-gate` are invoked as `/panproto-github-actions` and so on
4. Symlinks all agents into `~/.claude/agents/` (prefixed with `panproto-`)

It then builds and registers the MCP server unless `--no-mcp` is passed. Since the install uses symlinks, running `git pull` in the cloned repo updates all skills in place.

Two flags are worth knowing: `--local <dir>` installs from a checkout you already have instead of cloning, and `--project <dir>` installs into that project's `.claude/` directory in addition to the global one. The global install always runs.

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
