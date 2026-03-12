import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DATA_MAP = {
  entity_categories: {
    source_entities: {
      description: "Entities that define core motorsports identity.",
      entities: ['Driver', 'Team', 'Track', 'Series', 'Event', 'Session']
    },
    operational_entities: {
      description: "Entities that represent race activity and results.",
      entities: ['Entry', 'Results', 'Standings', 'SeriesClass', 'EventClass']
    },
    access_system: {
      description: "Entities that control user permissions and access.",
      entities: ['User', 'EntityCollaborator', 'Invitation', 'Entity']
    },
    import_system: {
      description: "Systems that feed source and operational entities.",
      entities: ['CSV Imports', 'API Imports', 'Schedule Imports', 'Calendar Imports', 'Web Crawler Imports']
    },
    system_entities: {
      description: "Entities that support platform infrastructure and diagnostics.",
      entities: ['OperationLog', 'Diagnostics Functions', 'System Verification Functions']
    }
  },
  entity_relationships: {
    Driver: ['Belongs to one Team', 'Competes in multiple Series', 'Participates in multiple Events', 'Appears in Results, Standings, and Entries'],
    Team: ['Contains multiple Drivers', 'Participates in multiple Series and Events'],
    Track: ['Hosts multiple Events'],
    Series: ['Owns multiple Events', 'Owns multiple SeriesClasses'],
    Event: ['Belongs to one Series', 'Held at one Track', 'Contains multiple Sessions and Entries', 'Produces Results'],
    Session: ['Belongs to one Event', 'Produces Results for a specific class or group'],
    SeriesClass: ['Belongs to one Series', 'Defines a category of competition within a series'],
    EventClass: ['Belongs to one Event', 'Represents a SeriesClass for a specific event'],
    Entry: ['Links a Driver to an Event and an EventClass'],
    Results: ['Links a Driver to a Session, recording their performance'],
    Standings: ['Aggregates Results for a Driver within a Series/SeriesClass over a season']
  },
  access_relationships: {
    User: ['The primary identity for any person interacting with the platform.', 'Can be granted access to manage entities via an EntityCollaborator record.'],
    EntityCollaborator: ['Links a User to a specific Driver, Team, Series, Track, or Event.', 'Defines the user\'s role as either \'owner\' or \'editor\'.'],
    Invitation: ['A mechanism to grant a User a role on an entity, which creates an EntityCollaborator record upon acceptance.'],
    Entity: ['A central registry that provides a unified way to manage access and relationships across different entity types.'],
    PrimaryEntityContext: ['A setting on the User record that defines the primary focus of their dashboard (e.g., their driver profile or their home track).']
  },
  import_flows: {
    source_ingestion: [
      { source: "API Imports", targets: ["Driver", "Team", "Series", "Track", "Event"], description: "Primary method for creating and updating canonical source records from external partners." },
      { source: "Schedule Imports", targets: ["Event", "Track", "Series"], description: "Ingests race schedules from sanctioning bodies or large series." },
      { source: "CSV Imports", targets: ["Driver"], description: "Bulk import of drivers, typically used for onboarding a new series." }
    ],
    operational_ingestion: [
      { source: "CSV Imports", targets: ["Results", "Entry", "Standings"], description: "Standard for receiving race-day data from timing & scoring systems." },
    ],
    detailed_operational_flow: [
      { name: "Results Import", flow: "Creates Results records, linking them to existing Driver, Event, and Session entities." },
      { name: "Entry Import", flow: "Creates Entry records, linking Drivers to an Event and EventClass." },
      { name: "Standings Import", flow: "Creates or updates Standings records, linking them to a Driver and Series/SeriesClass for a season." }
    ]
  },
  page_dependencies: {
    Homepage: ["Driver", "Series", "Event", "Track"],
    Profile: ["User", "EntityCollaborator", "Invitation"],
    MyDashboard: ["EntityCollaborator", "Driver", "Series", "Track", "Event"],
    RegistrationDashboard: ["Event", "Entry", "Driver", "SeriesClass", "EventClass"],
    DriverProfile: ["Driver", "Results", "Standings", "Entry"],
    EventProfile: ["Event", "Session", "Entry", "Results"],
    Management: ["Full access to all source and operational entities."],
    Diagnostics: ["OperationLog", "System Verification Functions"]
  },
  data_flows: {
    source_ingestion: "Source data is ingested, normalized, resolved against canonical entities, and then used to create or update source entity records. This ensures a single source of truth.",
    operational_ingestion: "Operational data (like race results) is ingested, its references to source entities (like drivers and events) are resolved, and then the operational records are created.",
    access_lifecycle: "Users gain access via an invitation or an access code. Accepting creates an EntityCollaborator record, which updates their dashboard context and grants permissions.",
    diagnostics: "System verification functions run against the OperationLog and other system data to produce health reports, ensuring data integrity and system stability."
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // In a real scenario, you might check for user auth here
    // const user = await base44.auth.me();
    // if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    return new Response(JSON.stringify(DATA_MAP), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});