/**
 * ManageSessions — R9CB TOMBSTONE
 * Sessions are managed exclusively through Event Files.
 * Route: /ManageSessions → /racecore/event-files (App.jsx Navigate)
 * This component is retained as a named export for any residual pagesConfig imports,
 * but renders nothing — the redirect fires before this component is ever mounted.
 */
import { Navigate } from 'react-router-dom';
export default function ManageSessions() {
  return <Navigate to="/racecore/event-files" replace />;
}