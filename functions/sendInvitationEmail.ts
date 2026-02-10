import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, code, entityType, entityName, signupUrl } = await req.json();

    if (!to || !code || !entityType || !entityName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const gmailToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    const subject = `You're invited to join ${entityName}`;
    const inviteLink = `${signupUrl}?code=${code}`;
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>You're invited!</h2>
          <p>You've been invited to join <strong>${entityName}</strong> as a ${entityType}.</p>
          <p>Click the link below to sign up and join:</p>
          <p><a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #232323; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
          <p>Or copy this code: <strong>${code}</strong></p>
          <p>This invitation is valid for 30 days.</p>
        </body>
      </html>
    `;

    const message = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${htmlBody}`;
    const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gmailToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return Response.json({ error: 'Failed to send email', details: error }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Invitation email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});