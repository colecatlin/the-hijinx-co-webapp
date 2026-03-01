import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ExportHistory({ history, onClear }) {
  const typeLabels = {
    entries: 'Entries by Class',
    sessionResults: 'Session Results',
    weekend: 'Weekend Summary',
    standings: 'Season Standings',
    pointsLedger: 'Points Ledger',
  };

  return (
    <Card className="bg-[#262626] border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">Export History</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={onClear}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          Clear History
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-[#171717]">
              <TableRow>
                <TableHead className="text-gray-400">Timestamp</TableHead>
                <TableHead className="text-gray-400">Export Type</TableHead>
                <TableHead className="text-gray-400">Filters</TableHead>
                <TableHead className="text-gray-400 text-right">Rows</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry, idx) => (
                <TableRow key={idx} className="hover:bg-[#262626] border-t border-gray-700/50">
                  <TableCell className="text-gray-400 text-sm">{entry.timestamp}</TableCell>
                  <TableCell className="text-gray-300 text-sm">
                    {typeLabels[entry.type] || entry.type}
                  </TableCell>
                  <TableCell className="text-gray-400 text-xs">{entry.summary}</TableCell>
                  <TableCell className="text-right text-gray-300 text-sm font-medium">
                    {entry.rows}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs ${
                        entry.status === 'success'
                          ? 'bg-green-900/40 text-green-400 border-green-700/50'
                          : 'bg-red-900/40 text-red-400 border-red-700/50'
                      }`}
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}