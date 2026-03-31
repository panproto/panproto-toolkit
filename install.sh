#!/bin/bash
set -euo pipefail

# panproto-toolkit installer
# Symlinks skills and agents into Claude Code's configuration directories.

REPO_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/panproto-toolkit"
CLAUDE_DIR="${CLAUDE_HOME:-$HOME/.claude}"
SKILLS_DIR="$CLAUDE_DIR/skills"
AGENTS_DIR="$CLAUDE_DIR/agents"

echo "Installing panproto-toolkit..."

# Clone or update
if [ -d "$REPO_DIR" ]; then
  echo "Updating existing installation..."
  git -C "$REPO_DIR" pull --ff-only
else
  echo "Cloning panproto-skills..."
  git clone https://github.com/panproto/panproto-toolkit.git "$REPO_DIR"
fi

# Ensure target directories exist
mkdir -p "$SKILLS_DIR" "$AGENTS_DIR"

# Symlink skills
installed_skills=0
for skill in "$REPO_DIR"/skills/*/; do
  name="$(basename "$skill")"
  target="$SKILLS_DIR/panproto-$name"
  ln -sfn "$skill" "$target"
  installed_skills=$((installed_skills + 1))
done

# Symlink CI integration skills
for skill in "$REPO_DIR"/ci-integrations/*/; do
  name="$(basename "$skill")"
  target="$SKILLS_DIR/panproto-$name"
  ln -sfn "$skill" "$target"
  installed_skills=$((installed_skills + 1))
done

# Symlink agents
installed_agents=0
for agent in "$REPO_DIR"/agents/*/; do
  name="$(basename "$agent")"
  target="$AGENTS_DIR/panproto-$name"
  ln -sfn "$agent" "$target"
  installed_agents=$((installed_agents + 1))
done

echo ""
echo "Installed $installed_skills skills and $installed_agents agents."
echo ""
echo "Skills are available as /panproto-<name> in Claude Code."
echo "For example: /panproto-getting-started ts"
echo ""
echo "To install the MCP server:"
echo "  npm install -g @panproto/mcp-server"
echo ""
echo "Prerequisites:"
echo "  - panproto CLI: brew install panproto/tap/panproto-cli"
echo "  - Or: cargo install panproto-cli"
