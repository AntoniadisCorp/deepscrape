# RuVector & Ruflo Ecosystem — Copilot Reference

This skill documents the external **RuVector** and **Ruflo** repositories that form the
agentic AI ecosystem around deepscrape. Use this reference when working with vector
memory, multi-agent coordination, self-learning AI, or anything related to the
ruvnet/* ecosystem.

---

## RuVector (`ruvnet/RuVector`)

> Self-learning, self-optimizing vector database with graph intelligence, local AI
> (CPU-first, GPU optional), PostgreSQL integration, and WASM/browser runtime.
> Powered by [Cognitum.One](https://cognitum.one/) — CES 2026 Innovation Awards Honoree.
> **License**: MIT — **Stars**: ~4.2k — **Language**: Rust (78%) + TypeScript (11%)

### Key Capabilities

| Area | Detail |
|---|---|
| **Self-Learning (SONA)** | Self-Optimizing Neural Architecture — adapts in <1ms via LoRA fine-tuning + EWC++ memory on every query. No manual retraining. |
| **Vector Search** | Self-learning HNSW with GNN layer — Graph Neural Network that improves results from every query using multi-head attention. |
| **AI Runtime (ruvLLM)** | Local LLM inference — GGUF models, MicroLoRA (<1ms), speculative decoding, continuous batching. CPU-first, GPU for bursts. |
| **Graph DB** | Built-in graph with Cypher, W3C SPARQL 1.1, hyperedges — replaces Neo4j/Amazon Neptune. |
| **PostgreSQL** | Drop-in replacement with 230+ SQL functions — pgvector-compatible, but search gets smarter over time. |
| **RVF Containers** | Single `.rvf` file = entire service. Boots in ~125ms, branches like Git, tamper-proof witness chain. |
| **WASM / Browser** | Runs in browsers via WebAssembly (~850KB rvLite). Also available as iOS WASM and edge runtime. |
| **Edge-Net** | Collective AI computing network for distributed inference. |
| **Coherence (Min-Cut)** | Finds weakest links in any network — detects AI drift, prunes wasted compute (~50% reduction). |
| **Agentic-Jujutsu** | Quantum-resistant version control for AI agents. |
| **DrAgnes** | AI-powered dermatology intelligence platform (example). |
| **7sense** | Bioacoustic intelligence platform — bird/animal sound analysis. |

### Installation

```bash
# Interactive installer
npx ruvector install

# Or direct npm install
npm install ruvector
npx ruvector

# Self-learning hooks for Claude Code
npx @ruvector/cli hooks init
npx @ruvector/cli hooks install

# Rust crates
cargo add ruvector-core ruvector-graph ruvector-gnn

# WASM browser
npm install ruvector-wasm
```

### Key Packages

| Package | npm | Rust (crates.io) |
|---|---|---|
| Core | `ruvector` | `ruvector-core` |
| SONA (self-learning) | `@ruvector/sona` | `ruvector-sona` |
| LLM runtime | `@ruvector/ruvllm` | `ruvllm` |
| RVF containers | `@ruvector/rvf` | `rvf-runtime` |
| Edge (rvLite) | — | `rvlite` |
| Genomics | `@ruvector/rvdna` | `rvdna` |
| Graph | — | `ruvector-graph` |
| Router CLI | — | `ruvector-router-cli` |
| WASM math | `@ruvector/math-wasm` | `ruvector-math-wasm` |
| WASM graph | — | `ruvector-gnn-wasm` |
| Admin API (Tiny Dancer) | — | `ruvector-tiny-dancer-core` |
| Cluster | — | `ruvector-cluster` |
| Gate (safety) | `@cognitum/gate` | — |
| Acorn WASM | `@ruvector/acorn-wasm` | — |

### Quick Usage

```typescript
import { RvfDatabase } from '@ruvector/rvf';

const db = await RvfDatabase.openReadonly('./rvf/master.rvf');
const results = await db.query(queryVector, 10);
await db.close();
```

### Links
- **GitHub**: https://github.com/ruvnet/RuVector
- **npm**: https://www.npmjs.com/package/ruvector
- **Crates.io**: https://crates.io/crates/rvf-runtime
- **Docs**: https://github.com/ruvnet/RuVector/tree/main/docs
- **Docs Index**: https://github.com/ruvnet/RuVector/tree/main/docs/INDEX.md
- **RVF Spec**: https://github.com/ruvnet/RuVector/tree/main/crates/rvf/README.md

---

## Ruflo (`ruvnet/ruflo`)

> Multi-agent AI harness for Claude Code and Codex. Orchestrates 100+ specialized
> AI agents across machines, teams, and trust boundaries. Formerly "Claude Flow."
> **License**: MIT — **Stars**: ~59.5k — **Language**: TypeScript (86%)
> **npm**: `ruflo` — **Releases**: 1,533+ — **Contributors**: 33

### What Ruflo Does

One `npx ruflo init` gives Claude Code a nervous system: agents self-organize
into swarms, learn from every task, remember across sessions, and — with federation —
securely talk to agents on other machines without leaking data.

```
User --> Ruflo (CLI/MCP) --> Router --> Swarm --> Agents --> Memory --> LLM Providers
                          ^                           |
                          +---- Learning Loop <-------+
```

### Quick Start

**Path A — Claude Code Plugins (slash commands only)**:
```
/plugin marketplace add ruvnet/ruflo
/plugin install ruflo-core@ruflo
```

**Path B — Full install (all features)**:
```bash
# POSIX shells (macOS/Linux/WSL/Git-Bash)
curl -fsSL https://cdn.jsdelivr.net/gh/ruvnet/ruflo@main/scripts/install.sh | bash

# All platforms (PowerShell/cmd native)
npx ruflo@latest init wizard

# Or quick non-interactive
npx ruflo@latest init
```

**MCP Server**:
```bash
claude mcp add ruflo -- npx ruflo@latest mcp start
```

### What You Get

| Feature | Detail |
|---|---|
| **100+ Agents** | Specialized agents for coding, testing, security, docs, architecture |
| **Swarm Coordination** | Hierarchical, mesh, and adaptive topologies with consensus |
| **Self-Learning** | SONA neural patterns, ReasoningBank, trajectory learning |
| **Vector Memory** | HNSW-indexed AgentDB — ~1.9x–4.7x faster than brute force (recall@10 ~0.99) |
| **Background Workers** | 12 auto-triggered workers (audit, optimize, testgaps, etc.) |
| **Plugin Marketplace** | 32 native Claude Code plugins + 21 npm plugins |
| **Multi-Provider** | Claude, GPT, Gemini, Cohere, Ollama with smart routing |
| **Agent Federation** | Zero-trust cross-machine agent collaboration with mTLS + ed25519 |
| **Web UI (Beta)** | Multi-model chat at `flo.ruv.io` with parallel MCP tool calling |
| **GOAP Planner** | Goal-Oriented Action Planning at `goal.ruv.io` — plain-English goals → agent plans |
| **Witness Verification** | Cryptographic proof that installed bytes match signed manifest |

### Memory (used by deepscrape)

Ruflo uses a **4-tier memory system** that deepscrape can leverage:

| Tier | Backend | Use Case |
|---|---|---|
| 1 | SQLite (default) | Local transcript archive, ACID, indexed queries |
| 2 | **RuVector PostgreSQL** | TB-scale, pgvector embeddings, GNN search |
| 3 | AgentDB + HNSW | In-memory semantic search with persistence |
| 4 | JSON (fallback) | Zero-dependencies, always works |

### Key CLI Commands

```bash
ruflo agent spawn -t coder --name api-worker    # Spawn long-running agent
ruflo swarm init --topology hierarchical         # Init coordinated team
ruflo memory search --query "auth patterns"      # Semantic search
ruflo doctor --fix                               # Diagnose & repair
ruflo verify                                     # Cryptographic verification
```

### Links
- **GitHub**: https://github.com/ruvnet/ruflo
- **npm**: `ruflo` / `npx ruflo@latest`
- **User Guide**: https://github.com/ruvnet/ruflo/blob/main/docs/USERGUIDE.md
- **Status**: https://github.com/ruvnet/ruflo/blob/main/docs/STATUS.md
- **Web UI**: https://flo.ruv.io/
- **Goal Planner**: https://goal.ruv.io/
- **Live Agents**: https://goal.ruv.io/agents

---

## Ecosystem Relationship

```
RuVector (Vector DB + AI OS)
    |
    ├── powers Ruflo's AgentDB + HNSW memory (Tier 2-3)
    ├── provides ruvLLM local inference
    └── RVF containers for portable agent state
    |
Ruflo (Multi-Agent Harness)
    |
    ├── orchestrates 100+ agents
    ├── wraps Claude Code / Codex
    └── federation between machines
    |
deepscrape (this repo)
    |
    ├── uses Crawl4AI (agent.deepscrape.dev)
    ├── Claude, OpenAI, Groq, JinaAI for AI/scraping
    └── can leverage RuVector for vector memory
        and Ruflo for agent orchestration
```

### When to use which

| Task | Use |
|---|---|
| Vector / semantic search | `ruvector` or `@ruvector/rvf` |
| Local LLM inference (CPU) | `ruvllm` / `@ruvector/ruvllm` |
| Multi-agent orchestration | `ruflo` CLI + MCP server |
| Persistent agent memory | Ruflo Tier 2 (RuVector PostgreSQL) or Tier 3 (AgentDB) |
| Browser-based vector DB | `ruvector-wasm` / `rvlite` |
| Agent federation across machines | Ruflo federation plugin |
| Cryptographic build verification | Ruflo `witness` system |
