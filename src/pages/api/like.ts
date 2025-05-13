import type { APIRoute } from "astro";
import { getSupabase } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, locals }) => {
  const user = await locals.currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { slug, title, action } = await request.json();
  if (!slug) return new Response("Bad Request", { status: 400 });

  const supabase = getSupabase();

  if (action === "status") {
    // Return like status + count
    const { data: userLike } = await supabase
      .from("liked")
      .select("*")
      .eq("userid", user.id)
      .eq("slug", slug)
      .single();

    const { count } = await supabase
      .from("liked")
      .select("*", { count: "exact", head: true })
      .eq("slug", slug);

    return new Response(
      JSON.stringify({ liked: !!userLike, likeCount: count }),
      { status: 200 }
    );
  }

  if (action === "toggle") {
    // Toggle like
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
  }

  return new Response("Invalid action", { status: 400 });
};