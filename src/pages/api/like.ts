// src/pages/api/bookmark.ts
import type { APIRoute } from "astro";
import { getSupabase } from "../../lib/supabase";

export const GET: APIRoute = async ({ request, locals }) => {
  const user = await locals.currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) return new Response("Bad Request", { status: 400 });

  const supabase = getSupabase();
  const { data } = await supabase
    .from("liked")
    .select("*")
    .eq("userid", user.id)
    .eq("slug", slug)
    .single();

  return new Response(JSON.stringify({ liked: !!data }), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = await locals.currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { slug, title } = await request.json();
  if (!slug || !title) return new Response("Bad Request", { status: 400 });

  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("liked")
    .select("*")
    .eq("userid", user.id)
    .eq("slug", slug)
    .single();

  if (existing) {
    await supabase.from("liked").delete().eq("id", existing.id!);
    return new Response(JSON.stringify({ liked: false }), { status: 200 });
  }

  const { error } = await supabase.from("liked").insert([
    { userid: user.id, slug, title },
  ]);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify({ liked: true }), { status: 201 });
};