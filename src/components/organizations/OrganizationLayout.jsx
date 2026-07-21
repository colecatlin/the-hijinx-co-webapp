import React from 'react';
import OrganizationSidebar from '@/components/organizations/OrganizationSidebar';

/**
 * Shared shell for every organization page: header on top, then a
 * sidebar + content row. The content (active section) is passed as children.
 */
export default function OrganizationLayout({ orgType, entityId, header, children }) {
  return (
    <div className="space-y-5">
      {header}
      <div className="flex flex-col lg:flex-row gap-5">
        <OrganizationSidebar orgType={orgType} entityId={entityId} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}