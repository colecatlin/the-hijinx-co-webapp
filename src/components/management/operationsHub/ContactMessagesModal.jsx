import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, MailOpen, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

/**
 * Inline modal showing contact messages from the Operations Hub stat card.
 * Supports marking messages as read and deleting them.
 */
export default function ContactMessagesModal({ open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['mgmt_contact_messages'],
    queryFn: () => base44.entities.ContactMessage.list('-created_date', 50),
    enabled: open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['mgmt_contact_messages'] });
  };

  const markRead = async (msg) => {
    if (msg.read) return;
    setActingId(msg.id);
    try {
      await base44.entities.ContactMessage.update(msg.id, { read: true });
      invalidate();
    } catch {
      toast({ title: 'Failed to update message', variant: 'destructive' });
    } finally {
      setActingId(null);
    }
  };

  const remove = async (msg) => {
    setActingId(msg.id);
    try {
      await base44.entities.ContactMessage.delete(msg.id);
      invalidate();
      toast({ title: 'Message deleted' });
    } catch {
      toast({ title: 'Failed to delete message', variant: 'destructive' });
    } finally {
      setActingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-divider">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Mail className="w-4 h-4 text-motion" /> Contact Messages
          </DialogTitle>
          <DialogDescription className="text-xs">
            {messages.length} total · {messages.filter(m => !m.read).length} unread
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center">
              <MailOpen className="w-8 h-8 mx-auto text-foreground-quiet mb-2" />
              <p className="text-sm text-foreground-quiet">No contact messages.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg border p-3 transition-colors ${
                  msg.read ? 'border-divider bg-surface' : 'border-motion/30 bg-motion/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {msg.name || msg.email || 'Unknown sender'}
                    </p>
                    {msg.email && msg.name && (
                      <p className="text-[11px] text-foreground-quiet truncate">{msg.email}</p>
                    )}
                  </div>
                  {!msg.read && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-motion shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-motion" /> New
                    </span>
                  )}
                </div>
                {msg.message && (
                  <p className="text-xs text-foreground-secondary leading-relaxed line-clamp-4 mb-2">
                    {msg.message}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-foreground-quiet">
                    {msg.created_date
                      ? new Date(msg.created_date).toLocaleString('en', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })
                      : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    {!msg.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={actingId === msg.id}
                        onClick={() => markRead(msg)}
                      >
                        {actingId === msg.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <MailOpen className="w-3 h-3" />}
                        Mark read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-danger hover:text-danger"
                      disabled={actingId === msg.id}
                      onClick={() => remove(msg)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}