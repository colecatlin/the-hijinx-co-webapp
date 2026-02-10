import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { driverId, data } = await req.json();

    // Fetch the driver to check ownership
    const driver = await base44.entities.Driver.filter({ id: driverId });
    
    if (!driver || driver.length === 0) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }

    const driverRecord = driver[0];

    // Check if user owns this driver or is an admin
    if (driverRecord.owner_user_id !== user.id && user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: You do not have permission to edit this driver' },
        { status: 403 }
      );
    }

    // Update the driver
    const updatedDriver = await base44.entities.Driver.update(driverId, data);

    return Response.json({ success: true, driver: updatedDriver });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});