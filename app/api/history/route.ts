import { with_auth } from "@/lib/api-auth";
import { json_response } from "@/lib/api-helpers";
import { list_generations_with_favorites } from "@/lib/repositories/generations";

export const GET = async (request: Request) => {
  return with_auth(async () => {
    const { searchParams } = new URL(request.url);

    // Parse tags from comma-separated string
    const tags_param = searchParams.get("tags");
    const tags = tags_param ? tags_param.split(",").filter(Boolean) : undefined;

    // Parse sort option
    const sort_param = searchParams.get("sort");
    const sort = sort_param === "oldest" ? "oldest" : "newest";

    const result = list_generations_with_favorites({
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "24"),
      favorites_only: searchParams.get("favorites") === "true",
      search: searchParams.get("search") || undefined,
      tags,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
      sort,
    });

    return json_response(result);
  });
};
