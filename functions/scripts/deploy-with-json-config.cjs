const fs = require("node:fs")
const path = require("node:path")
const {spawnSync} = require("node:child_process")

const rootDir = path.resolve(__dirname, "..")
const configPath = path.resolve(rootDir, ".deploy-secrets.json")

if (!fs.existsSync(configPath)) {
  console.error(`Missing deploy config JSON: ${configPath}`)
  console.error("Run `npm run migrate:env:json` first or create the file manually.")
  process.exit(1)
}

const run = (command, args, extraEnv = {}) => {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      ...extraEnv,
    },
  })

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

run("firebase", ["functions:secrets:set", "FUNCTIONS_ENV_JSON", "--data-file", configPath])
run("firebase", ["deploy", "--only", "functions,hosting"], { BUILD_ENV: "production" })