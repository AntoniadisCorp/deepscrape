# SVG GIFS Image Generation Prompts — Glassmorphism Dark Assets

These prompts are designed to generate images matching the Figma "Framer Course" glassmorphism aesthetic for the deepscrape platform landing page. Use tools
---

## 1. Hero Dark UI Mockup

**Replace:** The interactive code terminal window (currently in hero right column)
**Style:** Figma-inspired dark UI concept with glass cards
**Size:** ~1200×800px (landscape)

> **Prompt:**
> A dark UI dashboard concept on a near-black background (#060606). Left sidebar with glass-morphism navigation items: "Crawl Jobs", "Data Extraction", "Analytics", "Settings" — each as translucent glass pills with subtle cyan border glows. Main content area shows: top row of 3 glass stat cards with gradient progress rings (68k GitHub Stars, 99.9% Uptime, <200ms Response), a middle section with a glass-panel "Recent Crawls" data table showing URLs and structured JSON results with green status badges, and a bottom-right glass card with a gradient line chart labeled "Pages Crawled (Last 30 Days)". Color scheme: deep black, glass white/10 surfaces, cyan (#176ab1) and rose (#be123c) accent glows. Subtle grid pattern overlay at 6% opacity. Dark and moody, premium software aesthetic, no text readability needed — this is a visual concept. 4K, ultra-detailed.

---

## 2. Global Distributed Browser Pool Network Map

**Replace:** `assets/images/landing/architecture-global-network.webp`
**Size:** ~1800×900px (landscape)

> **Prompt:**
> A stylized global network map on a deep black background (#060606). Glowing cyan nodes at major cities (San Francisco, New York, London, Frankfurt, Singapore, Tokyo, Sydney, São Paulo) connected by thin rose-gradient data flow lines with particle animation trails. Each node is a translucent glass sphere with a subtle pulsing cyan inner glow. Decorative grid lines at 5% opacity overlay. Small glass-panel data badges floating near each cluster showing "40+ Countries", "<200ms", "99.9% Uptime". At the bottom, a glass-panel legend bar. Color palette: cyan (#176ab1), light blue (#cbd8f1), rose (#be123c) accents on deep black. Cinematic lighting, volumetric fog effect at edges. 4K, ultra-detailed, no text overlays needed beyond decorative badges.

---

## 3. Data Flow Pipeline Diagram

**Replace:** `assets/images/landing/hero-mermaid-graph.webp`
**Size:** ~1800×700px (landscape)

> **Prompt:**
> A horizontal data flow pipeline diagram on deep black background (#060606). Five stages connected by glowing arrow lines: "SDK / API" (Python, Node.js, REST icons) → "Crawl Dispatcher" (load balancer icon) → "Browser Pool" (3 browser window icons) → "AI Extraction" (sparkle/LLM icon) → "Structured Data" (JSON/database icon). Each stage is a glass-morphism card with cyan (#176ab1) border glow, semi-transparent white/5 fill, subtle backdrop blur. Arrows between stages are gradient cyan-to-rose. A glass-panel header badge reads "Full Data Flow". Small decorative grid pattern at 4% opacity behind the pipeline. Dark premium aesthetic, dashboard-style. 4K, ultra-detailed.

---

## 4. Cost Savings Comparison Ticket Card

**Use in:** Architecture section cost comparison area
**Size:** ~400×500px (portrait)

> **Prompt:**
> A premium glass-morphism flight/booking-style ticket card on transparent background. The card shows: top section with "deepscrape Managed" branding in cyan gradient text, a large "Save 60–80%" badge in green glass-pill style, middle section showing "€19.99/mo" vs "€1,200/mo" with a strikethrough on the higher price, bottom section with checkmark features: "No DevOps", "Auto-scaling", "Anti-detection included". The card has glass surface (white/5 fill, backdrop-blur, white/10 border), subtle cyan glow on edges, rounded corners (16px). Dark theme. 4K, product showcase quality.

---

## 5. Trusted By / Logo Bar Background

**Use in:** Social Proof "Trusted by developers worldwide" section
**Size:** ~1400×200px (wide banner)

> **Prompt:**
> A wide decorative glass panel banner on deep black background (#060606). The panel has subtle glass-morphism surface (white/5 fill, backdrop-blur-xl, white/8 border, rounded-2xl). A faint grid pattern overlay at 4% opacity. A subtle cyan-to-rose gradient glow at the left edge and a rose-to-cyan glow at the right edge. The center area is clean and semi-transparent — designed so company logo text or names can be overlaid. No text in the image itself. Cinematic lighting, premium dark aesthetic. 4K.

---

## 6. Feature Icons — Glass Container Set

**Use in:** Features section icon containers
**Size:** Individual 44×44px icons (generate as a spritesheet or individual)

> **Prompt:**
> A set of 6 glass-morphism icon containers arranged in a row. Each is a 44×44px rounded-xl square with glass surface (white/5 fill, backdrop-blur, white/10 border). Inside each container, a different simple line icon: (1) robot/spider bot, (2) database/server, (3) shield/security, (4) lightning bolt, (5) brain/AI chip, (6) globe/network. Icons are in cyan (#176ab1) color, thin stroke style, centered. The glass containers have a subtle hover-style cyan glow. Dark theme background. Minimal, clean, premium UI component aesthetic. 4K.

## 7. Animated SVGs — Drop-in Replacements for Current Images

These animated SVGs replace the static images currently used in the landing page. They are self-contained (CSS + SVG animations, no JS), auto-loop, and match the dark glassmorphism aesthetic.

### Created Files

| File | Description | Replaces |
|---|---|---|
| `architecture-global-network-animated.svg` | 6 pulsing glass network nodes with animated data flow particles, floating badges, legend bar | `architecture-global-network.webp` |
| `hero-mermaid-graph-animated.svg` | 5-stage pipeline with cascade entrance, flow particles, pulsing borders | `hero-mermaid-graph.webp` |
| `hero-dashboard-animated.svg` | Dashboard with animated chart, stat cards, data table, status bar | — |
| `comparison-animated.svg` | Self-hosted vs managed cost comparison with staggered reveal | — |
| `use-cases-ecommerce.svg` | Product monitoring dashboard with animated price table | — |
| `use-cases-ai-training.svg` | Neural network + 3-step AI pipeline animation | — |
| `use-cases-market-research.svg` | Animated bar chart with insights panel | — |
| `use-cases-seo.svg` | Search/SERP interface with extraction + analysis panels | — |
| `feature-*.svg` (6) | Glass icon containers with animated icons per feature | Icon containers |

### Usage
```html
<!-- Already applied in components -->
<img src="assets/images/landing/architecture-global-network-animated.svg" ...>
<img src="assets/images/landing/hero-mermaid-graph-animated.svg" ...>
```
