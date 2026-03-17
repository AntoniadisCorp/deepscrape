const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")
const { spawnSync } = require("node:child_process")

const rootDir = path.resolve(__dirname, "..")
const sourcePath = path.resolve(rootDir, ".env.dev")
const targetPath = path.resolve(rootDir, ".deploy-secrets.json")
const ip2locationBinPath = path.resolve(rootDir, "databases", "IP2LOCATION-LITE-DB11.BIN")
const ip2locationGcsPath = "gs://libnet-d76db.appspot.com/geo/IP2LOCATION-LITE-DB11.BIN"

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

const computeSha256 = (filePath) => {
  const hash = crypto.createHash("sha256")
  const content = fs.readFileSync(filePath)
  hash.update(content)
  return hash.digest("hex").toLowerCase()
}

const syncEnvVar = (rawContent, key, value) => {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`^${escapedKey}=.*$`, "m")
  const newLine = `${key}=${value}`

  if (pattern.test(rawContent)) {
    return rawContent.replace(pattern, newLine)
  }

  const trimmed = rawContent.trimEnd()
  return `${trimmed}\n${newLine}\n`
}

const uploadIp2locationBinIfChanged = (envContent, parsedEnv) => {
  if (!fs.existsSync(ip2locationBinPath)) {
    console.warn(`Skipping IP2Location upload. Missing BIN file: ${ip2locationBinPath}`)
    return { updatedEnvContent: envContent, checksum: parsedEnv.IP2LOCATION_SHA256 || "" }
  }

  const newChecksum = computeSha256(ip2locationBinPath)
  const currentChecksum = (parsedEnv.IP2LOCATION_SHA256 || "").trim().toLowerCase()

  if (currentChecksum === newChecksum) {
    console.log("IP2Location checksum unchanged. Skipping gsutil upload.")
    return { updatedEnvContent: envContent, checksum: newChecksum }
  }

  console.log(`IP2Location checksum changed: ${currentChecksum || "<empty>"} -> ${newChecksum}`)
  console.log(`Uploading BIN to ${ip2locationGcsPath}`)

  const upload = spawnSync("gsutil", ["cp", ip2locationBinPath, ip2locationGcsPath], {
    cwd: rootDir,
    stdio: "inherit",
    shell: true,
  })

  if (upload.status !== 0) {
    console.error("gsutil upload failed.")
    process.exit(upload.status || 1)
  }

  const updatedEnvContent = syncEnvVar(envContent, "IP2LOCATION_SHA256", newChecksum)
  fs.writeFileSync(sourcePath, updatedEnvContent, "utf8")
  console.log("Updated .env.dev with new IP2LOCATION_SHA256")

  return { updatedEnvContent, checksum: newChecksum }
}

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing source env file: ${sourcePath}`)
  process.exit(1)
}

const envContent = fs.readFileSync(sourcePath, "utf8")
const parsed = parseEnvFile(envContent)

const { updatedEnvContent } = uploadIp2locationBinIfChanged(envContent, parsed)
const updatedParsed = parseEnvFile(updatedEnvContent)

fs.writeFileSync(targetPath, `${JSON.stringify(updatedParsed, null, 2)}\n`, "utf8")

console.log(`Wrote ${Object.keys(updatedParsed).length} keys to ${targetPath}`)