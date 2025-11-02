/**
 * @file Auction.jsx
 * @description Player auction page for season start
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, Users, TrendingUp, Award, ChevronRight, Play } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useGameStore from '../../stores/gameStore';
import AuctionEngine from '../../core/auction-system/AuctionEngine';
import PlayerValuation from '../../core/auction-system/PlayerValuation';

const Auction = () => {
  const navigate = useNavigate();
  const { teams, userTeamId, getUserTeam, addPlayerToSquad } = useTeamStore();
  const { players } = usePlayerStore();
  const { currentSeason } = useGameStore();

  const userTeam = getUserTeam();
  const valuation = useMemo(() => new PlayerValuation(), []);

  // Auction state
  const [auctionEngine, setAuctionEngine] = useState(null);
  const [auctionState, setAuctionState] = useState('not_started');
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [highestBidder, setHighestBidder] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [auctionLog, setAuctionLog] = useState([]);
  const [activeTab, setActiveTab] = useState('auction');
  const [showSoldScreen, setShowSoldScreen] = useState(false);
  const [soldDetails, setSoldDetails] = useState(null);
  const [secondsSinceLastBid, setSecondsSinceLastBid] = useState(0);
  const [isAuctioning, setIsAuctioning] = useState(false);

  const timerRef = useRef(null);
  const bidFloor = useRef(0); // Never allow bids below this
  const secondsRef = useRef(0); // Track seconds for timer
  const currentPriceRef = useRef(0); // Track current price to avoid stale state
  const highestBidderRef = useRef(null); // Track highest bidder to avoid stale state
  const isAuctioningRef = useRef(false); // Track auction state to avoid stale state
  const willingBiddersRef = useRef([]); // Pre-calculated max bids for each team
  const pendingBidsRef = useRef([]); // Track pending setTimeout IDs

  // Initialize auction
  const handleStartAuction = () => {
    try {
      const playersArray = Object.values(players);
      if (playersArray.length === 0) {
        addToLog('Error: No players loaded. Please refresh the page.', 'error');
        alert('Player database not loaded yet. Please refresh the page and try again.');
        return;
      }

      console.log(`Starting auction with ${playersArray.length} players`);

      const engine = new AuctionEngine({ fastMode: false });

      // Prepare teams
      const teamsArray = Object.values(teams).map(team => ({
        ...team,
        isUserControlled: team.id === userTeamId
      }));

      engine.initializeAuction(teamsArray, playersArray);

      const categorized = engine.categorizePlayers();
      const auctionRounds = engine.createAuctionRounds(categorized);

      setAuctionEngine(engine);
      setRounds(auctionRounds);
      setAuctionState('in_progress');
      setCurrentRound(0);
      setCurrentPlayerIndex(0);

      if (auctionRounds.length > 0 && auctionRounds[0].length > 0) {
        console.log(`Starting with ${auctionRounds.length} rounds`);
        startPlayerAuction(engine, auctionRounds[0][0], 0, 0);
      } else {
        console.error('No auction rounds available!');
        addToLog('Error: No players available for auction', 'error');
      }

      addToLog('Auction started!', 'info');
    } catch (error) {
      console.error('Error starting auction:', error);
      addToLog('Error starting auction: ' + error.message, 'error');
    }
  };

  // Start auction for a single player
  const startPlayerAuction = async (engine, player, roundIndex, playerIndex) => {
    setIsAuctioning(true);
    isAuctioningRef.current = true;
    setCurrentPlayer(player);
    setCurrentPrice(player.basePrice);
    currentPriceRef.current = player.basePrice;
    setHighestBidder(null);
    highestBidderRef.current = null;
    setSecondsSinceLastBid(0);
    secondsRef.current = 0;
    bidFloor.current = player.basePrice;

    addToLog(`Now auctioning: ${player.name} (${player.role}) - Base Price: ${valuation.formatPrice(player.basePrice)}`, 'player');

    // Calculate auction progress
    const totalPlayers = rounds.reduce((sum, round) => sum + round.length, 0);
    const playersAuctioned = (roundIndex * (rounds[0]?.length || 10)) + playerIndex;
    const auctionProgress = totalPlayers > 0 ? playersAuctioned / totalPlayers : 0;

    // PRE-CALCULATE max bids for all teams (do this ONCE per player)
    const initialBidders = [];
    for (const team of engine.teams) {
      if (team.squad.length >= engine.config.squadSize.max) continue;

      const decision = engine.ai.shouldBid(
        player,
        player.basePrice,
        team,
        auctionProgress
      );

      if (decision.shouldBid) {
        initialBidders.push({
          team,
          maxBid: decision.maxBid
        });
      }
    }

    willingBiddersRef.current = initialBidders;
    console.log(`${initialBidders.length} teams interested in ${player.name}`);

    // Start timer
    startBidTimer(engine, player, auctionProgress);

    // Start AI bidding race
    startAIBiddingRace(engine, player, auctionProgress);
  };

  // Timer that ticks every second
  const startBidTimer = (engine, player, auctionProgress) => {
    const bidTimerDuration = engine.config.timing.bidTimer;

    const tick = () => {
      secondsRef.current += 1;
      setSecondsSinceLastBid(secondsRef.current);

      if (secondsRef.current >= bidTimerDuration) {
        // Time's up - finalize
        finalizePlayerAuction(engine, player);
      } else {
        // Continue timer (no need to process AI bids every second)
        timerRef.current = setTimeout(tick, 1000);
      }
    };

    // Start timer after 1 second
    timerRef.current = setTimeout(tick, 1000);
  };

  // Start AI bidding race - assign random delays to all willing bidders
  const startAIBiddingRace = (engine, player, auctionProgress) => {
    if (!engine || !player || !isAuctioningRef.current) return;

    // Clear any pending bids
    pendingBidsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    pendingBidsRef.current = [];

    const price = currentPriceRef.current;
    const currentHighestBidder = highestBidderRef.current;

    // Filter willing bidders: maxBid >= next bid price AND not current highest bidder
    const increment = getValidIncrement(price);
    const nextBid = price + increment;

    const activeBidders = willingBiddersRef.current.filter(bidder =>
      bidder.maxBid >= nextBid &&
      bidder.team.id !== currentHighestBidder?.id &&
      !bidder.team.isUserControlled
    );

    console.log(`${activeBidders.length} teams can still bid at ${valuation.formatPrice(nextBid)}`);

    if (activeBidders.length === 0) {
      // No more AI bidders, auction will end when timer expires
      return;
    }

    // Assign random delay to EACH willing bidder - they race!
    const minDelay = (engine.config.timing.aiBidDelayMin || 1) * 1000;
    const maxDelay = (engine.config.timing.aiBidDelayMax || 5) * 1000;

    activeBidders.forEach(bidder => {
      const delay = Math.random() * (maxDelay - minDelay) + minDelay;

      const timeoutId = setTimeout(() => {
        // Double-check auction still active and price hasn't changed
        if (isAuctioningRef.current && currentPriceRef.current === price) {
          const currentIncrement = getValidIncrement(currentPriceRef.current);
          const bidAmount = currentPriceRef.current + currentIncrement;
          placeBid(bidder.team, bidAmount, engine, player, auctionProgress);
        }
      }, delay);

      pendingBidsRef.current.push(timeoutId);
    });
  };

  // Place a bid (user or AI)
  const placeBid = (team, amount, engine, player, auctionProgress) => {
    // Ensure bid is higher than current price (use ref for latest value)
    if (amount <= currentPriceRef.current) {
      console.warn(`Rejecting bid ${amount} <= current ${currentPriceRef.current}`);
      return;
    }

    // Ensure bid is at valid increment
    const validAmount = Math.max(amount, bidFloor.current);

    // Update both state and ref
    setCurrentPrice(validAmount);
    currentPriceRef.current = validAmount;
    setHighestBidder(team);
    highestBidderRef.current = team;
    setSecondsSinceLastBid(0);
    secondsRef.current = 0;
    bidFloor.current = validAmount; // Update floor

    addToLog(`${team.name} bids ${valuation.formatPrice(validAmount)}`, 'bid');

    // Clear and restart timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Restart timer if engine and player provided
    if (engine && player && auctionProgress !== undefined) {
      startBidTimer(engine, player, auctionProgress);
      // Restart AI bidding race with updated price
      startAIBiddingRace(engine, player, auctionProgress);
    }
  };

  // Handle user bid
  const handleBid = () => {
    if (!currentPlayer || !auctionEngine) return;

    const userTeamData = auctionEngine.teams.find(t => t.id === userTeamId);
    if (!userTeamData) return;

    const price = currentPriceRef.current;
    const increment = getValidIncrement(price);
    const nextBid = price + increment;

    if (nextBid > userTeamData.budgetRemaining) {
      addToLog(`Insufficient funds! Budget remaining: ${valuation.formatPrice(userTeamData.budgetRemaining)}`, 'error');
      return;
    }

    // Calculate auction progress for timer restart
    const totalPlayers = rounds.reduce((sum, round) => sum + round.length, 0);
    const playersAuctioned = (currentRound * (rounds[0]?.length || 10)) + currentPlayerIndex;
    const auctionProgress = totalPlayers > 0 ? playersAuctioned / totalPlayers : 0;

    placeBid(userTeamData, nextBid, auctionEngine, currentPlayer, auctionProgress);
  };

  // Handle pass - use fast mode logic
  const handlePass = () => {
    if (!auctionEngine || !currentPlayer) return;

    addToLog(`${userTeam?.name} passes - fast-tracking auction`, 'pass');

    // Clear timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Use fast mode logic: find all willing bidders
    const totalPlayers = rounds.reduce((sum, round) => sum + round.length, 0);
    const playersAuctioned = (currentRound * (rounds[0]?.length || 10)) + currentPlayerIndex;
    const auctionProgress = totalPlayers > 0 ? playersAuctioned / totalPlayers : 0;

    const price = currentPriceRef.current;
    const willingBidders = [];

    for (const team of auctionEngine.teams) {
      if (team.squad.length >= auctionEngine.config.squadSize.max) continue;

      const decision = auctionEngine.ai.shouldBid(
        currentPlayer,
        price,
        team,
        auctionProgress
      );

      if (decision.shouldBid) {
        willingBidders.push({
          team,
          maxBid: decision.maxBid
        });
      }
    }

    if (willingBidders.length > 0) {
      // Find highest bid
      let highestBid = Math.max(...willingBidders.map(b => b.maxBid));
      highestBid = auctionEngine.floorToValidBidAmount(highestBid);

      // Filter to teams willing to bid at highest
      const highestBidders = willingBidders.filter(b => b.maxBid >= highestBid);

      // Random selection
      const winner = highestBidders[Math.floor(Math.random() * highestBidders.length)];

      setCurrentPrice(highestBid);
      currentPriceRef.current = highestBid;
      setHighestBidder(winner.team);
      highestBidderRef.current = winner.team;

      addToLog(`Fast auction: ${winner.team.name} wins at ${valuation.formatPrice(highestBid)}`, 'bid');
    }

    // Finalize immediately
    finalizePlayerAuction(auctionEngine, currentPlayer);
  };

  // Finalize player auction
  const finalizePlayerAuction = (engine, player) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Clear all pending AI bids
    pendingBidsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    pendingBidsRef.current = [];

    setIsAuctioning(false);
    isAuctioningRef.current = false;

    const winner = highestBidderRef.current;
    const finalPrice = currentPriceRef.current;

    if (winner) {
      // Player sold
      const team = engine.teams.find(t => t.id === winner.id);
      if (!team) return;

      team.squad.push({ ...player, soldPrice: finalPrice });
      team.totalSpent += finalPrice;
      team.budgetRemaining -= finalPrice;

      addToLog(`SOLD! ${player.name} to ${winner.name} for ${valuation.formatPrice(finalPrice)}`, 'sold');

      // Update store if user team - add player ID to squad
      if (team.isUserControlled && player.id) {
        addPlayerToSquad(team.id, player.id);
      }

      setSoldDetails({
        player: { ...player },
        team: { ...winner },
        price: finalPrice,
        status: 'sold'
      });
    } else {
      // Player unsold
      addToLog(`UNSOLD: ${player.name}`, 'unsold');
      engine.unsoldPlayers.push(player);

      setSoldDetails({
        player: { ...player },
        status: 'unsold'
      });
    }

    setShowSoldScreen(true);
  };

  // Handle next player after sold screen
  const handleNextPlayer = () => {
    setShowSoldScreen(false);
    setSoldDetails(null);
    moveToNextPlayer();
  };

  // Move to next player
  const moveToNextPlayer = () => {
    if (currentPlayerIndex < rounds[currentRound].length - 1) {
      // Next player in current round
      const nextIndex = currentPlayerIndex + 1;
      setCurrentPlayerIndex(nextIndex);
      startPlayerAuction(auctionEngine, rounds[currentRound][nextIndex], currentRound, nextIndex);
    } else if (currentRound < rounds.length - 1) {
      // Next round
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      setCurrentPlayerIndex(0);
      addToLog(`--- Round ${nextRound + 1} ---`, 'info');
      startPlayerAuction(auctionEngine, rounds[nextRound][0], nextRound, 0);
    } else {
      // Auction complete
      setAuctionState('completed');
      setCurrentPlayer(null);
      addToLog('Auction completed!', 'success');
    }
  };

  // Get valid bid increment
  const getValidIncrement = (price) => {
    const increments = auctionEngine?.config.bidIncrements.increments || [];
    for (const tier of increments) {
      if (price <= tier.maxPrice) {
        return tier.increment;
      }
    }
    return increments[increments.length - 1]?.increment || 20000;
  };

  // Add to auction log
  const addToLog = (message, type = 'info') => {
    setAuctionLog(prev => [...prev, { message, type, timestamp: Date.now() }]);
  };

  // Cleanup timer and pending bids on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      pendingBidsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, []);

  // Get user team stats
  const userTeamData = auctionEngine?.teams.find(t => t.id === userTeamId);
  const bidTimer = auctionEngine?.config.timing.bidTimer || 10;
  const timeRemaining = Math.max(0, bidTimer - secondsSinceLastBid);

  const tabs = [
    { id: 'auction', label: 'Live Auction', icon: Gavel },
    { id: 'squads', label: 'Team Squads', icon: Users },
    { id: 'log', label: 'Auction Log', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cricket-text-primary flex items-center gap-3">
            <Gavel className="w-8 h-8 text-cricket-accent" />
            Player Auction
          </h1>
          <p className="text-cricket-text-secondary mt-1">
            Season {currentSeason} • {userTeam?.name || 'Select Team'}
          </p>
        </div>
        {auctionState === 'not_started' && (
          <button
            onClick={handleStartAuction}
            disabled={Object.keys(players).length === 0}
            className="btn-primary flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            {Object.keys(players).length === 0 ? 'Loading Players...' : 'Start Auction'}
          </button>
        )}
        {auctionState === 'completed' && (
          <button onClick={() => navigate('/dashboard')} className="btn-primary flex items-center gap-2">
            <ChevronRight className="w-5 h-5" />
            Continue to Dashboard
          </button>
        )}
      </div>

      {/* Auction Status */}
      {auctionEngine && (
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-cricket-text-secondary">Your Budget</div>
              <div className="text-2xl font-bold text-cricket-accent">
                {valuation.formatPrice(userTeamData?.budgetRemaining || 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-cricket-text-secondary">Squad Size</div>
              <div className="text-2xl font-bold">{userTeamData?.squad.length || 0} / 25</div>
            </div>
            <div>
              <div className="text-sm text-cricket-text-secondary">Round Progress</div>
              <div className="text-2xl font-bold">{currentRound + 1} / {rounds.length}</div>
            </div>
            <div>
              <div className="text-sm text-cricket-text-secondary">Status</div>
              <div className={`text-lg font-semibold ${
                auctionState === 'in_progress' ? 'text-yellow-500' :
                auctionState === 'completed' ? 'text-green-500' : 'text-gray-500'
              }`}>
                {auctionState === 'in_progress' ? 'Live' :
                 auctionState === 'completed' ? 'Complete' : 'Pending'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-cricket-primary text-cricket-primary'
                    : 'border-transparent text-cricket-text-secondary hover:text-cricket-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'auction' && (
        <div className="space-y-6">
          {auctionState === 'not_started' ? (
            <div className="card p-12 text-center">
              <Gavel className="w-16 h-16 text-cricket-text-secondary mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-semibold mb-2">Ready to Start Auction?</h2>
              <p className="text-cricket-text-secondary mb-6">
                Build your squad by bidding on the world's best cricket players
              </p>
              <button onClick={handleStartAuction} className="btn-primary text-lg px-8 py-3">
                <Play className="w-5 h-5 inline mr-2" />
                Start Auction
              </button>
            </div>
          ) : showSoldScreen && soldDetails ? (
            /* Sold/Unsold Confirmation Screen */
            <div className="card p-12 text-center">
              {soldDetails.status === 'sold' ? (
                <>
                  <div className="mb-6">
                    <Gavel className="w-20 h-20 text-green-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-green-500 mb-2">SOLD!</h2>
                  </div>

                  <div className="max-w-2xl mx-auto mb-8">
                    <div className="text-2xl font-bold text-cricket-text-primary mb-4">
                      {soldDetails.player.name}
                    </div>

                    <div className="flex items-center justify-center gap-4 mb-6">
                      <span className="px-4 py-2 bg-cricket-secondary rounded text-cricket-text-secondary">
                        {soldDetails.player.role}
                      </span>
                      <ChevronRight className="w-6 h-6 text-cricket-accent" />
                      <span className={`px-4 py-2 rounded font-semibold ${
                        soldDetails.team.isUserControlled
                          ? 'bg-cricket-primary text-white'
                          : 'bg-cricket-secondary text-cricket-text-primary'
                      }`}>
                        {soldDetails.team.name}
                      </span>
                    </div>

                    <div className="p-6 bg-cricket-secondary rounded-lg border-2 border-green-500">
                      <div className="text-sm text-cricket-text-secondary mb-2">Final Price</div>
                      <div className="text-5xl font-bold text-green-500">
                        {valuation.formatPrice(soldDetails.price)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleNextPlayer}
                    className="btn-primary text-lg px-12 py-3"
                  >
                    <ChevronRight className="w-5 h-5 inline mr-2" />
                    Next Player
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <Gavel className="w-20 h-20 text-red-500 mx-auto mb-4 opacity-50" />
                    <h2 className="text-3xl font-bold text-red-500 mb-2">UNSOLD</h2>
                  </div>

                  <div className="max-w-2xl mx-auto mb-8">
                    <div className="text-2xl font-bold text-cricket-text-primary mb-4">
                      {soldDetails.player.name}
                    </div>

                    <div className="p-6 bg-cricket-secondary rounded-lg border-2 border-red-500">
                      <p className="text-cricket-text-secondary">
                        No teams placed a bid for this player.
                        They will return to the pool for the unsold round.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleNextPlayer}
                    className="btn-primary text-lg px-12 py-3"
                  >
                    <ChevronRight className="w-5 h-5 inline mr-2" />
                    Next Player
                  </button>
                </>
              )}
            </div>
          ) : currentPlayer ? (
            <>
              {/* Current Player Card */}
              <div className="card p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Award className="w-6 h-6 text-cricket-accent" />
                      <h2 className="text-2xl font-bold">{currentPlayer.name}</h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="px-3 py-1 bg-cricket-secondary rounded text-cricket-text-primary">
                        {currentPlayer.role}
                      </span>
                      <span className="text-cricket-text-secondary">
                        Base Price: {valuation.formatPrice(currentPlayer.basePrice)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-cricket-text-secondary mb-1">Current Bid</div>
                    <div className="text-4xl font-bold text-cricket-accent">
                      {valuation.formatPrice(currentPrice)}
                    </div>
                    {highestBidder && (
                      <div className="text-sm text-cricket-text-secondary mt-1">
                        {highestBidder.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Timer Display */}
                <div className="mb-6 p-4 bg-cricket-secondary rounded-lg border-2 border-cricket-accent">
                  <div className="flex items-center justify-between">
                    <span className="text-cricket-text-secondary">Time Remaining</span>
                    <span className={`text-4xl font-bold tabular-nums ${
                      timeRemaining <= 3 ? 'text-red-500 animate-pulse' : 'text-cricket-accent'
                    }`}>
                      {timeRemaining}s
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        timeRemaining <= 3 ? 'bg-red-500' : 'bg-cricket-accent'
                      }`}
                      style={{ width: `${(timeRemaining / bidTimer) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Player Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-3 bg-cricket-secondary rounded">
                    <div className="text-xs text-cricket-text-secondary">Role</div>
                    <div className="text-sm font-semibold">{currentPlayer.role || 'Unknown'}</div>
                  </div>
                  <div className="p-3 bg-cricket-secondary rounded">
                    <div className="text-xs text-cricket-text-secondary">Nationality</div>
                    <div className="text-sm font-semibold">{currentPlayer.nationality || 'Unknown'}</div>
                  </div>
                  <div className="p-3 bg-cricket-secondary rounded">
                    <div className="text-xs text-cricket-text-secondary">Age</div>
                    <div className="text-lg font-bold">{currentPlayer.age || 'N/A'}</div>
                  </div>
                </div>

                {/* Playstyle Ratings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Batting Playstyles */}
                  <div className="p-4 bg-cricket-secondary rounded">
                    <div className="text-sm font-semibold text-cricket-accent mb-3">Batting Playstyles</div>
                    <div className="space-y-2">
                      {currentPlayer.topPlaystyles?.batting?.slice(0, 3).map((style, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs text-cricket-text-secondary">{style.name}</span>
                          <span className="text-sm font-bold">{style.rating.toFixed(1)}</span>
                        </div>
                      )) || <span className="text-xs text-cricket-text-secondary">No data</span>}
                    </div>
                  </div>

                  {/* Bowling Playstyles */}
                  <div className="p-4 bg-cricket-secondary rounded">
                    <div className="text-sm font-semibold text-cricket-accent mb-3">Bowling Playstyles</div>
                    <div className="space-y-2">
                      {currentPlayer.topPlaystyles?.bowling?.slice(0, 3).map((style, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs text-cricket-text-secondary">{style.name}</span>
                          <span className="text-sm font-bold">{style.rating.toFixed(1)}</span>
                        </div>
                      )) || <span className="text-xs text-cricket-text-secondary">No data</span>}
                    </div>
                  </div>
                </div>

                {/* Bidding Controls */}
                {isAuctioning && (
                  <>
                    {highestBidder?.id !== userTeamId ? (
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handleBid}
                          disabled={!userTeamData || currentPrice + getValidIncrement(currentPrice) > userTeamData.budgetRemaining}
                          className="btn-primary flex-1 text-lg py-3"
                        >
                          <Gavel className="w-5 h-5 inline mr-2" />
                          Bid {valuation.formatPrice(currentPrice + getValidIncrement(currentPrice))}
                        </button>
                        <button onClick={handlePass} className="btn-secondary text-lg py-3 px-8">
                          Pass
                        </button>
                      </div>
                    ) : (
                      <div className="bg-green-900/30 border border-green-700 rounded p-4 text-center">
                        <p className="text-lg font-semibold text-green-400">You are the highest bidder!</p>
                        <p className="text-sm text-cricket-text-secondary mt-1">Waiting for other teams...</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="card p-12 text-center">
              <Award className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Auction Complete!</h2>
              <p className="text-cricket-text-secondary mb-6">
                All players have been auctioned. View your squad in the Squads tab.
              </p>
              <button onClick={() => navigate('/dashboard')} className="btn-primary">
                Continue to Dashboard
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'squads' && (
        <div className="space-y-4">
          {auctionEngine?.teams.map(team => (
            <div key={team.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-lg font-semibold ${team.id === userTeamId ? 'text-cricket-accent' : ''}`}>
                  {team.name} {team.id === userTeamId && '(You)'}
                </h3>
                <div className="text-sm">
                  <span className="text-cricket-text-secondary">Budget: </span>
                  <span className="font-bold">{valuation.formatPrice(team.budgetRemaining)}</span>
                  <span className="text-cricket-text-secondary ml-3">Squad: </span>
                  <span className="font-bold">{team.squad.length}/25</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {team.squad.map((player, idx) => (
                  <div key={idx} className="text-sm p-2 bg-cricket-secondary rounded">
                    <div className="font-semibold truncate">{player.name}</div>
                    <div className="text-xs text-cricket-text-secondary">
                      {valuation.formatPrice(player.soldPrice)}
                    </div>
                  </div>
                ))}
                {team.squad.length === 0 && (
                  <div className="col-span-4 text-center text-cricket-text-secondary py-4">
                    No players yet
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'log' && (
        <div className="card p-4">
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {auctionLog.map((entry, idx) => (
              <div
                key={idx}
                className={`p-3 rounded text-sm ${
                  entry.type === 'player' ? 'bg-blue-900/30 border border-blue-700' :
                  entry.type === 'sold' ? 'bg-green-900/30 border border-green-700' :
                  entry.type === 'unsold' ? 'bg-red-900/30 border border-red-700' :
                  entry.type === 'bid' ? 'bg-cricket-secondary' :
                  entry.type === 'error' ? 'bg-red-900/50 border border-red-700' :
                  'bg-cricket-secondary/50'
                }`}
              >
                {entry.message}
              </div>
            ))}
            {auctionLog.length === 0 && (
              <div className="text-center text-cricket-text-secondary py-12">
                No auction activity yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Auction;
