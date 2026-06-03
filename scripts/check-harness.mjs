#!/usr/bin/env node

import { lstat, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

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
  "/today-bus.zip",
];

const requiredPackageScripts = ["lint", "typecheck", "build", "check:harness"];

const markdownLinkPattern = /(?<!!)\[[^\]\n]+\]\(([^)\n]+)\)/g;

const defaultDecisionMemoryRules = {
  watched_paths: [
    "src/**",
    "app/**",
    "lib/**",
    "components/**",
    "pages/**",
  ],
  decision_paths: ["docs/decisions/**"],
  ignored_paths: [
    "**/*.test.*",
    "**/*.spec.*",
    "**/__snapshots__/**",
    "docs/**",
    "scripts/**",
    "templates/**",
  ],
};

const decisionMemoryQuestion =
  "Does this change user workflow, input contract, input semantics, state " +
  "normalization, API request or response shape, fallback policy, or displayed " +
  "decision criteria?";

const requiredFailureRecordSections = [
  "## Date Observed",
  "## Failure Type",
  "## Goal",
  "## What Happened Or Was Tried",
  "## Why It Failed",
  "## Current Replacement",
  "## Detection Or Prevention Check",
  "## Agent Guidance",
];

const concreteFailureCheckPatterns = [
  /\b(?:tests?|specs?|fixtures?|scripts?)\/[^\s,.;)]+/,
  /`?\.github\/workflows\/[^\s,.;)`]+`?/,
  /\b(?:npm|pnpm|yarn|bun)\s+run\s+[\w:./-]+/,
  /\b(?:make|just)\s+[\w:./-]+/,
  /\bnode\s+scripts?\/[^\s,.;)]+/,
  /\bpython3?\s+(?:-m\s+[\w.:-]+|scripts?\/[^\s,.;)]+)/,
  /\b(?:vitest|jest|eslint)\s+[\w/.:@-]+/,
  /\bmanual review point\s+`?docs\/checklists\/[^\s,.;)`]+/,
];

const rejectedFailureDetectionPhrases = [
  "no test has been added",
  "no regression test",
  "no fixture",
  "not added yet",
  "should be added",
  "will be added",
  "to be added",
  "todo",
];

const failureCheckPathPattern =
  /`?((?:tests?|specs?|fixtures?|scripts?|docs\/checklists)\/[^\s,;)`]+|\.github\/workflows\/[^\s,;)`]+)`?/gi;
const packageScriptCommandPattern =
  /\b(?<manager>npm|pnpm|yarn|bun)\s+run\s+(?<script>[\w:./-]+)/g;

const failures = [];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function normalizeGitPath(value) {
  return value.trim().replaceAll("\\", "/");
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

function runGit(args) {
  return spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
  });
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegExp(pattern) {
  const normalized = normalizeGitPath(pattern);
  let source = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === "*") {
      if (normalized[index + 1] === "*") {
        if (normalized[index + 2] === "/") {
          source += "(?:.*/)?";
          index += 2;
          continue;
        }

        source += ".*";
        index += 1;
        continue;
      }

      source += "[^/]*";
      continue;
    }

    source += escapeRegExp(char);
  }

  return new RegExp(`^${source}$`);
}

function matchesAny(relativePath, patterns) {
  const normalized = normalizeGitPath(relativePath);
  return patterns.some((pattern) => globToRegExp(pattern).test(normalized));
}

function sectionText(text, heading) {
  if (!text.includes(heading)) {
    return undefined;
  }

  return text.split(heading, 2)[1].split(/\n##\s+/, 2)[0];
}

function hasConcreteFailureCheck(section) {
  return concreteFailureCheckPatterns.some((pattern) => pattern.test(section));
}

function referencedFailureCheckPaths(section) {
  return [...section.matchAll(failureCheckPathPattern)]
    .map((match) => match[1].replace(/[.)]+$/, ""))
    .sort();
}

function normalizePackageScriptName(value) {
  return value.replace(/[.,;)\]}]+$/, "");
}

function referencedPackageScriptCommands(section) {
  return [...section.matchAll(packageScriptCommandPattern)]
    .map((match) => ({
      command: `${match.groups.manager} run ${normalizePackageScriptName(
        match.groups.script,
      )}`,
      script: normalizePackageScriptName(match.groups.script),
    }))
    .sort((left, right) => left.command.localeCompare(right.command));
}

async function loadDecisionMemoryRules() {
  const rulesPath = path.join(root, ".harness/decision-memory-rules.json");

  if (!existsSync(rulesPath)) {
    return defaultDecisionMemoryRules;
  }

  const data = await readJson(".harness/decision-memory-rules.json");
  const rules = {};

  for (const [key, fallback] of Object.entries(defaultDecisionMemoryRules)) {
    rules[key] = Array.isArray(data[key])
      ? data[key].map((item) => String(item))
      : fallback;
  }

  return rules;
}

async function addUntrackedPath(paths, relativePath) {
  const absolutePath = path.join(root, relativePath);

  try {
    const stats = await lstat(absolutePath);

    if (stats.isDirectory()) {
      await walk(absolutePath, async (_absolutePath, childRelativePath) => {
        paths.add(normalizeGitPath(childRelativePath));
      });
      return;
    }

    if (stats.isFile()) {
      paths.add(normalizeGitPath(relativePath));
    }
  } catch {
    // Ignore paths that disappear while the check is running.
  }
}

async function getChangedPaths() {
  const paths = new Set();
  const diff = runGit([
    "diff",
    "--name-only",
    "--diff-filter=ACDMRTUXB",
    "HEAD",
    "--",
  ]);

  if (diff.status === 0) {
    for (const line of diff.stdout.split("\n")) {
      if (line.trim()) {
        paths.add(normalizeGitPath(line));
      }
    }
  }

  const status = runGit(["status", "--porcelain"]);

  if (status.status === 0) {
    for (const line of status.stdout.split("\n")) {
      if (line.startsWith("?? ")) {
        await addUntrackedPath(paths, line.slice(3));
      }
    }
  }

  return [...paths].sort();
}

async function checkDecisionMemoryWarning() {
  const insideWorkTree = runGit(["rev-parse", "--is-inside-work-tree"]);

  if (
    insideWorkTree.status !== 0 ||
    insideWorkTree.stdout.trim() !== "true"
  ) {
    return;
  }

  const rules = await loadDecisionMemoryRules();
  const changedPaths = await getChangedPaths();
  const watchedPaths = changedPaths.filter(
    (relativePath) =>
      matchesAny(relativePath, rules.watched_paths) &&
      !matchesAny(relativePath, rules.ignored_paths),
  );
  const decisionPaths = changedPaths.filter((relativePath) =>
    matchesAny(relativePath, rules.decision_paths),
  );

  if (watchedPaths.length === 0 || decisionPaths.length > 0) {
    return;
  }

  console.warn(
    "Decision memory review warning: watched implementation paths changed " +
      "without a docs/decisions change.",
  );
  console.warn(`Question: ${decisionMemoryQuestion}`);
  console.warn("Changed watched paths:");

  for (const relativePath of watchedPaths.slice(0, 10)) {
    console.warn(`- ${relativePath}`);
  }

  if (watchedPaths.length > 10) {
    console.warn(`- ... ${watchedPaths.length - 10} more`);
  }

  console.warn("");
  console.warn("Before the final report, do one of the following:");
  console.warn("- add or update a decision record");
  console.warn("- cite the existing ADR that covers the change");
  console.warn("- explain why no decision memory is needed");
}

async function checkFailureMemoryRecords() {
  const failuresDir = path.join(root, "docs/failures");

  if (!existsSync(failuresDir)) {
    return;
  }

  const packageJson = await readJson("package.json");
  const packageScripts = new Set(Object.keys(packageJson.scripts ?? {}));
  const entries = await readdir(failuresDir, { withFileTypes: true });
  const recordNames = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        entry.name !== "README.md" &&
        entry.name !== "000-template.md",
    )
    .map((entry) => entry.name)
    .sort();

  for (const recordName of recordNames) {
    const relativePath = `docs/failures/${recordName}`;
    const text = await readFile(path.join(root, relativePath), "utf8");

    for (const section of requiredFailureRecordSections) {
      if (!text.includes(section)) {
        failures.push(`${relativePath} is missing required section: ${section}`);
      }
    }

    const detectionSection = sectionText(
      text,
      "## Detection Or Prevention Check",
    );
    if (!detectionSection) {
      continue;
    }

    const normalizedDetection = detectionSection.toLowerCase().replace(/\s+/g, " ");
    for (const phrase of rejectedFailureDetectionPhrases) {
      if (normalizedDetection.includes(phrase)) {
        failures.push(
          `${relativePath} has non-committal detection/prevention prose: ${phrase}`,
        );
      }
    }

    if (!hasConcreteFailureCheck(detectionSection)) {
      failures.push(
        `${relativePath} detection/prevention must name a concrete test, fixture, script, command, CI gate, or manual review point`,
      );
    }

    for (const referencedPath of referencedFailureCheckPaths(detectionSection)) {
      if (!existsSync(path.join(root, referencedPath))) {
        failures.push(
          `${relativePath} detection/prevention references missing local path: ${referencedPath}`,
        );
      }
    }

    for (const { command, script } of referencedPackageScriptCommands(
      detectionSection,
    )) {
      if (!packageScripts.has(script)) {
        failures.push(
          `${relativePath} detection/prevention references missing package.json script: ${command}`,
        );
      }
    }
  }
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

  if (!agents.includes("docs/design/component-rules.md")) {
    failures.push("AGENTS.md must point UI work to docs/design/component-rules.md.");
  }
}

function checkDesignSystem() {
  const requiredPaths = [
    "docs/design/component-rules.md",
    "docs/design/mockup-source.md",
    "src/lib/design/tokens.ts",
    "src/components/ui/sketch-card.tsx",
    "src/components/ui/sketch-button.tsx",
    "src/components/ui/badge.tsx",
    "src/components/ui/ob-header.tsx",
    "src/components/ui/rough-svg-filters.tsx",
    "src/components/icons/doodle-icons.tsx",
  ];

  for (const requiredPath of requiredPaths) {
    if (!existsSync(path.join(root, requiredPath))) {
      failures.push(`Missing shared design-system path: ${requiredPath}`);
    }
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
  checkDesignSystem();
  await checkFailureMemoryRecords();
  await checkMarkdownLinks();
  await checkDriftProneFiles();
  await checkDecisionMemoryWarning();

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
