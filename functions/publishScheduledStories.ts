import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all scheduled stories
    const scheduledStories = await base44.asServiceRole.entities.OutletStory.filter({
      status: 'scheduled'
    });

    const now = new Date();
    const published = [];
    const errors = [];

    for (const story of scheduledStories) {
      try {
        const scheduledDate = new Date(story.scheduled_publish_date);
        
        // If scheduled time has passed, publish it
        if (scheduledDate <= now) {
          await base44.asServiceRole.entities.OutletStory.update(story.id, {
            status: 'published',
            published_date: new Date().toISOString(),
            scheduled_publish_date: null
          });
          published.push({ id: story.id, title: story.title });
        }
      } catch (error) {
        errors.push({ id: story.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      published: published.length,
      publishedStories: published,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});