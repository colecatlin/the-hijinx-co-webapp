import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { LINE_TYPES } from '@/constants/invoiceConstants';

export default function LineItemRow({ line, onChange, onRemove }) {
  const handleChange = (k, v) => {
    const updated = { ...line, [k]: v };
    if (k === 'quantity' || k === 'unit_price') {
      updated.line_total = parseFloat(updated.quantity || 0) * parseFloat(updated.unit_price || 0);
    }
    onChange(updated);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-gray-100 last:border-0">
      <div className="col-span-3">
        <Select value={line.line_type} onValueChange={v => handleChange('line_type', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LINE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4">
        <Input className="h-8 text-xs" value={line.description} onChange={e => handleChange('description', e.target.value)} placeholder="Description" />
      </div>
      <div className="col-span-1">
        <Input className="h-8 text-xs" type="number" value={line.quantity} onChange={e => handleChange('quantity', e.target.value)} />
      </div>
      <div className="col-span-2">
        <Input className="h-8 text-xs" type="number" step="0.01" value={line.unit_price} onChange={e => handleChange('unit_price', e.target.value)} />
      </div>
      <div className="col-span-1 text-xs font-semibold text-gray-700 text-right">
        ${parseFloat(line.line_total || 0).toFixed(2)}
      </div>
      <div className="col-span-1 flex justify-end">
        <button onClick={onRemove} className="text-gray-300 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}