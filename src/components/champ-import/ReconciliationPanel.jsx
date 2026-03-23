import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

function Section({ title, items, color = 'green', emptyText = 'None' }) {
  const Icon = color === 'green' ? CheckCircle : color === 'red' ? XCircle : AlertTriangle;
  const iconColor = color === 'green' ? 'text-green-500' : color === 'red' ? 'text-red-500' : 'text-amber-500';
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h3 className="text-sm font-semibold text-gray-700">{title} ({items?.length ?? 0})</h3>
      </div>
      {!items?.length
        ? <p className="text-xs text-gray-400 pl-6">{emptyText}</p>
        : (
          <div className="pl-6 space-y-1">
            {items.map((item, i) => (
              <div key={i} className="text-xs text-gray-600 flex gap-2 flex-wrap">
                <span className="font-medium">{item.name || item.staged_name || item.driver_name || item.staged_class || JSON.stringify(item)}</span>
                {item.matched_to && <span className="text-gray-400">→ {item.matched_to}</span>}
                {item.match_type && <span className="text-blue-400 text-[10px]">{item.match_type}</span>}
                {item.reason && <span className="text-red-400">({item.reason})</span>}
                {item.driver_id && <span className="font-mono text-[10px] text-slate-400">{item.driver_id}</span>}
                {item.date && <span className="text-slate-400">{item.date}</span>}
                {item.missing && <span className="text-red-400">missing: {item.missing}</span>}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

export default function ReconciliationPanel({ report }) {
  if (!report) return null;

  const totalIssues =
    (report.unmatched_drivers?.length || 0) +
    (report.unmatched_events?.length || 0) +
    (report.unmatched_classes?.length || 0) +
    (report.conflicts?.length || 0) +
    (report.missing_required?.length || 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className={`p-4 rounded-lg border ${totalIssues === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-2">
          {totalIssues === 0
            ? <CheckCircle className="w-5 h-5 text-green-600" />
            : <AlertTriangle className="w-5 h-5 text-amber-600" />
          }
          <div>
            <p className={`text-sm font-semibold ${totalIssues === 0 ? 'text-green-800' : 'text-amber-800'}`}>
              {totalIssues === 0
                ? 'Reconciliation clean — ready to apply'
                : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''} require review before applying`
              }
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {report.total_results} results · {report.total_standings} standings
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Drivers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Section title="Matched" items={report.matched_drivers} color="green" />
            <Section title="Unmatched" items={report.unmatched_drivers} color="amber" emptyText="All drivers matched" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Section title="Matched" items={report.matched_events} color="green" />
            <Section title="Unmatched" items={report.unmatched_events} color="amber" emptyText="All events matched" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Section title="Matched" items={report.matched_classes} color="green" />
            <Section title="Unmatched" items={report.unmatched_classes} color="amber" emptyText="All classes matched" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Section title="Conflicts" items={report.conflicts} color="red" emptyText="No conflicts" />
            <Section title="Missing Required Fields" items={report.missing_required} color="red" emptyText="No missing fields" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}