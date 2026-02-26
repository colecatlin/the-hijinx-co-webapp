import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Share2, Lightbulb, TrendingUp, Target } from 'lucide-react';

export default function DriverInsights({ driver, results, programs }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const stats = {
          careerStatus: driver.career_status,
          primaryDiscipline: driver.primary_discipline,
          primaryNumber: driver.primary_number,
          totalPrograms: programs.length,
        };

        const response = await base44.functions.invoke('generateDriverInsights', {
          driverId: driver.id,
          driverName: `${driver.first_name} ${driver.last_name}`,
          stats,
          results: results || [],
          programs: programs || [],
        });

        setInsights(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to generate insights');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (driver?.id) {
      fetchInsights();
    }
  }, [driver?.id]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <section className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-2xl font-bold text-[#232323]">AI Insights</h2>
        </div>
        <Skeleton className="h-20 mb-4" />
        <Skeleton className="h-20 mb-4" />
        <Skeleton className="h-20" />
      </section>
    );
  }

  if (error || !insights) {
    return null;
  }

  return (
    <section className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-8">
      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h2 className="text-2xl font-bold text-[#232323]">AI Insights</h2>
      </div>

      <div className="space-y-6">
        {/* Performance Summary */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-[#232323]">Performance Summary</h3>
          </div>
          <p className="text-gray-700 leading-relaxed">{insights.performanceSummary}</p>
        </div>

        {/* Strengths & Development */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-[#232323] mb-3">Strengths</h3>
            <div className="space-y-2">
              {insights.strengths?.map((strength, idx) => (
                <Badge key={idx} className="bg-green-100 text-green-800 block w-full text-left px-3 py-2">
                  ✓ {strength}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-[#232323] mb-3">Development Areas</h3>
            <div className="space-y-2">
              {insights.developmentAreas?.map((area, idx) => (
                <Badge key={idx} variant="outline" className="border-orange-200 text-orange-700 block w-full text-left px-3 py-2">
                  • {area}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Career Path */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-[#232323]">Career Development</h3>
          </div>
          <p className="text-gray-700 leading-relaxed mb-3">{insights.careerPath}</p>
          <Badge className="bg-purple-600 text-white block w-full text-left px-3 py-2">
            🎯 {insights.nextOpportunity}
          </Badge>
        </div>

        {/* Social Snippet */}
        {insights.socialSnippet && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-600">SOCIAL SNIPPET</span>
                </div>
                <p className="text-gray-800 font-medium italic">"{insights.socialSnippet}"</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(insights.socialSnippet)}
                className="ml-4"
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}