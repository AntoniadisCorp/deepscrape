#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../../');
const skillRoot = path.resolve(__dirname, '..');

const files = {
  matTheme: path.join(repoRoot, 'src', 'scss', '_mat-theme.scss'),
  tailwindConfig: path.join(repoRoot, 'tailwind.config.js'),
  skillReadme: path.join(skillRoot, 'README.md'),
  skillSpec: path.join(skillRoot, 'SKILL.md'),
  themeMap: path.join(skillRoot, 'references', 'current-theme-map.md'),
};

function readOrThrow(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${path.relative(repoRoot, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function countMatches(source, regex) {
  const matches = source.match(regex);
  return matches ? matches.length : 0;
}

const errors = [];

let matTheme;
let tailwindConfig;
let skillReadme;
let skillSpec;
let themeMap;

try {
  matTheme = readOrThrow(files.matTheme);
  tailwindConfig = readOrThrow(files.tailwindConfig);
  skillReadme = readOrThrow(files.skillReadme);
  skillSpec = readOrThrow(files.skillSpec);
  themeMap = readOrThrow(files.themeMap);
} catch (error) {
  console.error(`Theme drift validation failed: ${error.message}`);
  process.exit(2);
}

const primaryCount = countMatches(matTheme, /primary\s*:\s*mat\.\$cyan-palette/g);
const tertiaryCount = countMatches(matTheme, /tertiary\s*:\s*mat\.\$rose-palette/g);
if (primaryCount < 2) {
  errors.push('Expected cyan Material primary in both light and dark theme configs.');
}
if (tertiaryCount < 2) {
  errors.push('Expected rose Material tertiary in both light and dark theme configs.');
}

if (!/darkMode\s*:\s*['\"]class['\"]/g.test(tailwindConfig)) {
  errors.push("Expected Tailwind darkMode to be set to 'class'.");
}

const docs = {
  'README.md': skillReadme,
  'SKILL.md': skillSpec,
  'references/current-theme-map.md': themeMap,
};

const requiredPhrases = {
  'README.md': ['Material primary: cyan', 'Material tertiary: rose', 'Tailwind dark mode: class strategy'],
  'SKILL.md': ['Material primary palette: cyan', 'Material tertiary palette: rose', "darkMode: 'class'"],
  'references/current-theme-map.md': ['mat.$cyan-palette', 'mat.$rose-palette', 'dark mode strategy: `class`'],
};

for (const [docName, phrases] of Object.entries(requiredPhrases)) {
  const content = docs[docName];
  for (const phrase of phrases) {
    if (!content.includes(phrase)) {
      errors.push(`Missing phrase in ${docName}: ${phrase}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Theme drift validation failed.');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Theme drift validation passed.');
console.log('- Material primary/tertiary mapping is cyan/rose in source theme.');
console.log("- Tailwind dark mode strategy is 'class'.");
console.log('- Skill docs include expected theme facts.');
