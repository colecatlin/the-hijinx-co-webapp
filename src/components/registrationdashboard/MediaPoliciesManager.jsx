import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Plus } from 'lucide-react';
import { upsertPolicy } from './mediaApi';

export default function MediaPoliciesManager({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const [pending, setPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    policy_type: 'general',
    body_rich_text: '',
    version: 1,
    active: true,
  });
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Determine org context
  const orgEntityId = selectedTrack?.id || selectedSeries?.id;
  const orgEntityType = selectedTrack ? 'track' : 'series';

  // Load policies with proper scoping
  const { data: policies = [] } = useQuery({
    queryKey: ['policies', orgEntityId, selectedEvent?.id],
    queryFn: async () => {
      if (!orgEntityId) return [];
      const allPolicies = await base44.entities.Policy.filter({});
      return allPolicies.filter(
        (p) =>
          p.entity_id === orgEntityId ||
          (selectedEvent && p.entity_id === selectedEvent.id)
      );
    },
    enabled: !!orgEntityId,
  });

  // Create/Update mutation
  const upsertMutation = useMutation({
    mutationFn: async (data) => {
      const { userId, ...policyData } = data;
      const result = await upsertPolicy({
        entity_id: orgEntityId,
        user_id: userId,
        ...policyData,
      });
      if (!result.ok) throw new Error(result.errorMessage);
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      const operationType = variables.policy_id ? 'media_policy_updated' : 'media_policy_created';
      invalidateAfterOperation(operationType);
      setFormData({
        title: '',
        policy_type: 'general',
        body_rich_text: '',
        version: 1,
        active: true,
      });
      setEditingPolicyId(null);
      setDialogOpen(false);
      setError('');
      setPending(false);
    },
    onError: (err) => {
      setError(err.message);
      setPending(false);
    },
  });

  const handleOpenDialog = (policy = null) => {
    if (policy) {
      setEditingPolicyId(policy.id);
      setFormData({
        title: policy.title,
        policy_type: policy.policy_type,
        body_rich_text: policy.body_rich_text,
        version: policy.version,
        active: policy.active,
      });
    } else {
      setEditingPolicyId(null);
      setFormData({
        title: '',
        policy_type: 'general',
        body_rich_text: '',
        version: 1,
        active: true,
      });
    }
    setError('');
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.body_rich_text) {
      setError('Title and body are required');
      return;
    }
    setPending(true);
    const user = await base44.auth.me();
    upsertMutation.mutate({
      ...(editingPolicyId && { policy_id: editingPolicyId }),
      ...formData,
      userId: user.id,
    });
  };

  const handleToggleActive = async (policyId) => {
    const policy = policies.find((p) => p.id === policyId);
    const user = await base44.auth.me();
    upsertMutation.mutate({
      policy_id: policyId,
      ...policy,
      active: !policy.active,
      userId: user.id,
    });
  };

  if (!orgEntityId) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Media Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <p>Select a track or series to manage policies</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">Media Policies</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 px-3 bg-blue-700 hover:bg-blue-600" onClick={() => handleOpenDialog()}>
              <Plus className="w-3 h-3 mr-1" /> Create Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#262626] border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">{editingPolicyId ? 'Edit Policy' : 'Create Policy'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}
              <Input
                placeholder="Policy Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="bg-[#1A1A1A] border-gray-700 text-white"
              />
              <Select
                value={formData.policy_type}
                onValueChange={(val) =>
                  setFormData({ ...formData, policy_type: val })
                }
              >
                <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="conduct">Conduct</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="media_rules">Media Rules</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Policy Body (HTML/Markdown)"
                value={formData.body_rich_text}
                onChange={(e) =>
                  setFormData({ ...formData, body_rich_text: e.target.value })
                }
                rows={6}
                className="bg-[#1A1A1A] border-gray-700 text-white"
              />
              {editingPolicyId && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Version (increment for update)</label>
                  <Input
                    type="number"
                    value={formData.version}
                    onChange={(e) =>
                      setFormData({ ...formData, version: parseInt(e.target.value) || 1 })
                    }
                    className="bg-[#1A1A1A] border-gray-700 text-white"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 border-gray-700 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={pending}
                  className="flex-1 bg-green-700 hover:bg-green-600"
                >
                  {pending ? (editingPolicyId ? 'Saving...' : 'Creating...') : (editingPolicyId ? 'Save' : 'Create')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {policies.length === 0 ? (
          <p className="text-sm text-gray-500">No policies created</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-transparent">
                  <TableHead className="text-gray-400">Title</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Version</TableHead>
                  <TableHead className="text-gray-400">Active</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id} className="border-gray-700 hover:bg-gray-900/30">
                    <TableCell className="text-xs text-gray-300">
                      {policy.title}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {policy.policy_type}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {policy.version}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          policy.active
                            ? 'bg-green-900/40 text-green-300'
                            : 'bg-gray-900/40 text-gray-300'
                        }
                      >
                        {policy.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(policy)}
                        className="h-6 px-2 text-xs border-gray-700"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(policy.id)}
                        className="h-6 px-2 text-xs border-gray-700"
                      >
                        {policy.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}