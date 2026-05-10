import React, { useState, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function ResultsPublishConfirmDialog({
  open,
  onOpenChange,
  session,
  event,
  sessionResults,
  isHistoricalMode,
  onConfirm,
  isConfirming,
}) {
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  const analysis = useMemo(() => {
    const warnings = [];
    let blocksConfirmation = false;

    // No results check
    const resultRowsCount = sessionResults?.length || 0;
    if (resultRowsCount === 0) {
      warnings.push({ type: 'error', message: 'No results have been entered for this session.' });
      blocksConfirmation = true;
    }

    // Missing driver_id check
    const rowsMissingDriverId = (sessionResults || []).filter(r => !r.driver_id);
    if (rowsMissingDriverId.length > 0) {
      warnings.push({ type: 'error', message: `${rowsMissingDriverId.length} result row(s) are missing a driver.` });
      blocksConfirmation = true;
    }

    // Invalid positions check
    const rowsWithInvalidPositions = (sessionResults || []).filter(
      r => typeof r.position !== 'number' || r.position < 1 || isNaN(r.position)
    );
    if (rowsWithInvalidPositions.length > 0) {
      warnings.push({ type: 'error', message: `${rowsWithInvalidPositions.length} result row(s) have invalid positions.` });
      blocksConfirmation = true;
    }

    // Duplicate positions check (warning only, not blocking)
    const positionCounts = (sessionResults || []).reduce((acc, r) => {
      if (typeof r.position === 'number' && !isNaN(r.position)) {
        acc[r.position] = (acc[r.position] || 0) + 1;
      }
      return acc;
    }, {});
    const duplicatePositions = Object.entries(positionCounts).filter(([_, count]) => count > 1);
    if (duplicatePositions.length > 0) {
      warnings.push({ type: 'warning', message: `${duplicatePositions.length} position(s) are duplicated.` });
    }

    // Missing series_class_id (info warning)
    if (!session?.series_class_id) {
      warnings.push({ type: 'info', message: 'Session has no Series Class ID. Standings may group results broadly.' });
    }

    return {
      resultRowsCount,
      rowsMissingDriverIdCount: rowsMissingDriverId.length,
      rowsWithInvalidPositionsCount: rowsWithInvalidPositions.length,
      duplicatePositionsCount: duplicatePositions.length,
      warnings,
      blocksConfirmation,
    };
  }, [session, sessionResults]);

  const canConfirm = confirmationChecked && !analysis.blocksConfirmation;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#262626] border-gray-700 max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Publish as Official?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400 text-xs">
            {event?.name} — {session?.name || session?.session_type}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* A. Data Quality Summary */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded p-3">
            <h3 className="font-semibold text-white text-sm mb-2">Data Quality</h3>
            <div className="space-y-1.5 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <Badge className={analysis.resultRowsCount > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                  {analysis.resultRowsCount > 0 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                </Badge>
                <span>{analysis.resultRowsCount} result rows</span>
              </div>
              {analysis.resultRowsCount > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge className={analysis.rowsMissingDriverIdCount === 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                      {analysis.rowsMissingDriverIdCount === 0 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    </Badge>
                    <span>{analysis.rowsMissingDriverIdCount === 0 ? 'All rows have drivers' : `${analysis.rowsMissingDriverIdCount} missing driver`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={analysis.rowsWithInvalidPositionsCount === 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                      {analysis.rowsWithInvalidPositionsCount === 0 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    </Badge>
                    <span>{analysis.rowsWithInvalidPositionsCount === 0 ? 'All positions valid' : `${analysis.rowsWithInvalidPositionsCount} invalid positions`}</span>
                  </div>
                  {analysis.duplicatePositionsCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge className='bg-amber-500/20 text-amber-300'>
                        <AlertTriangle className="w-3 h-3" />
                      </Badge>
                      <span>{analysis.duplicatePositionsCount} duplicate positions</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* B. Standings Impact */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded p-3">
            <h3 className="font-semibold text-white text-sm mb-2">Standings Impact</h3>
            <div className="text-xs space-y-1">
              {session?.session_type === 'Final' ? (
                <p className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Standings will recalculate.
                </p>
              ) : (
                <p className="flex items-center gap-2 text-blue-400">
                  <Info className="w-3.5 h-3.5" /> Standings will not recalculate (non-Final session).
                </p>
              )}
            </div>
          </div>

          {/* C. Public Visibility */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded p-3">
            <h3 className="font-semibold text-white text-sm mb-2">Public Visibility</h3>
            <p className="text-xs flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Results will become public.
            </p>
          </div>

          {/* D. Historical Mode Context */}
          {isHistoricalMode && (
            <div className="bg-[#1A1A1A] border border-gray-800 rounded p-3">
              <h3 className="font-semibold text-white text-sm mb-2">Historical Mode</h3>
              <p className="text-xs flex items-center gap-2 text-blue-400">
                <Info className="w-3.5 h-3.5" /> Live checks bypassed, but results publish and standings update when eligible.
              </p>
            </div>
          )}

          {/* E. Warnings */}
          {analysis.warnings.filter(w => w.type !== 'error').map((warning, idx) => (
            <div key={idx} className="bg-amber-950/30 border border-amber-800/50 rounded p-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">{warning.message}</p>
            </div>
          ))}

          {/* Blocking Errors */}
          {analysis.warnings.filter(w => w.type === 'error').map((error, idx) => (
            <div key={idx} className="bg-red-950/30 border border-red-800/50 rounded p-3 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error.message}</p>
            </div>
          ))}

          {/* Confirmation Checkbox */}
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-800">
            <Checkbox
              id="confirm-publish"
              checked={confirmationChecked}
              onCheckedChange={setConfirmationChecked}
            />
            <Label htmlFor="confirm-publish" className="text-xs text-gray-400 cursor-pointer">
              I have reviewed and understand results will become public.
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm('Official')}
            disabled={!canConfirm || isConfirming}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {isConfirming ? 'Publishing...' : 'Publish Official'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}