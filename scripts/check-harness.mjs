#!/usr/bin/env node

import { lstat, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "harness-starter-kit",
  "out",
  "build",
  "coverage",
]);

const driftNamePatterns = [
  /^temp_/,
  /_new\.[^.]+$/,
  /_old\.[^.]+$/,
  /_backup\.[^.]+$/,
  /_fix\.[^.]+$/,
  /\.bak$/,
];

const forbiddenLockfiles = [
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
];

const requiredGitignoreEntries = [
  "/node_modules",
  "/.next/",
  "tsconfig.tsbuildinfo",
  "/harness-starter-kit/",
];

const requiredPackageScripts = ["lint", "typecheck", "build", "check:harness"];

const markdownLinkPattern = /(?<!!)\[[^\]\n]+\]\(([^)\n]+)\)/g;

const failures = [];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function isIgnored(relativePath) {
  return relativePath
    .split(path.sep)
    .some((part) => ignoredDirectories.has(part));
}

async function walk(directory, visitor) {
  const entries = await import("node:fs/promises").then(({ readdir }) =>
    readdir(directory, { withFileTypes: true }),
  );

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, absolutePath);

    if (entry.isDirectory()) {
      if (!isIgnored(relativePath)) {
        await walk(absolutePath, visitor);
      }
      continue;
    }

    if (entry.isFile()) {
      await visitor(absolutePath, relativePath);
    }
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(path.join(root, filePath), "utf8"));
}

async function checkPackageScripts() {
  const packageJson = await readJson("package.json");
  const scripts = packageJson.scripts ?? {};

  for (const scriptName of requiredPackageScripts) {
    if (!scripts[scriptName]) {
      failures.push(`Missing package script: ${scriptName}`);
    }
  }

  if (!existsSync(path.join(root, "package-lock.json"))) {
    failures.push("Missing npm lockfile: package-lock.json");
  }

  for (const lockfile of forbiddenLockfiles) {
    if (existsSync(path.join(root, lockfile))) {
      failures.push(`Unexpected non-npm lockfile: ${lockfile}`);
    }
  }
}

async function checkGitignore() {
  const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");

  for (const entry of requiredGitignoreEntries) {
    if (!gitignore.includes(entry)) {
      failures.push(`.gitignore is missing required entry: ${entry}`);
    }
  }
}

async function checkNextStructure() {
  const requiredPaths = ["src/app/layout.tsx", "src/app/page.tsx", "next.config.ts"];

  for (const requiredPath of requiredPaths) {
    if (!existsSync(path.join(root, requiredPath))) {
      failures.push(`Missing expected Next.js App Router path: ${requiredPath}`);
    }
  }

  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  if (!agents.includes("node_modules/next/dist/docs/")) {
    failures.push("AGENTS.md must keep the Next.js version-specific docs rule.");
  }
}

function normalizeMarkdownTarget(rawTarget) {
  let target = rawTarget.trim();

  if (target.startsWith("<")) {
    const closing = target.indexOf(">");
    if (closing !== -1) {
      target = target.slice(1, closing).trim();
    }
  }

  target = target.split(/\s+/)[0] ?? "";
  target = target.split("#")[0] ?? "";
  target = target.split("?")[0] ?? "";

  try {
    target = decodeURIComponent(target);
  } catch {
    return target;
  }

  return target;
}

function shouldSkipMarkdownTarget(target) {
  return (
    !target ||
    target.startsWith("#") ||
    /^[a-z][a-z0-9+.-]*:/i.test(target) ||
    target.includes("*") ||
    target.includes("{{") ||
    target.includes("}}")
  );
}

async function pathExists(absolutePath) {
  try {
    await lstat(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function checkMarkdownLinks() {
  const markdownFiles = [];

  await walk(root, async (absolutePath, relativePath) => {
    if (relativePath.endsWith(".md")) {
      markdownFiles.push({ absolutePath, relativePath });
    }
  });

  for (const { absolutePath, relativePath } of markdownFiles) {
    const text = await readFile(absolutePath, "utf8");

    for (const match of text.matchAll(markdownLinkPattern)) {
      const target = normalizeMarkdownTarget(match[1]);
      if (shouldSkipMarkdownTarget(target)) {
        continue;
      }

      const candidatePaths = [
        path.resolve(root, target),
        path.resolve(path.dirname(absolutePath), target),
      ];

      const exists = await Promise.all(candidatePaths.map(pathExists));
      if (!exists.some(Boolean)) {
        failures.push(`Broken local Markdown link in ${toPosix(relativePath)}: ${match[1]}`);
      }
    }
  }
}

async function checkDriftProneFiles() {
  await walk(root, async (_absolutePath, relativePath) => {
    const basename = path.basename(relativePath);
    if (driftNamePatterns.some((pattern) => pattern.test(basename))) {
      failures.push(`Drift-prone scratch file found: ${toPosix(relativePath)}`);
    }
  });
}

async function main() {
  await checkPackageScripts();
  await checkGitignore();
  await checkNextStructure();
  await checkMarkdownLinks();
  await checkDriftProneFiles();

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Harness checks passed.");
}

await main();
