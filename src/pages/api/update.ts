import type { APIRoute } from "astro";
import { getSupabase } from "../../lib/supabase";

const supabase = getSupabase();

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

    if (!oldSlug || !title || !content || !authorId) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const newSlug = slugify(title);

    // Step 1: Get post ID and current tags
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
              tag {
                slug
              }
            }
          }
        `,
        variables: { slug: oldSlug },
      }),
    });

    const findPostData = await findPostRes.json();
    const post = findPostData?.data?.post;

    if (!post?.id) {
      return new Response(
        JSON.stringify({ success: false, message: "Post not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const postId = post.id;
    const existingTagSlugs = post.tag?.map((tag: { slug: string }) => tag.slug) || [];

    // Step 2: Resolve and/or create new tags
    let resolvedTagSlugs: string[] = [];
    const inputTagSlugs = Array.isArray(tags) ? tags.map(slugify) : [];

    if (inputTagSlugs.length > 0) {
      // Fetch existing tags
      const tagRes = await fetch(import.meta.env.HYGRAPH_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
        },
        body: JSON.stringify({
          query: `
            query GetTagsByNames($names: [String!]) {
              tags(where: { name_in: $names }) {
                slug
                name
              }
            }
          `,
          variables: { names: tags },
        }),
      });

      const tagData = await tagRes.json();
      const existingTags = tagData?.data?.tags ?? [];
      resolvedTagSlugs = existingTags.map((tag: { slug: string }) => tag.slug);

      // Create new tags if needed
      const newTags = tags.filter((tag: string) => !resolvedTagSlugs.includes(slugify(tag)));

      for (const name of newTags) {
        const slug = slugify(name);

        // Create tag
        const createTagRes = await fetch(import.meta.env.HYGRAPH_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
          },
          body: JSON.stringify({
            query: `
              mutation CreateTag($name: String!, $slug: String!) {
                createTag(data: { name: $name, slug: $slug }) {
                  slug
                }
              }
            `,
            variables: { name, slug },
          }),
        });

        const createData = await createTagRes.json();
        const createdSlug = createData?.data?.createTag?.slug;

        if (createdSlug) {
          // Publish the tag
          await fetch(import.meta.env.HYGRAPH_API, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
            },
            body: JSON.stringify({
              query: `
                mutation PublishTag($slug: String!) {
                  publishTag(where: { slug: $slug }) {
                    slug
                  }
                }
              `,
              variables: { slug: createdSlug },
            }),
          });

          // Add a small delay to ensure the tag is ready
          await new Promise((resolve) => setTimeout(resolve, 300));
          resolvedTagSlugs.push(createdSlug);
        } else {
          console.error("Failed to create tag:", name);
        }
      }
    }

    // Step 3: Prepare tag connections
    const tagsToConnect = resolvedTagSlugs.filter(slug => !existingTagSlugs.includes(slug));
    const tagsToDisconnect = existingTagSlugs.filter((slug: string) => !resolvedTagSlugs.includes(slug));

    const tagConnections = `
      tag: {
        ${tagsToConnect.length ? `connect: [${tagsToConnect.map(slug => `{ where: { slug: "${slug}" } }`).join(", ")}],` : ""}
        ${tagsToDisconnect.length ? `disconnect: [${tagsToDisconnect.map((slug: string) => `{ slug: "${slug}" }`).join(", ")}],` : ""}
      },
    `;

    // Step 4: Update the post
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedContent = content
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");

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
        await supabase.from("saved").update({ slug: newSlug, title }).eq("slug", oldSlug);
        await supabase.from("liked").update({ slug: newSlug, title }).eq("slug", oldSlug);
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