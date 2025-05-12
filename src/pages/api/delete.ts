import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const slug = data.slug;
    
    if (!slug) {
      return new Response(
        JSON.stringify({ success: false, message: 'Post slug is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Find post ID by slug
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

    // Step 2: Unpublish the post first
    const unpublishPost = await fetch(import.meta.env.HYGRAPH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
      },
      body: JSON.stringify({
        query: `
          mutation UnpublishPost($id: ID!) {
            unpublishPost(where: { id: $id }) {
              id
            }
          }
        `,
        variables: { id: postId },
      }),
    });

    const unpublishData = await unpublishPost.json();
    if (!unpublishData?.data?.unpublishPost?.id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to unpublish post' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Delete the post
    const deletePost = await fetch(import.meta.env.HYGRAPH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.HYGRAPH_MUTATION_TOKEN}`,
      },
      body: JSON.stringify({
        query: `
          mutation DeletePost($id: ID!) {
            deletePost(where: { id: $id }) {
              id
            }
          }
        `,
        variables: { id: postId },
      }),
    });

    const deleteData = await deletePost.json();
    if (!deleteData?.data?.deletePost?.id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to delete post' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Also delete any saved and liked references in Supabase
    try {
      const supabase = (await import('../../lib/supabase')).getSupabase();
      
      // Delete from saved
      await supabase
        .from('saved')
        .delete()
        .eq('slug', slug);
      
      // Delete from liked
      await supabase
        .from('liked')
        .delete()
        .eq('slug', slug);
    } catch (error) {
      console.error('Error cleaning up Supabase references:', error);
      // Continue regardless of Supabase errors since the post was deleted from the CMS
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Post deleted successfully' }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in delete API route:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};