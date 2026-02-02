import { NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import {
  get_generation_stats,
  get_popular_components,
  get_daily_generations,
  get_queue_stats,
} from "@/lib/repositories/stats";

export const GET = async () => {
  return with_auth(async () => {
    const stats = {
      generations: get_generation_stats(),
      popular_components: get_popular_components(10),
      daily_generations: get_daily_generations(30),
      queue: get_queue_stats(),
    };

    return NextResponse.json(stats);
  });
};
