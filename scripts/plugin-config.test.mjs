import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { pluginConfig } from './plugin-config.mjs';

test('installation paths are generated from a recipient checkout, including spaces', () => {
  const root = join(tmpdir(), 'A friend', '摸鱼短剧');
  const config = pluginConfig(root, process.execPath);
  assert.equal(config.mcp.mcpServers.hongguo.args[0], join(root, 'codex', 'server.mjs'));
  assert(config.hooks.hooks.Stop[0].hooks[0].command.includes(join(root, 'scripts', 'task-hook.mjs')));
  assert.equal(Object.keys(config.hooks.hooks).length, 5);
});

test('task hooks handle completion and interruption without storing chat text', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hongguo-hook-'));
  try {
    for (const event of ['UserPromptSubmit', 'PreToolUse', 'Stop', 'Interrupt', 'SessionEnd']) {
      const result = spawnSync(process.execPath, [fileURLToPath(new URL('./task-hook.mjs', import.meta.url))], {
        input: JSON.stringify({session_id: 'test-session', hook_event_name: event, prompt: 'PRIVATE_TEST_SENTINEL'}),
        env: {...process.env, HONGGUO_DATA_DIR: directory}, encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      const text = await readFile(join(directory, 'tasks', 'test-session.json'), 'utf8');
      assert(!text.includes('PRIVATE_TEST_SENTINEL'));
      assert.equal(JSON.parse(text).running, ['UserPromptSubmit', 'PreToolUse'].includes(event));
    }
  } finally { await rm(directory, {recursive: true}); }
});
