#!/usr/bin/env bun
/**
 * scripts/fix-specs.ts
 *
 * Batch-patches all Angular spec files under src/app/ to inject
 * `getTestProviders()` from src/app/testing into every
 * TestBed.configureTestingModule call that has no providers yet.
 *
 * Run with:  bun scripts/fix-specs.ts
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

// ---- Config ----------------------------------------------------------------

const ROOT = join(import.meta.dir, '..'); // project root
const SPEC_ROOT = join(ROOT, 'src', 'app');
const TESTING_DIR = join(SPEC_ROOT, 'testing');
const IMPORT_LINE = "import { getTestProviders } from 'src/app/testing';";

// ---- Helpers ---------------------------------------------------------------

function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else if (entry.endsWith('.spec.ts')) {
      results.push(full);
    }
  }
  return results;
}

function isInsideTesting(filePath: string): boolean {
  return filePath.startsWith(TESTING_DIR + sep) || filePath === TESTING_DIR;
}

/**
 * Adds `import { getTestProviders } from 'src/app/testing';`
 * right after the last existing import statement in the file.
 */
function addImport(src: string): string {
  const lines = src.split('\n');
  // Find index of last line that starts with 'import '
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) {
      lastImportIdx = i;
    }
  }
  if (lastImportIdx === -1) {
    // No imports found — prepend
    return IMPORT_LINE + '\n' + src;
  }
  lines.splice(lastImportIdx + 1, 0, IMPORT_LINE);
  return lines.join('\n');
}

/**
 * Rewrites TestBed.configureTestingModule calls to include providers.
 *
 * Handles two patterns:
 *
 * Pattern 1 — empty/single-line:
 *   TestBed.configureTestingModule({})
 *   → TestBed.configureTestingModule({ providers: getTestProviders() })
 *
 * Pattern 2 — multi-line with imports only (no providers key yet):
 *   TestBed.configureTestingModule({
 *     imports: [SomeComponent],
 *   });
 *   →
 *   TestBed.configureTestingModule({
 *     imports: [SomeComponent],
 *     providers: getTestProviders(),
 *   });
 */
function patchConfigureTestingModule(src: string): string {
  // Pattern 1: empty braces on same line
  src = src.replace(
    /TestBed\.configureTestingModule\(\s*\{\s*\}\s*\)/g,
    'TestBed.configureTestingModule({ providers: getTestProviders() })',
  );

  // Pattern 2: multi-line block without a providers: key
  // Match the entire configureTestingModule({ ... }) call across multiple lines
  src = src.replace(
    /TestBed\.configureTestingModule\((\{[\s\S]*?\})\)/g,
    (match, block) => {
      // Skip if block already has providers: or getTestProviders
      if (/providers\s*:/.test(block) || /getTestProviders/.test(block)) {
        return match;
      }
      // Insert `providers: getTestProviders(),` before the closing `}`
      const newBlock = block.replace(/(\n\s*)\}(\s*)$/, (_:any, indent: any, tail: any) => {
        return `${indent}  providers: getTestProviders(),${indent}}${tail}`;
      });
      return `TestBed.configureTestingModule(${newBlock})`;
    },
  );

  return src;
}

// ---- Main ------------------------------------------------------------------

let patchedCount = 0;
let skippedCount = 0;

const specFiles = walk(SPEC_ROOT).filter((f) => !isInsideTesting(f));

for (const filePath of specFiles) {
  const rel = relative(ROOT, filePath);
  const original = readFileSync(filePath, 'utf8');

  // Skip files that already use getTestProviders
  if (original.includes('getTestProviders')) {
    console.log(`  SKIP (already patched): ${rel}`);
    skippedCount++;
    continue;
  }

  // Skip files with no TestBed.configureTestingModule at all
  if (!original.includes('TestBed.configureTestingModule')) {
    console.log(`  SKIP (no configureTestingModule): ${rel}`);
    skippedCount++;
    continue;
  }

  let patched = original;
  patched = addImport(patched);
  patched = patchConfigureTestingModule(patched);

  if (patched !== original) {
    writeFileSync(filePath, patched, 'utf8');
    console.log(`  PATCHED: ${rel}`);
    patchedCount++;
  } else {
    console.log(`  SKIP (no change needed): ${rel}`);
    skippedCount++;
  }
}

console.log(`\nDone. Patched ${patchedCount} file(s), skipped ${skippedCount} file(s).`);
