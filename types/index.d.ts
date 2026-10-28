export type McpServer = {
  name: string
  state: 'ok' | 'error' | 'auth' | 'off'
  label: string
  target: string
  detail: string
  tools: string[]
}
export type Skill = { name: string; description: string; group: string }
export type McpList = {
  servers: McpServer[]
  skills: Skill[]
  isLoading: boolean
  error: string
}

declare module 'claude-code' {
  interface PluginState {
    'mcp-list': {
      list: Shaped<McpList>
      open: Shaped<string[]>
    }
  }
}
