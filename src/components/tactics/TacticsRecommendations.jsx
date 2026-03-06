/**
 * @file TacticsRecommendations.jsx
 * @description Collapsible panel showing plain-text tactical insight cards
 * based on the most recent completed match. Read-only — no state modifications.
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import useTeamStore from '../../stores/teamStore';
import { generateInsights } from '../../utils/matchAnalytics';
import thresholds from '../../data/config/insight-thresholds.json';

const TYPE_CONFIG = {
  warning:  { Icon: AlertTriangle, color: 'text-yellow-400',  bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  positive: { Icon: TrendingUp,   color: 'text-green-400',   bg: 'bg-green-400/10',  border: 'border-green-400/30' },
  info:     { Icon: Info,         color: 'text-blue-400',    bg: 'bg-blue-400/10',   border: 'border-blue-400/30' },
};

const InsightCard = ({ insight }) => {
  const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.info;
  const { Icon, color, bg, border } = cfg;
  return (
    <div className={`rounded p-2.5 border ${bg} ${border}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${color}`} />
        <div>
          <p className={`text-xs font-semibold ${color} mb-0.5`}>{insight.title}</p>
          <p className="text-xs text-text-secondary leading-relaxed">{insight.body}</p>
        </div>
      </div>
    </div>
  );
};

const TacticsRecommendations = ({ teamId }) => {
  const [isOpen, setIsOpen] = useState(true);
  const { results } = useLeagueStore();
  const { getUserTeam } = useTeamStore();

  const userTeam = useTeamStore(s => s.teams?.[teamId]) || getUserTeam();
  const userTeamId = teamId || userTeam?.id;

  const insights = useMemo(() => {
    if (!userTeamId || !results?.length) return [];
    // Find most recent match involving the user's team
    const recent = [...results]
      .reverse()
      .find(r => r.homeTeam === userTeamId || r.awayTeam === userTeamId);
    if (!recent?.analytics) return [];
    return generateInsights(recent.analytics, userTeamId, thresholds);
  }, [results, userTeamId]);

  if (insights.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-tertiary transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-trophy-gold" />
          <span className="text-sm font-semibold text-text-primary">Tactical Insights</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-trophy-gold/20 text-trophy-gold font-medium">
            {insights.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-text-tertiary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-tertiary" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2 border-t border-border-primary pt-2">
          <p className="text-xs text-text-tertiary mb-2">Based on your most recent match</p>
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TacticsRecommendations;
