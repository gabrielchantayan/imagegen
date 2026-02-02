// app/api/import/route.ts
import { NextResponse } from 'next/server';
import { with_auth } from '@/lib/api-auth';
import { create_component } from '@/lib/repositories/components';
import { create_prompt } from '@/lib/repositories/prompts';
import { parse_himd } from '@/lib/parser';
import { get_db } from '@/lib/db';

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const body = await request.json();
    const { content, format, mode } = body;

    if (!content || !format) {
      return NextResponse.json(
        { error: 'content and format are required' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    let imported_components = 0;
    let imported_prompts = 0;

    // Replace mode: clear existing data
    if (mode === 'replace') {
      const db = get_db();
      db.prepare('DELETE FROM components').run();
      db.prepare('DELETE FROM saved_prompts').run();
    }

    if (format === 'json') {
      try {
        const data = JSON.parse(content);

        // Import components
        if (data.components && Array.isArray(data.components)) {
          for (const component of data.components) {
            try {
              create_component({
                category_id: component.category_id,
                name: component.name,
                description: component.description,
                data: component.data,
              });
              imported_components++;
            } catch (err) {
              errors.push(
                `Component "${component.name}": ${err instanceof Error ? err.message : 'Unknown error'}`
              );
            }
          }
        }

        // Import prompts
        if (data.prompts && Array.isArray(data.prompts)) {
          for (const prompt of data.prompts) {
            try {
              create_prompt({
                name: prompt.name,
                description: prompt.description,
                prompt_json: prompt.prompt_json,
              });
              imported_prompts++;
            } catch (err) {
              errors.push(
                `Prompt "${prompt.name}": ${err instanceof Error ? err.message : 'Unknown error'}`
              );
            }
          }
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON format' },
          { status: 400 }
        );
      }
    } else if (format === 'himd') {
      try {
        const components = parse_himd(content);

        for (const component of components) {
          try {
            create_component(component);
            imported_components++;
          } catch (err) {
            errors.push(
              `Component "${component.name}": ${err instanceof Error ? err.message : 'Unknown error'}`
            );
          }
        }
      } catch (err) {
        return NextResponse.json(
          {
            error: `Failed to parse hi.md: ${err instanceof Error ? err.message : 'Unknown error'}`,
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Use "json" or "himd"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: {
        components: imported_components,
        prompts: imported_prompts,
      },
      errors,
    });
  });
};
