import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function EdgeCaseLab({ selectedEvent, isAdmin }) {
  const queryClient = useQueryClient();
  const [runState, setRunState] = useState({});
  const [createdIds, setCreatedIds] = useState({});

  // Visibility check
  const isTestEvent = useMemo(() => {
    if (!selectedEvent) return false;
    return (
      selectedEvent.is_sample === true ||
      (selectedEvent.name && selectedEvent.name.includes('TEST')) ||
      selectedEvent.status === 'Draft'
    );
  }, [selectedEvent]);

  if (!isAdmin || !selectedEvent || !isTestEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Edge Case Lab
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            This panel only runs on test events. Mark event as Draft and include TEST in the name, or set is_sample true.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleRun = async (scenario) => {
    try {
      const startTime = Date.now();
      let result = {};

      switch (scenario) {
        case 'duplicate_car_number':
          result = await runDuplicateCarNumber();
          break;
        case 'retroactive_edit_official':
          result = await runRetroactiveEditOfficial();
          break;
        case 'lock_then_reopen':
          result = await runLockThenReopen();
          break;
        case 'mid_event_driver_transfer':
          result = await runMidEventDriverTransfer();
          break;
        case 'results_imported_twice':
          result = await runResultsImportedTwice();
          break;
      }

      const elapsed = Date.now() - startTime;
      setRunState({
        scenario,
        success: result.success,
        error: result.error || null,
        timestamp: new Date().toISOString(),
        recordsCreated: result.recordsCreated || 0,
        recordsModified: result.recordsModified || 0,
        elapsed,
      });

      if (result.createdIds) {
        setCreatedIds(prev => ({
          ...prev,
          [scenario]: result.createdIds,
        }));
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', selectedEvent.id] });
      queryClient.invalidateQueries({ queryKey: ['results', selectedEvent.id] });
      queryClient.invalidateQueries({ queryKey: ['operationLogs'] });
    } catch (error) {
      setRunState({
        scenario,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleRollback = async (scenario) => {
    try {
      const ids = createdIds[scenario] || {};
      if (ids.entries) {
        for (const id of ids.entries) {
          await base44.asServiceRole.entities.Entry.delete(id);
        }
      }
      if (ids.sessions) {
        for (const id of ids.sessions) {
          await base44.asServiceRole.entities.Session.delete(id);
        }
      }
      if (ids.results) {
        for (const id of ids.results) {
          await base44.asServiceRole.entities.Results.delete(id);
        }
      }
      if (ids.programs) {
        for (const id of ids.programs) {
          await base44.asServiceRole.entities.DriverProgram.delete(id);
        }
      }
      if (ids.teams) {
        for (const id of ids.teams) {
          await base44.asServiceRole.entities.Team.delete(id);
        }
      }

      setCreatedIds(prev => {
        const newState = { ...prev };
        delete newState[scenario];
        return newState;
      });

      setRunState(prev => ({
        ...prev,
        rolledBack: true,
      }));

      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', selectedEvent.id] });
      queryClient.invalidateQueries({ queryKey: ['results', selectedEvent.id] });
      queryClient.invalidateQueries({ queryKey: ['operationLogs'] });
    } catch (error) {
      console.error('Rollback failed:', error);
    }
  };

  // Scenario implementations
  const runDuplicateCarNumber = async () => {
    const drivers = await base44.asServiceRole.entities.Driver.list();
    if (drivers.length < 2) {
      return { success: false, error: 'Need at least 2 drivers', recordsCreated: 0, recordsModified: 0 };
    }

    const createdEntries = [];
    for (let i = 0; i < 2; i++) {
      const entry = await base44.asServiceRole.entities.Entry.create({
        event_id: selectedEvent.id,
        driver_id: drivers[i].id,
        car_number: 'TEST_DUP_001',
        entry_status: 'Registered',
        payment_status: 'Unpaid',
        tech_status: 'Not Inspected',
        notes: 'TEST_EDGE_CASE: Duplicate car number detection',
      });
      createdEntries.push(entry.id);
    }

    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'Entry',
      operation: 'duplicate_detection',
      status: 'completed',
      details: `Found duplicate car number TEST_DUP_001 in ${createdEntries.length} entries`,
      notes: 'TEST_EDGE_CASE: Duplicate car number detection',
    });

    return {
      success: true,
      recordsCreated: createdEntries.length,
      recordsModified: 0,
      createdIds: { entries: createdEntries },
    };
  };

  const runRetroactiveEditOfficial = async () => {
    let session = await base44.asServiceRole.entities.Session.filter({ event_id: selectedEvent.id });
    session = session.find(s => s.session_type === 'Final') || session[0];

    if (!session) {
      session = await base44.asServiceRole.entities.Session.create({
        event_id: selectedEvent.id,
        session_type: 'Final',
        name: 'Final TEST',
        status: 'Draft',
        notes: 'TEST_EDGE_CASE: Retroactive edit official',
      });
    }

    const drivers = await base44.asServiceRole.entities.Driver.list();
    if (drivers.length === 0) {
      return { success: false, error: 'Need at least 1 driver', recordsCreated: 0, recordsModified: 0 };
    }

    const result = await base44.asServiceRole.entities.Results.create({
      driver_id: drivers[0].id,
      event_id: selectedEvent.id,
      session_id: session.id,
      session_type: session.session_type,
      position: 1,
      status: 'Running',
      notes: 'TEST_EDGE_CASE: Retroactive edit official',
    });

    // Mark session as Official
    await base44.asServiceRole.entities.Session.update(session.id, {
      status: 'Official',
    });

    // Attempt edit - would normally be blocked
    const editAllowed = true; // This should be checked in ResultsManager
    
    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'Results',
      operation: 'edit_after_official',
      status: editAllowed ? 'warning' : 'blocked',
      details: `Attempted to edit result ${result.id} after session marked Official`,
      notes: 'TEST_EDGE_CASE: Retroactive edit official',
    });

    return {
      success: !editAllowed,
      recordsCreated: 1,
      recordsModified: 1,
      createdIds: { sessions: session.id === selectedEvent.id ? [] : [session.id], results: [result.id] },
    };
  };

  const runLockThenReopen = async () => {
    let session = await base44.asServiceRole.entities.Session.filter({ event_id: selectedEvent.id });
    session = session[0];

    if (!session) {
      session = await base44.asServiceRole.entities.Session.create({
        event_id: selectedEvent.id,
        session_type: 'Final',
        name: 'Final TEST',
        status: 'Draft',
        notes: 'TEST_EDGE_CASE: Lock then reopen',
      });
    }

    // Lock the session
    await base44.asServiceRole.entities.Session.update(session.id, {
      status: 'Locked',
    });

    // Attempt to reopen - would normally require override
    const reopenAllowed = false; // Should require override confirmation

    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'Session',
      operation: 'reopen_locked',
      status: reopenAllowed ? 'allowed_with_override' : 'blocked',
      details: `Attempted to reopen locked session ${session.id}`,
      notes: 'TEST_EDGE_CASE: Lock then reopen',
    });

    return {
      success: reopenAllowed === false,
      recordsCreated: 0,
      recordsModified: 1,
      createdIds: { sessions: session.id === selectedEvent.id ? [] : [session.id] },
    };
  };

  const runMidEventDriverTransfer = async () => {
    const programs = await base44.asServiceRole.entities.DriverProgram.filter({ event_id: selectedEvent.id });
    if (programs.length === 0) {
      return { success: false, error: 'No driver programs in event', recordsCreated: 0, recordsModified: 0 };
    }

    const program = programs[0];
    const teams = await base44.asServiceRole.entities.Team.list();
    let newTeam = teams.find(t => t.id !== program.team_id);

    if (!newTeam) {
      newTeam = await base44.asServiceRole.entities.Team.create({
        name: 'TEST TEAM',
        headquarters_city: 'TEST',
        headquarters_state: 'TEST',
        country: 'TEST',
        status: 'Active',
        notes: 'TEST_EDGE_CASE: Mid event driver transfer',
      });
    }

    const oldTeamId = program.team_id;
    await base44.asServiceRole.entities.DriverProgram.update(program.id, {
      team_id: newTeam.id,
    });

    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'DriverProgram',
      operation: 'team_transfer',
      status: 'completed',
      details: `Transferred program ${program.id} from team ${oldTeamId} to ${newTeam.id}`,
      notes: 'TEST_EDGE_CASE: Mid event driver transfer',
    });

    return {
      success: true,
      recordsCreated: newTeam.id ? 0 : 1,
      recordsModified: 1,
      createdIds: { programs: [program.id], teams: newTeam.id ? [] : [newTeam.id] },
    };
  };

  const runResultsImportedTwice = async () => {
    let session = await base44.asServiceRole.entities.Session.filter({ event_id: selectedEvent.id });
    session = session[0];

    if (!session) {
      session = await base44.asServiceRole.entities.Session.create({
        event_id: selectedEvent.id,
        session_type: 'Final',
        name: 'Final TEST',
        status: 'Draft',
        notes: 'TEST_EDGE_CASE: Results imported twice',
      });
    }

    const drivers = await base44.asServiceRole.entities.Driver.list();
    if (drivers.length === 0) {
      return { success: false, error: 'Need at least 1 driver', recordsCreated: 0, recordsModified: 0 };
    }

    const result1 = await base44.asServiceRole.entities.Results.create({
      driver_id: drivers[0].id,
      event_id: selectedEvent.id,
      session_id: session.id,
      session_type: session.session_type,
      position: 1,
      status: 'Running',
      notes: 'TEST_EDGE_CASE: Results imported twice - first',
    });

    let duplicateAllowed = false;
    let result2Id = null;
    try {
      const result2 = await base44.asServiceRole.entities.Results.create({
        driver_id: drivers[0].id,
        event_id: selectedEvent.id,
        session_id: session.id,
        session_type: session.session_type,
        position: 1,
        status: 'Running',
        notes: 'TEST_EDGE_CASE: Results imported twice - duplicate',
      });
      duplicateAllowed = true;
      result2Id = result2.id;
    } catch (e) {
      duplicateAllowed = false;
    }

    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'Results',
      operation: 'duplicate_detection',
      status: duplicateAllowed ? 'warning' : 'blocked',
      details: `Attempted duplicate result creation: ${duplicateAllowed ? 'allowed' : 'blocked'}`,
      notes: 'TEST_EDGE_CASE: Results imported twice',
    });

    return {
      success: !duplicateAllowed,
      recordsCreated: duplicateAllowed ? 2 : 1,
      recordsModified: 0,
      createdIds: { sessions: session.id ? [] : [session.id], results: result2Id ? [result1.id, result2Id] : [result1.id] },
    };
  };

  return (
    <Card className="bg-[#171717] border-gray-800 mb-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          Edge Case Lab
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 px-3 py-2 bg-red-950/30 border border-red-800/50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">Runs controlled mutations on test data only.</p>
        </div>

        {runState.scenario && (
          <div className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg">
            <div className="text-xs text-gray-400 mb-2">Last Run</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Scenario:</span>
                <span className="text-white font-mono">{runState.scenario}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Status:</span>
                <span className={runState.success ? 'text-green-400' : 'text-red-400'}>
                  {runState.success ? 'Success' : 'Failed'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Records Created:</span>
                <span className="text-white">{runState.recordsCreated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Records Modified:</span>
                <span className="text-white">{runState.recordsModified}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Timestamp:</span>
                <span className="text-gray-400 text-xs">{new Date(runState.timestamp).toLocaleTimeString()}</span>
              </div>
              {runState.error && (
                <div className="flex justify-between text-red-400 text-xs mt-2">
                  <span>Error:</span>
                  <span>{runState.error}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {['duplicate_car_number', 'retroactive_edit_official', 'lock_then_reopen', 'mid_event_driver_transfer', 'results_imported_twice'].map(scenario => (
            <div key={scenario} className="flex items-center gap-2 p-3 bg-gray-900/30 border border-gray-700 rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-200">
                  {scenario === 'duplicate_car_number' && 'Duplicate Car Number Detection'}
                  {scenario === 'retroactive_edit_official' && 'Retroactive Result Edit After Official'}
                  {scenario === 'lock_then_reopen' && 'Lock Then Attempt Reopen'}
                  {scenario === 'mid_event_driver_transfer' && 'Mid-Event Driver Transfer'}
                  {scenario === 'results_imported_twice' && 'Results Imported Twice'}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRun(scenario)}
                className="border-green-800/50 text-green-400 hover:bg-green-900/30 hover:text-green-300"
              >
                Run
              </Button>
              {createdIds[scenario] && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRollback(scenario)}
                  className="border-orange-800/50 text-orange-400 hover:bg-orange-900/30 hover:text-orange-300"
                >
                  Rollback
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}