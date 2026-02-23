import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CATEGORY_MAP = {
  Racing: ['Race Reports', 'Results', 'Standings', 'Championship Watch', 'Track Profiles'],
  Business: ['Sponsorship', 'Industry', 'Deals', 'Ownership', 'Expansion'],
  Culture: ['Grassroots', 'Legacy', 'Fan Experience', 'Opinion', 'Letters'],
  Tech: ['Engineering', 'Data', 'Setup', 'Safety', 'Rules'],
  Media: ['Photo Essays', 'Film Room', 'Behind The Lens', 'Broadcast', 'Creator Spotlight'],
  Marketplace: ['Classifieds', 'Rent A Ride', 'Auctions', 'Gear', 'Builds'],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all stories
    const stories = await base44.asServiceRole.entities.OutletStory.list('-created_date', 200);

    const results = { updated: 0, skipped: 0, errors: [] };

    for (const story of stories) {
      // Strip HTML tags from body
      const bodyText = (story.body || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const snippet = bodyText.slice(0, 1500);

      const prompt = `You are a content categorizer for a motorsports and culture media brand called Hijinx.

Given the article title and body, assign the MOST appropriate primary_category and sub_category from the lists below.

Primary categories and their sub-categories:
- Racing: Race Reports, Results, Standings, Championship Watch, Track Profiles
- Business: Sponsorship, Industry, Deals, Ownership, Expansion
- Culture: Grassroots, Legacy, Fan Experience, Opinion, Letters
- Tech: Engineering, Data, Setup, Safety, Rules
- Media: Photo Essays, Film Room, Behind The Lens, Broadcast, Creator Spotlight
- Marketplace: Classifieds, Rent A Ride, Auctions, Gear, Builds

Article Title: "${story.title}"
Article Body (excerpt): "${snippet}"

Respond with ONLY a JSON object like: {"primary_category": "Culture", "sub_category": "Opinion"}
Choose the sub_category ONLY from the list under the chosen primary_category.`;

      try {
        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              primary_category: { type: 'string' },
              sub_category: { type: 'string' },
            },
            required: ['primary_category', 'sub_category'],
          },
        });

        const { primary_category, sub_category } = llmResult;

        // Validate the returned values are in our allowed lists
        const validSubCategories = CATEGORY_MAP[primary_category] || [];
        if (!CATEGORY_MAP[primary_category] || !validSubCategories.includes(sub_category)) {
          results.errors.push({ id: story.id, title: story.title, reason: `Invalid category: ${primary_category} / ${sub_category}` });
          results.skipped++;
          continue;
        }

        await base44.asServiceRole.entities.OutletStory.update(story.id, {
          primary_category,
          sub_category,
        });

        results.updated++;
      } catch (err) {
        results.errors.push({ id: story.id, title: story.title, reason: err.message });
        results.skipped++;
      }
    }

    return Response.json({ success: true, total: stories.length, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});