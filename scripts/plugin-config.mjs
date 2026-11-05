import { join } from 'node:path';
export function pluginConfig(root, node, platform = process.platform) {
  // These machine-specific values are generated on the recipient's computer.
  const quote = value => platform === 'win32'
    ? '"' + value.replace(/"/g, '\\"') + '"'
    : "'" + value.replace(/'/g, "'\\''") + "'";
  const command = `${quote(node)} ${quote(join(root, 'scripts', 'task-hook.mjs'))}`;
  const hook = { type: 'command', command, timeout: 3 };
  if (platform === 'win32') hook.commandWindows = command;
  return {
    manifest: {
      name: 'codex-hongguo', version: '0.2.0',
      description: 'Codex 侧栏短剧播放器，基于 frostming/dsh-hongguo。',
      mcpServers: './.mcp.json', hooks: './hooks/hooks.json',
      interface: { displayName: '摸鱼短剧', shortDescription: '等 Agent 时刷一集',
        developerName: 'Echoes0302 · Codex adaptation with Vesper', category: 'Productivity' },
    },
    mcp: { mcpServers: { hongguo: { command: node, args: [join(root, 'codex', 'server.mjs')],
      startup_timeout_sec: 30, tool_timeout_sec: 120 } } },
    hooks: { description: '仅记录会话 ID、任务状态和时间；用于任务结束暂停。', hooks:
      Object.fromEntries(['UserPromptSubmit', 'PreToolUse', 'Stop', 'Interrupt', 'SessionEnd']
        .map(event => [event, [{ hooks: [hook] }]])) },
  };
}
