import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import EventProfile from '@/pages/EventProfile';

/**
 * EventProfileRouteWrapper
 * Phase 13 — Canonical /events/:slug route wrapper.
 * Extracts the slug from the path param and passes it to EventProfile
 * which handles both path-param slugs and legacy ?id= / ?slug= query params.
 */
export default function EventProfileRouteWrapper() {
  const { slug } = useParams();
  if (!slug) return <Navigate to="/Directory?cat=events" replace />;
  return <EventProfile routeSlug={slug} />;
}