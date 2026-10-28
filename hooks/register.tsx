import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { McpList, McpServer } from '../types'

const PANE = 'mcp-list'
const REFRESH_MS = 120_000

const list = atom(
  { plugin: 'mcp-list', key: 'list' } as const,
  { servers: [], isLoading: false, error: '' } as McpList,
  { shape: 'list-2' },
)
const selected = atom({ plugin: 'mcp-list', key: 'selected' } as const, '', {
  shape: 'selected-1',
})

const STATES: Record<string, McpServer['state']> = {
  '✔': 'ok',
  '✘': 'error',
  '!': 'auth',
  '⊘': 'off',
}

// `claude mcp list` prints `<name>: <target> - <marker> <status>`; the target
// may hold ": " or " - ", so the name is the first match and the marker the last.
const parse = (out: string): McpServer[] =>
  out
    .split('\n')
    .map(line => /^(.+?): (.*) - ([✔✘!⊘]) (.*)$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map(m => ({
      name: m[1],
      state: STATES[m[3]],
      label: m[4].split(' — ')[0].replace(/\s*\(.*$/, ''),
      target: m[2].slice(0, 120),
      detail: (m[4].split(' — ')[1] ?? m[4]).slice(0, 300),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

async function refresh($: EngineInterface) {
  await update($, list, l => ({ ...l, isLoading: true }))
  try {
    const { stdout } = await $.process.run(['claude', 'mcp', 'list'], {
      timeoutMs: 90_000,
    })
    await update($, list, () => ({
      servers: parse(stdout),
      isLoading: false,
      error: '',
    }))
  } catch (err) {
    await update($, list, l => ({
      ...l,
      isLoading: false,
      error: String(err),
    }))
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'mcp-list',
      description: 'Show MCP servers and their status in a pane',
    })
    void $.ui.open({ id: PANE, title: 'MCP' })
    void refresh($)
    $.clock.every(REFRESH_MS, () => void refresh($))

    return next(e)
  })

  on('command.run', { command: 'mcp-list' }, async $ => {
    await $.ui.open({ id: PANE, title: 'MCP' })
    void refresh($)

    return { text: 'MCP pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const { servers, isLoading, error } = await read($, list)
    const color = { ok: 'green', error: 'red', auth: 'yellow', off: 'gray' }

    const pick = await read($, selected)
    const word = { ok: 'Connected', auth: 'Sign in', error: 'Error', off: 'Off' }

    return (
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold>
            ▼ MCP {isLoading && <Text dimColor>(checking…)</Text>}
          </Text>
          <Button
            key="refresh"
            hotkey="r"
            onPress={() => void refresh($)}
          >
            Refresh
          </Button>
        </Box>
        {error !== '' && <Text color="red">{error}</Text>}
        {servers.length === 0 && !isLoading && (
          <Text dimColor>No servers.</Text>
        )}
        {servers.map(s => (
          <Box flexDirection="column">
            <Button
              key={s.name}
              onPress={() =>
                void update($, selected, cur => (cur === s.name ? '' : s.name))
              }
            >
              <Text color={color[s.state]}>{pick === s.name ? '▾ ' : '• '}</Text>
              {s.name}{' '}
              <Text
                dimColor={s.state === 'ok'}
                color={s.state === 'ok' ? undefined : color[s.state]}
              >
                {word[s.state]}
              </Text>
            </Button>
            {pick === s.name && (
              <Box flexDirection="column" paddingLeft={2}>
                <Text dimColor>{s.target}</Text>
                {s.state !== 'ok' && <Text color={color[s.state]}>{s.detail}</Text>}
              </Box>
            )}
          </Box>
        ))}
        <Text dimColor>click a server for details · r refresh</Text>
      </Box>
    )
  })
}
