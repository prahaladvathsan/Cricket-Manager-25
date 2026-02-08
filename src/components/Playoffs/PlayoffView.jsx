/**
 * @file PlayoffView.jsx
 * @description Playoff bracket visualization with match progression
 * Standard T20 playoff format:
 * - Qualifier 1: 1st vs 2nd (winner → Final)
 * - Eliminator: 3rd vs 4th (loser eliminated)
 * - Qualifier 2: Loser Q1 vs Winner Eliminator (winner → Final)
 * - Final: Winner Q1 vs Winner Q2
 */

import React, { useMemo } from 'react';
import { Trophy, ArrowRight, X } from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import TeamName from '../shared/TeamName';
import { useMatchResultModal } from '../../hooks/useMatchResultModal';

const PlayoffView = () => {
  const {
    fixtures,
    playoffResults,
    champion,
    clubs
  } = useLeagueStore();

  // Match result modal for clickable results
  const { showResult, ModalComponent: MatchResultModalComponent } = useMatchResultModal();

  // Extract playoff matches
  const playoffMatches = useMemo(() => {
    const playoffFixtures = fixtures.filter(f => f.type === 'playoff');
    
    const q1 = playoffFixtures.find(f => f.matchId === 'playoff_q1');
    const eliminator = playoffFixtures.find(f => f.matchId === 'playoff_eliminator');
    const q2 = playoffFixtures.find(f => f.matchId === 'playoff_q2');
    const final = playoffFixtures.find(f => f.matchId === 'playoff_final');

    const q1Result = playoffResults.find(r => r.matchId === 'playoff_q1');
    const eliminatorResult = playoffResults.find(r => r.matchId === 'playoff_eliminator');
    const q2Result = playoffResults.find(r => r.matchId === 'playoff_q2');
    const finalResult = playoffResults.find(r => r.matchId === 'playoff_final');

    return {
      q1: { fixture: q1, result: q1Result },
      eliminator: { fixture: eliminator, result: eliminatorResult },
      q2: { fixture: q2, result: q2Result },
      final: { fixture: final, result: finalResult }
    };
  }, [fixtures, playoffResults]);

  /**
   * Render a match card
   */
  const MatchCard = ({ fixture, result, round, onClick }) => {
    if (!fixture) return null;

    const isCompleted = result && result.status === 'completed';
    const isPending = fixture.status === 'pending';
    const isScheduled = fixture.status === 'scheduled';
    const hasFullScorecard = result?.fullScorecard != null;

    const handleClick = () => {
      if (hasFullScorecard && onClick) {
        onClick();
      }
    };

    return (
      <div
        className={`border rounded-lg p-3 transition-all ${
          isCompleted
            ? hasFullScorecard
              ? 'bg-cricket-primary/10 border-cricket-accent cursor-pointer hover:bg-cricket-primary/20'
              : 'bg-cricket-primary/10 border-cricket-accent'
            : isPending
            ? 'bg-bg-tertiary/30 border-border-secondary'
            : 'border-border-primary hover:bg-bg-secondary'
        }`}
        onClick={handleClick}
        title={hasFullScorecard ? 'Click to view full scorecard' : ''}
      >
        {/* Round Title */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {round}
          </span>
          {isCompleted && (
            <span className="ml-auto text-xs text-cricket-accent font-medium">
              Completed
            </span>
          )}
          {isPending && (
            <span className="ml-auto text-xs text-text-tertiary font-medium">
              TBD
            </span>
          )}
        </div>

        {/* Teams */}
        <div className="space-y-2">
          {/* Team 1 */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {fixture.homeTeam ? (
                <div className={`font-medium text-sm ${
                  isCompleted && result?.winner === fixture.homeTeam
                    ? 'text-cricket-accent'
                    : isCompleted
                    ? 'text-text-secondary'
                    : 'text-text-primary'
                }`}>
                  <TeamName teamId={fixture.homeTeam} inline={true} showHoverEffect={isCompleted && result?.winner === fixture.homeTeam} />
                </div>
              ) : (
                <span className="text-sm text-text-tertiary italic">
                  {fixture.homeTeamName || 'TBD'}
                </span>
              )}
            </div>
            {isCompleted && result && (
              <div className="ml-3 text-sm font-mono text-text-primary">
                {result.homeTeam === fixture.homeTeam
                  ? `${result.innings1?.totalScore || 0}/${result.innings1?.wickets || 0}`
                  : `${result.innings2?.totalScore || 0}/${result.innings2?.wickets || 0}`
                }
              </div>
            )}
            {isCompleted && result?.winner === fixture.homeTeam && (
              <Trophy className="w-4 h-4 ml-2 text-cricket-accent" />
            )}
          </div>

          {/* VS Divider */}
          <div className="text-center text-xs text-text-tertiary font-bold">vs</div>

          {/* Team 2 */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {fixture.awayTeam ? (
                <div className={`font-medium text-sm ${
                  isCompleted && result?.winner === fixture.awayTeam
                    ? 'text-cricket-accent'
                    : isCompleted
                    ? 'text-text-secondary'
                    : 'text-text-primary'
                }`}>
                  <TeamName teamId={fixture.awayTeam} inline={true} showHoverEffect={isCompleted && result?.winner === fixture.awayTeam} />
                </div>
              ) : (
                <span className="text-sm text-text-tertiary italic">
                  {fixture.awayTeamName || 'TBD'}
                </span>
              )}
            </div>
            {isCompleted && result && (
              <div className="ml-3 text-sm font-mono text-text-primary">
                {result.awayTeam === fixture.awayTeam
                  ? `${result.innings1?.totalScore || 0}/${result.innings1?.wickets || 0}`
                  : `${result.innings2?.totalScore || 0}/${result.innings2?.wickets || 0}`
                }
              </div>
            )}
            {isCompleted && result?.winner === fixture.awayTeam && (
              <Trophy className="w-4 h-4 ml-2 text-cricket-accent" />
            )}
          </div>
        </div>

        {/* Venue */}
        {fixture.venue && (
          <div className="mt-3 pt-2 border-t border-border-secondary text-xs text-text-tertiary">
            {fixture.venue}
          </div>
        )}

        {/* Result Summary */}
        {isCompleted && result && (
          <div className="mt-3 pt-2 border-t border-border-primary text-xs text-cricket-accent">
            <TeamName teamId={result.winner} inline={true} /> won by {result.margin}
          </div>
        )}
      </div>
    );
  };

  /**
   * Render progression arrow
   */
  const ProgressionArrow = ({ show, eliminated = false }) => {
    if (!show) return <div className="w-12" />;

    return (
      <div className="flex items-center justify-center w-12">
        {eliminated ? (
          <X className="w-5 h-5 text-text-negative" />
        ) : (
          <ArrowRight className="w-5 h-5 text-cricket-accent" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-cricket-accent" />
          <h2 className="text-xl font-bold text-text-primary">
            Playoff Stage
          </h2>
        </div>
        <p className="text-sm text-text-secondary mt-1">
          Top 4 teams compete in knockout format for the championship
        </p>
      </div>

      {/* Playoff Bracket */}
      <div className="card p-4">
        <div className="space-y-6">
          {/* Round 1: Qualifier 1 + Eliminator */}
          <div>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 pb-2 border-b border-border-primary">
              Round 1
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Qualifier 1 */}
              <MatchCard
                fixture={playoffMatches.q1.fixture}
                result={playoffMatches.q1.result}
                round="Qualifier 1"
                onClick={() => {
                  if (playoffMatches.q1.result?.fullScorecard) {
                    showResult(playoffMatches.q1.result.fullScorecard);
                  }
                }}
              />

              {/* Eliminator */}
              <MatchCard
                fixture={playoffMatches.eliminator.fixture}
                result={playoffMatches.eliminator.result}
                round="Eliminator"
                onClick={() => {
                  if (playoffMatches.eliminator.result?.fullScorecard) {
                    showResult(playoffMatches.eliminator.result.fullScorecard);
                  }
                }}
              />
            </div>

            {/* Progression Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-text-secondary">
                  <span>Winner →</span>
                  <Trophy className="w-3 h-3 text-cricket-accent" />
                  <span>Final</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary mt-1">
                  <span>Loser → Qualifier 2</span>
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-text-secondary">
                  <span>Winner → Qualifier 2</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-text-negative mt-1">
                  <X className="w-3 h-3" />
                  <span>Loser Eliminated</span>
                </div>
              </div>
            </div>
          </div>

          {/* Round 2: Qualifier 2 */}
          <div>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 pb-2 border-b border-border-primary">
              Round 2 - Second Chance
            </h3>
            <div className="max-w-md mx-auto">
              <MatchCard
                fixture={playoffMatches.q2.fixture}
                result={playoffMatches.q2.result}
                round="Qualifier 2"
                onClick={() => {
                  if (playoffMatches.q2.result?.fullScorecard) {
                    showResult(playoffMatches.q2.result.fullScorecard);
                  }
                }}
              />
              <div className="text-center mt-2 text-xs text-text-secondary">
                <span>Winner →</span>
                <Trophy className="w-3 h-3 inline mx-1 text-cricket-accent" />
                <span>Final</span>
              </div>
            </div>
          </div>

          {/* Round 3: Final */}
          <div>
            <h3 className="text-sm font-semibold text-cricket-accent uppercase tracking-wider mb-3 pb-2 border-b border-cricket-accent">
              Championship Final
            </h3>
            <div className="max-w-md mx-auto">
              <MatchCard
                fixture={playoffMatches.final.fixture}
                result={playoffMatches.final.result}
                round="Final"
                onClick={() => {
                  if (playoffMatches.final.result?.fullScorecard) {
                    showResult(playoffMatches.final.result.fullScorecard);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Champion Announcement */}
      {champion && (
        <div className="card p-4 bg-cricket-primary/10 border-2 border-cricket-accent">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="w-8 h-8 text-cricket-accent" />
              <h2 className="text-2xl font-bold text-cricket-accent">
                Season Champion
              </h2>
              <Trophy className="w-8 h-8 text-cricket-accent" />
            </div>
            <div>
              <div className="text-3xl font-bold text-text-primary mb-2">
                <TeamName teamId={champion.championId} inline={true} className="text-cricket-accent" />
              </div>
              <div className="text-sm text-text-secondary">
                <span className="font-medium">Runner-up:</span>{' '}
                <TeamName teamId={champion.runnerUpId} inline={true} />
              </div>
              <div className="text-xs text-text-tertiary mt-1">
                Final margin: {champion.margin}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Result Modal */}
      {MatchResultModalComponent}
    </div>
  );
};

export default PlayoffView;
