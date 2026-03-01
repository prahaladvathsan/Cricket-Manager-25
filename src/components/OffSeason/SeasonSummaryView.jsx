/**
 * @file SeasonSummaryView.jsx
 * @description Season summary screen with champion celebration, final standings, prizes, and board review
 */

import React, { useState } from 'react';
import { Trophy, Award, TrendingUp, DollarSign, ChevronRight, Target, Zap, ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import useGameStore from '../../stores/gameStore';
import usePlayerStore from '../../stores/playerStore';
import useTeamStore from '../../stores/teamStore';
import TeamName from '../shared/TeamName';
import PlayerName from '../shared/PlayerName';
import { ICON_MAP } from '../../utils/ObjectiveGenerator';

const SeasonSummaryView = ({ onContinue }) => {
  const { seasonName, standings, champion, stats } = useLeagueStore();
  const { currentSeason, seasonObjectives, getBoardScore } = useGameStore();
  const { players, careerStats } = usePlayerStore();
  const { userTeam } = useTeamStore();
  const [activeTab, setActiveTab] = useState('summary');

  // Sort standings for final positions
  const sortedStandings = React.useMemo(() => {
    return [...standings].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.netRunRate - a.netRunRate;
    });
  }, [standings]);

  // Calculate season leaderboards
  const { topScorers, topWicketTakers, topMVPs } = React.useMemo(() => {
    const seasonId = `season_${currentSeason}`;
    const playersWithStats = [];

    // Extract season stats for all players
    Object.entries(careerStats).forEach(([playerId, stats]) => {
      if (stats.seasons && stats.seasons[seasonId]) {
        const seasonStats = stats.seasons[seasonId];
        const player = players[playerId];
        if (player) {
          const totalImpact = seasonStats.totalImpact || 0;
          playersWithStats.push({
            playerId,
            name: player.name,
            teamId: player.currentTeam,
            runs: seasonStats.runs || 0,
            wickets: seasonStats.wickets || 0,
            matches: seasonStats.matches || 0,
            average: seasonStats.matches > 0 && seasonStats.dismissals > 0
              ? (seasonStats.runs / seasonStats.dismissals).toFixed(2)
              : seasonStats.runs,
            strikeRate: seasonStats.ballsFaced > 0
              ? ((seasonStats.runs / seasonStats.ballsFaced) * 100).toFixed(2)
              : 0,
            economy: seasonStats.ballsBowled > 0
              ? ((seasonStats.runsConceded / (seasonStats.ballsBowled / 6))).toFixed(2)
              : 0,
            battingImpact: seasonStats.battingImpact || 0,
            bowlingImpact: seasonStats.bowlingImpact || 0,
            fieldingImpact: seasonStats.fieldingImpact || 0,
            totalImpact
          });
        }
      }
    });

    // Top 5 run scorers
    const topScorers = [...playersWithStats]
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 5);

    // Top 5 wicket takers
    const topWicketTakers = [...playersWithStats]
      .sort((a, b) => {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        // Tie-break by economy rate (lower is better)
        return parseFloat(a.economy) - parseFloat(b.economy);
      })
      .slice(0, 5);

    // Top 5 MVPs by total impact
    const topMVPs = [...playersWithStats]
      .filter(p => p.totalImpact !== 0 || p.matches > 0)
      .sort((a, b) => b.totalImpact - a.totalImpact)
      .slice(0, 5);

    return { topScorers, topWicketTakers, topMVPs };
  }, [careerStats, players, currentSeason]);

  // Prize structure
  const SEASON_PRIZES = {
    1: 5000000,
    2: 3000000,
    3: 2000000,
    4: 1500000,
    5: 1000000,
    6: 750000,
    7: 500000,
    8: 400000,
    9: 300000,
    10: 200000
  };

  const formatPrize = (amount) => {
    return `$${(amount / 1000000).toFixed(2)}M`;
  };

  const totalPrizePool = Object.values(SEASON_PRIZES).reduce((sum, prize) => sum + prize, 0);

  // Board score and evaluation
  const boardScore = getBoardScore();

  // Generate board comments for each objective
  const generateBoardComment = (objective) => {
    const progress = objective.progress;
    const status = objective.status;

    if (status === 'completed' || progress === 100) {
      return "✅ **Outstanding!** Objective achieved. The board is extremely pleased with this result.";
    } else if (progress >= 75) {
      return "👍 **Good progress.** While not fully achieved, the board recognizes your strong efforts toward this objective.";
    } else if (progress >= 50) {
      return "⚠️ **Moderate progress.** More was expected, but there were some positive developments.";
    } else if (progress >= 25) {
      return "❌ **Disappointing.** This objective was not adequately pursued. Significant improvement needed.";
    } else {
      return "❌ **Unacceptable.** No meaningful progress was made toward this objective. The board is deeply concerned.";
    }
  };

  // Overall board assessment
  const getBoardAssessment = (score) => {
    if (score >= 85) {
      return {
        rating: "OUTSTANDING",
        color: "text-green-400",
        icon: Trophy,
        message: "Your performance this season has been exceptional. The board unanimously commends your outstanding leadership and strategic acumen. You have exceeded all expectations and set a new standard for excellence. Job security: ABSOLUTE. The board wishes to extend your contract immediately."
      };
    } else if (score >= 70) {
      return {
        rating: "EXCELLENT",
        color: "text-cricket-accent",
        icon: Award,
        message: "Strong performance across most objectives. The board is very satisfied with your management this season. You've demonstrated excellent decision-making and tactical prowess. Job security: STRONG. Continue this level of performance."
      };
    } else if (score >= 50) {
      return {
        rating: "SATISFACTORY",
        color: "text-blue-400",
        icon: CheckCircle2,
        message: "A mixed season with both successes and shortcomings. While some objectives were achieved, others fell short of expectations. The board believes you have potential but expects improvement. Job security: MODERATE. Next season will be crucial."
      };
    } else if (score >= 30) {
      return {
        rating: "BELOW EXPECTATIONS",
        color: "text-yellow-500",
        icon: AlertTriangle,
        message: "This season's performance has been disappointing. Multiple key objectives were not met, and the board has serious concerns about tactical decisions and squad management. Immediate improvement is required. Job security: AT RISK. You are on notice."
      };
    } else {
      return {
        rating: "UNACCEPTABLE",
        color: "text-red-500",
        icon: XCircle,
        message: "This performance is far below the standards expected of a manager at this level. Critical objectives were missed, and the squad underperformed dramatically. The board is considering your position. Job security: CRITICAL. One more poor season may result in termination."
      };
    }
  };

  const assessment = getBoardAssessment(boardScore);

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="card p-1 flex gap-1">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 px-4 py-2 text-sm font-semibold rounded transition-colors ${
            activeTab === 'summary'
              ? 'bg-cricket-primary text-text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
        >
          <Trophy className="w-4 h-4 inline mr-2" />
          Season Summary
        </button>
        <button
          onClick={() => setActiveTab('board')}
          className={`flex-1 px-4 py-2 text-sm font-semibold rounded transition-colors ${
            activeTab === 'board'
              ? 'bg-cricket-primary text-text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 inline mr-2" />
          Board Review
        </button>
      </div>

      {/* Season Summary Tab */}
      {activeTab === 'summary' && (
        <>
          {/* Champion Celebration */}
          {champion && (
            <div className="card p-6 bg-gradient-to-br from-cricket-primary/20 via-cricket-accent/10 to-transparent border-2 border-cricket-accent">
          <div className="text-center space-y-4">
            {/* Trophy Animation Area */}
            <div className="flex items-center justify-center gap-4">
              <Trophy className="w-12 h-12 text-cricket-accent animate-pulse" />
              <Trophy className="w-16 h-16 text-cricket-accent" />
              <Trophy className="w-12 h-12 text-cricket-accent animate-pulse" />
            </div>

            {/* Champion Title */}
            <div>
              <h1 className="text-3xl font-bold text-cricket-accent mb-2">
                {seasonName} Champion
              </h1>
              <div className="text-4xl font-bold text-text-primary mb-3">
                <TeamName teamId={champion.championId} inline={true} className="text-cricket-accent" />
              </div>
              <div className="text-lg text-text-secondary">
                Defeated <TeamName teamId={champion.runnerUpId} inline={true} className="font-semibold" /> in the Final
              </div>
              <div className="text-sm text-text-tertiary mt-1">
                Margin: {champion.margin}
              </div>
            </div>

            {/* Champion Prize */}
            <div className="inline-block px-6 py-3 bg-cricket-primary/30 rounded-lg border border-cricket-accent">
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-cricket-accent" />
                <div className="text-left">
                  <div className="text-xs text-text-secondary uppercase tracking-wider">Champion Prize</div>
                  <div className="text-2xl font-bold text-cricket-accent">{formatPrize(SEASON_PRIZES[1])}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Season Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-cricket-accent" />
            <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Highest Score
            </span>
          </div>
          {stats.highestScore ? (
            <div>
              <div className="text-2xl font-bold text-text-primary">
                {stats.highestScore.score}
              </div>
              <div className="text-xs text-text-tertiary mt-1">
                <TeamName teamId={stats.highestScore.team} variant="short" inline={true} />
              </div>
            </div>
          ) : (
            <div className="text-text-tertiary">No data</div>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-cricket-accent" />
            <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Total Matches
            </span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {stats.totalMatches || 0}
          </div>
          <div className="text-xs text-text-tertiary mt-1">
            {stats.completedMatches || 0} completed
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-cricket-accent" />
            <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Prize Pool
            </span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {formatPrize(totalPrizePool)}
          </div>
          <div className="text-xs text-text-tertiary mt-1">
            Distributed across all teams
          </div>
        </div>
      </div>

      {/* Season Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Top Run Scorers */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
            <Target className="w-5 h-5 text-cricket-accent" />
            <h3 className="text-lg font-bold text-text-primary">Top Run Scorers</h3>
          </div>
          <div className="space-y-2">
            {topScorers.length > 0 ? topScorers.map((player, idx) => (
              <div
                key={player.playerId}
                className={`flex items-center justify-between p-2 rounded ${
                  idx === 0 ? 'bg-cricket-primary/20 border border-cricket-accent' : 'bg-bg-tertiary/30'
                }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className={`text-sm font-mono ${
                    idx === 0 ? 'text-cricket-accent font-bold' : 'text-text-secondary'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div className="flex-1">
                    <PlayerName
                      playerId={player.playerId}
                      inline={true}
                      className={idx === 0 ? 'font-bold text-cricket-accent' : 'font-medium'}
                    />
                    <div className="text-xs text-text-tertiary">
                      <TeamName teamId={player.teamId} variant="short" inline={true} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold font-mono ${
                    idx === 0 ? 'text-cricket-accent' : 'text-text-primary'
                  }`}>
                    {player.runs}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    SR: {player.strikeRate}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-text-tertiary text-sm text-center py-4">
                No run scorers data available
              </div>
            )}
          </div>
        </div>

        {/* Top Wicket Takers */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
            <Zap className="w-5 h-5 text-cricket-accent" />
            <h3 className="text-lg font-bold text-text-primary">Top Wicket Takers</h3>
          </div>
          <div className="space-y-2">
            {topWicketTakers.length > 0 ? topWicketTakers.map((player, idx) => (
              <div
                key={player.playerId}
                className={`flex items-center justify-between p-2 rounded ${
                  idx === 0 ? 'bg-cricket-primary/20 border border-cricket-accent' : 'bg-bg-tertiary/30'
                }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className={`text-sm font-mono ${
                    idx === 0 ? 'text-cricket-accent font-bold' : 'text-text-secondary'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div className="flex-1">
                    <PlayerName
                      playerId={player.playerId}
                      inline={true}
                      className={idx === 0 ? 'font-bold text-cricket-accent' : 'font-medium'}
                    />
                    <div className="text-xs text-text-tertiary">
                      <TeamName teamId={player.teamId} variant="short" inline={true} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold font-mono ${
                    idx === 0 ? 'text-cricket-accent' : 'text-text-primary'
                  }`}>
                    {player.wickets}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    Econ: {player.economy}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-text-tertiary text-sm text-center py-4">
                No wicket takers data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Season MVP */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
          <Trophy className="w-5 h-5 text-trophy-gold" />
          <h3 className="text-lg font-bold text-text-primary">Season MVP</h3>
        </div>
        <div className="space-y-2">
          {topMVPs.length > 0 ? topMVPs.map((player, idx) => (
            <div
              key={player.playerId}
              className={`flex items-center justify-between p-2 rounded ${
                idx === 0 ? 'bg-trophy-gold/10 border border-trophy-gold' : 'bg-bg-tertiary/30'
              }`}
            >
              <div className="flex items-center gap-2 flex-1">
                <span className={`text-sm font-mono ${
                  idx === 0 ? 'text-trophy-gold font-bold' : 'text-text-secondary'
                }`}>
                  #{idx + 1}
                </span>
                <div className="flex-1">
                  <PlayerName
                    playerId={player.playerId}
                    inline={true}
                    className={idx === 0 ? 'font-bold text-trophy-gold' : 'font-medium'}
                  />
                  <div className="text-xs text-text-tertiary">
                    <TeamName teamId={player.teamId} variant="short" inline={true} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold font-mono ${
                  player.totalImpact >= 0 ? (idx === 0 ? 'text-trophy-gold' : 'text-green-400') : 'text-red-400'
                }`}>
                  {player.totalImpact >= 0 ? '+' : ''}{player.totalImpact.toFixed(1)}
                </div>
                <div className="text-xs text-text-tertiary">
                  Impact
                </div>
              </div>
            </div>
          )) : (
            <div className="text-text-tertiary text-sm text-center py-4">
              No MVP data available
            </div>
          )}
        </div>
      </div>

      {/* Final Standings with Prizes */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
          <Trophy className="w-5 h-5 text-cricket-accent" />
          <h2 className="text-lg font-bold text-text-primary">
            Final Standings & Prize Money
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary text-text-secondary text-xs">
                <th className="text-left py-2 px-2 font-medium">#</th>
                <th className="text-left py-2 px-3 font-medium">Team</th>
                <th className="text-center py-2 px-2 font-medium">P</th>
                <th className="text-center py-2 px-2 font-medium">W</th>
                <th className="text-center py-2 px-2 font-medium">L</th>
                <th className="text-center py-2 px-2 font-medium">NRR</th>
                <th className="text-center py-2 px-2 font-medium">Pts</th>
                <th className="text-right py-2 px-3 font-medium">Prize Money</th>
              </tr>
            </thead>
            <tbody>
              {sortedStandings.map((team, idx) => {
                const position = idx + 1;
                const prize = SEASON_PRIZES[position] || 0;
                const isChampion = champion && team.clubId === champion.championId;
                const isTop4 = position <= 4;

                return (
                  <tr
                    key={team.clubId}
                    className={`border-b border-border-secondary transition-colors ${
                      isChampion
                        ? 'bg-cricket-primary/20'
                        : isTop4
                        ? 'bg-bg-tertiary/30'
                        : 'hover:bg-bg-secondary'
                    }`}
                  >
                    <td className="py-2 px-2 text-text-secondary font-mono text-xs">
                      {position}
                      {isChampion && <Trophy className="w-3 h-3 inline ml-1 text-cricket-accent" />}
                    </td>
                    <td className="py-2 px-3">
                      <TeamName
                        teamId={team.clubId}
                        inline={true}
                        className={isChampion ? 'font-bold text-cricket-accent' : 'font-medium'}
                      />
                    </td>
                    <td className="py-2 px-2 text-center text-text-primary font-mono text-xs">
                      {team.played}
                    </td>
                    <td className="py-2 px-2 text-center text-text-positive font-mono text-xs">
                      {team.won}
                    </td>
                    <td className="py-2 px-2 text-center text-text-negative font-mono text-xs">
                      {team.lost}
                    </td>
                    <td className={`py-2 px-2 text-center font-mono text-xs ${
                      team.netRunRate >= 0 ? 'text-text-positive' : 'text-text-negative'
                    }`}>
                      {team.netRunRate >= 0 ? '+' : ''}{team.netRunRate.toFixed(3)}
                    </td>
                    <td className="py-2 px-2 text-center text-cricket-accent font-bold font-mono">
                      {team.points}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-sm">
                      {prize > 0 ? (
                        <span className="text-cricket-accent font-semibold">
                          {formatPrize(prize)}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-3 border-t border-border-primary flex items-center justify-between">
          <div className="text-xs text-text-secondary">
            <Trophy className="w-3 h-3 inline mr-1" />
            Top 4 teams qualified for playoffs
          </div>
          <div className="text-sm font-semibold text-text-primary">
            Total Prize Money: <span className="text-cricket-accent">{formatPrize(totalPrizePool)}</span>
          </div>
        </div>
      </div>

        </>
      )}

      {/* Board Review Tab */}
      {activeTab === 'board' && (
        <>
          {/* Overall Board Assessment */}
          <div className="card p-6 border-2 border-cricket-accent bg-gradient-to-br from-cricket-primary/20 to-transparent">
            <div className="text-center space-y-4">
              <assessment.icon className="w-16 h-16 mx-auto text-cricket-accent" />
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Season {currentSeason} Performance Review
                </h1>
                <div className={`text-5xl font-bold ${assessment.color} mb-3`}>
                  {boardScore}/100
                </div>
                <div className={`text-2xl font-semibold ${assessment.color} uppercase tracking-wide`}>
                  {assessment.rating}
                </div>
              </div>
              <div className="max-w-2xl mx-auto p-4 bg-bg-secondary/50 rounded-lg border border-border-primary">
                <p className="text-sm text-text-primary leading-relaxed">
                  {assessment.message}
                </p>
              </div>
            </div>
          </div>

          {/* Individual Objective Reviews */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-primary">
              <ClipboardCheck className="w-5 h-5 text-cricket-accent" />
              <h2 className="text-lg font-bold text-text-primary">
                Objective-by-Objective Analysis
              </h2>
            </div>

            <div className="space-y-4">
              {seasonObjectives && seasonObjectives.length > 0 ? (
                seasonObjectives.map((objective) => {
                  // Resolve icon component from ICON_MAP if it's a string, otherwise fallback
                  const IconComponent = typeof objective.icon === 'string' 
                    ? (ICON_MAP[objective.icon] || Target)
                    : (objective.icon || Target);

                  // Status badge configuration
                  const statusConfig = {
                    completed: { label: 'COMPLETE', color: 'bg-green-500', textColor: 'text-white', icon: CheckCircle2 },
                    on_track: { label: 'ON TRACK', color: 'bg-blue-500', textColor: 'text-white', icon: TrendingUp },
                    in_progress: { label: 'FALLING SHORT', color: 'bg-yellow-500', textColor: 'text-white', icon: AlertTriangle },
                    at_risk: { label: 'FALLING SHORT', color: 'bg-yellow-500', textColor: 'text-white', icon: AlertTriangle },
                    failed: { label: 'FAILED', color: 'bg-red-500', textColor: 'text-white', icon: XCircle },
                    pending: { label: 'PENDING', color: 'bg-gray-500', textColor: 'text-white', icon: Clock }
                  };

                  const statusDisplay = statusConfig[objective.status] || statusConfig.pending;
                  const StatusIcon = statusDisplay.icon;

                  return (
                    <div
                      key={objective.id}
                      className="p-4 rounded-lg border border-border-primary bg-bg-tertiary/30"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <IconComponent className="w-6 h-6 text-cricket-accent" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-text-primary">{objective.title}</h3>
                            <p className="text-xs text-text-secondary mt-1">{objective.description}</p>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${statusDisplay.color} ${statusDisplay.textColor} text-xs font-bold`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusDisplay.label}
                          </div>
                          <div className="text-xs text-text-tertiary mt-2">
                            Weight: {objective.weight}%
                          </div>
                        </div>
                      </div>

                      {/* Current Status */}
                      <div className="text-xs text-text-secondary mb-3">
                        <strong>Progress:</strong> {objective.details}
                      </div>

                      {/* Board Comment */}
                      <div className="p-3 bg-bg-secondary rounded border-l-4 border-cricket-accent">
                        <div className="text-xs font-semibold text-cricket-accent uppercase tracking-wide mb-1">
                          Board Assessment:
                        </div>
                        <p className="text-sm text-text-primary">
                          {generateBoardComment(objective)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-text-secondary py-8">
                  No objectives data available for this season
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Continue Button (shown on both tabs) */}
      <div className="card p-6 bg-cricket-primary/10 border border-cricket-accent">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              Season {currentSeason} Complete
            </h3>
            <p className="text-sm text-text-secondary">
              Continue to off-season for transfers and squad building
            </p>
          </div>
          <button
            onClick={onContinue}
            className="btn-primary flex items-center gap-2 px-6 py-3"
          >
            Continue to Off-Season
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeasonSummaryView;
