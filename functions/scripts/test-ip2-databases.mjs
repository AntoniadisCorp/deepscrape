/**
 * IP2Location LITE + IP2Proxy LITE — Download & Test Script
 *
 * Usage:
 *   node functions/scripts/test-ip2-databases.mjs [download] [token=YOUR_TOKEN]
 *
 * Examples:
 *   # Just test existing BIN files (no download):
 *   node functions/scripts/test-ip2-databases.mjs
 *
 *   # Download fresh BINs first (requires your token from ip2location.com account):
 *   node functions/scripts/test-ip2-databases.mjs download token=abc123xyz
 *
 * Get your token at: https://www.ip2location.com/log-in → My Downloads
 *
 * Required npm packages:
 *   ip2location-nodejs  (already installed)
 *   ip2proxy-nodejs     (install: bun add ip2proxy-nodejs  inside functions/)
 */

import { createWriteStream, existsSync } from "node:fs";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, mkdtemp, open, readdir, rename, rm, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.resolve(__dirname, "../databases");

// ─── Configuration ────────────────────────────────────────────────────────────

const TEST_IPS = [
  "2a02:85f:e0ba:de00:e180:c371:cb0e:cbba",  // IPv6 Greece (used in previous tests)
  "141.237.210.42",
  "202.169.229.139",                   // Known open proxy (IPv4:port, PUB type)
//   "8.8.8.8",                                 // Google DNS (IPv4, DCH/SES type)
//   "185.220.101.34",                          // Known Tor exit node
//   "1.1.1.1",                                 // Cloudflare DNS
//   "127.0.0.1",                               // Localhost
];

// Files to download — one BIN per category. Edit to add more.
const DOWNLOAD_TARGETS = [
  { code: "DB11LITEBINIPV6", file: "IP2LOCATION-LITE-DB11.BIN",  desc: "Geo: Country/Region/City/Lat/Lon/ZIP/TZ (IPv4+IPv6)" },
  { code: "DBASNLITEBINIPV6", file: "IP2LOCATION-LITE-ASN.BIN",  desc: "ASN: Autonomous System Number + Name (IPv4+IPv6)" },
  { code: "PX12LITEBIN",       file: "IP2PROXY-LITE-PX12.BIN",    desc: "Proxy: Type/Country/Region/City/ISP/Domain/UsageType/ASN/LastSeen/Threat" },
];

// ─── CLI parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const doDownload = args.includes("download");
const tokenArg = args.find((a) => a.startsWith("token="));
const TOKEN = tokenArg ? tokenArg.split("=")[1] : process.env.IP2LOCATION_TOKEN;

const ZIP_SIGNATURE = [0x50, 0x4B, 0x03, 0x04];

function runCommand(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: "pipe" });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} exited with ${code}: ${stderr || stdout}`));
    });
  });
}

async function fileLooksLikeZip(filePath) {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(4);
    const { bytesRead } = await handle.read(buffer, 0, 4, 0);
    if (bytesRead < 4) return false;
    return ZIP_SIGNATURE.every((byte, idx) => buffer[idx] === byte);
  } finally {
    await handle.close();
  }
}

async function extractZipToBin(zipPath, expectedBinName, destinationPath) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "ip2-bin-"));
  try {
    if (process.platform === "win32") {
      await runCommand("powershell", [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force`,
      ]);
    } else {
      await runCommand("unzip", ["-o", zipPath, "-d", tmpDir]);
    }

    const entries = await readdir(tmpDir, { recursive: true });
    const binEntry = entries.find((entry) =>
      typeof entry === "string" && entry.toUpperCase().endsWith(".BIN"),
    );

    if (!binEntry) {
      throw new Error(`No BIN file found in archive for ${expectedBinName}`);
    }

    const extractedBin = path.join(tmpDir, binEntry);
    await copyFile(extractedBin, destinationPath);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

async function ensureValidBin(filePath) {
  if (!existsSync(filePath)) return;
  const asZip = await fileLooksLikeZip(filePath);
  if (!asZip) return;

  console.log(`   ⚠ ${path.basename(filePath)} is a ZIP archive, extracting BIN payload...`);
  const tmpDest = `${filePath}.bin.repair.tmp`;
  await extractZipToBin(filePath, path.basename(filePath), tmpDest);
  await rename(tmpDest, filePath);
  const repairedStats = await stat(filePath);
  console.log(`   ✓ Repaired ${path.basename(filePath)} (${(repairedStats.size / (1024 * 1024)).toFixed(2)} MB)`);
}

async function validateBin(filePath, minBytes) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  await ensureValidBin(filePath);
  const s = await stat(filePath);
  if (s.size < minBytes) {
    throw new Error(`Downloaded file is too small (${s.size} bytes): ${filePath}`);
  }
}

// ─── Download helper ──────────────────────────────────────────────────────────

async function downloadBin({ code, file, desc }) {
  if (!TOKEN) {
    console.warn(`⚠  Skipping download of ${file} — no token provided.`);
    return;
  }

  const destPath = path.join(DB_DIR, file);
  const url = `https://www.ip2location.com/download/?token=${TOKEN}&file=${code}`;

  console.log(`\n⬇  Downloading ${file}\n   ${desc}`);
  console.log(`   URL: https://www.ip2location.com/download/?token=***&file=${code}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status} for ${code}`);
  }

  const tmpDownload = destPath + ".download.tmp";
  const fileStream = createWriteStream(tmpDownload);
  await pipeline(res.body, fileStream);

  const downloadedLooksLikeZip = await fileLooksLikeZip(tmpDownload);
  if (downloadedLooksLikeZip) {
    console.log("   Extracting ZIP payload...");
    await extractZipToBin(tmpDownload, file, destPath);
    await rm(tmpDownload, { force: true });
    const outStats = await stat(destPath);
    console.log(`   ✓ Saved BIN ${file} (${(outStats.size / (1024 * 1024)).toFixed(2)} MB)`);
  } else {
    await rename(tmpDownload, destPath);
    console.log(`   ✓ Saved raw BIN ${file}`);
  }

  await validateBin(destPath, 1024 * 1024);
}

// ─── IP2Location geo lookup ───────────────────────────────────────────────────

async function testGeoDB() {
  const geoFile = path.join(DB_DIR, "IP2LOCATION-LITE-DB11.BIN");
  if (!existsSync(geoFile)) {
    console.log("\n⚠  IP2LOCATION-LITE-DB11.BIN not found, skipping geo test.");
    return;
  }

  await validateBin(geoFile, 10 * 1024 * 1024);

  const { default: IP2LocationNS } = await import("ip2location-nodejs");
  const db = new IP2LocationNS.IP2Location();
  db.open(geoFile);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(" GEO LOOKUP — IP2LOCATION-LITE-DB11.BIN");
  console.log("═══════════════════════════════════════════════════════");

  for (const ip of TEST_IPS) {
    const r = db.getAll(ip);
    console.log(`\n▶ ${ip}`);
    console.log({
      country:   `${r.countryShort} / ${r.countryLong}`,
      region:    r.region,
      city:      r.city,
      zip:       r.zipCode,
      coords:    `${r.latitude}, ${r.longitude}`,
      timezone:  r.timeZone,
      // These will say "not applicable" on LITE DB11 — shown for transparency:
      isp:       r.isp,
      asn:       r.asn,
      usageType: r.usageType,
    }, r);
  }

  db.close();
}

// ─── ASN lookup ───────────────────────────────────────────────────────────────

async function testAsnDB() {
  const asnFile = path.join(DB_DIR, "IP2LOCATION-LITE-ASN.BIN");
  if (!existsSync(asnFile)) {
    console.log("\n⚠  IP2LOCATION-LITE-ASN.BIN not found, skipping ASN test.");
    console.log("   Download it with: node test-ip2-databases.mjs download token=YOUR_TOKEN");
    return;
  }

  await validateBin(asnFile, 10 * 1024 * 1024);

  const { default: IP2LocationNS } = await import("ip2location-nodejs");
  const db = new IP2LocationNS.IP2Location();
  db.open(asnFile);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(" ASN LOOKUP — IP2LOCATION-LITE-ASN.BIN");
  console.log("═══════════════════════════════════════════════════════");

  for (const ip of TEST_IPS) {
    const r = db.getAll(ip);
    console.log(`\n▶ ${ip}`);
    console.log({
      asn:    r.asn,   // e.g. "AS1234"
      as:     r.as,    // e.g. "WIND Hellas Telecommunications"
      // asDomain and asCidr only in commercial edition
    }, r);
  }

  db.close();
}

// ─── IP2Proxy lookup ──────────────────────────────────────────────────────────

async function testProxyDB() {
  const proxyFile = path.join(DB_DIR, "IP2PROXY-LITE-PX12.BIN");
  if (!existsSync(proxyFile)) {
    console.log("\n⚠  IP2PROXY-LITE-PX12.BIN not found, skipping proxy test.");
    console.log("   Download it with: node test-ip2-databases.mjs download token=YOUR_TOKEN");
    return;
  }

  await validateBin(proxyFile, 10 * 1024 * 1024);

  let IP2Proxy;
  try {
    IP2Proxy = (await import("ip2proxy-nodejs")).default;
  } catch {
    console.log("\n⚠  ip2proxy-nodejs not installed.");
    console.log("   Run: cd functions && bun add ip2proxy-nodejs");
    return;
  }

  const db = new IP2Proxy.IP2Proxy();
  db.open(proxyFile);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(" PROXY LOOKUP — IP2PROXY-LITE-PX12.BIN");
  console.log(" NOTE: LITE only tracks open proxies (PUB).");
  console.log(" VPN/TOR/DCH/RES require commercial IP2Proxy edition.");
  console.log("═══════════════════════════════════════════════════════");

  for (const ip of TEST_IPS) {
    const r = db.getAll(ip);
    console.log(`\n▶ ${ip}`);
    console.log({
      isProxy:    r.isProxy,   // 0 = not proxy, 1 = proxy, 2 = data center
      proxyType:  r.proxyType, // VPN | TOR | PUB | WEB | DCH | SES | RES | CPN | EPN
      country:    `${r.countryShort} / ${r.countryLong}`,
      region:     r.region,
      city:       r.city,
      isp:        r.isp,
      domain:     r.domain,
      usageType:  r.usageType,
      asn:        r.asn,
      as:         r.as,
      lastSeen:   r.lastSeen,  // days since last seen as proxy
      threat:     r.threat,    // SPAM | SCANNER | BOTNET | BOGON
    }, r);
  }

  db.close();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(DB_DIR, { recursive: true });

  if (doDownload) {
    console.log("\n📥 Download mode enabled");
    if (!TOKEN) {
      console.error("❌ No token found. Pass token=YOUR_TOKEN or set IP2LOCATION_TOKEN env var.");
      console.error("   Get your token at: https://www.ip2location.com/log-in → My Downloads");
      process.exit(1);
    }
    for (const target of DOWNLOAD_TARGETS) {
      await downloadBin(target);
    }
  }

  await testGeoDB();
  await testAsnDB();
  await testProxyDB();

  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
