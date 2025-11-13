/**
 * @file TossTab.jsx
 * @description Toss tab for pre-match flow
 * Features coin flip animation, random caller assignment, and batting decision interface
 */

import React from 'react';
import { Coins, Target, Shield } from 'lucide-react';
import TeamName from '../../shared/TeamName';

const TossTab = ({
  matchData,
  tossState,
  onTossComplete
}) => {
  const { homeTeam, awayTeam, userTeamId } = matchData;
  const isUserHomeTeam = homeTeam.id === userTeamId;
  const userTeamData = isUserHomeTeam ? homeTeam : awayTeam;
  const oppositionTeam = isUserHomeTeam ? awayTeam : homeTeam;

  // Simulate toss (called when user clicks Flip Coin button)
  const handleSimulateToss = () => {
    onTossComplete({ animating: true });

    // Animate for 2 seconds
    setTimeout(() => {
      // Random caller (50/50 user or AI)
      const userCalledToss = Math.random() < 0.5;

      // Random toss winner (50/50)
      const tossWinner = Math.random() < 0.5 ? homeTeam : awayTeam;
      const userWonToss = tossWinner.id === userTeamId;

      // If AI won toss, decide randomly (with some logic for realism)
      // In real cricket, teams often choose to bowl first in T20s
      const aiDecision = Math.random() < 0.4 ? 'bat' : 'bowl';

      onTossComplete({
        animating: false,
        completed: true,
        caller: userCalledToss ? 'user' : 'ai',
        winner: tossWinner,
        userWonToss: userWonToss,
        decision: userWonToss ? null : aiDecision, // null means user needs to choose
        userCalledToss: userCalledToss
      });
    }, 2000);
  };

  // Handle user's batting decision (if they won toss)
  const handleUserDecision = (decision) => {
    onTossComplete({
      ...tossState,
      decision: decision,
      decisionMade: true,
      completed: true
    });
  };

  // Get AI decision reasoning
  const getAIDecisionReasoning = (decision) => {
    if (decision === 'bat') {
      return 'Setting a strong total on this batting-friendly surface';
    } else {
      return 'Bowling first to leverage the chase advantage';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toss Introduction */}
      {!tossState.completed && !tossState.animating && (
        <div className="card p-6 text-center">
          <div className="w-20 h-20 bg-cricket-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Coins className="w-10 h-10 text-cricket-accent" />
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-2">
            Toss Time
          </h3>
          <p className="text-text-secondary mb-6">
            The captains are ready for the coin toss
          </p>

          <button
            onClick={handleSimulateToss}
            className="btn-primary py-3 text-lg flex items-center gap-2"
          >
            <Coins className="w-5 h-5" />
            <span>Flip Coin</span>
          </button>
        </div>
      )}

      {/* Toss Animation */}
      {tossState.animating && (
        <div className="card p-8 text-center">
          <div className="w-24 h-24 bg-cricket-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <Coins className="w-12 h-12 text-cricket-accent" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">
            Flipping the Coin...
          </h3>
          <p className="text-text-secondary animate-pulse">
            Wait for it...
          </p>
        </div>
      )}

      {/* Toss Result */}
      {tossState.completed && !tossState.animating && (
        <div className="space-y-4">
          {/* Toss Winner Announcement */}
          <div
            className={`card p-6 text-center ${
              tossState.userWonToss
                ? 'bg-cricket-primary/10 border-2 border-cricket-accent'
                : 'bg-bg-secondary'
            }`}
          >
            <div className="text-xl font-bold text-text-primary mb-2">
              <TeamName teamId={tossState.winner.id} inline={true} className="text-xl font-bold" /> won the toss!
            </div>

            {/* Caller Info */}
            <div className="text-sm text-text-secondary mb-3">
              {tossState.userCalledToss ? (
                <>You called {tossState.userWonToss ? 'correctly!' : 'incorrectly'}</>
              ) : (
                <>Opposition captain called {tossState.userWonToss ? 'incorrectly' : 'correctly'}</>
              )}
            </div>

            {tossState.userWonToss && !tossState.decisionMade && (
              <div className="inline-block px-4 py-2 bg-cricket-accent/20 text-cricket-accent font-semibold rounded-lg">
                🎉 You won the toss!
              </div>
            )}
          </div>

          {/* User Decision (if user won toss) */}
          {tossState.userWonToss && !tossState.decisionMade && (
            <div className="card p-6">
              <h4 className="text-lg font-bold text-text-primary mb-2 text-center">
                Make Your Decision
              </h4>
              <p className="text-sm text-text-secondary mb-4 text-center">
                Choose whether to bat or bowl first
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleUserDecision('bat')}
                  className="card p-5 hover:bg-cricket-primary/10 hover:border-cricket-accent transition-all border-2 border-transparent"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Target className="w-10 h-10 text-cricket-accent" />
                    <div className="text-base font-bold text-text-primary">Bat First</div>
                    <div className="text-xs text-text-secondary text-center">
                      Set a target for the opposition
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleUserDecision('bowl')}
                  className="card p-5 hover:bg-cricket-primary/10 hover:border-cricket-accent transition-all border-2 border-transparent"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="w-10 h-10 text-cricket-accent" />
                    <div className="text-base font-bold text-text-primary">Bowl First</div>
                    <div className="text-xs text-text-secondary text-center">
                      Restrict the opposition and chase
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* AI Decision (if AI won toss) */}
          {!tossState.userWonToss && tossState.decision && (
            <div className="card p-6">
              <div className="text-center">
                <h4 className="text-lg font-bold text-text-primary mb-2">
                  Opposition's Decision
                </h4>
                <p className="text-sm text-text-secondary mb-4">
                  <TeamName teamId={oppositionTeam.id} inline={true} /> chose to{' '}
                  <span className="font-semibold text-text-primary">
                    {tossState.decision === 'bat' ? 'bat first' : 'bowl first'}
                  </span>
                </p>
                <div className="inline-block px-4 py-2 bg-bg-tertiary rounded-lg">
                  <div className="text-xs text-text-tertiary mb-1">Captain's Reasoning</div>
                  <div className="text-sm text-text-secondary italic">
                    "{getAIDecisionReasoning(tossState.decision)}"
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User's Decision Made */}
          {tossState.userWonToss && tossState.decisionMade && (
            <div className="card p-6 text-center">
              <h4 className="text-lg font-bold text-text-primary mb-2">
                Your Decision
              </h4>
              <p className="text-sm text-text-secondary mb-4">
                You chose to{' '}
                <span className="font-semibold text-text-primary">
                  {tossState.decision === 'bat' ? 'bat first' : 'bowl first'}
                </span>
              </p>
              <div className="inline-block px-3 py-1.5 bg-cricket-accent/20 text-cricket-accent text-sm font-medium rounded">
                ✓ Decision Confirmed
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TossTab;
