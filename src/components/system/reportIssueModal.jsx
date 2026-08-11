import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, CheckCircle2, Loader2, Upload, AlertCircle } from 'lucide-react';

const ISSUE_TYPES = [
  'Page not loading',
  'Data appears incorrect',
  'Feature not working',
  'Access or permission issue',
  'Slow performance',
  'Visual / display issue',
  'Other',
];

export default function ReportIssueModal({ open, onClose }) {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setScreenshotFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueType || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      let screenshotUrl = null;
      if (screenshotFile) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: screenshotFile });
        screenshotUrl = uploadResult.file_url;
      }
      await base44.entities.ContactMessage.create({
        subject: `[Issue Report] ${issueType}`,
        message: description,
        metadata_json: {
          issue_type: issueType,
          page_url: pageUrl,
          screenshot_url: screenshotUrl,
          reported_at: new Date().toISOString(),
        },
        status: 'unread',
        source: 'issue_report',
      });
      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong submitting your report. Please try again or contact us directly.');
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    setIssueType('');
    setDescription('');
    setScreenshotFile(null);
    setSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--divider))' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'hsl(var(--warning))' }} />
            <h2 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Report an Issue</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'hsl(var(--success))' }} />
            <h3 className="font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>Report received</h3>
            <p className="text-sm mb-5" style={{ color: 'hsl(var(--foreground-secondary))' }}>Thank you — we'll review this shortly.</p>
            <Button onClick={handleClose} className="text-sm" style={{ background: 'hsl(var(--motion))', color: 'hsl(var(--canvas))' }}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Error state */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'hsl(var(--danger) / 0.08)', border: '1px solid hsl(var(--danger) / 0.2)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--danger))' }} />
                <p className="text-xs" style={{ color: 'hsl(var(--danger))' }}>{error}</p>
              </div>
            )}

            {/* Issue type */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Issue Type <span style={{ color: 'hsl(var(--danger))' }}>*</span></label>
              <div className="flex flex-wrap gap-2">
                {ISSUE_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setIssueType(type)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={
                      issueType === type
                        ? { background: 'hsl(var(--motion))', color: 'hsl(var(--canvas))', border: '1px solid hsl(var(--motion))' }
                        : { background: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }
                    }
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Description <span style={{ color: 'hsl(var(--danger))' }}>*</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what happened and what you expected..."
                rows={4}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
                style={{
                  background: 'hsl(var(--surface-interactive) / 0.5)',
                  border: '1px solid hsl(var(--divider))',
                  color: 'hsl(var(--foreground))',
                }}
                required
              />
            </div>

            {/* Screenshot upload */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Screenshot <span style={{ color: 'hsl(var(--foreground-quiet))' }} className="font-normal">(optional)</span></label>
              <div className="flex items-center gap-2">
                <label
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors"
                  style={{ background: 'hsl(var(--surface-interactive) / 0.5)', border: '1px solid hsl(var(--divider))', color: 'hsl(var(--foreground-secondary))' }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {screenshotFile ? screenshotFile.name : 'Choose file'}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
                {screenshotFile && (
                  <button type="button" onClick={() => setScreenshotFile(null)} className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Page URL (auto-filled, read-only) */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Page</label>
              <input
                type="text"
                value={pageUrl}
                readOnly
                className="w-full rounded-lg px-3 py-2 text-xs font-mono"
                style={{
                  background: 'hsl(var(--surface-interactive) / 0.3)',
                  border: '1px solid hsl(var(--divider))',
                  color: 'hsl(var(--foreground-quiet))',
                }}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 text-sm" disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!issueType || !description.trim() || submitting}
                className="flex-1 text-sm gap-2"
                style={{ background: 'hsl(var(--motion))', color: 'hsl(var(--canvas))' }}
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Report'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}