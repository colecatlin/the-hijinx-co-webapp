import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail } from 'lucide-react';

const DISMISS_KEY_PREFIX = 'hijinx_popup_dismissed_';

export default function SitePopupOverlay() {
  const queryClient = useQueryClient();
  const [activePopup, setActivePopup] = useState(null);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  // Fetch published pop-ups (5-min staleTime per platform convention)
  const { data: popups = [] } = useQuery({
    queryKey: ['activeSitePopups'],
    queryFn: () => base44.entities.SitePopup.filter({ status: 'published' }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Pick the highest-priority pop-up within its schedule window that hasn't
  // been dismissed this session.
  const candidate = useMemo(() => {
    if (!popups || popups.length === 0) return null;
    const now = new Date();
    const eligible = popups
      .filter((p) => {
        if (p.status !== 'published') return false;
        if (p.start_date && new Date(p.start_date) > now) return false;
        if (p.end_date && new Date(p.end_date) < now) return false;
        // Skip if dismissed this session
        if (typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY_PREFIX + p.id)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    return eligible[0] || null;
  }, [popups]);

  // Show the candidate after a short delay so it doesn't fight the page paint.
  useEffect(() => {
    if (!candidate) {
      setActivePopup(null);
      return;
    }
    const timer = setTimeout(() => setActivePopup(candidate), 600);
    return () => clearTimeout(timer);
  }, [candidate]);

  const subscribeMutation = useMutation({
    mutationFn: (email) =>
      base44.entities.NewsletterSubscriber.create({
        email,
        source: 'home_popup',
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      setSubscribed(true);
      queryClient.invalidateQueries({ queryKey: ['newsletterSubscribers'] });
    },
  });

  const dismiss = React.useCallback((popupId) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DISMISS_KEY_PREFIX + popupId, '1');
    }
    setActivePopup(null);
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!subscribeEmail || !activePopup) return;
    subscribeMutation.mutate(subscribeEmail);
  };

  const handleCtaClick = () => {
    if (activePopup) dismiss(activePopup.id);
  };

  return (
    <AnimatePresence>
      {activePopup && (
        <motion.div
          key="popup-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'hsl(0 0% 0% / 0.78)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={() => dismiss(activePopup.id)}
        >
          <motion.div
            key="popup-card"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl"
            style={{
              background: 'hsl(var(--surface-elevated))',
              border: '1px solid hsl(var(--divider))',
              boxShadow: '0 24px 80px hsl(0 0% 0% / 0.6), 0 0 48px hsl(var(--motion) / 0.08)',
            }}
          >
            {/* VERY VISIBLE RED EXIT BUTTON — top right */}
            <button
              onClick={() => dismiss(activePopup.id)}
              aria-label="Close pop-up"
              className="absolute top-3 right-3 z-10 flex items-center justify-center rounded-xl transition-all"
              style={{
                background: 'hsl(var(--danger))',
                color: '#FFFFFF',
                minWidth: '44px',
                minHeight: '44px',
                width: '44px',
                height: '44px',
                border: '2px solid hsl(0 0% 100% / 0.25)',
                boxShadow: '0 4px 16px hsl(0 72% 51% / 0.45), 0 0 0 1px hsl(0 0% 0% / 0.2)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(0 72% 58%)'; e.currentTarget.style.transform = 'scale(1.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(var(--danger))'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <X className="w-5 h-5" strokeWidth={3} />
            </button>

            {/* Cover image */}
            {activePopup.cover_image_url && (
              <div className="w-full h-40 overflow-hidden" style={{ borderBottom: '1px solid hsl(var(--divider))' }}>
                <img
                  src={activePopup.cover_image_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* Content */}
            <div className="px-6 pt-6 pb-6">
              <h2 className="text-xl font-bold text-foreground mb-2 pr-10" style={{ letterSpacing: '-0.01em' }}>
                {activePopup.title}
              </h2>

              {activePopup.body && (
                <p className="text-sm text-foreground-secondary leading-relaxed mb-4 whitespace-pre-line">
                  {activePopup.body}
                </p>
              )}

              {/* Subscribe form */}
              {activePopup.subscribe_enabled && !subscribed && (
                <form onSubmit={handleSubscribe} className="mb-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(var(--foreground-quiet))' }} />
                      <input
                        type="email"
                        value={subscribeEmail}
                        onChange={(e) => setSubscribeEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
                        style={{
                          background: 'hsl(var(--surface))',
                          color: 'hsl(var(--foreground))',
                          border: '1px solid hsl(var(--divider))',
                          caretColor: 'hsl(var(--motion))',
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={subscribeMutation.isPending}
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                      style={{
                        background: 'hsl(var(--motion))',
                        color: 'hsl(var(--canvas))',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--motion-hover))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(var(--motion))'; }}
                    >
                      {subscribeMutation.isPending ? '...' : 'Subscribe'}
                    </button>
                  </div>
                </form>
              )}

              {activePopup.subscribe_enabled && subscribed && (
                <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' }}>
                  You're subscribed — thanks for following along!
                </div>
              )}

              {/* CTA button */}
              {activePopup.cta_text && activePopup.cta_url && (
                <a
                  href={activePopup.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleCtaClick}
                  className="inline-flex items-center justify-center w-full px-4 py-3 rounded-lg text-sm font-bold transition-colors"
                  style={{
                    background: 'hsl(var(--motion))',
                    color: 'hsl(var(--canvas))',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--motion-hover))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(var(--motion))'; }}
                >
                  {activePopup.cta_text}
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}