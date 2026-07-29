import React, { useState, useRef, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

/**
 * Simple, non-blocking pull-to-refresh wrapper for touch/scrollable feeds.
 * Detects a downward drag when the scroll container (or window) is at the top,
 * shows a resistance-based indicator, and calls `onRefresh` once past threshold.
 * Does not block scrolling or interaction while refreshing.
 */
const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children, className, style }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const atTop = () => {
    const el = containerRef.current;
    const elTop = el ? el.scrollTop : 0;
    return elTop <= 0 && (typeof window !== 'undefined' ? window.scrollY : 0) <= 0;
  };

  const handleTouchStart = useCallback((e) => {
    if (refreshing || !atTop()) { startY.current = null; return; }
    startY.current = e.touches[0].clientY;
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (startY.current == null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setPull(0); return; }
    // Apply resistance so the pull feels native (1/2 speed).
    setPull(Math.min(dy * 0.5, THRESHOLD * 1.6));
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } catch (err) {
        // non-blocking: swallow refresh errors
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, refreshing, onRefresh]);

  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        aria-hidden={pull === 0 && !refreshing}
        style={{
          height: pull,
          display: pull > 0 || refreshing ? 'flex' : 'block',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: refreshing ? 'none' : 'height 0.2s ease',
        }}
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#1DA1A1' }} />
        ) : (
          <RefreshCw
            className="w-4 h-4"
            style={{
              color: '#1DA1A1',
              transform: `rotate(${progress * 360}deg)`,
              opacity: progress,
              transition: 'transform 0.1s linear',
            }}
          />
        )}
      </div>
      {children}
    </div>
  );
}