# Structured Imagegen

A tool for generating images with Nano Banana based on structured components.

```diff
- NOTE: This project is a part of a personal exploration on experimental Claude Code usage.
- This entire project is YOLO'd, with the code having never been looked at.
- I have taken care to ensure that this code is safe to run, however
- be warned that it has not been checked by human eyes.
```

---

All these images are generated with ImageGen.

<p align="center">
  <img src="docs/_img/subject-cafe.jpg" width="33%" />
  <img src="docs/_img/subject-dive-bar.jpg" width="33%" />
</p>

You can even generate the same background with consistency.

<p align="center">
  <img src="docs/_img/subject-bedroom-1.jpg" width="33%" />
  <img src="docs/_img/subject-bedroom-2.jpg" width="33%" />
  <img src="docs/_img/subject-bedroom-3.jpg" width="33%" />
</p>

---

### Analyze a face to build a character

Upload a reference photo and the tool extracts detailed information about the subject and returns a structured JSON component you can reuse across generations.

<p align="center">
  <img src="docs/_img/facial-analysis.png" width="90%" />
</p>

### Configure components with structured JSON

Each component (character, wardrobe, pose, scene) is a JSON block you can edit directly. Link face references so they're auto-selected when composing prompts.

<p align="center">
  <img src="docs/_img/component-editor.png" width="60%" />
</p>

### Compose prompts from hot-swappable parts

The builder lets you pick from your saved components across categories—swap a wardrobe, change the scene, add accessories and change the posing—and preview the assembled JSON prompt before generating.

<p align="center">
  <img src="docs/_img/component-selector.png" width="90%" />
</p>

### Browse, filter, and compare generations

Every generation is tagged with the components that built it. Filter by character, wardrobe, scene, or any tag to find what you're looking for.

<p align="center">
  <img src="docs/_img/history.png" width="90%" />
</p>

### Remix with natural language edits

Edit generated images with natural language easily in-app.

<p align="center">
  <img src="docs/_img/remix.png" width="50%" />
  <img src="docs/_img/history-edit.png" width="90%" />
</p>

<p align="center">
  <img src="docs/_img/will-smith-miku.jpg" width="40%" />
</p>

---

## Documentation

- [**Installation**](docs/installation.md) - Setup guide, env vars, and database init.
- [**Features**](docs/features.md) - Overview of builder, analysis, and history tools.
- [**Usage**](docs/usage.md) - Workflow guide from component creation to generation.

## Quick Start

```bash
# Install dependencies
bun install

# Setup database
bun db:migrate && bun db:seed

# Start server
bun dev
```
