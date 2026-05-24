#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");

const allowedRendererScriptImports = [
  /^scripts\/config(?:\.ts)?$/,
  /^scripts\/utils\/event-system(?:\.ts)?$/,
  /^scripts\/types\//,
];

const p0Events = [
  "RENDER_SYNC",
  "PARTICLE_EMIT",
  "ENEMY_SPAWN",
  "ENEMY_DEATH",
  "ENEMY_DAMAGE",
  "PLAYER_LEVEL_UP",
  "PLAYER_DAMAGE",
  "PLAYER_HEAL",
  "PLAYER_DEATH",
];

const failures = [];

function walk(dir, matcher, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "coverage") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, matcher, results);
    } else if (matcher(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

function rel(file) {
  return path.relative(repoRoot, file).replaceAll(path.sep, "/");
}

function normalizeImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) {
    return specifier;
  }

  const resolved = path.normalize(path.join(path.dirname(fromFile), specifier));
  return rel(resolved).replace(/\.(js|ts)$/, "");
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function checkRendererImports() {
  const files = walk(path.join(repoRoot, "client", "src", "scenes"), (file) => /\.(js|ts)$/.test(file));
  const importPattern = /import(?:\s+type)?[\s\S]*?from\s+["']([^"']+)["']|import\(["']([^"']+)["']\)/g;

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1] || match[2];
      const normalized = normalizeImport(file, specifier);
      if (!normalized.startsWith("scripts/")) {
        continue;
      }

      if (!allowedRendererScriptImports.some((allowed) => allowed.test(normalized))) {
        failures.push(
          `${rel(file)}:${lineNumber(source, match.index)} imports ${normalized}; renderer may only consume config, event bus, or shared types.`
        );
      }
    }
  }
}

function checkP0Emitters() {
  const files = walk(path.join(repoRoot, "scripts"), (file) => /\.(ts|js)$/.test(file));
  const directEmitPattern = /GameEvents\.emit\(\s*EVENTS\.([A-Z_]+)/g;

  for (const file of files) {
    if (rel(file) === "scripts/utils/game-event-emitters.ts") {
      continue;
    }

    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(directEmitPattern)) {
      const eventName = match[1];
      if (p0Events.includes(eventName)) {
        failures.push(
          `${rel(file)}:${lineNumber(source, match.index)} emits ${eventName} directly; use scripts/utils/game-event-emitters.ts.`
        );
      }
    }
  }
}

function checkMacMetadataTracked() {
  const metadataFiles = walk(repoRoot, (file) => {
    const base = path.basename(file);
    return base === ".DS_Store" || base.startsWith("._");
  });

  for (const file of metadataFiles) {
    failures.push(`${rel(file)} should not be present in the repository.`);
  }
}

checkRendererImports();
checkP0Emitters();
checkMacMetadataTracked();

if (failures.length > 0) {
  console.error("Architecture check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Architecture check passed.");
