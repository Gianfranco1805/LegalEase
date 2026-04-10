import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side Supabase client for use in API routes and Server Components.
 * Uses the service role key — never call this client-side.
 * Throws if the caller is not authenticated.
 */
export async function createServerClient() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthenticated: no active Clerk session");
  }

  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  return { client, userId };
}

/**
 * Helper to return a JSON error response from an API route.
 */
export function apiError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
