import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { story_id } = await req.json();

        if (!story_id) {
            return Response.json({ error: 'story_id is required' }, { status: 400 });
        }

        // Get the story
        const stories = await base44.asServiceRole.entities.OutletStory.filter({ id: story_id });
        const story = stories[0];

        if (!story) {
            return Response.json({ error: 'Story not found' }, { status: 404 });
        }

        // Get LinkedIn access token
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('linkedin');

        // Get LinkedIn user profile (to get the person URN)
        const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const profile = await profileRes.json();
        const personUrn = `urn:li:person:${profile.sub}`;

        // Build the post text
        const postText = `${story.title}${story.subtitle ? '\n\n' + story.subtitle : ''}${story.cover_image ? '' : ''}\n\nRead more on The Outlet.`;

        // Build the share content
        const shareBody = {
            author: personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text: postText },
                    shareMediaCategory: story.cover_image ? 'ARTICLE' : 'NONE',
                    ...(story.cover_image && {
                        media: [{
                            status: 'READY',
                            description: { text: story.subtitle || story.title },
                            originalUrl: story.cover_image,
                            title: { text: story.title }
                        }]
                    })
                }
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
            }
        };

        const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            body: JSON.stringify(shareBody)
        });

        if (!postRes.ok) {
            const err = await postRes.text();
            return Response.json({ error: 'LinkedIn API error', details: err }, { status: 500 });
        }

        const result = await postRes.json();
        return Response.json({ success: true, linkedin_post_id: result.id });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});