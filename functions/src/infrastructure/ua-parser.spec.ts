/* eslint-disable max-len */
import test from "node:test"
import assert from "node:assert/strict"
import {parseUA} from "./ua-parser"

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

test("parseUA keeps the legacy useragent surface for real browsers", () => {
  const agent = parseUA(CHROME)

  assert.equal(agent.family, "Chrome")
  assert.equal(agent.os.family, "Windows")
  assert.equal(agent.toString(), CHROME)
  assert.equal(agent.isBot, false)
  assert.equal(agent.botKind, null)
})

test("parseUA separates AI agents from plain crawlers", () => {
  const googlebot = parseUA("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")
  const gptbot = parseUA("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot")
  const chatgptUser = parseUA("Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)")

  assert.equal(googlebot.isBot, true)
  assert.equal(googlebot.botKind, "bot")
  assert.equal(gptbot.botKind, "ai-crawler")
  assert.equal(chatgptUser.botKind, "ai-assistant")
})

test("parseUA tolerates a missing UA header", () => {
  const agent = parseUA("")

  assert.equal(agent.family, "Other")
  assert.equal(agent.toString(), "")
  assert.equal(agent.isBot, false)
})
