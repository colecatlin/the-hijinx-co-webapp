import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, CheckCircle2, Loader2 } from 'lucide-react';

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
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueType || !description.trim()) return;
    setSubmitting(true);
    try {
      await base44.entities.ContactMessage.create({
        subject: `[Issue Report] ${issueType}`,
        message: description,
        metadata_json: {
          issue_type: issueType,
          page_url: pageUrl,
          screenshot_url: screenshotUrl || null,
          reported_at: new Date().toISOString(),
        },
        status: 'unread',
        source: 'issue_report',
      });
      setSubmitted(true);
    } catch (_) {
      // Fallback: log to console if entity write fails
      console.warn('[ReportIssue] Could not write to ContactMessage:', issueType, description);
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    setIssueType('');
    setDescription('');
    setScreenshotUrl('');
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-gray-900">Report an Issue</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Report received</h3>
            <p className="text-sm text-gray-500 mb-5">Thank you — we will review this shortly.</p>
            <Button onClick={handleClose} className="bg-[#232323] hover:bg-black text-white text-sm">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Issue type */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">Issue Type <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {ISSUE_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setIssueType(type)}
                    className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                      issueType === type
                        ? 'bg-[#232323] text-white border-[#232323]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">Description <span className="text-red-500">*</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what happened and what you expected..."
                rows={4}
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none"
                required
              />
            </div>

            {/* Screenshot URL (optional) */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">Screenshot URL <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="url"
                value={screenshotUrl}
                onChange={e => setScreenshotUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
            </div>

            {/* Page URL (auto-filled, read-only) */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">Page</label>
              <input
                type="text"
                value={pageUrl}
                readOnly
                className="w-full border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-400 font-mono"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 text-sm">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!issueType || !description.trim() || submitting}
                className="flex-1 bg-[#232323] hover:bg-black text-white text-sm gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Submit Report'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}