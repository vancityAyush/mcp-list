import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { McpList, McpServer, Skill } from '../types'

const PANE = 'mcp-list'
const REFRESH_MS = 120_000

const list = atom(
  { plugin: 'mcp-list', key: 'list' } as const,
  { servers: [], skills: [], isLoading: false, error: '' } as McpList,
  { shape: 'list-3' },
)
// Ids of what is expanded: sections (`sec:`), skill groups (`grp:`), rows.
const open = atom(
  { plugin: 'mcp-list', key: 'open' } as const,
  ['sec:mcp', 'sec:skills'] as string[],
  { shape: 'open-1' },
)

const STATES: Record<string, McpServer['state']> = {
  '✔': 'ok',
  '✘': 'error',
  '!': 'auth',
  '⊘': 'off',
}
const ORDER = { error: 0, auth: 1, off: 2, ok: 3 }

// `claude mcp list` prints `<name>: <target> - <marker> <status>`; the target
// may hold ": " or " - ", so the name is the first match and the marker the last.
const parse = (out: string): Omit<McpServer, 'tools'>[] =>
  out
    .split('\n')
    .map(line => /^(.+?): (.*) - ([✔✘!⊘]) (.*)$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map(m => ({
      name: m[1],
      state: STATES[m[3]],
      label: m[4].split(' — ')[0].replace(/\s*\(.*$/, ''),
      target: m[2].slice(0, 120),
      detail: m[4].split(' — ').slice(1).join(' — ').slice(0, 400) || m[4],
    }))

// The engine names a server's tools `mcp__<server>__<tool>`, with every
// character outside letters, digits, `_` and `-` of the server's name as `_`.
const slug = (name: string) => name.replace(/[^A-Za-z0-9_-]/g, '_')

async function refresh($: EngineInterface) {
  await update($, list, l => ({ ...l, isLoading: true }))
  try {
    const [{ stdout }, tools, commands] = await Promise.all([
      $.process.run(['claude', 'mcp', 'list'], { timeoutMs: 90_000 }),
      $.tool.list(),
      $.command.list(),
    ])
    const names = tools.filter(t => t.mcp).map(t => t.name)
    const servers = parse(stdout)
      .map(s => {
        const prefix = `mcp__${slug(s.name)}__`
        return {
          ...s,
          tools: names
            .filter(n => n.startsWith(prefix))
            .map(n => n.slice(prefix.length)),
        }
      })
      .sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.name.localeCompare(b.name))
    const skills: Skill[] = commands
      .filter(c => c.source === 'plugin' || c.source === 'user')
      .map(c => ({
        name: c.name,
        description: c.description.slice(0, 240),
        group: c.source === 'user' ? 'your skills' : (c.plugin ?? 'plugins'),
      }))
      .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
    await update($, list, () => ({ servers, skills, isLoading: false, error: '' }))
  } catch (err) {
    await update($, list, l => ({ ...l, isLoading: false, error: String(err) }))
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'mcp-list',
      description: 'Show MCP servers and skills in a pane',
    })
    void $.ui.open({ id: PANE, title: 'MCP & Skills' })
    void refresh($)
    $.clock.every(REFRESH_MS, () => void refresh($))

    return next(e)
  })

  on('command.run', { command: 'mcp-list' }, async $ => {
    await $.ui.open({ id: PANE, title: 'MCP & Skills' })
    void refresh($)

    return { text: 'MCP & Skills pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const { servers, skills, isLoading, error } = await read($, list)
    const isOpen = await read($, open)
    const toggle = (id: string) =>
      void update($, open, ids =>
        ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id],
      )

    const color = { ok: 'green', error: 'red', auth: 'yellow', off: 'gray' }
    const word = { ok: 'Connected', auth: 'Sign in', error: 'Error', off: 'Off' }
    const up = servers.filter(s => s.state === 'ok').length
    const bad = servers.filter(s => s.state === 'error' || s.state === 'auth').length

    const groups = [...new Set(skills.map(s => s.group))]

    return (
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold>
            MCP & Skills {isLoading && <Text dimColor>(checking…)</Text>}
          </Text>
          <Button key="refresh" hotkey="r" onPress={() => void refresh($)}>
            Refresh
          </Button>
        </Box>
        {error !== '' && <Text color="red">{error}</Text>}

        <Box marginTop={1}>
          <Button key="sec:mcp" hotkey="m" onPress={() => toggle('sec:mcp')}>
            {isOpen.includes('sec:mcp') ? '▼' : '▶'} <Text bold>MCP</Text>{' '}
            <Text color={bad > 0 ? undefined : 'green'} dimColor={bad > 0}>
              {up}/{servers.length} up
            </Text>
            {bad > 0 && <Text color="red"> · {bad} need attention</Text>}
          </Button>
        </Box>
        {isOpen.includes('sec:mcp') &&
          servers.map(s => (
            <Box flexDirection="column" paddingLeft={2}>
              <Button key={`srv:${s.name}`} onPress={() => toggle(`srv:${s.name}`)}>
                <Text color={color[s.state]}>
                  {isOpen.includes(`srv:${s.name}`) ? '▾' : '•'}{' '}
                </Text>
                {s.name}
                {s.tools.length > 0 && <Text dimColor> {s.tools.length} tools</Text>}{' '}
                <Text
                  dimColor={s.state === 'ok'}
                  color={s.state === 'ok' ? undefined : color[s.state]}
                >
                  {word[s.state]}
                </Text>
              </Button>
              {isOpen.includes(`srv:${s.name}`) && (
                <Box flexDirection="column" paddingLeft={2}>
                  <Text dimColor>{s.target}</Text>
                  {s.state !== 'ok' && (
                    <Text color={color[s.state]}>{s.detail}</Text>
                  )}
                  {s.tools.length > 0 && (
                    <Text dimColor>
                      {s.tools.slice(0, 24).join(', ')}
                      {s.tools.length > 24 ? ` +${s.tools.length - 24} more` : ''}
                    </Text>
                  )}
                </Box>
              )}
            </Box>
          ))}

        <Box marginTop={1}>
          <Button key="sec:skills" hotkey="s" onPress={() => toggle('sec:skills')}>
            {isOpen.includes('sec:skills') ? '▼' : '▶'} <Text bold>Skills</Text>{' '}
            <Text dimColor>{skills.length}</Text>
          </Button>
        </Box>
        {isOpen.includes('sec:skills') &&
          groups.map(g => (
            <Box flexDirection="column" paddingLeft={2}>
              <Button key={`grp:${g}`} onPress={() => toggle(`grp:${g}`)}>
                {isOpen.includes(`grp:${g}`) ? '▾' : '▸'} {g}{' '}
                <Text dimColor>{skills.filter(s => s.group === g).length}</Text>
              </Button>
              {isOpen.includes(`grp:${g}`) &&
                skills
                  .filter(s => s.group === g)
                  .map(s => (
                    <Box flexDirection="column" paddingLeft={2}>
                      <Button key={`skl:${g}:${s.name}`} onPress={() => toggle(`skl:${g}:${s.name}`)}>
                        <Text dimColor>{isOpen.includes(`skl:${g}:${s.name}`) ? '▾' : '•'} </Text>
                        /{s.name}
                      </Button>
                      {isOpen.includes(`skl:${g}:${s.name}`) && (
                        <Box paddingLeft={2}>
                          <Text dimColor>{s.description || 'No description.'}</Text>
                        </Box>
                      )}
                    </Box>
                  ))}
            </Box>
          ))}

        <Box marginTop={1}>
          <Text dimColor>click to expand · m mcp · s skills · r refresh</Text>
        </Box>
      </Box>
    )
  })
}
