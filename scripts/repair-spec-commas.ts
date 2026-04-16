#!/usr/bin/env bun
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const SPEC_ROOT = join(ROOT, 'src', 'app');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.spec.ts')) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(SPEC_ROOT)) {
  const original = readFileSync(file, 'utf8');
  let next = original;

  // Ensure comma before providers if previous property line is missing trailing comma.
  next = next.replace(
    /(imports\s*:\s*\[[^\n]*\])(\r?\n\s*providers\s*:)/g,
    '$1,$2',
  );

  next = next.replace(
    /(declarations\s*:\s*\[[^\n]*\])(\r?\n\s*providers\s*:)/g,
    '$1,$2',
  );

  next = next.replace(
    /(schemas\s*:\s*\[[^\n]*\])(\r?\n\s*providers\s*:)/g,
    '$1,$2',
  );

  if (next !== original) {
    writeFileSync(file, next, 'utf8');
    changed++;
  }
}

console.log(`Repaired ${changed} spec file(s).`);
