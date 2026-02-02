// app/api/export/route.ts
import { NextResponse } from 'next/server';
import { with_auth } from '@/lib/api-auth';
import {
  get_all_components,
  get_components_by_category,
  get_categories,
} from '@/lib/repositories/components';
import { list_prompts } from '@/lib/repositories/prompts';

export const GET = async (request: Request) => {
  return with_auth(async () => {
    const { searchParams } = new URL(request.url);
    const include_components = searchParams.get('components') !== 'false';
    const include_prompts = searchParams.get('prompts') !== 'false';
    const category_filter = searchParams.get('category');

    const export_data: Record<string, unknown> = {
      version: '1.0',
      exported_at: new Date().toISOString(),
    };

    if (include_components) {
      export_data.components = category_filter
        ? get_components_by_category(category_filter)
        : get_all_components();
      export_data.categories = get_categories();
    }

    if (include_prompts) {
      export_data.prompts = list_prompts();
    }

    const response = NextResponse.json(export_data);

    // Set download headers
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="prompt-builder-export-${Date.now()}.json"`
    );

    return response;
  });
};
