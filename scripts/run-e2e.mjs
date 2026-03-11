import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';

const cwd = process.cwd();
const port = 3001;
const baseUrl = `http://127.0.0.1:${port}`;
const extraArgs = process.argv.slice(2);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const statusCode = await new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
          response.resume();
          resolve(response.statusCode ?? 0);
        });
        request.on('error', reject);
      });

      if (statusCode >= 200 && statusCode < 500) {
        return;
      }
    } catch {}

    await wait(400);
  }

  throw new Error(`Static server did not become ready within ${timeoutMs}ms.`);
}

function spawnChild(command, args, options = {}) {
  return spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    ...options,
  });
}

async function run() {
  const server = spawnChild(process.execPath, ['scripts/serve-static.mjs', 'out', String(port)]);
  let serverExitedEarly = false;

  server.once('exit', () => {
    serverExitedEarly = true;
  });

  try {
    await waitForServer(`${baseUrl}/calculator/`, 120_000);

    if (serverExitedEarly) {
      throw new Error('Static server exited before Playwright started.');
    }

    const playwrightCli = path.resolve(cwd, 'node_modules', 'playwright', 'cli.js');
    const testRunner = spawnChild(process.execPath, [playwrightCli, 'test', ...extraArgs]);

    const exitCode = await new Promise((resolve, reject) => {
      testRunner.once('exit', (code) => resolve(code ?? 1));
      testRunner.once('error', reject);
    });

    server.kill('SIGTERM');
    await new Promise((resolve) => server.once('exit', () => resolve(undefined)));
    process.exit(Number(exitCode));
  } catch (error) {
    if (!server.killed) {
      server.kill('SIGTERM');
    }
    await new Promise((resolve) => server.once('exit', () => resolve(undefined)));
    throw error;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
