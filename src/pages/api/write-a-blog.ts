import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();

  const title = formData.get('title')?.toString() || '';
  const content = formData.get('content')?.toString() || '';
  const email = formData.get('email')?.toString() || '';
  const name = formData.get('name')?.toString() || '';
  const tags = formData.getAll('tags') || [];

  if (!title || !content || !email || !name) {
    return new Response('Missing required fields', { status: 400 });
  }

  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  // Step 1: Get author ID
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

  const tagConnections = tags.map((tag) => ({ slug: tag }));

  // Step 2: Create post
  const createPost = await fetch(import.meta.env.HYGRAPH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
    },
    body: JSON.stringify({
      query: `
        mutation CreatePost($title: String!, $content: String!, $slug: String!, $tag: [TagWhereUniqueInput!], $authorId: ID!) {
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
      variables: { title, content, slug, tag: tagConnections, authorId },
    }),
  });

  const createJson = await createPost.json();
  if (!createJson?.data?.createPost?.id) {
    console.error('Failed to create post:', createJson);
    return new Response('Failed to create post', { status: 500 });
  }

  // Step 3: Publish author and tags
  await fetch(import.meta.env.HYGRAPH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
    },
    body: JSON.stringify({
      query: `
        mutation PublishRelated($authorId: ID!, $tags: [TagWhereUniqueInput!]) {
          publishAuthor(where: { id: $authorId }) {
            id
          }
          publishManyTags(where: { OR: $tags }) {
            count
          }
        }
      `,
      variables: {
        authorId,
        tags: tagConnections,
      },
    }),
  });

  // Step 4: Publish post
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

  return redirect(`/blogs/${slug}`);
};