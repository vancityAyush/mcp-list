export type McpServer = {
  name: string
  state: 'ok' | 'error' | 'auth' | 'off'
  label: string
  target: string
  detail: string
}
export type McpList = { servers: McpServer[]; isLoading: boolean; error: string }

declare module 'claude-code' {
  interface PluginState {
    'mcp-list': {
      list: Shaped<McpList>
      selected: Shaped<string>
    }
  }
}
