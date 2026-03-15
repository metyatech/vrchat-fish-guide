import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';

const cwd = process.cwd();
const DEFAULT_PORT = Number(process.env.PLAYWRIGHT_TEST_PORT ?? 3001);
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

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort, attempts = 20) {
  for (let port = startPort; port < startPort + attempts; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`Could not find an open port starting from ${startPort}.`);
}

async function run() {
  const port = await findAvailablePort(DEFAULT_PORT);
  const baseUrl = `http://127.0.0.1:${port}`;
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
    const testRunner = spawnChild(process.execPath, [playwrightCli, 'test', ...extraArgs], {
      env: {
        ...process.env,
        PLAYWRIGHT_TEST_PORT: String(port),
      },
    });

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
