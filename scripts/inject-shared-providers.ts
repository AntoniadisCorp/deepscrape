#!/usr/bin/env bun
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const SPEC_ROOT = join(ROOT, 'src', 'app');
const IMPORT_LINE = "import { getTestProviders } from 'src/app/testing';";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.spec.ts')) out.push(full);
  }
  return out;
}

function ensureImport(src: string): string {
  if (src.includes(IMPORT_LINE)) return src;
  const lines = src.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImport = i;
  }
  if (lastImport === -1) return `${IMPORT_LINE}\n${src}`;
  lines.splice(lastImport + 1, 0, IMPORT_LINE);
  return lines.join('\n');
}

let changed = 0;

for (const file of walk(SPEC_ROOT)) {
  const original = readFileSync(file, 'utf8');
  let next = original;

  // only if this file has a providers array and doesn't already spread shared providers
  if (/providers\s*:\s*\[/.test(next) && !/\.\.\.getTestProviders\(\)/.test(next)) {
    next = ensureImport(next);
    next = next.replace(/providers\s*:\s*\[/g, 'providers: [\n        ...getTestProviders(),');
  }

  if (next !== original) {
    writeFileSync(file, next, 'utf8');
    changed++;
  }
}

console.log(`Injected shared providers in ${changed} spec file(s).`);
