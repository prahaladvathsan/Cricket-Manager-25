/**
 * @file SeasonSummaryView.jsx
 * @description Season summary screen with champion celebration, final standings, and prizes
 */

import React from 'react';
import { Trophy, Award, TrendingUp, DollarSign, ChevronRight, Target, Zap } from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import useGameStore from '../../stores/gameStore';
import usePlayerStore from '../../stores/playerStore';
import TeamName from '../shared/TeamName';
import PlayerName from '../shared/PlayerName';

const SeasonSummaryView = ({ onContinue }) => {
  const { seasonName, standings, champion, stats } = useLeagueStore();
  const { currentSeason } = useGameStore();
  const { players, careerStats } = usePlayerStore();

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
  const { topScorers, topWicketTakers } = React.useMemo(() => {
    const seasonId = `season_${currentSeason}`;
    const playersWithStats = [];

    // Extract season stats for all players
    Object.entries(careerStats).forEach(([playerId, stats]) => {
      if (stats.seasons && stats.seasons[seasonId]) {
        const seasonStats = stats.seasons[seasonId];
        const player = players[playerId];
        if (player) {
          playersWithStats.push({
            playerId,
            name: player.name,
            teamId: player.teamId,
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
              : 0
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

    return { topScorers, topWicketTakers };
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

  return (
    <div className="space-y-4">
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

      {/* Continue Button */}
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
