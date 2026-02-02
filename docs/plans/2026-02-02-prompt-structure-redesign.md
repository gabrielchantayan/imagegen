# Prompt Structure Redesign

## Overview

Restructure the prompt builder output from flat merging into `subject` to a separated structure matching the hi.md format with distinct sections for subject, wardrobe, pose, etc.

## Output Structure

### Single Subject

```json
{
  "scene": "casual 2020s phone selfie; unintentional snapshot",
  "subject": {
    "type": "adult woman",
    "age_range": "early 20s",
    "hair": "...",
    "skin": "...",
    "makeup": "...",
    "attractiveness": "...",
    "ethnicity": "...",
    "jewelry": "...",
    "body": "..."
  },
  "wardrobe": {
    "top": "...",
    "bottom": "...",
    "footwear": "...",
    "notes": "..."
  },
  "pose": {
    "angle": "...",
    "body": "...",
    "hands": "...",
    "framing": "..."
  },
  "camera": { ... },
  "look": {
    "texture": "modern phone camera; mild JPEG artifacts",
    "color": "perfect white balance"
  },
  "background": { ... },
  "style": {
    "authenticity": "imperfect candid moment"
  },
  "ban": [ ... ]
}
```

### Multiple Subjects

```json
{
  "scene": "...",
  "subjects": [
    {
      "body": { /* character traits */ },
      "wardrobe": { ... },
      "pose": { ... }
    },
    {
      "body": { /* character traits */ },
      "wardrobe": { ... },
      "pose": { ... }
    }
  ],
  "camera": { ... },
  "look": { ... },
  "background": { ... },
  "style": { ... },
  "ban": [ ... ]
}
```

Note: In multi-subject mode, character traits use `body` key (not `subject`).

## Category Mapping

### Subject-Specific Categories

| Category | Target Section | Behavior |
|----------|---------------|----------|
| characters | subject/body | Merge all fields |
| physical_traits | subject/body | Merge all fields |
| jewelry | subject/body.jewelry | Merge or replace |
| wardrobe | wardrobe | Replace entire object |
| wardrobe_tops | wardrobe.top | Override just top |
| wardrobe_bottoms | wardrobe.bottom | Override just bottom |
| wardrobe_footwear | wardrobe.footwear | Override just footwear |
| poses | pose | Replace entire object |

### Shared Categories

| Category | Target Key |
|----------|-----------|
| scenes | scene |
| backgrounds | background |
| camera | camera |
| ban_lists | ban |

### Hardcoded Defaults

Always included in output:

```json
"look": {
  "texture": "modern phone camera; mild JPEG artifacts",
  "color": "perfect white balance"
},
"style": {
  "authenticity": "imperfect candid moment"
}
```

## Implementation

### File to Change

`lib/stores/builder-store.ts` - rewrite `compose_prompt` function

### Logic

1. Build each subject's sections separately:
   - `body` from characters + physical_traits + jewelry
   - `wardrobe` from wardrobe + wardrobe_tops/bottoms/footwear
   - `pose` from poses

2. Assemble final structure:
   - Single subject: use `subject` key for body data
   - Multiple subjects: use `subjects` array with `body` key

3. Add shared sections: scene, camera, background, ban

4. Add hardcoded defaults: look, style

5. Omit empty sections (no empty `{}` objects)

### Conflict Detection

Same as current - detect when two components set the same field to different values, scoped to their target section.

## Component Data Expectations

Components should structure their data to match target sections:

**Characters/physical_traits:**
```json
{
  "type": "adult woman",
  "age_range": "early 20s",
  "hair": "long blue hair",
  "skin": "fair",
  "body": "thin waist, wide hips"
}
```

**Wardrobe:**
```json
{
  "top": "white tank top",
  "bottom": "denim shorts",
  "footwear": "sandals",
  "notes": "casual summer"
}
```

**Poses:**
```json
{
  "angle": "mirror selfie FULL BODY",
  "body": "standing, weight on one hip",
  "hands": "phone in one hand",
  "framing": "HEAD-TO-SHOES, feet visible"
}
```

Existing components with different structures will still work - fields merge into target section.
