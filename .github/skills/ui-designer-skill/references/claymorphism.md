# Claymorphism Design Principles

Claymorphism is soft, tactile, and playful, with inflated 3D surfaces.

## Core Concepts
- Double inner shadows (light + dark)
- Very rounded corners (`rounded-3xl` / `rounded-[40px]`)
- Soft float shadows and pastel backgrounds
- Optional light blur for airy depth

## Tailwind Example
```html
<div class="bg-blue-200 rounded-[40px] p-10 shadow-[inset_-8px_-8px_16px_rgba(0,0,0,0.1),inset_8px_8px_16px_rgba(255,255,255,0.8)]">
  <h2 class="text-3xl font-bold text-blue-900 mb-2">Soft & Tactile</h2>
  <p class="text-blue-800">A playful 3D aesthetic.</p>
</div>
```

## Usage Guidance
- Prefer pastel palettes and soft contrast
- Keep component density low to preserve the feel