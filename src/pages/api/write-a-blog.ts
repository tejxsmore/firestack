import type { APIRoute } from 'astro';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();

    const title = formData.get('title')?.toString() || '';
    const content = formData.get('content')?.toString() || '';
    const email = formData.get('email')?.toString() || '';
    const name = formData.get('name')?.toString() || '';
    const tagInput = formData.get('tags')?.toString() || '';
    const tags = tagInput ? tagInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    if (!title || !content || !email || !name) {
      return new Response('Missing required fields', { status: 400 });
    }

    const slug = slugify(title);

    // Step 1: Get Author ID
    const authorQuery = await fetch(import.meta.env.HYGRAPH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
      },
      body: JSON.stringify({
        query: `
          query GetAuthorByEmail($email: String!) {
            author(where: { email: $email }) {
              id
            }
          }
        `,
        variables: { email },
      }),
    });

    const authorJson = await authorQuery.json();
    const authorId = authorJson?.data?.author?.id;
    if (!authorId) return new Response('Author not found', { status: 404 });

    // Step 2: Handle Tags
    let resolvedTagSlugs: string[] = [];

    if (tags.length > 0) {
      // 2.1 Fetch existing tags
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

      const newTags = tags.filter(tag =>
        !existingTags.some((existing : any) => existing.name.toLowerCase() === tag.toLowerCase())
      );

      // 2.2 Create and publish new tags
      for (const name of newTags) {
        const tagSlug = slugify(name);

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
            variables: { name, slug: tagSlug },
          }),
        });

        const createData = await createTagRes.json();
        const createdSlug = createData?.data?.createTag?.slug;

        if (createdSlug) {
          // Wait a moment before publishing
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Publish the tag
          const publishRes = await fetch(import.meta.env.HYGRAPH_API, {
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

          const publishData = await publishRes.json();
          const publishedSlug = publishData?.data?.publishTag?.slug;

          if (publishedSlug) {
            resolvedTagSlugs.push(publishedSlug);
          } else {
            console.error("Failed to publish tag:", tagSlug);
          }
        } else {
          console.error("Failed to create tag:", name);
        }
      }
    }

    // Step 3: Create the Post with Tag Connections
    const tagConnections = resolvedTagSlugs.map(slug => ({ slug }));

    const createPostRes = await fetch(import.meta.env.HYGRAPH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
      },
      body: JSON.stringify({
        query: `
          mutation CreatePost(
            $title: String!, 
            $content: String!, 
            $slug: String!, 
            $tag: [TagWhereUniqueInput!], 
            $authorId: ID!
          ) {
            createPost(data: {
              title: $title,
              content: $content,
              slug: $slug,
              date: "${new Date().toISOString()}",
              author: { connect: { id: $authorId } },
              tag: { connect: $tag }
            }) {
              id
            }
          }
        `,
        variables: {
          title,
          content,
          slug,
          tag: tagConnections,
          authorId,
        },
      }),
    });

    const createJson = await createPostRes.json();
    const postId = createJson?.data?.createPost?.id;

    if (!postId) {
      console.error('Failed to create post:', createJson);
      return new Response('Failed to create post', { status: 500 });
    }

    // Step 4: Publish the Post
    await fetch(import.meta.env.HYGRAPH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
      },
      body: JSON.stringify({
        query: `
          mutation PublishPost($slug: String!) {
            publishPost(where: { slug: $slug }) {
              id
              publishedAt
            }
          }
        `,
        variables: { slug },
      }),
    });

    return redirect(`/`);
  } catch (error) {
    console.error('Error in write-a-blog API route:', error);
    return new Response(
      `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
      { status: 500 }
    );
  }
};