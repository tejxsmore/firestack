import type { APIRoute } from "astro";
import { getSupabase } from "../../lib/supabase";

const supabase = getSupabase()

// Utility to slugify titles and tag names
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { slug: oldSlug, title, content, tags, authorId } = await request.json();

    // Validate required fields
    if (!oldSlug || !title || !content || !authorId) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate new slug
    const newSlug = slugify(title);

    // Step 1: Get post ID by old slug
    const findPostRes = await fetch(import.meta.env.HYGRAPH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
      },
      body: JSON.stringify({
        query: `
          query GetPostBySlug($slug: String!) {
            post(where: { slug: $slug }) {
              id
            }
          }
        `,
        variables: { slug: oldSlug },
      }),
    });

    const findPostData = await findPostRes.json();
    const postId = findPostData?.data?.post?.id;

    if (!postId) {
      return new Response(
        JSON.stringify({ success: false, message: "Post not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 2: Resolve tag slugs, and create tags if necessary
    let resolvedTagSlugs: string[] = [];
    if (Array.isArray(tags) && tags.length > 0) {
      const existingTagsQuery = `
        query GetTagsByNames($names: [String!]) {
          tags(where: { name_in: $names }) {
            slug
          }
        }
      `;

      try {
        // Fetch existing tags by name
        const tagRes = await fetch(import.meta.env.HYGRAPH_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
          },
          body: JSON.stringify({
            query: existingTagsQuery,
            variables: { names: tags },
          }),
        });

        const tagData = await tagRes.json();
        if (tagRes.ok && tagData?.data?.tags) {
          const existingTags = tagData.data.tags ?? [];
          resolvedTagSlugs = existingTags.map((tag: { slug: string }) => tag.slug);
        } else {
          throw new Error('Failed to fetch existing tags');
        }

        // Find tags that need to be created
        const newTags = tags.filter((tag: string) => !resolvedTagSlugs.includes(slugify(tag)));

        // If there are new tags, create them
        if (newTags.length > 0) {
          const createTagsMutation = `
            mutation CreateTags($names: [String!]) {
              createTags(data: $names) {
                slug
              }
            }
          `;

          const createTagsRes = await fetch(import.meta.env.HYGRAPH_API, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
            },
            body: JSON.stringify({
              query: createTagsMutation,
              variables: { names: newTags },
            }),
          });

          const createdTagsData = await createTagsRes.json();
          if (createTagsRes.ok && createdTagsData?.data?.createTags) {
            const createdTags = createdTagsData.data.createTags ?? [];
            resolvedTagSlugs = [
              ...resolvedTagSlugs,
              ...createdTags.map((tag: { slug: string }) => tag.slug),
            ];
          } else {
            throw new Error('Failed to create new tags');
          }
        }
      } catch (error) {
        console.error('Error resolving tags:', error);
        // Handle error, maybe notify user
      }
    }

    // Step 3: Construct GraphQL mutation
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedContent = content
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");

    const tagConnections = resolvedTagSlugs.length
      ? `tag: { connect: [${resolvedTagSlugs.map(slug => `{ where: { slug: "${slug}" } }`).join(",\n")}] },`
      : "";

    const mutation = `
      mutation UpdatePost {
        updatePost(
          where: { id: "${postId}" }
          data: {
            title: "${escapedTitle}",
            slug: "${newSlug}",
            content: "${escapedContent}",
            ${tagConnections}
            author: { connect: { id: "${authorId}" } }
          }
        ) {
          id
          slug
        }

        publishPost(where: { id: "${postId}" }) {
          id
        }
      }
    `;

    // Step 4: Send update mutation
    const updateRes = await fetch(import.meta.env.HYGRAPH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
      },
      body: JSON.stringify({ query: mutation }),
    });

    const updateData = await updateRes.json();

    if (updateData.errors) {
      console.error("GraphCMS update error:", updateData.errors);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to update post",
          errors: updateData.errors,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 5: Update Supabase references if slug changed
    if (newSlug !== oldSlug) {
      try {
        await supabase.from("saved").update({ slug: newSlug, title: title }).eq("slug", oldSlug);
        await supabase.from("liked").update({ slug: newSlug, title: title }).eq("slug", oldSlug);
        
      } catch (error) {
        console.error("Supabase update error:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Post updated successfully",
        newSlug,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edit API route error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};