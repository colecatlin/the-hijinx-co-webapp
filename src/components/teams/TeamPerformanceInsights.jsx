import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, TrendingUp, Award, AlertCircle } from 'lucide-react';

export default function TeamPerformanceInsights({ team, performance, programs = [], roster = [] }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const prompt = `Analyze this racing team's performance data and provide insights:

Team: ${team.name}
Primary Discipline: ${team.primary_discipline}
Team Level: ${team.team_level}
Founded: ${team.founded_year || 'Unknown'}

Performance Data:
- Recent Form: ${performance?.recent_form || 'Unknown'}
- Reliability: ${performance?.reliability || 'Unknown'}
- Championships: ${performance?.championships || 'None recorded'}
- Notable Wins: ${performance?.notable_wins || 'None recorded'}
- Highlights: ${performance?.highlights || 'None recorded'}
- Strengths: ${performance?.strengths?.join(', ') || 'None recorded'}
- Weaknesses: ${performance?.weaknesses?.join(', ') || 'None recorded'}
- Trend Notes: ${performance?.trend_notes || 'None recorded'}

Programs: ${programs.map(p => `${p.series_name}${p.class_name ? ' - ' + p.class_name : ''}`).join(', ')}
Active Drivers: ${roster.filter(r => r.role === 'Driver' && r.active).length}

Please provide:
1. A concise 2-3 sentence performance trend summary
2. A prediction of potential future performance (1-2 sentences)
3. 2-3 key statistical highlights or achievements that stand out
4. One strategic recommendation for improvement

Be specific, data-driven, and focus on motorsports context.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            trend_summary: { type: 'string' },
            future_prediction: { type: 'string' },
            key_highlights: {
              type: 'array',
              items: { type: 'string' }
            },
            recommendation: { type: 'string' }
          }
        }
      });

      setInsights(result);
    } catch (err) {
      setError('Failed to generate insights. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!performance) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-[#00FFDA]/5 to-[#1A3249]/5 border border-[#00FFDA]/20 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#00FFDA]" />
          <h3 className="text-lg font-bold text-[#232323]">AI Performance Insights</h3>
        </div>
        {!insights && !loading && (
          <Button
            onClick={generateInsights}
            size="sm"
            className="bg-[#00FFDA] text-[#232323] hover:bg-[#00FFDA]/80"
          >
            Generate Insights
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 p-4 rounded">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {insights && !loading && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#1A3249]" />
              <div className="text-sm font-semibold text-[#232323]">Performance Trend</div>
            </div>
            <p className="text-gray-700 leading-relaxed">{insights.trend_summary}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#00FFDA]" />
              <div className="text-sm font-semibold text-[#232323]">Future Outlook</div>
            </div>
            <p className="text-gray-700 leading-relaxed">{insights.future_prediction}</p>
          </div>

          {insights.key_highlights && insights.key_highlights.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-[#D33F49]" />
                <div className="text-sm font-semibold text-[#232323]">Key Highlights</div>
              </div>
              <ul className="space-y-1">
                {insights.key_highlights.map((highlight, idx) => (
                  <li key={idx} className="text-gray-700 text-sm flex items-start gap-2">
                    <span className="text-[#00FFDA] mt-1">•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.recommendation && (
            <div className="bg-white/60 border border-[#00FFDA]/30 p-4 rounded">
              <div className="text-xs font-semibold text-[#232323] mb-1 uppercase tracking-wide">
                Strategic Recommendation
              </div>
              <p className="text-sm text-gray-700">{insights.recommendation}</p>
            </div>
          )}

          <Button
            onClick={generateInsights}
            size="sm"
            variant="outline"
            className="w-full"
          >
            Regenerate Insights
          </Button>
        </div>
      )}
    </div>
  );
}