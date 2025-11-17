/**
 * @file Auction.jsx
 * @description Player auction page for season start
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, Users, TrendingUp, Award, ChevronRight, Play, DollarSign, X, FastForward, SkipForward, Trophy } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useGameStore from '../../stores/gameStore';
import useAuctionStore from '../../stores/auctionStore';
import useLeagueStore from '../../stores/leagueStore';
import useInboxStore from '../../stores/inboxStore';
import AuctionEngine from '../../core/auction-system/AuctionEngine';
import PlayerValuation from '../../core/auction-system/PlayerValuation';
import PlayerCard from '../shared/PlayerCard';
import PlayerCardModal from '../shared/PlayerCardModal';
import PlayerName from '../shared/PlayerName';
import MatchWeekScheduleGenerator from '../../core/league/MatchWeekScheduleGenerator';
import MessageGenerator from '../../utils/MessageGenerator';

const Auction = () => {
  const navigate = useNavigate();
  const { teams, userTeamId, getUserTeam, addPlayerToSquad, initializeAllTeamsTactics } = useTeamStore();
  const { players, assignPlayerToTeam } = usePlayerStore();
  const { currentSeason, currentDate, gameDay, scheduleEvents, advancePhase, clearEvents } = useGameStore();
  const { initializeSeason } = useLeagueStore();
  const { addMessage } = useInboxStore();
  const savedAuction = useAuctionStore();
  const { setUserMaxBid, clearUserMaxBid, getUserMaxBid, userMaxBid, userMaxBidPlayerId } = useAuctionStore();

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
  const [maxBidInput, setMaxBidInput] = useState(''); // Input field for max bid
  const [isSkipping, setIsSkipping] = useState(false); // Track if skip operation is in progress
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [skipProgress, setSkipProgress] = useState({ current: 0, total: 0, type: '' }); // Skip progress

  const timerRef = useRef(null);
  const bidFloor = useRef(0); // Never allow bids below this
  const secondsRef = useRef(0); // Track seconds for timer
  const currentPriceRef = useRef(0); // Track current price to avoid stale state
  const highestBidderRef = useRef(null); // Track highest bidder to avoid stale state
  const isAuctioningRef = useRef(false); // Track auction state to avoid stale state
  const willingBiddersRef = useRef([]); // Pre-calculated max bids for each team
  const pendingBidsRef = useRef([]); // Track pending setTimeout IDs

  // Check for saved auction state on mount
  useEffect(() => {
    if (savedAuction.auctionState === 'in_progress' && savedAuction.rounds.length > 0) {
      console.log('📦 Restoring saved auction state...');
      console.log('Current round:', savedAuction.currentRound, 'Player index:', savedAuction.currentPlayerIndex);
      console.log('Total rounds:', savedAuction.rounds.length);

      // Create engine first to get playerPool with basePrices
      const engine = new AuctionEngine({ fastMode: false });
      const teamsArray = Object.values(teams).map(team => ({
        ...team,
        isUserControlled: team.id === userTeamId
      }));
      engine.initializeAuction(teamsArray, Object.values(players));

      // RESTORE AUCTION PROGRESS from soldPlayers
      console.log('🔄 Restoring auction progress:', savedAuction.soldPlayers.length, 'players sold');

      savedAuction.soldPlayers.forEach(sale => {
        const player = engine.playerPool.find(p => p.id === sale.playerId);
        const team = engine.teams.find(t => t.id === sale.teamId);

        if (player && team) {
          // Add player to team squad in engine
          team.squad.push({ ...player, soldPrice: sale.price });
          // Deduct from budget
          team.budgetRemaining -= sale.price;
          team.totalSpent += sale.price;

          // Also update teamStore squad (especially for user team)
          if (team.isUserControlled) {
            addPlayerToSquad(team.id, player.id);
          }

          console.log(`  ✓ ${team.name}: ${player.name} for ${sale.price} (Budget left: ${team.budgetRemaining})`);
        }
      });

      setAuctionEngine(engine);

      // Create a lookup map from engine's playerPool (has basePrices)
      const playerPoolMap = new Map();
      engine.playerPool.forEach(p => playerPoolMap.set(p.id, p));

      // Convert player IDs back to player objects with basePrices
      const roundsWithPlayers = savedAuction.rounds.map(round =>
        round.map(playerId => playerPoolMap.get(playerId)).filter(p => p)
      );

      console.log('Restored rounds with players:', roundsWithPlayers.length);

      // Restore auction state
      setAuctionState('in_progress');
      setRounds(roundsWithPlayers);
      setCurrentRound(savedAuction.currentRound);
      setCurrentPlayerIndex(savedAuction.currentPlayerIndex);

      // Start auction for current player
      const currentRoundPlayers = roundsWithPlayers[savedAuction.currentRound];
      if (currentRoundPlayers && currentRoundPlayers[savedAuction.currentPlayerIndex]) {
        const playerToAuction = currentRoundPlayers[savedAuction.currentPlayerIndex];
        console.log('🎯 Starting auction for:', playerToAuction.name, 'Base price:', playerToAuction.basePrice);
        startPlayerAuction(engine, playerToAuction, savedAuction.currentRound, savedAuction.currentPlayerIndex);
      } else {
        console.error('❌ No player found at current position');
      }
    } else if (savedAuction.auctionState === 'completed') {
      // If the auction was completed in a previous session, reset it for a new auction
      console.log('🔄 Auction was completed previously, resetting for new auction...');
      savedAuction.resetAuction();
      setAuctionState('not_started');
    } else {
      console.log('No saved auction to restore, auctionState:', savedAuction.auctionState);
    }
  }, []);

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

      // Reset auction store first (clear any stale data)
      savedAuction.resetAuction();

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

      // Initialize auction store - convert player objects to IDs only
      const roundsWithIds = auctionRounds.map(round =>
        round.map(player => player.id)
      );
      savedAuction.initializeAuction(roundsWithIds);

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

      // Check if this is user team with max bid set
      const isUserTeamWithMaxBid = team.isUserControlled && userMaxBidPlayerId === player.id && userMaxBid;

      if (isUserTeamWithMaxBid) {
        // User has set a max bid, treat as auto-bidder
        initialBidders.push({
          team,
          maxBid: userMaxBid,
          isUserAutoBid: true
        });
      } else if (!team.isUserControlled) {
        // AI team - use normal logic
        const decision = engine.ai.shouldBid(
          player,
          player.basePrice,
          team,
          auctionProgress
        );

        if (decision.shouldBid) {
          initialBidders.push({
            team,
            maxBid: decision.maxBid,
            isUserAutoBid: false
          });
        }
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
      (!bidder.team.isUserControlled || bidder.isUserAutoBid)  // Allow user if they have max bid set
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

    // Clear max bid since user is manually bidding
    if (userMaxBidPlayerId === currentPlayer.id) {
      clearUserMaxBid();
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

      // Include user team if they have max bid set
      if (team.isUserControlled && userMaxBidPlayerId === currentPlayer.id && userMaxBid) {
        willingBidders.push({
          team,
          maxBid: userMaxBid
        });
      } else if (!team.isUserControlled) {
        // AI teams use normal logic
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

  // Handle set max bid
  const handleSetMaxBid = () => {
    if (!currentPlayer || !auctionEngine) return;

    const userTeamData = auctionEngine.teams.find(t => t.id === userTeamId);
    if (!userTeamData) return;

    const maxBidAmount = parseFloat(maxBidInput);

    // Validation
    if (isNaN(maxBidAmount) || maxBidAmount <= 0) {
      addToLog('Invalid max bid amount', 'error');
      return;
    }

    const minBid = currentPriceRef.current + getValidIncrement(currentPriceRef.current);
    if (maxBidAmount < minBid) {
      addToLog(`Max bid must be at least ${valuation.formatPrice(minBid)}`, 'error');
      return;
    }

    if (maxBidAmount > userTeamData.budgetRemaining) {
      addToLog(`Max bid exceeds budget! Budget: ${valuation.formatPrice(userTeamData.budgetRemaining)}`, 'error');
      return;
    }

    // Set max bid in store
    setUserMaxBid(currentPlayer.id, maxBidAmount);
    addToLog(`Max bid set to ${valuation.formatPrice(maxBidAmount)} for ${currentPlayer.name}`, 'info');
    setMaxBidInput(''); // Clear input
  };

  // Handle clear max bid
  const handleClearMaxBid = () => {
    clearUserMaxBid();
    addToLog('Max bid cleared', 'info');
  };

  // Handle skip current round
  const handleSkipRound = async () => {
    if (!auctionEngine || !currentPlayer || isSkipping) return;

    const remainingInRound = rounds[currentRound].length - currentPlayerIndex;

    if (remainingInRound <= 0) {
      addToLog('No more players in this round to skip', 'info');
      return;
    }

    // Stop current auction immediately
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingBidsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    pendingBidsRef.current = [];
    setIsAuctioning(false);
    isAuctioningRef.current = false;

    addToLog(`Skipping ${remainingInRound} remaining players in Round ${currentRound + 1}`, 'info');
    setIsSkipping(true);
    setSkipProgress({ current: 0, total: remainingInRound, type: 'round' });

    // Calculate auction progress
    const totalPlayers = rounds.reduce((sum, round) => sum + round.length, 0);

    // Process each remaining player in the round
    for (let i = currentPlayerIndex; i < rounds[currentRound].length; i++) {
      const player = rounds[currentRound][i];
      const playersAuctioned = (currentRound * (rounds[0]?.length || 10)) + i;
      const auctionProgress = totalPlayers > 0 ? playersAuctioned / totalPlayers : 0;

      // Update progress
      setSkipProgress({ current: i - currentPlayerIndex + 1, total: remainingInRound, type: 'round' });

      // Update current position for save/load
      setCurrentPlayerIndex(i);

      // Fast auction logic for this player
      const willingBidders = [];
      for (const team of auctionEngine.teams) {
        if (team.squad.length >= auctionEngine.config.squadSize.max) continue;

        const decision = auctionEngine.ai.shouldBid(
          player,
          player.basePrice,
          team,
          auctionProgress
        );

        if (decision.shouldBid) {
          willingBidders.push({ team, maxBid: decision.maxBid });
        }
      }

      if (willingBidders.length > 0) {
        let highestBid = Math.max(...willingBidders.map(b => b.maxBid));
        highestBid = auctionEngine.floorToValidBidAmount(highestBid);
        const highestBidders = willingBidders.filter(b => b.maxBid >= highestBid);
        const winner = highestBidders[Math.floor(Math.random() * highestBidders.length)];

        // Add to squad
        winner.team.squad.push({ ...player, soldPrice: highestBid });
        winner.team.totalSpent += highestBid;
        winner.team.budgetRemaining -= highestBid;

        // Record sale
        savedAuction.recordSale(player.id, winner.team.id, highestBid);

        // Update stores - add player to team squad and assign to team
        if (player.id) {
          addPlayerToSquad(winner.team.id, player.id);
          assignPlayerToTeam(player.id, winner.team.id);
        }

        addToLog(`${player.name} → ${winner.team.name} (${valuation.formatPrice(highestBid)})`, 'sold');
      } else {
        auctionEngine.unsoldPlayers.push(player);
        addToLog(`${player.name} → UNSOLD`, 'unsold');
      }

      // Update auction store position after each player
      savedAuction.nextPlayer();

      // Small delay for animation
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsSkipping(false);
    setSkipProgress({ current: 0, total: 0, type: '' });

    // Move to next round
    moveToNextRound();
  };

  // Handle skip to end
  const handleSkipToEnd = async () => {
    if (!auctionEngine || isSkipping) return;

    // Stop current auction immediately
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingBidsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    pendingBidsRef.current = [];
    setIsAuctioning(false);
    isAuctioningRef.current = false;

    // Calculate total remaining players
    let remainingPlayers = 0;
    for (let r = currentRound; r < rounds.length; r++) {
      if (r === currentRound) {
        remainingPlayers += rounds[r].length - currentPlayerIndex;
      } else {
        remainingPlayers += rounds[r].length;
      }
    }

    if (remainingPlayers <= 0) {
      addToLog('No more players to auction', 'info');
      return;
    }

    addToLog(`Fast-forwarding through ${remainingPlayers} remaining players`, 'info');
    setIsSkipping(true);
    setSkipProgress({ current: 0, total: remainingPlayers, type: 'all' });

    const totalPlayers = rounds.reduce((sum, round) => sum + round.length, 0);
    let processed = 0;

    // Process all remaining rounds
    for (let r = currentRound; r < rounds.length; r++) {
      const startIdx = r === currentRound ? currentPlayerIndex : 0;

      for (let i = startIdx; i < rounds[r].length; i++) {
        const player = rounds[r][i];
        const playersAuctioned = (r * (rounds[0]?.length || 10)) + i;
        const auctionProgress = totalPlayers > 0 ? playersAuctioned / totalPlayers : 0;

        processed++;
        setSkipProgress({ current: processed, total: remainingPlayers, type: 'all' });

        // Update current position for save/load
        setCurrentRound(r);
        setCurrentPlayerIndex(i);

        // Fast auction logic
        const willingBidders = [];
        for (const team of auctionEngine.teams) {
          if (team.squad.length >= auctionEngine.config.squadSize.max) continue;

          const decision = auctionEngine.ai.shouldBid(
            player,
            player.basePrice,
            team,
            auctionProgress
          );

          if (decision.shouldBid) {
            willingBidders.push({ team, maxBid: decision.maxBid });
          }
        }

        if (willingBidders.length > 0) {
          let highestBid = Math.max(...willingBidders.map(b => b.maxBid));
          highestBid = auctionEngine.floorToValidBidAmount(highestBid);
          const highestBidders = willingBidders.filter(b => b.maxBid >= highestBid);
          const winner = highestBidders[Math.floor(Math.random() * highestBidders.length)];

          winner.team.squad.push({ ...player, soldPrice: highestBid });
          winner.team.totalSpent += highestBid;
          winner.team.budgetRemaining -= highestBid;

          savedAuction.recordSale(player.id, winner.team.id, highestBid);

          // Update stores - add player to team squad and assign to team
          if (player.id) {
            addPlayerToSquad(winner.team.id, player.id);
            assignPlayerToTeam(player.id, winner.team.id);
          }

          if (processed % 5 === 0) {
            addToLog(`${player.name} → ${winner.team.name} (${valuation.formatPrice(highestBid)})`, 'sold');
          }
        } else {
          auctionEngine.unsoldPlayers.push(player);
        }

        // Update auction store position after each player
        savedAuction.nextPlayer();

        // Faster delay for skip-to-end
        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    setIsSkipping(false);
    setSkipProgress({ current: 0, total: 0, type: '' });

    // Complete auction
    addToLog('Auction completed! Initializing league...', 'success');
    setCurrentPlayer(null);
    setAuctionState('completed');
    savedAuction.completeAuction();

    // Initialize league immediately (same as normal completion)
    clearEvents();
    setTimeout(() => {
      initializeLeague();
    }, 500);
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

      // Update stores - add player to team squad and assign to team
      if (player.id) {
        addPlayerToSquad(team.id, player.id);
        assignPlayerToTeam(player.id, team.id);
      }

      // Record sale in auction store
      savedAuction.recordSale(player.id, winner.id, finalPrice);

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

    // Clear user max bid for this player
    if (userMaxBidPlayerId === player.id) {
      clearUserMaxBid();
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

      // Update auction store
      savedAuction.nextPlayer();

      startPlayerAuction(auctionEngine, rounds[currentRound][nextIndex], currentRound, nextIndex);
    } else if (currentRound < rounds.length - 1) {
      // Next round
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      setCurrentPlayerIndex(0);
      addToLog(`--- Round ${nextRound + 1} ---`, 'info');

      // Update auction store
      savedAuction.nextPlayer();

      startPlayerAuction(auctionEngine, rounds[nextRound][0], nextRound, 0);
    } else {
      // Auction complete - automatically initialize league
      setAuctionState('completed');
      setCurrentPlayer(null);
      addToLog('Auction completed! Initializing league...', 'success');

      // Mark auction as completed in store
      savedAuction.completeAuction();

      // Clear auction event from calendar immediately
      clearEvents();

      // Auto-initialize league after brief delay
      setTimeout(() => {
        initializeLeague();
      }, 500);
    }
  };

  // Initialize league after auction completion
  const initializeLeague = () => {
    console.log('🏏 Initializing league after auction completion...');

    try {
      // Step 1: Get all teams from auction engine
      const clubs = auctionEngine.teams.map(team => ({
        id: team.id,
        name: team.name,
        shortName: team.shortName || team.name.substring(0, 3).toUpperCase(),
        homeVenue: team.homeGround || `${team.name} Stadium`,
        homeGround: team.homeGround || `${team.name} Stadium`,
        colors: team.colors || { primary: '#2D5F3F', secondary: '#D4AF37' }
      }));

      // Step 2: Generate league fixtures
      const scheduleGenerator = new MatchWeekScheduleGenerator();
      const { fixtures, seasonStart, seasonEnd } = scheduleGenerator.generateMatchWeekSchedule(
        clubs,
        new Date(currentDate)
      );

      console.log(`✅ Generated ${fixtures.length} fixtures`);

      // Step 3: Initialize league season
      initializeSeason({
        seasonId: `season_${currentSeason}`,
        seasonName: `Season ${currentSeason}`,
        clubs,
        fixtures,
        useMatchWeeks: false
      });

      // Step 4: Initialize tactics for all teams
      initializeAllTeamsTactics();

      // Step 5: Schedule match events in calendar
      clearEvents(); // Clear all existing events (including auction event)

      // Calculate game start date (day 1) from current date and game day
      const currentGameDate = new Date(currentDate);
      const gameStartDate = new Date(currentGameDate);
      gameStartDate.setDate(gameStartDate.getDate() - (gameDay - 1));

      // Calculate game days for each fixture based on their dates
      const matchEvents = fixtures.map(fixture => {
        const matchDate = new Date(fixture.dateObj);
        // Calculate game day number: days since game start + 1
        const daysSinceStart = Math.ceil((matchDate - gameStartDate) / (1000 * 60 * 60 * 24));
        const matchGameDay = daysSinceStart + 1;

        return {
          day: matchGameDay,
          type: 'match',
          data: fixture
        };
      });

      scheduleEvents(matchEvents);
      console.log(`📅 Scheduled ${matchEvents.length} match events starting from game day ${matchEvents[0]?.day}`);

      // Step 6: Advance game phase to league
      advancePhase('league');

      // Step 7: Generate inbox messages
      console.log('📧 Generating welcome messages...');

      // Welcome message
      addMessage(MessageGenerator.generateWelcomeMessage(userTeam, currentSeason));

      // Season expectations
      addMessage(MessageGenerator.generateExpectationsMessage(userTeam, currentSeason));

      // Tutorial message
      addMessage(MessageGenerator.generateTutorialMessage());

      // Auction summary
      const userSquad = auctionEngine.teams.find(t => t.id === userTeamId)?.squad || [];
      const finances = {
        totalSpent: auctionEngine.teams.find(t => t.id === userTeamId)?.totalSpent || 0,
        budgetRemaining: auctionEngine.teams.find(t => t.id === userTeamId)?.budgetRemaining || 0
      };
      addMessage(MessageGenerator.generateAuctionSummaryMessage(userSquad, finances));

      console.log('✅ League initialization complete!');

      // Don't auto-navigate - let user click Continue button
      // navigate('/game/home'); // REMOVED: User should click Continue
    } catch (error) {
      console.error('❌ Error initializing league:', error);
      alert(`Failed to initialize league: ${error.message}`);
    }
  };

  // Move to next round (after skipping current round)
  const moveToNextRound = () => {
    if (currentRound < rounds.length - 1) {
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      setCurrentPlayerIndex(0);
      addToLog(`--- Round ${nextRound + 1} ---`, 'info');

      // Update auction store to point to first player of next round
      savedAuction.nextPlayer();

      startPlayerAuction(auctionEngine, rounds[nextRound][0], nextRound, 0);
    } else {
      // Auction complete
      setAuctionState('completed');
      setCurrentPlayer(null);
      addToLog('Auction completed! Initializing league...', 'success');
      savedAuction.completeAuction();

      // Clear auction event from calendar immediately
      clearEvents();

      // Auto-initialize league after brief delay
      setTimeout(() => {
        initializeLeague();
      }, 1500);
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
    <div className="space-y-2">
      {/* Header - Single Line */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-cricket-text-primary flex items-center gap-2">
          <Gavel className="w-4 h-4 text-cricket-accent" />
          Player Auction • Season {currentSeason} • {userTeam?.name || 'Select Team'}
        </h1>
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
      </div>

      {/* Auction Status - Compressed */}
      {auctionEngine && (
        <div className="card p-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <div className="text-xxs text-cricket-text-secondary">Your Budget</div>
              <div className="text-base font-bold text-cricket-accent">
                {valuation.formatPrice(userTeamData?.budgetRemaining || 0)}
              </div>
            </div>
            <div>
              <div className="text-xxs text-cricket-text-secondary">Squad Size</div>
              <div className="text-base font-bold">{userTeamData?.squad.length || 0} / 25</div>
            </div>
            <div>
              <div className="text-xxs text-cricket-text-secondary">Round Progress</div>
              <div className="text-base font-bold">{currentRound + 1} / {rounds.length}</div>
            </div>
            <div>
              <div className="text-xxs text-cricket-text-secondary">Status</div>
              <div className={`text-sm font-semibold ${
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

      {/* Tabs - Compressed */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-6">
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
        <div className="space-y-2 relative">
          {/* Skip Overlay - Covers Auction Tab Only */}
          {isSkipping && (
            <div className="absolute inset-0 z-50 bg-bg-primary flex items-center justify-center rounded-lg">
              <div className="max-w-4xl w-full px-8">
                <div className="text-center mb-8">
                  <FastForward className="w-24 h-24 text-cricket-accent mx-auto mb-6 animate-pulse" />
                  <h2 className="text-4xl font-bold text-text-primary mb-4">
                    {skipProgress.type === 'round' ? `Skipping Round ${currentRound + 1}` : 'Fast-Forwarding Auction'}
                  </h2>
                  <p className="text-xl text-text-secondary">
                    Processing player auctions...
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-semibold text-text-primary">
                      {skipProgress.current} of {skipProgress.total} players
                    </span>
                    <span className="text-lg text-cricket-accent font-bold">
                      {Math.round((skipProgress.current / skipProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-bg-tertiary rounded-full h-4 overflow-hidden">
                    <div
                      className="h-4 bg-gradient-to-r from-cricket-primary to-cricket-accent transition-all duration-300 ease-out"
                      style={{ width: `${(skipProgress.current / skipProgress.total) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wide">
                    Recent Sales
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {auctionLog.slice(-10).reverse().filter(log => log.type === 'sold' || log.type === 'unsold').map((log, idx) => (
                      <div
                        key={idx}
                        className={`text-sm p-2 rounded ${
                          log.type === 'sold' ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'
                        }`}
                      >
                        {log.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {auctionState === 'not_started' ? (
            /* Not Started - Show Instructions */
            <div className="card p-8 text-center">
              <Gavel className="w-16 h-16 text-cricket-accent mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-text-primary">Ready to Start Auction</h2>
              <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-6">
                Click the "Start Auction" button above to begin the player auction for Season {currentSeason}.
                All teams will bid for players to build their squads.
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
                <div className="p-3 bg-bg-secondary rounded">
                  <div className="text-cricket-accent font-bold text-lg mb-1">25</div>
                  <div className="text-text-secondary">Players per Squad</div>
                </div>
                <div className="p-3 bg-bg-secondary rounded">
                  <div className="text-cricket-accent font-bold text-lg mb-1">10</div>
                  <div className="text-text-secondary">Teams Competing</div>
                </div>
                <div className="p-3 bg-bg-secondary rounded">
                  <div className="text-cricket-accent font-bold text-lg mb-1">5</div>
                  <div className="text-text-secondary">Auction Rounds</div>
                </div>
              </div>
            </div>
          ) : auctionState === 'completed' ? (
            /* Auction Complete - Show Detailed Summary and Continue Button */
            <div className="space-y-4">
              {/* Header */}
              <div className="card p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-green-500 mb-2">Auction Complete!</h2>
                <p className="text-lg text-text-secondary">
                  All squads have been finalized. League fixtures have been scheduled.
                </p>
              </div>

              {/* Auction Statistics */}
              {auctionEngine && (() => {
                // Calculate statistics
                const allSales = auctionEngine.teams.flatMap(team =>
                  team.squad.map(player => ({
                    name: player.name,
                    team: team.name,
                    price: player.soldPrice,
                    isUserTeam: team.isUserControlled
                  }))
                );

                const topBuys = [...allSales]
                  .sort((a, b) => b.price - a.price)
                  .slice(0, 5);

                const avgPrice = allSales.length > 0
                  ? allSales.reduce((sum, sale) => sum + sale.price, 0) / allSales.length
                  : 0;

                const teamSpending = auctionEngine.teams
                  .map(team => ({
                    name: team.name,
                    spent: team.totalSpent,
                    remaining: team.budgetRemaining,
                    players: team.squad.length,
                    isUserTeam: team.isUserControlled
                  }))
                  .sort((a, b) => b.spent - a.spent);

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Top Buys */}
                    <div className="card p-4">
                      <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                        <Award className="w-5 h-5 text-cricket-accent" />
                        Top 5 Most Expensive Buys
                      </h3>
                      <div className="space-y-2">
                        {topBuys.map((sale, idx) => (
                          <div key={idx} className={`flex items-center justify-between p-2 rounded ${
                            sale.isUserTeam ? 'bg-cricket-primary/10 border border-cricket-primary' : 'bg-bg-secondary'
                          }`}>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-text-primary">{sale.name}</div>
                              <div className="text-xs text-text-secondary">{sale.team}</div>
                            </div>
                            <div className="text-lg font-bold text-cricket-accent">
                              {valuation.formatPrice(sale.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Auction Overview */}
                    <div className="space-y-4">
                      {/* Stats */}
                      <div className="card p-4">
                        <h3 className="text-lg font-bold text-text-primary mb-3">Auction Overview</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-bg-secondary rounded">
                            <div className="text-xs text-text-secondary mb-1">Total Players Sold</div>
                            <div className="text-2xl font-bold text-cricket-accent">{allSales.length}</div>
                          </div>
                          <div className="p-3 bg-bg-secondary rounded">
                            <div className="text-xs text-text-secondary mb-1">Average Price</div>
                            <div className="text-2xl font-bold text-cricket-accent">
                              {valuation.formatPrice(avgPrice)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Your Squad Summary */}
                      {userTeamData && (
                        <div className="card p-4 bg-cricket-primary/10 border-2 border-cricket-primary">
                          <h3 className="text-lg font-bold text-text-primary mb-3">Your Squad Summary</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-text-secondary mb-1">Players Signed</div>
                              <div className="text-2xl font-bold text-cricket-accent">
                                {userTeamData.squad.length}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-text-secondary mb-1">Total Spent</div>
                              <div className="text-2xl font-bold text-text-primary">
                                {valuation.formatPrice(userTeamData.totalSpent)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-text-secondary mb-1">Budget Remaining</div>
                              <div className="text-2xl font-bold text-green-500">
                                {valuation.formatPrice(userTeamData.budgetRemaining)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-text-secondary mb-1">Avg. Price/Player</div>
                              <div className="text-2xl font-bold text-text-primary">
                                {valuation.formatPrice(userTeamData.squad.length > 0 ? userTeamData.totalSpent / userTeamData.squad.length : 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Team Spending Table */}
                    <div className="card p-4 lg:col-span-2">
                      <h3 className="text-lg font-bold text-text-primary mb-3">Team Spending Breakdown</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border-primary">
                              <th className="text-left py-2 px-3 text-text-secondary font-semibold">Team</th>
                              <th className="text-right py-2 px-3 text-text-secondary font-semibold">Players</th>
                              <th className="text-right py-2 px-3 text-text-secondary font-semibold">Total Spent</th>
                              <th className="text-right py-2 px-3 text-text-secondary font-semibold">Remaining</th>
                              <th className="text-right py-2 px-3 text-text-secondary font-semibold">Avg/Player</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamSpending.map((team, idx) => (
                              <tr key={idx} className={`border-b border-border-primary/50 ${
                                team.isUserTeam ? 'bg-cricket-primary/10' : ''
                              }`}>
                                <td className="py-2 px-3 font-semibold text-text-primary">
                                  {team.isUserTeam && '⭐ '}{team.name}
                                </td>
                                <td className="text-right py-2 px-3 text-text-primary">{team.players}</td>
                                <td className="text-right py-2 px-3 font-mono text-cricket-accent">
                                  {valuation.formatPrice(team.spent)}
                                </td>
                                <td className="text-right py-2 px-3 font-mono text-text-primary">
                                  {valuation.formatPrice(team.remaining)}
                                </td>
                                <td className="text-right py-2 px-3 font-mono text-text-secondary">
                                  {valuation.formatPrice(team.players > 0 ? team.spent / team.players : 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Continue Button */}
              <div className="card p-4 text-center">
                <button
                  onClick={() => navigate('/game/home')}
                  className="btn-primary text-lg px-8 py-3 flex items-center gap-2 mx-auto"
                >
                  <span>Continue to Season</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : showSoldScreen && soldDetails ? (
            /* Sold/Unsold Confirmation Screen */
            <div className="card p-6 text-center">
              {soldDetails.status === 'sold' ? (
                <>
                  <div className="mb-4">
                    <Gavel className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h2 className="text-2xl font-bold text-green-500 mb-2">SOLD!</h2>
                  </div>

                  <div className="max-w-3xl mx-auto mb-4">
                    {/* Player Card */}
                    <PlayerCard
                      player={soldDetails.player}
                      variant="compact"
                      soldPrice={soldDetails.price}
                      className="mb-4"
                      onClick={() => {
                        setSelectedPlayerId(soldDetails.player.id);
                        setShowPlayerModal(true);
                      }}
                    />

                    {/* Team Assignment */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <span className="px-3 py-1.5 bg-cricket-secondary rounded text-cricket-text-secondary text-sm">
                        Sold to
                      </span>
                      <ChevronRight className="w-5 h-5 text-cricket-accent" />
                      <span className={`px-3 py-1.5 rounded font-semibold text-sm ${
                        soldDetails.team.isUserControlled
                          ? 'bg-cricket-primary text-white'
                          : 'bg-cricket-secondary text-cricket-text-primary'
                      }`}>
                        {soldDetails.team.name}
                      </span>
                    </div>

                    <div className="p-4 bg-cricket-secondary rounded-lg border-2 border-green-500">
                      <div className="text-xs text-cricket-text-secondary mb-1">Final Price</div>
                      <div className="text-3xl font-bold text-green-500">
                        {valuation.formatPrice(soldDetails.price)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleNextPlayer}
                    className="btn-primary text-base px-8 py-2"
                  >
                    <ChevronRight className="w-4 h-4 inline mr-2" />
                    Next Player
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <Gavel className="w-12 h-12 text-red-500 mx-auto mb-3 opacity-50" />
                    <h2 className="text-2xl font-bold text-red-500 mb-2">UNSOLD</h2>
                  </div>

                  <div className="max-w-3xl mx-auto mb-4">
                    {/* Player Card */}
                    <PlayerCard
                      player={soldDetails.player}
                      variant="compact"
                      className="mb-4"
                      onClick={() => {
                        setSelectedPlayerId(soldDetails.player.id);
                        setShowPlayerModal(true);
                      }}
                    />

                    <div className="p-4 bg-cricket-secondary rounded-lg border-2 border-red-500">
                      <p className="text-sm text-cricket-text-secondary">
                        No teams placed a bid for this player.
                        They will return to the pool for the unsold round.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleNextPlayer}
                    className="btn-primary text-base px-8 py-2"
                  >
                    <ChevronRight className="w-4 h-4 inline mr-2" />
                    Next Player
                  </button>
                </>
              )}
            </div>
          ) : currentPlayer ? (
            <>
              {/* Current Player - Auction Layout */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Left: Player Card - Wider */}
                <div className="lg:w-1/2">
                  <PlayerCard
                    player={currentPlayer}
                    variant="auction"
                    onClick={() => {
                      setSelectedPlayerId(currentPlayer.id);
                      setShowPlayerModal(true);
                    }}
                  />
                </div>

                {/* Right: Bidding Area - Narrower */}
                <div className="lg:w-1/2 flex flex-col">
                  {/* Current Bid & Timer - Compact */}
                  <div className="card p-3 flex-1 flex flex-col justify-between">
                    {/* Current Bid */}
                    <div className="text-center mb-2">
                      <div className="text-xxs text-text-secondary mb-0.5">Current Bid</div>
                      <div className="text-3xl font-bold text-cricket-accent">
                        {valuation.formatPrice(currentPrice)}
                      </div>
                      {highestBidder && (
                        <div className="text-xs text-text-secondary mt-0.5">
                          {highestBidder.name}
                        </div>
                      )}
                    </div>

                    {/* Base Price */}
                    <div className="text-center mb-2 pb-2 border-b border-border-primary">
                      <div className="text-xxs text-text-secondary">Base Price</div>
                      <div className="text-sm font-semibold text-text-primary">
                        {valuation.formatPrice(currentPlayer.basePrice)}
                      </div>
                    </div>

                    {/* Timer Display */}
                    <div className="p-2 bg-cricket-secondary rounded-lg border-2 border-cricket-accent">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-text-secondary">Time</span>
                        <span className={`text-2xl font-bold tabular-nums ${
                          timeRemaining <= 3 ? 'text-red-500 animate-pulse' : 'text-cricket-accent'
                        }`}>
                          {timeRemaining}s
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-1000 ${
                            timeRemaining <= 3 ? 'bg-red-500' : 'bg-cricket-accent'
                          }`}
                          style={{ width: `${(timeRemaining / bidTimer) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bidding Controls - Below Player Info */}
              <div className="card p-2">
                {isAuctioning && (
                  <>
                    {highestBidder?.id !== userTeamId ? (
                      <>
                        {/* Row 1: Bid Button OR Set Custom Max Bid */}
                        <div className="flex items-center gap-3 mb-3">
                          <button
                            onClick={handleBid}
                            disabled={!userTeamData || currentPrice + getValidIncrement(currentPrice) > userTeamData.budgetRemaining}
                            className="btn-primary flex-1 text-base py-3"
                          >
                            <Gavel className="w-5 h-5 inline mr-2" />
                            Bid {valuation.formatPrice(currentPrice + getValidIncrement(currentPrice))}
                          </button>

                          <span className="text-sm text-text-tertiary px-2">or</span>

                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="number"
                              value={maxBidInput}
                              onChange={(e) => setMaxBidInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSetMaxBid();
                                }
                              }}
                              placeholder="Custom max bid"
                              className="input-field flex-1 text-sm"
                              min={currentPrice + getValidIncrement(currentPrice)}
                            />
                            <button
                              onClick={handleSetMaxBid}
                              disabled={!maxBidInput}
                              className="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
                            >
                              Set Max
                            </button>
                          </div>
                        </div>

                        {/* Max Bid Active Indicator */}
                        {userMaxBid && userMaxBidPlayerId === currentPlayer?.id && (
                          <div className="p-2 bg-green-900/20 border border-green-700/30 rounded flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-400" />
                              <span className="text-xs text-green-400">Auto-bid active: {valuation.formatPrice(userMaxBid)}</span>
                            </div>
                            <button
                              onClick={handleClearMaxBid}
                              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Clear
                            </button>
                          </div>
                        )}

                        {/* Row 2: Skip Player | Skip Round | Skip to End */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handlePass}
                            className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-1"
                          >
                            <ChevronRight className="w-4 h-4" />
                            Skip Player
                          </button>
                          <button
                            onClick={handleSkipRound}
                            className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-1"
                            disabled={rounds[currentRound].length - currentPlayerIndex <= 1}
                          >
                            <SkipForward className="w-4 h-4" />
                            Skip Round
                          </button>
                          <button
                            onClick={handleSkipToEnd}
                            className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-1"
                          >
                            <FastForward className="w-4 h-4" />
                            Skip to End
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="bg-green-900/30 border border-green-700 rounded p-4 text-center">
                        <p className="text-base font-semibold text-green-400">You are the highest bidder!</p>
                        <p className="text-sm text-cricket-text-secondary mt-1">Waiting for other teams...</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {/* Completion Header */}
              <div className="card p-8 text-center bg-gradient-to-br from-cricket-primary/20 to-cricket-accent/20">
                <Award className="w-20 h-20 text-cricket-accent mx-auto mb-4" />
                <h2 className="text-4xl font-bold mb-2 text-text-primary">Auction Complete!</h2>
                <p className="text-xl text-text-secondary">
                  All players have been allocated. Here's a summary of the auction.
                </p>
              </div>

              {/* Highest Buys */}
              <div className="card p-6">
                <h3 className="text-2xl font-bold mb-6 text-cricket-accent flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  Highest Buys
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {auctionEngine?.teams
                    .flatMap(team =>
                      team.squad.map(player => ({
                        ...player,
                        teamName: team.name,
                        teamId: team.id
                      }))
                    )
                    .sort((a, b) => b.soldPrice - a.soldPrice)
                    .slice(0, 9)
                    .map((player, idx) => (
                      <div key={idx} className="p-4 bg-bg-tertiary rounded-lg border border-border-primary">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold truncate">
                              <PlayerName playerId={player.id} player={player} className="font-bold" />
                            </div>
                            <div className="text-xs text-text-secondary">{player.role}</div>
                          </div>
                          <div className="text-xs font-bold text-cricket-accent bg-cricket-primary/20 px-2 py-1 rounded">
                            #{idx + 1}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-text-tertiary">{player.teamName}</span>
                          <span className="text-lg font-bold text-cricket-accent">
                            {valuation.formatPrice(player.soldPrice)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Team Summary */}
              <div className="card p-6">
                <h3 className="text-2xl font-bold mb-6 text-cricket-accent flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Final Team Squads & Budgets
                </h3>
                <div className="space-y-2">
                  {auctionEngine?.teams.map(team => (
                    <div
                      key={team.id}
                      className={`p-4 rounded-lg border-2 ${
                        team.isUserControlled
                          ? 'bg-cricket-primary/10 border-cricket-accent'
                          : 'bg-bg-tertiary border-border-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h4 className={`text-lg font-bold ${
                            team.isUserControlled ? 'text-cricket-accent' : 'text-text-primary'
                          }`}>
                            {team.name}
                            {team.isUserControlled && <span className="ml-2 text-sm text-cricket-accent-light">(Your Team)</span>}
                          </h4>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-text-secondary">Remaining Budget</div>
                          <div className={`text-xl font-bold ${
                            team.budgetRemaining < 500000 ? 'text-red-400' :
                            team.budgetRemaining < 1000000 ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {valuation.formatPrice(team.budgetRemaining)}
                          </div>
                        </div>
                      </div>

                      {/* Team Stats */}
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="p-2 bg-bg-secondary rounded">
                          <div className="text-xs text-text-secondary">Squad Size</div>
                          <div className="text-lg font-bold text-text-primary">{team.squad.length}</div>
                        </div>
                        <div className="p-2 bg-bg-secondary rounded">
                          <div className="text-xs text-text-secondary">Total Spent</div>
                          <div className="text-sm font-bold text-text-primary">
                            {valuation.formatPrice(team.totalSpent)}
                          </div>
                        </div>
                        <div className="p-2 bg-bg-secondary rounded">
                          <div className="text-xs text-text-secondary">Avg Price</div>
                          <div className="text-sm font-bold text-text-primary">
                            {valuation.formatPrice(team.squad.length > 0 ? team.totalSpent / team.squad.length : 0)}
                          </div>
                        </div>
                        <div className="p-2 bg-bg-secondary rounded">
                          <div className="text-xs text-text-secondary">Top Buy</div>
                          <div className="text-sm font-bold text-text-primary">
                            {team.squad.length > 0
                              ? valuation.formatPrice(Math.max(...team.squad.map(p => p.soldPrice)))
                              : '$0'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* League initialization happens automatically */}
              <div className="text-center text-text-secondary text-sm mt-4">
                League will be initialized automatically. Please wait...
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'squads' && (
        <div className="space-y-2">
          {auctionEngine?.teams.map(team => {
            // Categorize players by role
            const playersByRole = {
              'batsman': team.squad.filter(p => p.role === 'batsman'),
              'bowler': team.squad.filter(p => p.role === 'bowler'),
              'all-rounder': team.squad.filter(p => p.role === 'all-rounder'),
              'wicket-keeper': team.squad.filter(p => p.role === 'wicket-keeper')
            };

            const roleLabels = {
              'batsman': 'Batsmen',
              'bowler': 'Bowlers',
              'all-rounder': 'All-Rounders',
              'wicket-keeper': 'Wicket-Keepers'
            };

            return (
              <div key={team.id} className="card p-2">
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

                {team.squad.length === 0 ? (
                  <div className="text-center text-cricket-text-secondary py-4">
                    No players yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(playersByRole).map(([role, players]) => {
                      if (players.length === 0) return null;

                      return (
                        <div key={role}>
                          <h4 className="text-sm font-semibold text-cricket-accent mb-2">
                            {roleLabels[role]} ({players.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {players.map((player, idx) => (
                              <div key={idx} className="text-sm p-2 bg-cricket-secondary rounded border border-border-primary">
                                <div className="font-semibold truncate">
                                  <PlayerName playerId={player.id} player={player} className="font-semibold text-sm" />
                                </div>
                                <div className="text-xs text-cricket-text-secondary truncate">
                                  {role === 'wicket-keeper' && player.primaryPlaystyle?.fielding ? (
                                    <span>{player.primaryPlaystyle.fielding}</span>
                                  ) : (
                                    <>
                                      {player.primaryPlaystyle?.batting && (
                                        <span>{player.primaryPlaystyle.batting}</span>
                                      )}
                                      {player.primaryPlaystyle?.bowling && role === 'all-rounder' && (
                                        <span> | {player.primaryPlaystyle.bowling}</span>
                                      )}
                                      {player.primaryPlaystyle?.bowling && role === 'bowler' && (
                                        <span>{player.primaryPlaystyle.bowling}</span>
                                      )}
                                      {!player.primaryPlaystyle?.batting && !player.primaryPlaystyle?.bowling && !player.primaryPlaystyle?.fielding && (
                                        <span className="text-cricket-text-tertiary">—</span>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="text-xs text-cricket-accent font-bold mt-1">
                                  {valuation.formatPrice(player.soldPrice)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'log' && (
        <div className="card p-2">
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

      {/* Player Card Modal */}
      <PlayerCardModal
        isOpen={showPlayerModal}
        onClose={() => {
          setShowPlayerModal(false);
          setSelectedPlayerId(null);
        }}
        playerId={selectedPlayerId}
      />
    </div>
  );
};

export default Auction;
