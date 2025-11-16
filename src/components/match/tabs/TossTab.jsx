/**
 * @file TossTab.jsx
 * @description Toss tab for pre-match flow
 * Features:
 * - Home team captain tosses the coin
 * - Away team gets to call heads/tails
 * - User gets buttons if they're the away team
 * - CSS 3D coin flip animation
 * - References placeholder assets (cm25-logo.png for heads, toss-coin-reverse.png for tails)
 */

import React, { useState } from 'react';
import { Coins, Target, Shield } from 'lucide-react';
import TeamName from '../../shared/TeamName';

const TossTab = ({
  matchData,
  tossState,
  onTossComplete
}) => {
  const { homeTeam, awayTeam, userTeamId } = matchData;
  const isUserHomeTeam = homeTeam.id === userTeamId;
  const isUserAwayTeam = awayTeam.id === userTeamId;
  const userTeamData = isUserHomeTeam ? homeTeam : awayTeam;
  const oppositionTeam = isUserHomeTeam ? awayTeam : homeTeam;

  // Local state for toss flow
  const [tossStage, setTossStage] = useState('initial'); // initial | userCalling | flipping | userChoice | result
  const [userCall, setUserCall] = useState(null); // 'heads' or 'tails'
  const [coinResult, setCoinResult] = useState(null); // 'heads' or 'tails'

  // Handle user's call (if user is away team)
  const handleUserCall = (call) => {
    setUserCall(call);
    setTossStage('flipping');

    // Start coin flip animation
    setTimeout(() => {
      // Random coin result
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      setCoinResult(result);

      // Determine winner
      const userWon = call === result;

      if (!userWon) {
        // User lost, AI makes decision
        const aiDecision = Math.random() < 0.4 ? 'bat' : 'bowl';
        onTossComplete({
          animating: false,
          completed: true,
          caller: 'user',
          winner: homeTeam,
          userWonToss: false,
          decision: aiDecision,
          userCalledToss: true,
          decisionMade: true
        });
        setTossStage('result');
      } else {
        // User won, needs to choose bat/bowl
        onTossComplete({
          animating: false,
          completed: true,
          caller: 'user',
          winner: awayTeam,
          userWonToss: true,
          decision: null,
          userCalledToss: true,
          decisionMade: false
        });
        setTossStage('userChoice');
      }
    }, 1500);
  };

  // Handle AI toss (user is home team or not involved)
  const handleAIToss = () => {
    setTossStage('flipping');

    setTimeout(() => {
      // AI (away team) makes call
      const aiCall = Math.random() < 0.5 ? 'heads' : 'tails';
      setUserCall(aiCall);

      // Random coin result
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      setCoinResult(result);

      // Determine winner
      const awayTeamWon = aiCall === result;
      const tossWinner = awayTeamWon ? awayTeam : homeTeam;
      const userWon = tossWinner.id === userTeamId;

      // Make decision (AI always decides, or user if home team won)
      let decision;
      if (!userWon) {
        decision = Math.random() < 0.4 ? 'bat' : 'bowl';
      } else if (isUserHomeTeam) {
        // User is home team and won - needs to choose
        onTossComplete({
          animating: false,
          completed: true,
          caller: 'ai',
          winner: homeTeam,
          userWonToss: true,
          decision: null,
          userCalledToss: false,
          decisionMade: false
        });
        setTossStage('userChoice');
        return;
      }

      onTossComplete({
        animating: false,
        completed: true,
        caller: 'ai',
        winner: tossWinner,
        userWonToss: userWon,
        decision: decision,
        userCalledToss: false,
        decisionMade: true
      });
      setTossStage('result');
    }, 1500);
  };

  // Handle user's bat/bowl decision
  const handleUserDecision = (decision) => {
    onTossComplete({
      ...tossState,
      decision: decision,
      decisionMade: true,
      completed: true
    });
    setTossStage('result');
  };

  // Get AI decision reasoning
  const getAIDecisionReasoning = (decision) => {
    if (decision === 'bat') {
      return 'Setting a strong total on this batting-friendly surface';
    } else {
      return 'Bowling first to leverage the chase advantage';
    }
  };

  // Get home captain name (simplified - use team name)
  const homeCaptainName = `${homeTeam.shortName} Captain`;
  const awayCaptainName = `${awayTeam.shortName} Captain`;

  return (
    <div className="space-y-6">
      {/* Initial Screen - Toss Setup */}
      {tossStage === 'initial' && (
        <div className="card p-8">
          {/* Toss Info */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-cricket-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coins className="w-12 h-12 text-cricket-accent" />
            </div>
            <h2 className="text-3xl font-bold text-text-primary mb-3">
              Toss Time
            </h2>
            <div className="space-y-2 text-text-secondary">
              <p className="text-lg">
                <span className="font-semibold text-text-primary">{homeCaptainName}</span> will toss the coin
              </p>
              <p className="text-base">
                <span className="font-semibold text-text-primary">{awayCaptainName}</span> will call heads or tails
              </p>
            </div>
          </div>

          {/* Call Toss or Let AI Handle */}
          {isUserAwayTeam ? (
            <div className="space-y-4">
              <p className="text-center text-text-secondary text-sm mb-4">
                You are the away team - make your call!
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <button
                  onClick={() => handleUserCall('heads')}
                  className="card p-6 hover:bg-cricket-primary/10 hover:border-cricket-accent transition-all border-2 border-transparent"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 bg-cricket-primary/20 rounded-full flex items-center justify-center">
                      {/* Placeholder for CM25 logo */}
                      <div className="text-2xl font-bold text-cricket-accent">CM</div>
                    </div>
                    <div className="text-xl font-bold text-text-primary">Heads</div>
                  </div>
                </button>

                <button
                  onClick={() => handleUserCall('tails')}
                  className="card p-6 hover:bg-cricket-primary/10 hover:border-cricket-accent transition-all border-2 border-transparent"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 bg-cricket-primary/20 rounded-full flex items-center justify-center">
                      {/* Placeholder for reverse logo */}
                      <div className="text-2xl font-bold text-cricket-accent">25</div>
                    </div>
                    <div className="text-xl font-bold text-text-primary">Tails</div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-text-secondary mb-6">
                The away team captain will make the call
              </p>
              <button
                onClick={handleAIToss}
                className="btn-primary py-3 text-lg flex items-center gap-2 mx-auto"
              >
                <Coins className="w-5 h-5" />
                <span>Flip Coin</span>
              </button>
            </div>
          )}

          {/* Asset Instructions Comment */}
          {/*
            ASSET PLACEMENT:
            - Create CM25 logo and save as: src/assets/cm25-logo.png (for HEADS)
            - Create toss coin reverse and save as: src/assets/toss-coin-reverse.png (for TAILS)
            - Images should be square, ideally 200x200px or larger
          */}
        </div>
      )}

      {/* Coin Flipping Animation */}
      {tossStage === 'flipping' && (
        <div className="card p-8 text-center">
          {/* 3D Coin Flip Animation */}
          <div className="coin-flip-container mb-6">
            <div className={`coin ${coinResult ? `flip-${coinResult}` : 'flipping'}`}>
              <div className="coin-side coin-heads">
                <div className="w-full h-full bg-cricket-primary/30 rounded-full flex items-center justify-center border-4 border-cricket-accent">
                  <div className="text-4xl font-bold text-cricket-accent">CM</div>
                </div>
              </div>
              <div className="coin-side coin-tails">
                <div className="w-full h-full bg-cricket-primary/30 rounded-full flex items-center justify-center border-4 border-cricket-accent">
                  <div className="text-4xl font-bold text-cricket-accent">25</div>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-text-primary mb-2">
            Flipping the Coin...
          </h3>
          {userCall && (
            <p className="text-text-secondary">
              Called: <span className="font-semibold text-cricket-accent uppercase">{userCall}</span>
            </p>
          )}

          {/* CSS for 3D Coin Flip */}
          <style>{`
            .coin-flip-container {
              perspective: 1000px;
              height: 150px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .coin {
              width: 120px;
              height: 120px;
              position: relative;
              transform-style: preserve-3d;
              animation: coinFlip 1.5s ease-in-out;
            }

            .coin.flip-heads {
              transform: rotateY(0deg);
            }

            .coin.flip-tails {
              transform: rotateY(180deg);
            }

            .coin-side {
              position: absolute;
              width: 100%;
              height: 100%;
              backface-visibility: hidden;
              display: flex;
              align-items: center;
              justify-center;
            }

            .coin-heads {
              transform: rotateY(0deg);
            }

            .coin-tails {
              transform: rotateY(180deg);
            }

            @keyframes coinFlip {
              0% {
                transform: rotateY(0deg);
              }
              100% {
                transform: rotateY(1080deg); /* 3 full rotations */
              }
            }
          `}</style>
        </div>
      )}

      {/* User Won Toss - Make Decision */}
      {tossStage === 'userChoice' && (
        <div className="space-y-4">
          <div className="card p-6 text-center bg-cricket-primary/10 border-2 border-cricket-accent">
            <h3 className="text-2xl font-bold text-cricket-accent mb-2">
              🎉 You Won the Toss!
            </h3>
            <p className="text-text-secondary">
              The coin landed on <span className="font-semibold text-text-primary uppercase">{coinResult}</span>
            </p>
          </div>

          <div className="card p-6">
            <h4 className="text-xl font-bold text-text-primary mb-2 text-center">
              Make Your Decision
            </h4>
            <p className="text-sm text-text-secondary mb-6 text-center">
              Choose whether to bat or bowl first
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
              <button
                onClick={() => handleUserDecision('bat')}
                className="card p-6 hover:bg-cricket-primary/10 hover:border-cricket-accent transition-all border-2 border-transparent"
              >
                <div className="flex flex-col items-center gap-3">
                  <Target className="w-12 h-12 text-cricket-accent" />
                  <div className="text-lg font-bold text-text-primary">Bat First</div>
                  <div className="text-xs text-text-secondary text-center">
                    Set a target for the opposition
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleUserDecision('bowl')}
                className="card p-6 hover:bg-cricket-primary/10 hover:border-cricket-accent transition-all border-2 border-transparent"
              >
                <div className="flex flex-col items-center gap-3">
                  <Shield className="w-12 h-12 text-cricket-accent" />
                  <div className="text-lg font-bold text-text-primary">Bowl First</div>
                  <div className="text-xs text-text-secondary text-center">
                    Restrict the opposition and chase
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toss Result */}
      {tossStage === 'result' && (
        <div className="space-y-4">
          {/* Winner Announcement */}
          <div className={`card p-6 text-center ${
            tossState.userWonToss
              ? 'bg-cricket-primary/10 border-2 border-cricket-accent'
              : 'bg-bg-secondary'
          }`}>
            <div className="text-2xl font-bold text-text-primary mb-3">
              <TeamName teamId={tossState.winner.id} inline={true} className="text-2xl font-bold" /> won the toss!
            </div>

            <div className="text-text-secondary mb-2">
              The coin landed on <span className="font-semibold text-text-primary uppercase">{coinResult}</span>
            </div>

            {tossState.userCalledToss && (
              <div className="text-sm text-text-secondary">
                You called <span className="font-semibold text-text-primary uppercase">{userCall}</span>
                {' '}{tossState.userWonToss ? '✓ Correct!' : '✗ Incorrect'}
              </div>
            )}

            {!tossState.userCalledToss && (
              <div className="text-sm text-text-secondary">
                {oppositionTeam.shortName} captain called {tossState.userWonToss ? 'incorrectly' : 'correctly'}
              </div>
            )}
          </div>

          {/* Decision Display */}
          {tossState.userWonToss ? (
            <div className="card p-6 text-center">
              <h4 className="text-lg font-bold text-text-primary mb-2">
                Your Decision
              </h4>
              <p className="text-text-secondary mb-4">
                You chose to{' '}
                <span className="font-semibold text-text-primary">
                  {tossState.decision === 'bat' ? 'bat first' : 'bowl first'}
                </span>
              </p>
              <div className="inline-block px-4 py-2 bg-cricket-accent/20 text-cricket-accent text-sm font-semibold rounded-lg">
                ✓ Decision Confirmed
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center">
              <h4 className="text-lg font-bold text-text-primary mb-2">
                Opposition's Decision
              </h4>
              <p className="text-text-secondary mb-4">
                <TeamName teamId={tossState.winner.id} inline={true} /> chose to{' '}
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
          )}
        </div>
      )}
    </div>
  );
};

export default TossTab;
