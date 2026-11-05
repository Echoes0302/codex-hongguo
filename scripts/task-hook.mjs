import { mkdir, writeFile, rename } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Never persist the prompt, transcript, or tool arguments from the hook event.
try {
  let input = '';
  for await (const chunk of process.stdin) { input += chunk; if (input.length > 2 * 1024 * 1024) process.exit(0); }
  const event = JSON.parse(input);
  const session = event.session_id || event.thread_id;
  if (typeof session !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(session)) process.exit(0);
  const running = ['UserPromptSubmit', 'PreToolUse'].includes(event.hook_event_name);
  const directory = join(process.env.HONGGUO_DATA_DIR || join(homedir(), '.local/share/codex-hongguo'), 'tasks');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, session + '.json'), temp = file + '.' + process.pid + '.tmp';
  await writeFile(temp, JSON.stringify({ session, running, at: Date.now() }), { mode: 0o600 });
  await rename(temp, file);
} catch { /* A player must never interrupt the agent's work. */ }
