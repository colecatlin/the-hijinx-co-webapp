import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const ENTITY_TYPES = [
  { value: 'Driver', label: 'Driver' },
  { value: 'Team', label: 'Team' },
  { value: 'Track', label: 'Track' },
  { value: 'Series', label: 'Series' },
  { value: 'Event', label: 'Event' },
];

export default function CodeInputTab({ user }) {
  const [entityType, setEntityType] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    
    if (!entityType || !code) {
      setError('Please select an entity type and enter a code');
      return;
    }

    if (code.length !== 8) {
      setError('Code must be exactly 8 digits');
      return;
    }

    setIsVerifying(true);
    setError('');
    setSuccess(null);

    try {
      const result = await base44.functions.invoke('verifyAccessCode', {
        code,
      });

      if (result.data.success) {
        setSuccess({
          entity_name: result.data.entity.name || `${result.data.entity.first_name} ${result.data.entity.last_name}`,
          entityType: result.data.entityType,
        });
        toast.success(`Access granted!`);
        setCode('');
        setEntityType('');
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Invalid access code';
      setError(errorMsg);
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Input Code</CardTitle>
          <CardDescription>
            Enter an 8-digit code to gain access to manage an entity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label htmlFor="entity-type">Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger id="entity-type" className="mt-2">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="code">8-Digit Code</Label>
              <Input
                id="code"
                type="text"
                maxLength="8"
                placeholder="00000000"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setCode(val);
                  setError('');
                }}
                className="mt-2 text-center text-2xl tracking-widest font-mono"
              />
            </div>

            {error && (
              <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-700">
                  <p className="font-medium">Access granted!</p>
                  <p>You now have access to manage {success.entity_name}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isVerifying || !entityType || code.length !== 8}
              className="w-full bg-[#232323] hover:bg-[#1A3249]"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}