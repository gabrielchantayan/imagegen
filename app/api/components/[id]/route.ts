import { NextResponse } from 'next/server';
import { with_auth } from '@/lib/api-auth';
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
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(component);
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
        return NextResponse.json(
          { error: 'data must be a JSON object' },
          { status: 400 }
        );
      }
    }

    const component = update_component(id, {
      name: body.name,
      description: body.description,
      data: body.data,
    });

    if (!component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(component);
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
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  });
};
