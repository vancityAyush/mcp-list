import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'mcp-list',
  component: 'Pane',
  requestId: 'mcp-list',
  surface: 'terminal',
  props: {
    title: 'MCP',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const servers = [
  { name: 'qmd', state: 'ok', label: 'Connected', target: 'qmd mcp', detail: '' },
  { name: 'vault', state: 'error', label: 'Failed to connect', target: 'https://x/mcp', detail: 'HTTP 401' },
]

test('lists each server with its status', async ($, on) => {
  on('state.get', () => ({
    value: {
      value: { shape: 'list-2', value: { servers, isLoading: false, error: '' } },
      version: 1,
    },
  }))

  const ui = await $.ui.mount(PANE)

  expect(await ui.find({ type: 'Button', key: 'qmd' })).toBeTruthy()
  expect(await ui.find({ type: 'Button', key: 'vault' })).toBeTruthy()
  await ui.unmount()
})
