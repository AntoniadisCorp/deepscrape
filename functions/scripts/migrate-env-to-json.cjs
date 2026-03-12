const fs = require("node:fs")
const path = require("node:path")

const rootDir = path.resolve(__dirname, "..")
const sourcePath = path.resolve(rootDir, ".env.dev")
const targetPath = path.resolve(rootDir, ".deploy-secrets.json")

const parseEnvFile = (content) => {
  const lines = content.split(/\r?\n/)
  const result = {}

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#")) {
      continue
    }

    const separatorIndex = line.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (!key) {
      continue
    }

    if ((value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing source env file: ${sourcePath}`)
  process.exit(1)
}

const envContent = fs.readFileSync(sourcePath, "utf8")
const parsed = parseEnvFile(envContent)

fs.writeFileSync(targetPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8")

console.log(`Wrote ${Object.keys(parsed).length} keys to ${targetPath}`)