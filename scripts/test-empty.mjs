import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const source = `${process.cwd()}/public/feed-data.json`;
const backup = `${process.cwd()}/public/feed-data.test-backup.json`;
const emptyFeed = {
  items: [],
  trends: [],
  fetchedAt: "",
  attemptedAt: "2026-11-20T16:00:00Z",
  sources: [],
};

const hadFeed = existsSync(source);
if (hadFeed) writeFileSync(backup, readFileSync(source));
writeFileSync(source, JSON.stringify(emptyFeed, null, 2) + "\n");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

let exitCode = 0;
try {
  exitCode = run("npm", ["run", "build:static"]);
  if (exitCode === 0) {
    exitCode = run("npx", ["playwright", "test", "--config=playwright.empty.config.ts"]);
  }
} finally {
  if (hadFeed) writeFileSync(source, readFileSync(backup));
  else rmSync(source, { force: true });
  rmSync(backup, { force: true });

  // Leave the working tree with a normal production build and preserve test failures.
  const restoreExitCode = run("npm", ["run", "build:static"]);
  if (exitCode === 0) exitCode = restoreExitCode;
}

process.exit(exitCode);
