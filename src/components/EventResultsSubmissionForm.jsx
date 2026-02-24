import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function EventResultsSubmissionForm({ eventName, eventDate }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    series: '',
    drivers_results: '',
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create Google Sheets formula link
      const sheetUrl = `https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse?entry.1=${encodeURIComponent(eventName)}&entry.2=${encodeURIComponent(eventDate)}&entry.3=${encodeURIComponent(formData.name)}&entry.4=${encodeURIComponent(formData.email)}&entry.5=${encodeURIComponent(formData.series)}&entry.6=${encodeURIComponent(formData.drivers_results)}`;

      // Open Google Form in new tab
      window.open(sheetUrl, '_blank');

      setStatus('success');
      setFormData({ name: '', email: '', series: '', drivers_results: '' });
      setTimeout(() => setStatus(null), 5000);
    } catch (error) {
      setStatus('error');
      setTimeout(() => setStatus(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold">Submit Results to {eventName}</h3>

      {status === 'success' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">Results submitted! A Google Form will open to complete your submission.</AlertDescription>
        </Alert>
      )}

      {status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to submit results. Please try again.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-2">Your Name</label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Email</label>
          <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium block mb-2">Series Name</label>
          <Input value={formData.series} onChange={(e) => setFormData({ ...formData, series: e.target.value })} placeholder="e.g., NASCAR Craftsman Truck Series" required />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium block mb-2">Race Results</label>
          <Textarea
            value={formData.drivers_results}
            onChange={(e) => setFormData({ ...formData, drivers_results: e.target.value })}
            placeholder="Paste results here (driver name, finishing position, status, etc.)"
            rows={6}
            required
          />
          <p className="text-xs text-gray-500 mt-2">You can paste text, CSV data, or any format - we'll parse it</p>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Submitting...' : 'Submit Results'}
      </Button>
    </form>
  );
}