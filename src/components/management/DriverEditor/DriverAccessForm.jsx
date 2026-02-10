import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check } from 'lucide-react';

export default function DriverAccessForm({ driver }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [sent, setSent] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('createAndSendEntityInvitation', {
        email,
        entity_type: 'Driver',
        entity_id: driver.id,
        entity_name: `${driver.first_name} ${driver.last_name}`,
        access_code: driver.numeric_id,
        role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverManagers', driver.id] });
      setSent(true);
      setEmail('');
      setRole('editor');
      setTimeout(() => setSent(false), 2000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={mutation.isPending || !email} className="gap-2">
        {mutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : sent ? (
          <Check className="w-4 h-4" />
        ) : null}
        {sent ? 'Invitation Sent' : 'Send Invitation'}
      </Button>
    </form>
  );
}