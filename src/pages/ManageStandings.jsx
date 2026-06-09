/**
 * ManageStandings — R9CB TOMBSTONE
 * Standings are managed exclusively through RaceCore Standings.
 * Route: /ManageStandings → /racecore/standings (App.jsx Navigate)
 * This component is retained as a named export for any residual pagesConfig imports,
 * but renders nothing — the redirect fires before this component is ever mounted.
 */
import { Navigate } from 'react-router-dom';
export default function ManageStandings() {
  return <Navigate to="/racecore/standings" replace />;
}