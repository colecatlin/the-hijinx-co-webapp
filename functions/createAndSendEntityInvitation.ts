import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, entity_type, entity_id, entity_name, access_code, role = 'editor', expiration_days = 30 } = await req.json();

    if (!email || !entity_type || !entity_id || !entity_name || !access_code) {
      return Response.json({ error: 'Missing required fields: email, entity_type, entity_id, entity_name, access_code' }, { status: 400 });
    }

    // Generate unique 8-digit invitation code
    const code = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');

    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expiration_days);

    // Create invitation record
    const invitation = await base44.asServiceRole.entities.Invitation.create({
      email,
      code,
      entity_type,
      entity_id,
      entity_name,
      expiration_date: expirationDate.toISOString(),
      status: 'pending',
      invited_by: user.email,
    });

    // Create EntityCollaborator record with access_code
    await base44.asServiceRole.entities.EntityCollaborator.create({
      user_id: user.id,
      user_email: email,
      entity_type,
      entity_id,
      entity_name,
      access_code,
      role,
    });

    // Send invitation email via Gmail
    const gmailToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    const subject = `Invitation to manage ${entity_name}`;
    const formattedExpiration = expirationDate.toLocaleDateString();

    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>You're invited to manage ${entity_name}</h2>
          <p>Hello,</p>
          <p>You've been invited to manage <strong>${entity_name}</strong> (${entity_type}) on our platform.</p>
          <p style="margin-top: 20px; padding: 16px; background-color: #f5f5f5; border-left: 4px solid #232323; border-radius: 4px;">
            <strong>Your invitation code:</strong><br>
            <span style="font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px; color: #232323;">${code}</span>
          </p>
          <p>Enter this code in the "Code Input" tab on your profile to gain access to manage this entity.</p>
          <p style="color: #666; font-size: 14px;">This invitation expires on ${formattedExpiration}.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
          <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </body>
      </html>
    `;

    const message = `To: ${email}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${htmlBody}`;
    const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const emailResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gmailToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      console.error('Email send failed:', error);
      return Response.json({ error: 'Failed to send invitation email', details: error }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email,
        code,
        expiresAt: expirationDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});