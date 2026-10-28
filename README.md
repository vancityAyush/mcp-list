# mcp-list

A Claude Code mod that keeps your MCP servers in view. It adds a pane beside the
conversation listing every configured server with a coloured status dot, like the
`/mcp` list but always on screen.

- `•` green **Connected**, yellow **Sign in**, red **Error**, grey **Off**
- Click a server to expand its target (URL or command) and, for a server that is not
  connected, the full error text, such as an HTTP 401 or a `LOCAL_ONLY` 403
- **Refresh** button, or press `r` while the pane has focus
- Re-checks every two minutes; `/mcp-list` opens the pane and refreshes it

## Install

At the prompt of a terminal session:

```text
/plugin install mcp-list --marketplace vancityAyush/mcp-list
```

From a shell:

```sh
claude plugin install mcp-list --marketplace vancityAyush/mcp-list
```

Requires Claude Code 2.1.287 or later. A pane the mod opens by itself is drawn from
about 144 terminal columns; on a narrower terminal run `/mcp-list` to open it.

## What it can access

- **Runs a command:** `claude mcp list` (the same health check `/mcp` uses). Nothing else.
- **Network:** none of its own. The command contacts your configured MCP servers.
- **Reads / writes:** session state only (the server list and the selected row).
  It reads no files and writes none.
- `claude mcp list` already redacts tokens in server targets; the mod shows what it prints,
  cut to 120 characters for the target and 300 for an error.

## Develop

```sh
claude --plugin-dir .
claude plugin validate .
claude plugin test .
```

MIT licensed.
