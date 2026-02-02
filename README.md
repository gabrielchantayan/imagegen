# Structured Imagegen

A tool for generating images with Nano Banana based on structured components.

```diff
- NOTE: This project is a part of a personal exploration on experimental Claude Code usage.
- This entire project is YOLO'd, with the code having never been looked at.
- I have taken care to ensure that this code is safe to run, however
- be warned that it has not been checked by human eyes.
```

---

## The Problem

It is annoying to have to manually modify JSON prompts to generate digital avatars

## The Solution

JSON prompt builder with hot-swappable components

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
