# mcp-list

A Claude Code mod that keeps your MCP servers and skills in view. It adds a pane beside
the conversation with two collapsible sections.

**MCP** (`m` toggles it)
- Header shows `22/27 up` and how many need attention; servers that are failing or need
  sign-in sort to the top
- Per server: coloured dot, name, tool count, status (**Connected**, **Sign in**, **Error**, **Off**)
- Click a server for its target (URL or command), the full error text (an HTTP 401, a
  `LOCAL_ONLY` 403) and the names of its tools

**Skills** (`s` toggles it)
- Your own and every plugin's skills and slash commands, grouped by where they come from
- Click a group to open it, then a skill to read its description

Also: a **Refresh** button (or `r`), a re-check every two minutes, and `/mcp-list` to open the pane.
Inspired by the MCP sidebar in `ersinkoc/claude-mods` (switchboard).

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
- **Reads** the session's tool and slash-command lists to count tools and list skills.
- **Network:** none of its own. The command contacts your configured MCP servers.
- **Reads / writes:** session state only (the server list and the selected row).
  It reads no files and writes none.
- `claude mcp list` already redacts tokens in server targets; the mod shows what it prints,
  cut to 120 characters for the target and 400 for an error.

## Develop

```sh
claude --plugin-dir .
claude plugin validate .
claude plugin test .
```

MIT licensed.
