import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function SessionHealthPanel({
  session,
  sessionResults,
  seriesClass,
  lastImportLog,
  standingsLastRecalcAt,
}) {
  const analysis = useMemo(() => {
    if (!sessionResults) return null;

    const totalResults = sessionResults.length;
    const resultsWithDriver = sessionResults.filter(r => r.driver_id);
    const resultsWithValidPosition = sessionResults.filter(
      r => typeof r.position === 'number' && r.position >= 1 && !isNaN(r.position)
    );
    const resultsMissingDriver = sessionResults.filter(r => !r.driver_id);
    const resultsInvalidPosition = sessionResults.filter(
      r => typeof r.position !== 'number' || r.position < 1 || isNaN(r.position)
    );

    // Count duplicate positions
    const positionCounts = {};
    sessionResults.forEach(r => {
      if (typeof r.position === 'number' && !isNaN(r.position)) {
        positionCounts[r.position] = (positionCounts[r.position] || 0) + 1;
      }
    });
    const duplicatePositions = Object.entries(positionCounts)
      .filter(([_, count]) => count > 1)
      .map(([pos, count]) => ({ position: pos, count }));

    // Count duplicate drivers
    const driverCounts = {};
    sessionResults.forEach(r => {
      if (r.driver_id) {
        driverCounts[r.driver_id] = (driverCounts[r.driver_id] || 0) + 1;
      }
    });
    const duplicateDrivers = Object.entries(driverCounts)
      .filter(([_, count]) => count > 1)
      .length;

    // Health status
    let healthStatus = 'healthy';
    let healthColor = 'bg-green-500/20 text-green-300';
    if (resultsMissingDriver.length > 0 || resultsInvalidPosition.length > 0) {
      healthStatus = 'issues';
      healthColor = 'bg-red-500/20 text-red-300';
    } else if (duplicatePositions.length > 0 || duplicateDrivers > 0) {
      healthStatus = 'advisory';
      healthColor = 'bg-amber-500/20 text-amber-300';
    }

    return {
      totalResults,
      resultsWithDriver: resultsWithDriver.length,
      resultsMissingDriver: resultsMissingDriver.length,
      resultsWithValidPosition: resultsWithValidPosition.length,
      resultsInvalidPosition: resultsInvalidPosition.length,
      duplicatePositions,
      duplicateDrivers,
      healthStatus,
      healthColor,
    };
  }, [sessionResults]);

  if (!analysis) return null;

  return (
    <div className="space-y-3">
      {/* Health Summary */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-gray-400 uppercase tracking-wide">Session Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Status</span>
            <Badge className={analysis.healthColor}>
              {analysis.healthStatus === 'healthy' && <CheckCircle2 className="w-3 h-3 mr-1" />}
              {analysis.healthStatus === 'advisory' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {analysis.healthStatus === 'issues' && <AlertCircle className="w-3 h-3 mr-1" />}
              {analysis.healthStatus.charAt(0).toUpperCase() + analysis.healthStatus.slice(1)}
            </Badge>
          </div>

          <div className="space-y-1 text-xs text-gray-300">
            <div className="flex justify-between">
              <span>Total Results:</span>
              <span className="font-semibold">{analysis.totalResults}</span>
            </div>
            <div className="flex justify-between">
              <span>With Driver:</span>
              <span className={analysis.resultsMissingDriver > 0 ? 'text-red-400' : 'text-green-400'}>
                {analysis.resultsWithDriver}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Valid Positions:</span>
              <span className={analysis.resultsInvalidPosition > 0 ? 'text-red-400' : 'text-green-400'}>
                {analysis.resultsWithValidPosition}
              </span>
            </div>
          </div>

          {/* Issues */}
          {analysis.resultsMissingDriver > 0 && (
            <div className="mt-2 p-2 bg-red-950/30 border border-red-800/50 rounded text-xs text-red-300 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{analysis.resultsMissingDriver} row(s) missing driver</span>
            </div>
          )}

          {analysis.resultsInvalidPosition > 0 && (
            <div className="mt-2 p-2 bg-red-950/30 border border-red-800/50 rounded text-xs text-red-300 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{analysis.resultsInvalidPosition} row(s) invalid position</span>
            </div>
          )}

          {/* Warnings */}
          {analysis.duplicatePositions.length > 0 && (
            <div className="mt-2 p-2 bg-amber-950/30 border border-amber-800/50 rounded text-xs text-amber-300 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{analysis.duplicatePositions.length} duplicate position(s)</span>
            </div>
          )}

          {analysis.duplicateDrivers > 0 && (
            <div className="mt-2 p-2 bg-amber-950/30 border border-amber-800/50 rounded text-xs text-amber-300 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{analysis.duplicateDrivers} driver(s) appear multiple times</span>
            </div>
          )}

          {!session?.series_class_id && (
            <div className="mt-2 p-2 bg-blue-950/30 border border-blue-800/50 rounded text-xs text-blue-300 flex items-start gap-1">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>No Series Class ID set</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Standings Impact */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-gray-400 uppercase tracking-wide">Standings Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-2">
            {session?.session_type === 'Final' ? (
              <div className="flex items-start gap-2 p-2 bg-green-950/30 border border-green-800/50 rounded">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-green-300">Standings will recalculate on Official publish.</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-2 bg-blue-950/30 border border-blue-800/50 rounded">
                <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-blue-300">Standings will NOT recalculate (non-Final session).</span>
              </div>
            )}
            {seriesClass && (
              <p className="text-gray-400">Class: <span className="text-gray-300">{seriesClass.class_name}</span></p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Audit */}
      {(lastImportLog || standingsLastRecalcAt) && (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-gray-400 uppercase tracking-wide">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-gray-400">
            {lastImportLog && (
              <div>
                <span>Last Import:</span>{' '}
                <span className="text-gray-300">
                  {new Date(lastImportLog.created_date).toLocaleString()}
                </span>
              </div>
            )}
            {standingsLastRecalcAt && (
              <div>
                <span>Last Standings:</span>{' '}
                <span className="text-gray-300">
                  {new Date(standingsLastRecalcAt).toLocaleString()}
                </span>
              </div>
            )}
            {session?.updated_date && (
              <div>
                <span>Modified:</span>{' '}
                <span className="text-gray-300">
                  {new Date(session.updated_date).toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}