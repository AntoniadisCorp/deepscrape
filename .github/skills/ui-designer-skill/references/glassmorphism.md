# Glassmorphism Design System

Glassmorphism uses transparency, blur, and subtle borders for a frosted-glass effect.

## Core Principles
- Transparent surfaces (roughly 0.1-0.4 opacity)
- Backdrop blur for depth (`backdrop-filter`)
- Layering with soft shadow separation
- Strong foreground contrast for readability

## Tailwind Example
```html
<div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl">
  <!-- Content -->
</div>
```

## Dos and Don’ts
- Do use thin light borders for edge definition
- Do reserve this style for cards/navbars/overlays
- Don’t overuse across every element