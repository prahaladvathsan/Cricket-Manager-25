/**
 * @file CommentaryFeed.jsx
 * @description Ball-by-ball commentary display
 */

import React, { useEffect, useRef } from 'react';
import { MessageSquare, Circle } from 'lucide-react';

const CommentaryFeed = ({ ballByBall = [], autoScroll = true }) => {
  const feedRef = useRef(null);

  // Auto-scroll to latest ball
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = 0; // Scroll to top (newest first)
    }
  }, [ballByBall, autoScroll]);

  if (!ballByBall || ballByBall.length === 0) {
    return (
      <div className="card p-6 text-center">
        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-text-tertiary" />
        <p className="text-text-secondary text-sm">
          Commentary will appear here once the match begins
        </p>
      </div>
    );
  }

  // Group balls by over
  const ballsByOver = ballByBall.reduce((acc, ball) => {
    const overKey = `${ball.over}.${ball.ball}`;
    if (!acc[ball.over]) {
      acc[ball.over] = [];
    }
    acc[ball.over].push(ball);
    return acc;
  }, {});

  // Get outcome color and icon
  const getOutcomeStyle = (outcome) => {
    const runs = outcome?.runs || 0;
    const isWicket = outcome?.isWicket;
    const isExtra = outcome?.isWide || outcome?.isNoBall;

    if (isWicket) {
      return {
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        icon: 'W'
      };
    }

    if (runs === 6) {
      return {
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        icon: '6'
      };
    }

    if (runs === 4) {
      return {
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        icon: '4'
      };
    }

    if (runs === 0 && !isExtra) {
      return {
        color: 'text-text-secondary',
        bg: 'bg-bg-tertiary',
        border: 'border-border-primary',
        icon: '•'
      };
    }

    return {
      color: 'text-text-primary',
      bg: 'bg-bg-tertiary',
      border: 'border-border-primary',
      icon: runs.toString()
    };
  };

  // Format ball commentary
  const getBallCommentary = (ball) => {
    const outcome = ball.outcome;
    const bowler = ball.bowler?.name || 'Unknown';
    const batsman = ball.batsman?.name || 'Unknown';

    if (outcome.isWicket) {
      const dismissalType = outcome.dismissal?.type || 'out';
      return `WICKET! ${batsman} ${dismissalType}. ${outcome.commentary || ''}`;
    }

    if (outcome.runs === 6) {
      return `SIX! ${batsman} smashes it for six. ${outcome.commentary || ''}`;
    }

    if (outcome.runs === 4) {
      return `FOUR! ${batsman} finds the boundary. ${outcome.commentary || ''}`;
    }

    if (outcome.isWide) {
      return `Wide ball from ${bowler}. ${outcome.commentary || ''}`;
    }

    if (outcome.isNoBall) {
      return `No ball from ${bowler}. ${outcome.commentary || ''}`;
    }

    if (outcome.runs === 0) {
      return `Dot ball. ${outcome.commentary || batsman + ' defends.'}`;
    }

    return `${batsman} scores ${outcome.runs} run${outcome.runs > 1 ? 's' : ''}. ${outcome.commentary || ''}`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-cricket-accent" />
        <h3 className="text-base font-semibold text-text-primary">
          Ball-by-Ball Commentary
        </h3>
        <span className="ml-auto text-xs text-text-secondary">
          {ballByBall.length} balls
        </span>
      </div>

      {/* Commentary Feed */}
      <div
        ref={feedRef}
        className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border-primary scrollbar-track-bg-tertiary"
      >
        {/* Reverse order to show latest first */}
        {[...Object.keys(ballsByOver)].reverse().map(overNum => {
          const overBalls = ballsByOver[overNum];
          return (
            <div key={overNum} className="card p-3">
              {/* Over Header */}
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border-primary">
                <span className="text-sm font-semibold text-cricket-accent">
                  Over {overNum}
                </span>
                <div className="flex gap-1 ml-auto">
                  {overBalls.map((ball, idx) => {
                    const style = getOutcomeStyle(ball.outcome);
                    return (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${style.bg} ${style.color} border ${style.border}`}
                        title={`${ball.over}.${ball.ball}`}
                      >
                        {style.icon}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Balls in Over */}
              <div className="space-y-2">
                {overBalls.map((ball, idx) => {
                  const style = getOutcomeStyle(ball.outcome);
                  return (
                    <div key={idx} className="flex gap-2">
                      {/* Ball Number */}
                      <div className="flex-shrink-0">
                        <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${style.bg} ${style.color} border ${style.border}`}>
                          {style.icon}
                        </div>
                      </div>

                      {/* Commentary */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm text-text-primary">
                              {getBallCommentary(ball)}
                            </p>
                            {ball.outcome.shotType && (
                              <p className="text-xs text-text-secondary mt-0.5">
                                Shot: {ball.outcome.shotType}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-text-secondary font-mono flex-shrink-0">
                            {ball.over}.{ball.ball}
                          </span>
                        </div>

                        {/* Score After Ball */}
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                          <span className="font-mono">
                            {ball.score?.totalScore || 0}/{ball.score?.wickets || 0}
                          </span>
                          {ball.outcome.isWicket && ball.outcome.dismissal && (
                            <span className="text-red-400">
                              {ball.outcome.dismissal.type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommentaryFeed;
