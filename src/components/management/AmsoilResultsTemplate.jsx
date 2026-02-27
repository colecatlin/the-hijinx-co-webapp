import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AmsoilResultsTemplate() {
  const handleDownload = () => {
    const headers = [
      'event_date',
      'event_name',
      'event_location',
      'series_name',
      'class_name',
      'round_number',
      'session_type',
      'driver_first_name',
      'driver_last_name',
      'team_name',
      'position',
      'status',
      'laps_completed'
    ];

    const sampleRows = [
      [
        '2024-07-14',
        'Crandon World Finals',
        'Crandon International Raceway',
        'AMSOIL Championship Off Road',
        'Pro 4',
        '1',
        'Final',
        'Kyle',
        'Klecker',
        'Monster Energy',
        '1',
        'Running',
        '12'
      ],
      [
        '2024-07-14',
        'Crandon World Finals',
        'Crandon International Raceway',
        'AMSOIL Championship Off Road',
        'Pro 4',
        '1',
        'Final',
        'Andrew',
        'Carlson',
        'Madix',
        '2',
        'Running',
        '12'
      ],
      [
        '2024-07-14',
        'Crandon World Finals',
        'Crandon International Raceway',
        'AMSOIL Championship Off Road',
        'Pro 2',
        '1',
        'Final',
        'CJ',
        'Greaves',
        'JCR',
        '1',
        'Running',
        '12'
      ]
    ];

    // Create CSV content
    const csvContent = [
      headers.join('\t'),
      ...sampleRows.map(row => row.join('\t'))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'AMSOIL_Results_Template.tsv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-lg mb-1">AMSOIL Results Template</h3>
          <p className="text-sm text-gray-600 mb-4">
            Download a CSV template for bulk importing race results. Fill in your data and upload to Google Sheets.
          </p>
          <div className="text-xs text-gray-600 bg-white p-3 rounded border border-blue-100 mb-4">
            <p className="font-mono mb-2"><strong>Columns:</strong></p>
            <p className="font-mono text-xs">event_date • event_name • event_location • series_name • class_name • round_number • session_type • driver_first_name • driver_last_name • team_name • position • status • laps_completed</p>
          </div>
        </div>
        <Button
          onClick={handleDownload}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          Download Template
        </Button>
      </div>
    </div>
  );
}