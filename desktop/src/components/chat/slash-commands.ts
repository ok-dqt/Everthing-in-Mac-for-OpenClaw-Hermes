export interface SlashCommand {
  id: string
  label: string
  description: string
  category: 'gateway' | 'navigate' | 'client'
}

export interface CommandCatalogEntry {
  name: string
  help: string
}

export const CLIENT_COMMANDS: SlashCommand[] = [
  { id: 'models', label: '/models', description: '模型管理', category: 'navigate' },
  { id: 'skills', label: '/skills', description: '技能管理', category: 'navigate' },
  { id: 'config', label: '/config', description: '配置管理', category: 'navigate' },
  { id: 'mcp', label: '/mcp', description: 'MCP 服务器', category: 'navigate' },
  { id: 'plugins', label: '/plugins', description: '插件管理', category: 'navigate' },
  { id: 'profiles', label: '/profiles', description: '配置文件', category: 'navigate' },
  { id: 'cron', label: '/cron', description: '定时任务', category: 'navigate' },
  { id: 'analytics', label: '/analytics', description: '会话统计', category: 'navigate' },
  { id: 'logs', label: '/logs', description: '日志', category: 'navigate' },
  { id: 'env', label: '/env', description: '环境变量', category: 'navigate' },
  { id: 'webhooks', label: '/webhooks', description: 'Webhook 管理', category: 'navigate' },
  { id: 'pairing', label: '/pairing', description: '设备配对', category: 'navigate' },
  { id: 'channels', label: '/channels', description: '频道管理', category: 'navigate' },
  { id: 'system', label: '/system', description: '系统信息', category: 'navigate' },
]

const NAV_MAP: Record<string, string> = {
  models: '/models',
  skills: '/skills',
  config: '/config',
  mcp: '/mcp',
  plugins: '/plugins',
  profiles: '/profiles',
  cron: '/cron',
  analytics: '/analytics',
  logs: '/logs',
  env: '/env',
  webhooks: '/webhooks',
  pairing: '/pairing',
  channels: '/channels',
  system: '/system',
}

export function getNavPath(commandId: string): string | null {
  return NAV_MAP[commandId] ?? null
}
