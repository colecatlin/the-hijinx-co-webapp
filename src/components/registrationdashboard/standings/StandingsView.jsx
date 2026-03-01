import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function StandingsView({ standings, drivers }) {
  const sortedStandings = useMemo(() => {
    return [...standings].sort((a, b) => {
      if (a.total_points !== b.total_points) {
        return b.total_points - a.total_points;
      }
      return (a.position || 0) - (b.position || 0);
    });
  }, [standings]);

  // Check for ties
  const tiedPositions = useMemo(() => {
    const tieMap = {};
    sortedStandings.forEach((s, idx) => {
      const tieCount = sortedStandings.filter(
        (other) => other.total_points === s.total_points
      ).length;
      if (tieCount > 1) {
        tieMap[s.id] = true;
      }
    });
    return tieMap;
  }, [sortedStandings]);

  if (standings.length === 0) {
    return (
      <Card className="bg-[#262626] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Standings</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-gray-400 text-sm">No standings calculated yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#262626] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Standings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-[#171717]">
              <TableRow>
                <TableHead className="text-gray-400 w-12">Pos</TableHead>
                <TableHead className="text-gray-400">Driver</TableHead>
                <TableHead className="text-gray-400 text-right">Points</TableHead>
                <TableHead className="text-gray-400 text-right">Events</TableHead>
                <TableHead className="text-gray-400 text-right">Wins</TableHead>
                <TableHead className="text-gray-400 text-right">Podiums</TableHead>
                <TableHead className="text-gray-400 text-right">Bonus</TableHead>
                <TableHead className="text-gray-400 text-xs">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStandings.map((s, idx) => {
                const driver = drivers.find((d) => d.id === s.driver_id);
                const isTied = tiedPositions[s.id];

                return (
                  <TableRow
                    key={s.id}
                    className="hover:bg-[#262626] border-t border-gray-700/50"
                  >
                    <TableCell className="text-gray-300 font-medium w-12">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {driver ? (
                        <Link
                          to={createPageUrl(`DriverProfile?driverId=${driver.id}`)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {driver.first_name} {driver.last_name}
                        </Link>
                      ) : (
                        <span>{s.driver_name || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-gray-300 font-semibold">
                      {s.total_points || 0}
                    </TableCell>
                    <TableCell className="text-right text-gray-400 text-sm">
                      {s.events_counted || 0}
                    </TableCell>
                    <TableCell className="text-right text-gray-400 text-sm">
                      {s.wins || 0}
                    </TableCell>
                    <TableCell className="text-right text-gray-400 text-sm">
                      {s.podiums || 0}
                    </TableCell>
                    <TableCell className="text-right text-gray-400 text-sm">
                      {s.bonus_points || 0}
                    </TableCell>
                    <TableCell className="text-gray-500 text-xs">
                      <div className="flex items-center justify-between">
                        {s.last_calculated
                          ? new Date(s.last_calculated).toLocaleDateString()
                          : '-'}
                        {isTied && (
                          <Badge
                            variant="outline"
                            className="ml-1 bg-amber-900/30 border-amber-700 text-amber-400 text-xs py-0 px-1"
                            title="Tie breaker may be in effect"
                          >
                            <AlertCircle className="w-2 h-2 mr-0.5" />
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}