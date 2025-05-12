import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { slug, title, content, tags } = await request.json();

    if (!slug || !title || !content) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Find the post ID by slug
    const findPost = await fetch(import.meta.env.HYGRAPH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
        variables: { slug },
      }),
    });

    const postData = await findPost.json();
    const postId = postData?.data?.post?.id;

    if (!postId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Post not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Update the post
    const updatePost = await fetch(import.meta.env.HYGRAPH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
      },
      body: JSON.stringify({
        query: `
          mutation UpdatePost($id: ID!, $title: String!, $content: String!, $tags: [TagWhereUniqueInput!]) {
            updatePost(
              where: { id: $id }
              data: {
                title: $title
                content: $content
                tags: { connect: $tags }
              }
            ) {
              id
              title
              slug
            }
          }
        `,
        variables: {
          id: postId,
          title,
          content,
          tags: tags?.map((tag: string) => ({ slug: tag })) || [],
        },
      }),
    });

    const updateData = await updatePost.json();
    if (!updateData?.data?.updatePost?.id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to update post' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Publish the updated post
    const publishPost = await fetch(import.meta.env.HYGRAPH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
      },
      body: JSON.stringify({
        query: `
          mutation PublishPost($id: ID!) {
            publishPost(where: { id: $id }) {
              id
            }
          }
        `,
        variables: { id: postId },
      }),
    });

    const publishData = await publishPost.json();
    if (!publishData?.data?.publishPost?.id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to publish post' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Post updated successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in edit API route:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};