import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { TrendingUp, Eye, Mouse, CheckCircle } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';

const COLORS = ['#232323', '#1A3249', '#3B82F6', '#10B981', '#F59E0B'];

export default function AdvertisementAnalytics() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedAdId, setSelectedAdId] = useState('all');

  const { data: analytics = [] } = useQuery({
    queryKey: ['adAnalytics'],
    queryFn: () => base44.entities.AdAnalytics.list('-date'),
    initialData: [],
  });

  const { data: ads = [] } = useQuery({
    queryKey: ['advertisements'],
    queryFn: () => base44.entities.Advertisement.list(),
    initialData: [],
  });

  const filteredAnalytics = useMemo(() => {
    return analytics.filter(item => {
      const itemDate = new Date(item.date);
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      const dateInRange = itemDate >= from && itemDate <= to;
      const adMatch = selectedAdId === 'all' || item.advertisement_id === selectedAdId;
      return dateInRange && adMatch;
    });
  }, [analytics, dateFrom, dateTo, selectedAdId]);

  const aggregatedMetrics = useMemo(() => {
    const totals = filteredAnalytics.reduce((acc, item) => ({
      impressions: acc.impressions + (item.impressions || 0),
      clicks: acc.clicks + (item.clicks || 0),
      conversions: acc.conversions + (item.conversions || 0),
    }), { impressions: 0, clicks: 0, conversions: 0 });

    return {
      ...totals,
      ctr: totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : 0,
      conversionRate: totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100).toFixed(2) : 0,
    };
  }, [filteredAnalytics]);

  const chartData = useMemo(() => {
    const grouped = {};
    filteredAnalytics.forEach(item => {
      const date = format(new Date(item.date), 'MMM d');
      if (!grouped[date]) grouped[date] = { date, impressions: 0, clicks: 0, conversions: 0 };
      grouped[date].impressions += item.impressions || 0;
      grouped[date].clicks += item.clicks || 0;
      grouped[date].conversions += item.conversions || 0;
    });
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredAnalytics]);

  const performanceByAd = useMemo(() => {
    const grouped = {};
    filteredAnalytics.forEach(item => {
      if (!grouped[item.advertisement_id]) {
        grouped[item.advertisement_id] = { id: item.advertisement_id, impressions: 0, clicks: 0, conversions: 0 };
      }
      grouped[item.advertisement_id].impressions += item.impressions || 0;
      grouped[item.advertisement_id].clicks += item.clicks || 0;
      grouped[item.advertisement_id].conversions += item.conversions || 0;
    });

    return Object.values(grouped).map(item => {
      const ad = ads.find(a => a.id === item.id);
      return {
        ...item,
        name: ad?.title || 'Unknown Ad',
        ctr: item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(2) : 0,
      };
    });
  }, [filteredAnalytics, ads]);

  return (
    <ManagementLayout currentPage="AdvertisementAnalytics">
      <ManagementShell title="Advertisement Analytics" subtitle="Track impressions, clicks, and conversions across your ads">
        <div>

        {/* Filters */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Ad</label>
              <select
                value={selectedAdId}
                onChange={(e) => setSelectedAdId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#232323] focus:border-transparent"
              >
                <option value="all">All Ads</option>
                {ads.map(ad => (
                  <option key={ad.id} value={ad.id}>{ad.title}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Impressions</p>
                <p className="text-3xl font-bold mt-2">{aggregatedMetrics.impressions.toLocaleString()}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Clicks</p>
                <p className="text-3xl font-bold mt-2">{aggregatedMetrics.clicks.toLocaleString()}</p>
              </div>
              <Mouse className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Click-Through Rate</p>
                <p className="text-3xl font-bold mt-2">{aggregatedMetrics.ctr}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Conversions</p>
                <p className="text-3xl font-bold mt-2">{aggregatedMetrics.conversions.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Impressions & Clicks Over Time */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Impressions & Clicks Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="impressions" stroke="#232323" strokeWidth={2} />
                <Line type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Conversions Over Time */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Conversions Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="conversions" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Performance by Ad */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-6">Performance by Advertisement</h3>
          {performanceByAd.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No analytics data available for the selected date range</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Advertisement</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Impressions</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Clicks</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">CTR</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Conversions</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceByAd.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="text-right py-3 px-4 text-gray-600">{item.impressions.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-gray-600">{item.clicks.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-gray-600">{item.ctr}%</td>
                      <td className="text-right py-3 px-4 text-gray-600">{item.conversions.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </ManagementLayout>
  );
}