import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only check
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { submissionId, title, subtitle, body, author, author_title } = await req.json();

    // Fetch the submission
    const submission = await base44.entities.StorySubmission.list();
    const submissionData = submission.find(s => s.id === submissionId);

    if (!submissionData) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Create new OutletStory from submission
    const slug = (title || submissionData.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const newStory = await base44.entities.OutletStory.create({
      title: title || submissionData.title,
      slug,
      subtitle: subtitle || '',
      body: body || submissionData.pitch,
      author: author || submissionData.name,
      author_title: author_title || '',
      category: submissionData.category,
      photo_credit: '',
      cover_image: submissionData.photo_urls?.[0] || '',
      images: submissionData.photo_urls || [],
      location_city: '',
      location_state: '',
      location_country: '',
      featured: false,
      status: 'draft',
      tags: [],
    });

    // Update submission status to accepted
    await base44.entities.StorySubmission.update(submissionId, {
      status: 'accepted',
    });

    return Response.json({
      success: true,
      storyId: newStory.id,
      message: 'Submission accepted and story created as draft',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});