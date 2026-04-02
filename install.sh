#!/bin/bash
set -euo pipefail

# panproto-toolkit installer
# Installs skills, agents, and configures the MCP server for Claude Code.

usage() {
  cat <<EOF
Usage: install.sh [OPTIONS]

Options:
  --project DIR    Install into a project's .claude/ directory instead of global ~/.claude/
  --local DIR      Use a local repo checkout instead of cloning from GitHub
  --no-mcp         Skip MCP server configuration
  --global-only    Only install globally (skip MCP server setup)
  -h, --help       Show this help

Examples:
  # Global install (clone from GitHub)
  ./install.sh

  # Global install from local checkout
  ./install.sh --local /path/to/panproto-toolkit

  # Per-project install
  ./install.sh --project /path/to/my-project

  # Both global and per-project
  ./install.sh --local . --project /path/to/my-project
EOF
  exit 0
}

PROJECT_DIR=""
LOCAL_DIR=""
SKIP_MCP=false
GLOBAL_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)    PROJECT_DIR="$2"; shift 2 ;;
    --local)      LOCAL_DIR="$2"; shift 2 ;;
    --no-mcp)     SKIP_MCP=true; shift ;;
    --global-only) GLOBAL_ONLY=true; shift ;;
    -h|--help)    usage ;;
    *)            echo "Unknown option: $1"; usage ;;
  esac
done

# Determine repo location
if [[ -n "$LOCAL_DIR" ]]; then
  REPO_DIR="$(cd "$LOCAL_DIR" && pwd)"
  if [[ ! -f "$REPO_DIR/install.sh" ]] || [[ ! -d "$REPO_DIR/skills" ]]; then
    echo "Error: $REPO_DIR does not look like a panproto-toolkit checkout"
    exit 1
  fi
  echo "Using local repo: $REPO_DIR"
else
  REPO_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/panproto-toolkit"
  if [[ -d "$REPO_DIR" ]]; then
    echo "Updating existing installation..."
    git -C "$REPO_DIR" pull --ff-only
  else
    echo "Cloning panproto-toolkit..."
    git clone https://github.com/panproto/panproto-toolkit.git "$REPO_DIR"
  fi
fi

# --- Helper: install skills + agents into a target .claude/ directory ---
install_to() {
  local claude_dir="$1"
  local label="$2"
  local skills_dir="$claude_dir/skills"
  local agents_dir="$claude_dir/agents"

  mkdir -p "$skills_dir" "$agents_dir"

  local installed_skills=0
  for skill in "$REPO_DIR"/skills/*/; do
    [[ -d "$skill" ]] || continue
    name="$(basename "$skill")"
    ln -sfn "$skill" "$skills_dir/panproto-$name"
    installed_skills=$((installed_skills + 1))
  done

  for skill in "$REPO_DIR"/ci-integrations/*/; do
    [[ -d "$skill" ]] || continue
    name="$(basename "$skill")"
    ln -sfn "$skill" "$skills_dir/panproto-$name"
    installed_skills=$((installed_skills + 1))
  done

  local installed_agents=0
  for agent in "$REPO_DIR"/agents/*/; do
    [[ -d "$agent" ]] || continue
    name="$(basename "$agent")"
    ln -sfn "$agent" "$agents_dir/panproto-$name"
    installed_agents=$((installed_agents + 1))
  done

  echo "[$label] Installed $installed_skills skills and $installed_agents agents."
}

# --- Global install ---
CLAUDE_DIR="${CLAUDE_HOME:-$HOME/.claude}"
install_to "$CLAUDE_DIR" "global"

# --- Per-project install ---
if [[ -n "$PROJECT_DIR" ]]; then
  if [[ ! -d "$PROJECT_DIR" ]]; then
    echo "Error: project directory $PROJECT_DIR does not exist"
    exit 1
  fi
  install_to "$PROJECT_DIR/.claude" "project: $(basename "$PROJECT_DIR")"
fi

# --- MCP server configuration ---
if [[ "$SKIP_MCP" == false ]]; then
  MCP_SERVER_ENTRY="$REPO_DIR/mcp-server/dist/index.js"

  if [[ ! -f "$MCP_SERVER_ENTRY" ]]; then
    echo ""
    echo "MCP server not built. Building..."
    if command -v npm &>/dev/null; then
      (cd "$REPO_DIR/mcp-server" && npm install && npm run build)
      echo "MCP server built successfully."
    else
      echo "Warning: npm not found. Install Node.js 22+ and run:"
      echo "  cd $REPO_DIR/mcp-server && npm install && npm run build"
      SKIP_MCP=true
    fi
  fi

  if [[ "$SKIP_MCP" == false ]]; then
    # Configure MCP server in global settings
    configure_mcp() {
      local settings_file="$1"
      local label="$2"

      if [[ -f "$settings_file" ]]; then
        # Check if panproto MCP is already configured
        if grep -q '"panproto"' "$settings_file" 2>/dev/null; then
          echo "[$label] MCP server already configured in $(basename "$settings_file")"
          return
        fi

        # Add mcpServers to existing settings using python (available on macOS/Linux)
        if command -v python3 &>/dev/null; then
          python3 -c "
import json, sys
with open('$settings_file', 'r') as f:
    settings = json.load(f)
servers = settings.setdefault('mcpServers', {})
servers['panproto'] = {
    'command': 'node',
    'args': ['$MCP_SERVER_ENTRY']
}
with open('$settings_file', 'w') as f:
    json.dump(settings, f, indent=2)
    f.write('\n')
"
          echo "[$label] MCP server configured in $(basename "$settings_file")"
        else
          echo "[$label] Warning: python3 not found. Add manually to $settings_file:"
          echo '  "mcpServers": { "panproto": { "command": "node", "args": ["'"$MCP_SERVER_ENTRY"'"] } }'
        fi
      else
        # Create new settings file with MCP config
        mkdir -p "$(dirname "$settings_file")"
        cat > "$settings_file" <<SETTINGSEOF
{
  "mcpServers": {
    "panproto": {
      "command": "node",
      "args": ["$MCP_SERVER_ENTRY"]
    }
  }
}
SETTINGSEOF
        echo "[$label] Created $(basename "$settings_file") with MCP server config"
      fi
    }

    # Global Claude Code settings
    configure_mcp "$CLAUDE_DIR/settings.json" "global"

    # Per-project settings
    if [[ -n "$PROJECT_DIR" ]]; then
      configure_mcp "$PROJECT_DIR/.claude/settings.local.json" "project"
    fi
  fi
fi

echo ""
echo "Done. Skills are available as /panproto-<name> in Claude Code."
echo "For example: /panproto-getting-started ts"
if [[ "$SKIP_MCP" == false ]]; then
  echo ""
  echo "MCP server configured. The panproto tools will be available"
  echo "automatically when Claude Code starts."
fi
echo ""
echo "Prerequisites:"
echo "  - panproto CLI: brew install panproto/tap/panproto-cli"
echo "  - Or: cargo install panproto-cli"
