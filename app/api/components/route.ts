import { with_auth } from '@/lib/api-auth';
import { json_response, error_response } from '@/lib/api-helpers';
import {
  get_all_components,
  get_components_by_category,
  search_components,
  get_categories,
  create_component
} from '@/lib/repositories/components';

export const GET = async (request: Request) => {
  return with_auth(async () => {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let components;
    if (search) {
      components = search_components(search, category ?? undefined);
    } else if (category) {
      components = get_components_by_category(category);
    } else {
      components = get_all_components();
    }

    const categories = get_categories();

    return json_response({ components, categories });
  });
};

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const body = await request.json();

    // Validate required fields
    if (!body.category_id || !body.name || !body.data) {
      return error_response('category_id, name, and data are required');
    }

    // Validate data is an object
    if (typeof body.data !== 'object' || Array.isArray(body.data)) {
      return error_response('data must be a JSON object');
    }

    const component = create_component({
      category_id: body.category_id,
      name: body.name,
      description: body.description,
      data: body.data,
    });

    return json_response(component, 201);
  });
};
