// lib/parser.ts

export type ParsedComponent = {
  category_id: string;
  name: string;
  description?: string;
  data: Record<string, unknown>;
};

// Category mapping from hi.md headers
const CATEGORY_MAPPING: Record<string, string> = {
  'characters': 'characters',
  'character': 'characters',
  'physical traits': 'physical_traits',
  'physical': 'physical_traits',
  'traits': 'physical_traits',
  'jewelry': 'jewelry',
  'accessories': 'jewelry',
  'wardrobe': 'wardrobe',
  'outfit': 'wardrobe',
  'outfits': 'wardrobe',
  'tops': 'wardrobe_tops',
  'top': 'wardrobe_tops',
  'bottoms': 'wardrobe_bottoms',
  'bottom': 'wardrobe_bottoms',
  'footwear': 'wardrobe_footwear',
  'shoes': 'wardrobe_footwear',
  'poses': 'poses',
  'pose': 'poses',
  'scenes': 'scenes',
  'scene': 'scenes',
  'backgrounds': 'backgrounds',
  'background': 'backgrounds',
  'camera': 'camera',
  'camera settings': 'camera',
  'ban': 'ban_lists',
  'ban list': 'ban_lists',
  'ban lists': 'ban_lists',
};

export const parse_himd = (content: string): ParsedComponent[] => {
  const components: ParsedComponent[] = [];
  const lines = content.split('\n');

  let current_category: string | null = null;
  let current_name: string | null = null;
  let current_description: string | null = null;
  let in_code_block = false;
  let code_content = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for category header (## Category)
    const category_match = line.match(/^##\s+(.+)$/);
    if (category_match) {
      const header_text = category_match[1].toLowerCase().trim();
      const mapped_category = CATEGORY_MAPPING[header_text];
      if (mapped_category) {
        current_category = mapped_category;
      }
      continue;
    }

    // Check for component name (### Name)
    const name_match = line.match(/^###\s+(.+)$/);
    if (name_match) {
      current_name = name_match[1].trim();
      current_description = null;
      continue;
    }

    // Check for code block start/end
    if (line.startsWith('```')) {
      if (in_code_block) {
        // End of code block - save component
        if (current_category && current_name && code_content.trim()) {
          try {
            const data = JSON.parse(code_content);
            components.push({
              category_id: current_category,
              name: current_name,
              description: current_description || undefined,
              data,
            });
          } catch {
            // Invalid JSON, skip
            console.warn(`Invalid JSON for component "${current_name}"`);
          }
        }
        in_code_block = false;
        code_content = '';
      } else {
        in_code_block = true;
      }
      continue;
    }

    // Collect code content
    if (in_code_block) {
      code_content += line + '\n';
      continue;
    }

    // Check for description (text after name, before code block)
    if (current_name && !in_code_block && line.trim() && !line.startsWith('#')) {
      if (!current_description) {
        current_description = line.trim();
      }
    }
  }

  return components;
};
