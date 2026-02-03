import { with_auth } from '@/lib/api-auth';
import { json_response, error_response, not_found, success_response } from '@/lib/api-helpers';
import { get_component, update_component, delete_component } from '@/lib/repositories/components';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const GET = async (
  _request: Request,
  { params }: RouteParams
) => {
  return with_auth(async () => {
    const { id } = await params;
    const component = get_component(id);

    if (!component) {
      return not_found('Component', id);
    }

    return json_response(component);
  });
};

export const PUT = async (
  request: Request,
  { params }: RouteParams
) => {
  return with_auth(async () => {
    const { id } = await params;
    const body = await request.json();

    // Validate data if provided
    if (body.data !== undefined) {
      if (typeof body.data !== 'object' || Array.isArray(body.data)) {
        return error_response('data must be a JSON object');
      }
    }

    const component = update_component(id, {
      name: body.name,
      description: body.description,
      data: body.data,
    });

    if (!component) {
      return not_found('Component', id);
    }

    return json_response(component);
  });
};

export const DELETE = async (
  _request: Request,
  { params }: RouteParams
) => {
  return with_auth(async () => {
    const { id } = await params;
    const deleted = delete_component(id);

    if (!deleted) {
      return not_found('Component', id);
    }

    return success_response();
  });
};
