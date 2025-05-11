import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();

  const name = formData.get('name')?.toString() || '';
  const email = formData.get('email')?.toString() || '';
  const title = formData.get('title')?.toString() || '';
  const bio = formData.get('bio')?.toString() || '';
  const slug = formData.get('slug')?.toString() || '';

  if (!name || !email || !title || !bio || !slug) {
    return new Response('Missing required fields', { status: 400 });
  }

  const mutation = `
    mutation CreateAndPublishAuthor($name: String!, $email: String!, $title: String!, $slug: String!, $bio: String!) {
      createAuthor(data: {
        name: $name,
        email: $email,
        title: $title,
        slug: $slug,
        bio: $bio
      }) {
        id
        publishedAt
      }
      publishAuthor(where: { slug: $slug }) {
        id
        publishedAt
      }
    }
  `;

  const variables = { name, email, title, slug, bio };

  const response = await fetch(import.meta.env.HYGRAPH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    console.error('Hygraph Error:', result.errors);
    console.log('Failed to register and publish author', { status: 500 })
    return redirect('/');
  }

  return redirect('/user/write-a-blog');
};