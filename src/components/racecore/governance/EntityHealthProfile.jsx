/**
 * EntityHealthProfile — R9EB.3
 * Renders a single entity's health score breakdown.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Shield, Database, Link, Star, Zap } from 'lucide-react';

const CERT_COLORS = {
  EXCELLENT: 'text-green-400',
  GOOD:      'text-teal-400',
  FAIR:      'text-amber-400',
  POOR:      'text-orange-400',
  CRITICAL:  'text-red-400',
};

const SEV_CONFIG = {
  critical: { Icon: AlertCircle,   color: 'text-red-400',   bg: 'bg-red-900/20 border-red-800/30' },
  warning:  { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-800/30' },
  info:     { Icon: Info,          color: 'text-blue-400',  bg: 'bg-blue-900/20 border-blue-800/30' },
};

function ScoreMeter({ label, value, icon: Icon, color = 'text-teal-400' }) {
  const pct = Math.round(value || 0);
  const barColor = pct >= 85 ? '#22c55e' : pct >= 65 ? '#14b8a6' : pct >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className={`w-3 h-3 ${color}`} />}
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <span className={`text-xs font-bold font-mono ${color}`}>{pct}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

export default function EntityHealthProfile({ profile, compact = false }) {
  if (!profile) return null;
  const certColor = CERT_COLORS[profile.certification] || 'text-gray-400';

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="text-center w-10">
          <div className={`text-base font-bold font-mono ${certColor}`}>{profile.health_score}</div>
          <div className="text-[8px] text-gray-600 uppercase">Health</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-semibold truncate">{profile.entity_name}</div>
          <div className="text-gray-500 text-[10px]">{profile.entity_type} · {profile.certification}</div>
        </div>
        {profile.critical_count > 0 && (
          <Badge className="bg-red-900/30 text-red-400 border-red-800/40 text-[9px]">{profile.critical_count} critical</Badge>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border space-y-4 p-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white font-bold text-sm">{profile.entity_name}</div>
          <div className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mt-0.5">{profile.entity_type}</div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold font-mono ${certColor}`}>{profile.health_score}</div>
          <div className={`text-[9px] uppercase tracking-widest font-bold ${certColor}`}>{profile.certification}</div>
        </div>
      </div>

      {/* Score meters */}
      <div className="space-y-2.5">
        <ScoreMeter label="Completeness"    value={profile.completeness_score}     icon={Database} color="text-blue-400" />
        <ScoreMeter label="Confidence"      value={profile.confidence_score}        icon={Star}     color="text-amber-400" />
        <ScoreMeter label="Relationships"   value={profile.relationship_score}      icon={Link}     color="text-purple-400" />
        <ScoreMeter label="Verification"    value={profile.verification_score}      icon={Shield}   color="text-green-400" />
        <ScoreMeter label="Source Authority" value={profile.source_authority_score} icon={Zap}      color="text-teal-400" />
      </div>

      {/* Issues */}
      {profile.issues?.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Issues ({profile.issue_count})</div>
          {profile.issues.slice(0, 6).map((issue, i) => {
            const cfg = SEV_CONFIG[issue.severity] || SEV_CONFIG.info;
            const { Icon } = cfg;
            return (
              <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${cfg.bg}`}>
                <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                <div className="min-w-0">
                  <div className="text-xs text-white font-medium">{issue.message}</div>
                  {issue.recommendation && <div className="text-[10px] text-gray-500 mt-0.5">{issue.recommendation}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {profile.issues?.length === 0 && (
        <div className="flex items-center gap-2 text-green-400 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          No issues — this entity is in excellent health
        </div>
      )}
    </div>
  );
}