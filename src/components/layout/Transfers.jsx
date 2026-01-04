/**
 * @file Transfers.jsx
 * @description Player auction and transfers management page
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Gavel, Users, TrendingUp, Award, ChevronRight, Play, DollarSign, X, FastForward, SkipForward, Trophy, Calendar, List, Zap, HelpCircle } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useGameStore from '../../stores/gameStore';
import useAuctionStore from '../../stores/auctionStore';
import useLeagueStore from '../../stores/leagueStore';
import useFinanceStore from '../../stores/financeStore';
import useInboxStore from '../../stores/inboxStore';
import useTransferStore from '../../stores/transferStore';
import AuctionEngine from '../../core/auction-system/AuctionEngine';
import aiCore from '../../core/ai/AICore';
import PlayerCard from '../shared/PlayerCard';
import PlayerCardModal from '../shared/PlayerCardModal';
import PlayerName from '../shared/PlayerName';
import MatchWeekScheduleGenerator from '../../core/league/MatchWeekScheduleGenerator';
import MessageGenerator from '../../utils/MessageGenerator';
import TransferMarketView from '../Transfers/TransferMarketView';
import { useTransferSystem } from '../../hooks/useTransferSystem';
import { initializeLeague as sharedInitializeLeague } from '../../utils/LeagueInitializer';
import { ContextualTip, useScreenTip, screenTips, TutorialSpotlight, useAuctionTutorial, auctionTutorialSteps } from '../tutorial';

const Transfers = () => {
  const { teams, userTeamId, getUserTeam, addPlayerToSquad, initializeAllTeamsTactics } = useTeamStore();
  const { players, assignPlayerToTeam, setPlayerSoldPrice } = usePlayerStore();
  const { currentSeason, currentDate, gameDay, scheduleEvents, advancePhase, clearEvents, currentWeek, currentPhase } = useGameStore();
  const { initializeSeason } = useLeagueStore();
  const { initializeSeason: initializeFinances, processAuctionSpending } = useFinanceStore();
  const { addMessage } = useInboxStore();
  const savedAuction = useAuctionStore();
  const { setUserMaxBid, clearUserMaxBid, getUserMaxBid, userMaxBid, userMaxBidPlayerId, userAutoBidEnabled, toggleAutoBid, setAutoBid } = useAuctionStore();
  const { transferWindow, openTransferWindow, closeTransferWindow } = useTransferStore();

  // Initialize transfer system
  const { transferHandler, transferMarket, isReady } = useTransferSystem();

  const userTeam = getUserTeam();

  // Tutorial: Screen tip for first-time visitors
  const { shouldShow: showTip, dismiss: dismissTip } = useScreenTip('transfers');

  // Reconstruct auction summary from persisted data (for when user navigates away and comes back)
  const auctionSummary = useMemo(() => {
    if (savedAuction.auctionState !== 'completed' || !savedAuction.soldPlayers.length) return null;

    // Build summary from soldPlayers data
    const teamSummaries = {};
    const allSales = [];

    // Initialize team summaries
    Object.values(teams).forEach(team => {
      teamSummaries[team.id] = {
        id: team.id,
        name: team.name,
        isUserControlled: team.id === userTeamId,
        squad: [],
        totalSpent: 0,
        budgetRemaining: 10000000 // Starting budget
      };
    });

    // Process sold players
    savedAuction.soldPlayers.forEach(sale => {
      const player = players[sale.playerId];
      const team = teamSummaries[sale.teamId];

      if (player && team) {
        team.squad.push({ ...player, soldPrice: sale.price });
        team.totalSpent += sale.price;
        team.budgetRemaining -= sale.price;

        allSales.push({
          name: player.name,
          team: team.name,
          price: sale.price,
          isUserTeam: team.isUserControlled
        });
      }
    });

    const topBuys = [...allSales]
      .sort((a, b) => b.price - a.price)
      .slice(0, 5);

    const avgPrice = allSales.length > 0
      ? allSales.reduce((sum, sale) => sum + sale.price, 0) / allSales.length
      : 0;

    const teamSpending = Object.values(teamSummaries)
      .sort((a, b) => b.totalSpent - a.totalSpent);

    const userTeamSummary = teamSummaries[userTeamId];

    return {
      allSales,
      topBuys,
      avgPrice,
      teamSpending,
      userTeamSummary
    };
  }, [savedAuction.auctionState, savedAuction.soldPlayers, teams, players, userTeamId]);

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
  const [maxBidInput, setMaxBidInput] = useState('');
  const [isSkipping, setIsSkipping] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [skipProgress, setSkipProgress] = useState({ current: 0, total: 0, type: '' });
  const [roundMetadata, setRoundMetadata] = useState([]);

  // Tutorial: Auction walkthrough when auction starts
  // Must be after auctionState and setActiveTab declarations
  const {
    shouldShowTutorial: showAuctionTutorial,
    currentStep: auctionTutorialStep,
    advance: advanceAuctionTutorial,
    skip: skipAuctionTutorial,
    totalSteps: auctionTutorialTotalSteps
  } = useAuctionTutorial(auctionState, setActiveTab);

  const timerRef = useRef(null);
  const bidFloor = useRef(0);
  const secondsRef = useRef(0);
  const currentPriceRef = useRef(0);
  const highestBidderRef = useRef(null);
  const isAuctioningRef = useRef(false);
  const willingBiddersRef = useRef([]);
  const pendingBidsRef = useRef([]);

  // Transfer window management
  const isTransferWindowOpen = transferWindow.isOpen || (currentWeek >= 22 && currentWeek <= 26);
  const isLeagueActive = currentPhase === 'league' || currentPhase === 'playoffs';
  const auctionCompleted = savedAuction.auctionState === 'completed';

  // Automatically open/close transfer window based on current week
  useEffect(() => {
    if (!isReady || !transferMarket || !auctionCompleted) return;

    const isOffSeasonWindow = currentWeek >= 22 && currentWeek <= 26;
    const shouldBeOpen = isOffSeasonWindow;

    if (shouldBeOpen && !transferWindow.isOpen) {
      console.log(`🔓 Opening off-season transfer window (Week ${currentWeek})`);
      transferMarket.openTransferWindow('offSeason', currentWeek, 14);
      openTransferWindow(22, 26);
    } else if (!shouldBeOpen && transferWindow.isOpen) {
      console.log(`🔒 Closing transfer window (Week ${currentWeek})`);
      transferMarket.closeTransferWindow();
      closeTransferWindow();
    }
  }, [currentWeek, transferWindow.isOpen, transferMarket, isReady, openTransferWindow, closeTransferWindow, auctionCompleted]);

  // Warn user if they try to close browser/tab during active auction
  useEffect(() => {
    if (savedAuction.auctionState === 'in_progress') {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Auction in progress. Are you sure you want to leave?';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [savedAuction.auctionState]);

  // Check for saved auction state on mount
  useEffect(() => {
    if (savedAuction.auctionState === 'in_progress' && savedAuction.rounds.length > 0) {
      console.log('📦 Restoring saved auction state...');
      const engine = new AuctionEngine({ fastMode: false });
      const teamsArray = Object.values(teams).map(team => ({
        ...team,
        isUserControlled: team.id === userTeamId
      }));
      engine.initializeAuction(teamsArray, Object.values(players));

      savedAuction.soldPlayers.forEach(sale => {
        const player = engine.playerPool.find(p => p.id === sale.playerId);
        const team = engine.teams.find(t => t.id === sale.teamId);
        if (player && team) {
          team.squad.push({ ...player, soldPrice: sale.price });
          team.budgetRemaining -= sale.price;
          team.totalSpent += sale.price;
          if (team.isUserControlled) {
            addPlayerToSquad(team.id, player.id);
          }
        }
      });

      setAuctionEngine(engine);
      const playerPoolMap = new Map();
      engine.playerPool.forEach(p => playerPoolMap.set(p.id, p));
      const roundsWithPlayers = savedAuction.rounds.map(round =>
        round.map(playerId => playerPoolMap.get(playerId)).filter(p => p)
      );

      setAuctionState('in_progress');
      setRounds(roundsWithPlayers);
      setCurrentRound(savedAuction.currentRound);
      setCurrentPlayerIndex(savedAuction.currentPlayerIndex);

      const currentRoundPlayers = roundsWithPlayers[savedAuction.currentRound];
      if (currentRoundPlayers && currentRoundPlayers[savedAuction.currentPlayerIndex]) {
        const playerToAuction = currentRoundPlayers[savedAuction.currentPlayerIndex];
        startPlayerAuction(engine, playerToAuction, savedAuction.currentRound, savedAuction.currentPlayerIndex);
      }
    } else if (savedAuction.auctionState === 'completed') {
      setAuctionState('completed');
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

      savedAuction.resetAuction();
      const engine = new AuctionEngine({ fastMode: false });
      const teamsArray = Object.values(teams).map(team => ({
        ...team,
        isUserControlled: team.id === userTeamId
      }));
      engine.initializeAuction(teamsArray, playersArray);

      const categorized = engine.categorizePlayers();
      const auctionRounds = engine.createAuctionRounds(categorized);

      setAuctionEngine(engine);
      setRounds(auctionRounds);
      setRoundMetadata(engine.getRoundMetadata());
      setAuctionState('in_progress');
      setCurrentRound(0);
      setCurrentPlayerIndex(0);

      const roundsWithIds = auctionRounds.map(round => round.map(player => player.id));
      savedAuction.initializeAuction(roundsWithIds);

      if (auctionRounds.length > 0 && auctionRounds[0].length > 0) {
        startPlayerAuction(engine, auctionRounds[0][0], 0, 0);
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

    addToLog(`Now auctioning: ${player.name} (${player.role}) - Base Price: ${aiCore.formatPrice(player.basePrice)}`, 'player');

    const totalPlayers = rounds.reduce((sum, round) => sum + round.length, 0);
    const playersAuctioned = (roundIndex * (rounds[0]?.length || 10)) + playerIndex;
    const auctionProgress = totalPlayers > 0 ? playersAuctioned / totalPlayers : 0;

    const initialBidders = [];
    for (const team of engine.teams) {
      if (team.squad.length >= engine.config.squadSize.max) continue;

      const isUserTeamWithMaxBid = team.isUserControlled && userMaxBidPlayerId === player.id && userMaxBid;

      if (isUserTeamWithMaxBid) {
        initialBidders.push({
          team,
          maxBid: userMaxBid,
          isUserAutoBid: true
        });
      } else if (!team.isUserControlled) {
        const decision = engine.ai.shouldBid(player, player.basePrice, team, auctionProgress);
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
    startBidTimer(engine, player, auctionProgress);
    startAIBiddingRace(engine, player, auctionProgress);
  };

  const startBidTimer = (engine, player, auctionProgress) => {
    const bidTimerDuration = engine.config.timing.bidTimer;
    const tick = () => {
      secondsRef.current += 1;
      setSecondsSinceLastBid(secondsRef.current);
      if (secondsRef.current >= bidTimerDuration) {
        finalizePlayerAuction(engine, player);
      } else {
        timerRef.current = setTimeout(tick, 1000);
      }
    };
    timerRef.current = setTimeout(tick, 1000);
  };

  const startAIBiddingRace = (engine, player, auctionProgress) => {
    if (!engine || !player || !isAuctioningRef.current) return;

    pendingBidsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    pendingBidsRef.current = [];

    const price = currentPriceRef.current;
    const currentHighestBidder = highestBidderRef.current;
    const increment = getValidIncrement(price);
    const nextBid = price + increment;

    const activeBidders = willingBiddersRef.current.filter(bidder =>
      bidder.maxBid >= nextBid &&
      bidder.team.id !== currentHighestBidder?.id &&
      (!bidder.team.isUserControlled || bidder.isUserAutoBid)
    );

    if (activeBidders.length === 0) return;

    const minDelay = (engine.config.timing.aiBidDelayMin || 1) * 1000;
    const maxDelay = (engine.config.timing.aiBidDelayMax || 5) * 1000;

    activeBidders.forEach(bidder => {
      const delay = Math.random() * (maxDelay - minDelay) + minDelay;
      const timeoutId = setTimeout(() => {
        if (isAuctioningRef.current && currentPriceRef.current === price) {
          const currentIncrement = getValidIncrement(currentPriceRef.current);
          const bidAmount = currentPriceRef.current + currentIncrement;
          placeBid(bidder.team, bidAmount, engine, player, auctionProgress);
        }
      }, delay);
      pendingBidsRef.current.push(timeoutId);
    });
  };

  const placeBid = (team, amount, engine, player, auctionProgress) => {
    if (amount <= currentPriceRef.current) return;

    const validAmount = Math.max(amount, bidFloor.current);
    setCurrentPrice(validAmount);
    currentPriceRef.current = validAmount;
    setHighestBidder(team);
    highestBidderRef.current = team;
    setSecondsSinceLastBid(0);
    secondsRef.current = 0;
    bidFloor.current = validAmount;

    addToLog(`${team.name} bids ${aiCore.formatPrice(validAmount)}`, 'bid');

    if (timerRef.current) clearTimeout(timerRef.current);
    if (engine && player && auctionProgress !== undefined) {
      startBidTimer(engine, player, auctionProgress);
      startAIBiddingRace(engine, player, auctionProgress);
    }
  };

  const handleBid = () => {
    if (!currentPlayer || !auctionEngine) return;

    const userTeamData = auctionEngine.teams.find(t => t.id === userTeamId);
    if (!userTeamData) return;

    const price = currentPriceRef.current;
    const increment = getValidIncrement(price);
    const nextBid = price + increment;

    if (nextBid > userTeamData.budgetRemaining) {
      addToLog(`Insufficient funds! Budget remaining: ${aiCore.formatPrice(userTeamData.budgetRemaining)}`, 'error');
      return;
    }

    if (userMaxBidPlayerId === currentPlayer.id) clearUserMaxBid();

    const totalPlayers = rounds.reduce((sum, round) => sum + round.length, 0);
    const playersAuctioned = (currentRound * (rounds[0]?.length || 10)) + currentPlayerIndex;
    const auctionProgress = totalPlayers > 0 ? playersAuctioned / totalPlayers : 0;

    placeBid(userTeamData, nextBid, auctionEngine, currentPlayer, auctionProgress);
  };

  const handlePass = () => {
    if (!auctionEngine || !currentPlayer) return;

    addToLog(`${userTeam?.name} passes - fast-tracking auction`, 'pass');

    if (timerRef.current) clearTimeout(timerRef.current);

    const totalPlayers = rounds.reduce((sum, round) => sum + round.length, 0);
    const playersAuctioned = (currentRound * (rounds[0]?.length || 10)) + currentPlayerIndex;
    const auctionProgress = totalPlayers > 0 ? playersAuctioned / totalPlayers : 0;

    const price = currentPriceRef.current;
    const willingBidders = [];

    for (const team of auctionEngine.teams) {
      if (team.squad.length >= auctionEngine.config.squadSize.max) continue;

      if (team.isUserControlled) {
        // Only auto-bid if toggle is ON and max bid is set
        if (userAutoBidEnabled && userMaxBidPlayerId === currentPlayer.id && userMaxBid) {
          willingBidders.push({ team, maxBid: userMaxBid });
        }
        // If toggle is OFF, user team never participates in skip bidding
      } else {
        // AI teams always bid
        const decision = auctionEngine.ai.shouldBid(currentPlayer, price, team, auctionProgress);
        if (decision.shouldBid) {
          willingBidders.push({ team, maxBid: decision.maxBid });
        }
      }
    }

    if (willingBidders.length > 0) {
      // Use second-price auction logic
      const bids = willingBidders.map(b => ({
        teamId: b.team.id,
        team: b.team,
        amount: auctionEngine.floorToValidBidAmount(b.maxBid)
      }));

      const result = auctionEngine.ai.determineWinningBid(bids);

      if (result) {
        setCurrentPrice(result.paidPrice);
        currentPriceRef.current = result.paidPrice;
        setHighestBidder(result.team);
        highestBidderRef.current = result.team;

        addToLog(`Fast auction: ${result.team.name} wins at ${aiCore.formatPrice(result.paidPrice)} (2nd-price)`, 'bid');
      }
    }

    finalizePlayerAuction(auctionEngine, currentPlayer);
  };

  const handleSetMaxBid = () => {
    if (!currentPlayer || !auctionEngine) return;

    const userTeamData = auctionEngine.teams.find(t => t.id === userTeamId);
    if (!userTeamData) return;

    const inputValue = parseFloat(maxBidInput);

    if (isNaN(inputValue) || inputValue <= 0) {
      addToLog('Invalid max bid amount', 'error');
      return;
    }

    // Scale by 1000 (user inputs 900 = 900K = 900,000)
    const maxBidAmount = inputValue * 1000;

    const minBid = currentPriceRef.current + getValidIncrement(currentPriceRef.current);
    if (maxBidAmount < minBid) {
      addToLog(`Max bid must be at least ${aiCore.formatPrice(minBid)} (${(minBid / 1000).toFixed(0)}K)`, 'error');
      return;
    }

    if (maxBidAmount > userTeamData.budgetRemaining) {
      addToLog(`Max bid exceeds budget! Budget: ${aiCore.formatPrice(userTeamData.budgetRemaining)} (${(userTeamData.budgetRemaining / 1000).toFixed(0)}K)`, 'error');
      return;
    }

    setUserMaxBid(currentPlayer.id, maxBidAmount);
    addToLog(`Max bid set to ${aiCore.formatPrice(maxBidAmount)} for ${currentPlayer.name}`, 'info');
    setMaxBidInput('');
  };

  const handleClearMaxBid = () => {
    clearUserMaxBid();
    addToLog('Max bid cleared', 'info');
  };

  const handleSkipRound = async () => {
    if (!auctionEngine || !currentPlayer || isSkipping) return;

    const remainingInRound = rounds[currentRound].length - currentPlayerIndex;
    if (remainingInRound <= 0) return;

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

    const totalPlayers = rounds.reduce((sum, round) => sum + round.length, 0);

    for (let i = currentPlayerIndex; i < rounds[currentRound].length; i++) {
      const player = rounds[currentRound][i];
      const playersAuctioned = (currentRound * (rounds[0]?.length || 10)) + i;
      const auctionProgress = totalPlayers > 0 ? playersAuctioned / totalPlayers : 0;

      setSkipProgress({ current: i - currentPlayerIndex + 1, total: remainingInRound, type: 'round' });
      setCurrentPlayerIndex(i);

      const willingBidders = [];
      for (const team of auctionEngine.teams) {
        if (team.squad.length >= auctionEngine.config.squadSize.max) continue;

        if (team.isUserControlled) {
          // Only include user team if auto-bid is enabled
          if (userAutoBidEnabled) {
            const decision = auctionEngine.ai.shouldBid(player, player.basePrice, team, auctionProgress);
            if (decision.shouldBid) {
              willingBidders.push({ team, maxBid: decision.maxBid });
            }
          }
        } else {
          // AI teams always bid
          const decision = auctionEngine.ai.shouldBid(player, player.basePrice, team, auctionProgress);
          if (decision.shouldBid) {
            willingBidders.push({ team, maxBid: decision.maxBid });
          }
        }
      }

      if (willingBidders.length > 0) {
        // Use second-price auction logic
        const bids = willingBidders.map(b => ({
          teamId: b.team.id,
          team: b.team,
          amount: auctionEngine.floorToValidBidAmount(b.maxBid)
        }));

        const result = auctionEngine.ai.determineWinningBid(bids);

        if (result) {
          result.team.squad.push({ ...player, soldPrice: result.paidPrice });
          result.team.totalSpent += result.paidPrice;
          result.team.budgetRemaining -= result.paidPrice;

          savedAuction.recordSale(player.id, result.team.id, result.paidPrice);
          if (player.id) {
            addPlayerToSquad(result.team.id, player.id);
            assignPlayerToTeam(player.id, result.team.id);
            setPlayerSoldPrice(player.id, result.paidPrice);
          }
          addToLog(`${player.name} → ${result.team.name} (${aiCore.formatPrice(result.paidPrice)})`, 'sold');
        }
      } else {
        auctionEngine.unsoldPlayers.push(player);
        addToLog(`${player.name} → UNSOLD`, 'unsold');
      }

      savedAuction.nextPlayer();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsSkipping(false);
    setSkipProgress({ current: 0, total: 0, type: '' });
    moveToNextRound();
  };

  const handleSkipToEnd = async () => {
    if (!auctionEngine || isSkipping) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingBidsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    pendingBidsRef.current = [];
    setIsAuctioning(false);
    isAuctioningRef.current = false;

    let remainingPlayers = 0;
    for (let r = currentRound; r < rounds.length; r++) {
      if (r === currentRound) {
        remainingPlayers += rounds[r].length - currentPlayerIndex;
      } else {
        remainingPlayers += rounds[r].length;
      }
    }

    if (remainingPlayers <= 0) return;

    addToLog(`Fast-forwarding through ${remainingPlayers} remaining players`, 'info');
    setIsSkipping(true);
    setSkipProgress({ current: 0, total: remainingPlayers, type: 'all' });

    const totalPlayers = rounds.reduce((sum, round) => sum + round.length, 0);
    let processed = 0;

    for (let r = currentRound; r < rounds.length; r++) {
      const startIdx = r === currentRound ? currentPlayerIndex : 0;

      for (let i = startIdx; i < rounds[r].length; i++) {
        const player = rounds[r][i];
        const playersAuctioned = (r * (rounds[0]?.length || 10)) + i;
        const auctionProgress = totalPlayers > 0 ? playersAuctioned / totalPlayers : 0;

        processed++;
        setSkipProgress({ current: processed, total: remainingPlayers, type: 'all' });
        setCurrentRound(r);
        setCurrentPlayerIndex(i);

        const willingBidders = [];
        for (const team of auctionEngine.teams) {
          if (team.squad.length >= auctionEngine.config.squadSize.max) continue;

          if (team.isUserControlled) {
            // Only include user team if auto-bid is enabled
            if (userAutoBidEnabled) {
              const decision = auctionEngine.ai.shouldBid(player, player.basePrice, team, auctionProgress);
              if (decision.shouldBid) {
                willingBidders.push({ team, maxBid: decision.maxBid });
              }
            }
          } else {
            // AI teams always bid
            const decision = auctionEngine.ai.shouldBid(player, player.basePrice, team, auctionProgress);
            if (decision.shouldBid) {
              willingBidders.push({ team, maxBid: decision.maxBid });
            }
          }
        }

        if (willingBidders.length > 0) {
          // Use second-price auction logic
          const bids = willingBidders.map(b => ({
            teamId: b.team.id,
            team: b.team,
            amount: auctionEngine.floorToValidBidAmount(b.maxBid)
          }));

          const result = auctionEngine.ai.determineWinningBid(bids);

          if (result) {
            result.team.squad.push({ ...player, soldPrice: result.paidPrice });
            result.team.totalSpent += result.paidPrice;
            result.team.budgetRemaining -= result.paidPrice;
            savedAuction.recordSale(player.id, result.team.id, result.paidPrice);

            if (player.id) {
              addPlayerToSquad(result.team.id, player.id);
              assignPlayerToTeam(player.id, result.team.id);
              setPlayerSoldPrice(player.id, result.paidPrice);
            }

            if (processed % 5 === 0) {
              addToLog(`${player.name} → ${result.team.name} (${aiCore.formatPrice(result.paidPrice)})`, 'sold');
            }
          }
        } else {
          auctionEngine.unsoldPlayers.push(player);
        }

        savedAuction.nextPlayer();

        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Check if user needs minimum squad enforcement before unsold round
    const userTeamData = auctionEngine.teams.find(t => t.id === userTeamId);
    const needsMinimumEnforcement = userTeamData && userTeamData.squad.length < auctionEngine.config.squadSize.min;
    const originalAutoBidState = userAutoBidEnabled;

    if (needsMinimumEnforcement && !originalAutoBidState) {
      addToLog('⚠️ Squad below minimum (18 players). Auto-bid temporarily enabled for unsold round.', 'system');
      setAutoBid(true);
    }

    // Check for unsold players and run unsold round
    if (auctionEngine.hasUnsoldPlayers()) {
      const { players: unsoldPlayers } = auctionEngine.createUnsoldRound();

      if (unsoldPlayers.length > 0) {
        addToLog(`--- UNSOLD ROUND (${unsoldPlayers.length} players at 50% base price) ---`, 'info');
        setSkipProgress({ current: 0, total: unsoldPlayers.length, type: 'unsold' });

        for (let i = 0; i < unsoldPlayers.length; i++) {
          const player = unsoldPlayers[i];
          const auctionProgress = 0.95 + (i / unsoldPlayers.length) * 0.05;

          setSkipProgress({ current: i + 1, total: unsoldPlayers.length, type: 'unsold' });

          const willingBidders = [];
          for (const team of auctionEngine.teams) {
            if (team.squad.length >= auctionEngine.config.squadSize.max) continue;

            if (team.isUserControlled) {
              // In unsold round, use current auto-bid state (which may have been forced ON)
              if (useAuctionStore.getState().userAutoBidEnabled) {
                const decision = auctionEngine.ai.shouldBid(player, player.basePrice, team, auctionProgress);
                if (decision.shouldBid) {
                  willingBidders.push({ team, maxBid: decision.maxBid });
                }
              }
            } else {
              // AI teams always bid
              const decision = auctionEngine.ai.shouldBid(player, player.basePrice, team, auctionProgress);
              if (decision.shouldBid) {
                willingBidders.push({ team, maxBid: decision.maxBid });
              }
            }
          }

          if (willingBidders.length > 0) {
            // Use second-price auction logic
            const bids = willingBidders.map(b => ({
              teamId: b.team.id,
              team: b.team,
              amount: auctionEngine.floorToValidBidAmount(b.maxBid)
            }));

            const result = auctionEngine.ai.determineWinningBid(bids);

            if (result) {
              result.team.squad.push({ ...player, soldPrice: result.paidPrice });
              result.team.totalSpent += result.paidPrice;
              result.team.budgetRemaining -= result.paidPrice;
              savedAuction.recordSale(player.id, result.team.id, result.paidPrice);

              if (player.id) {
                addPlayerToSquad(result.team.id, player.id);
                assignPlayerToTeam(player.id, result.team.id);
                setPlayerSoldPrice(player.id, result.paidPrice);
              }

              addToLog(`${player.name} → ${result.team.name} (${aiCore.formatPrice(result.paidPrice)}) [UNSOLD ROUND]`, 'sold');
            }
          } else {
            auctionEngine.permanentlyUnsold.push(player);
            addToLog(`${player.name} → PERMANENTLY UNSOLD`, 'unsold');
          }

          savedAuction.nextPlayer();

          if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }
    }

    // Restore original auto-bid state if we forced it ON for minimum squad
    if (needsMinimumEnforcement && !originalAutoBidState) {
      const finalUserTeamData = auctionEngine.teams.find(t => t.id === userTeamId);
      const finalSquadSize = finalUserTeamData?.squad.length || 0;

      if (finalSquadSize >= auctionEngine.config.squadSize.min) {
        setAutoBid(false);
        addToLog('✓ Minimum squad reached (18+ players). Auto-bid disabled as per your preference.', 'system');
      }
    }

    setIsSkipping(false);
    setSkipProgress({ current: 0, total: 0, type: '' });

    addToLog('Auction completed! Initializing league...', 'success');
    setCurrentPlayer(null);
    setAuctionState('completed');
    savedAuction.completeAuction();

    clearEvents();
    setTimeout(() => {
      initializeLeague();
    }, 500);
  };

  const finalizePlayerAuction = (engine, player) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingBidsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    pendingBidsRef.current = [];

    setIsAuctioning(false);
    isAuctioningRef.current = false;

    const winner = highestBidderRef.current;
    const finalPrice = currentPriceRef.current;

    if (winner) {
      const team = engine.teams.find(t => t.id === winner.id);
      if (!team) return;

      team.squad.push({ ...player, soldPrice: finalPrice });
      team.totalSpent += finalPrice;
      team.budgetRemaining -= finalPrice;

      addToLog(`SOLD! ${player.name} to ${winner.name} for ${aiCore.formatPrice(finalPrice)}`, 'sold');

      if (player.id) {
        addPlayerToSquad(team.id, player.id);
        assignPlayerToTeam(player.id, team.id);
        setPlayerSoldPrice(player.id, finalPrice);
      }

      savedAuction.recordSale(player.id, winner.id, finalPrice);

      setSoldDetails({
        player: { ...player },
        team: { ...winner },
        price: finalPrice,
        status: 'sold'
      });
    } else {
      addToLog(`UNSOLD: ${player.name}`, 'unsold');
      engine.unsoldPlayers.push(player);

      setSoldDetails({
        player: { ...player },
        status: 'unsold'
      });
    }

    if (userMaxBidPlayerId === player.id) clearUserMaxBid();
    setShowSoldScreen(true);
  };

  const handleNextPlayer = () => {
    setShowSoldScreen(false);
    setSoldDetails(null);
    moveToNextPlayer();
  };

  const moveToNextPlayer = () => {
    if (currentPlayerIndex < rounds[currentRound].length - 1) {
      const nextIndex = currentPlayerIndex + 1;
      setCurrentPlayerIndex(nextIndex);
      savedAuction.nextPlayer();
      startPlayerAuction(auctionEngine, rounds[currentRound][nextIndex], currentRound, nextIndex);
    } else if (currentRound < rounds.length - 1) {
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      setCurrentPlayerIndex(0);
      const nextRoundLabel = roundMetadata[nextRound]?.label || `Round ${nextRound + 1}`;
      addToLog(`--- ${nextRoundLabel.toUpperCase()} ---`, 'info');
      savedAuction.nextPlayer();
      startPlayerAuction(auctionEngine, rounds[nextRound][0], nextRound, 0);
    } else {
      // Check for unsold players before completing
      if (auctionEngine.hasUnsoldPlayers()) {
        startUnsoldRound();
      } else {
        completeAuction();
      }
    }
  };

  // Start the unsold round
  const startUnsoldRound = () => {
    const { players: unsoldPlayers, metadata } = auctionEngine.createUnsoldRound();

    if (unsoldPlayers.length === 0) {
      completeAuction();
      return;
    }

    // Add unsold round to rounds array
    const newRounds = [...rounds, unsoldPlayers];
    setRounds(newRounds);
    setRoundMetadata(auctionEngine.getRoundMetadata());

    const nextRound = newRounds.length - 1;
    setCurrentRound(nextRound);
    setCurrentPlayerIndex(0);

    addToLog(`--- UNSOLD ROUND (${unsoldPlayers.length} players at 50% base price) ---`, 'info');
    savedAuction.nextPlayer();
    startPlayerAuction(auctionEngine, unsoldPlayers[0], nextRound, 0);
  };

  // Complete the auction
  const completeAuction = () => {
    setAuctionState('completed');
    setCurrentPlayer(null);
    addToLog('Auction completed! Initializing league...', 'success');
    savedAuction.completeAuction();
    clearEvents();
    setTimeout(() => {
      initializeLeague();
    }, 500);
  };

  const initializeLeague = () => {
    console.log('🏏 Initializing league after auction completion...');

    try {
      return sharedInitializeLeague({
        stores: {
          gameStore: useGameStore,
          teamStore: useTeamStore,
          leagueStore: useLeagueStore,
          financeStore: useFinanceStore,
          auctionStore: useAuctionStore,
          inboxStore: useInboxStore,
          playerStore: usePlayerStore
        },
        isFirstSeasonInit: true // Transfers page always handles Season 1 initial setup
      });
    } catch (error) {
      console.error('❌ Error initializing league:', error);
      alert(`Failed to initialize league: ${error.message}`);
    }
  };

  const moveToNextRound = () => {
    if (currentRound < rounds.length - 1) {
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      setCurrentPlayerIndex(0);
      const nextRoundLabel = roundMetadata[nextRound]?.label || `Round ${nextRound + 1}`;
      addToLog(`--- ${nextRoundLabel.toUpperCase()} ---`, 'info');
      savedAuction.nextPlayer();
      startPlayerAuction(auctionEngine, rounds[nextRound][0], nextRound, 0);
    } else {
      // Check for unsold players before completing
      if (auctionEngine.hasUnsoldPlayers()) {
        startUnsoldRound();
      } else {
        completeAuction();
      }
    }
  };

  const getValidIncrement = (price) => {
    const increments = auctionEngine?.config.bidIncrements.increments || [];
    for (const tier of increments) {
      if (price <= tier.maxPrice) {
        return tier.increment;
      }
    }
    return increments[increments.length - 1]?.increment || 20000;
  };

  const addToLog = (message, type = 'info') => {
    setAuctionLog(prev => [...prev, { message, type, timestamp: Date.now() }]);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingBidsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, []);

  const userTeamData = auctionEngine?.teams.find(t => t.id === userTeamId);
  const bidTimer = auctionEngine?.config.timing.bidTimer || 10;
  const timeRemaining = Math.max(0, bidTimer - secondsSinceLastBid);

  // Check if user's squad has reached the cap (25 players)
  const userSquadSize = userTeamData?.squad.length || 0;
  const squadCapReached = userSquadSize >= (auctionEngine?.config.squadSize.max || 25);

  const tabs = [
    { id: 'auction', label: 'Live Auction', icon: Gavel },
    { id: 'rounds', label: 'Rounds', icon: List },
    { id: 'squads', label: 'Team Squads', icon: Users },
    { id: 'log', label: 'Auction Log', icon: TrendingUp }
  ];

  // Get current round label for display
  const currentRoundLabel = roundMetadata[currentRound]?.label || `Round ${currentRound + 1}`;
  const currentRoundCategory = roundMetadata[currentRound]?.category || '';

  // If transfer window is open and auction completed, show transfer market
  if (isTransferWindowOpen && auctionCompleted && userTeam && isReady) {
    return <TransferMarketView transferHandler={transferHandler} />;
  }

  return (
    <div className="space-y-2">
      <h1 className="sr-only">
        {currentPhase === 'auction' ? 'Player Auction' : 'Transfer Market'}
      </h1>
      {/* Transfer Window Banner - Only show after auction if league is active */}
      {auctionCompleted && isLeagueActive && !isTransferWindowOpen && (
        <div className="card p-3 bg-cricket-primary/10 border border-cricket-accent">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-cricket-accent" />
            <div>
              <h4 className="font-semibold text-text-primary">Transfer Window</h4>
              <p className="text-sm text-text-secondary">
                Opens during Off-Season: Week 22-26 (5 weeks after playoffs)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Start Auction Button */}
      {auctionState === 'not_started' && (
        <div className="flex justify-end">
          <button
            onClick={handleStartAuction}
            disabled={Object.keys(players).length === 0}
            className="btn-primary flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            {Object.keys(players).length === 0 ? 'Loading Players...' : 'Start Auction'}
          </button>
        </div>
      )}

      {/* Auction Status - Compressed */}
      {auctionEngine && (
        <div className="auction-status-bar card p-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
            <div>
              <div className="text-xxs text-cricket-text-secondary">Your Budget</div>
              <div className="text-base font-bold text-cricket-accent">
                {aiCore.formatPrice(userTeamData?.budgetRemaining || 0)}
              </div>
            </div>
            <div>
              <div className="text-xxs text-cricket-text-secondary">Squad Size</div>
              <div className="text-base font-bold">{userTeamData?.squad.length || 0} / 25</div>
            </div>
            <div>
              <div className="text-xxs text-cricket-text-secondary">Current Round</div>
              <div className="text-base font-bold capitalize">{currentRoundLabel}</div>
            </div>
            <div>
              <div className="text-xxs text-cricket-text-secondary">Status</div>
              <div className={`text-sm font-semibold ${
                auctionState === 'in_progress' ? 'text-yellow-500' :
                auctionState === 'completed' ? 'text-green-500' : 'text-gray-500'
              }`}>
                {auctionState === 'in_progress' ? `Live (${currentRound + 1}/${rounds.length})` :
                 auctionState === 'completed' ? 'Complete' : 'Pending'}
              </div>
            </div>
          </div>

          {/* Players in Current Round */}
          {rounds[currentRound] && rounds[currentRound].length > 0 && (
            <div className="pt-2 border-t border-border-primary">
              <div className="flex items-center gap-1 flex-wrap">
                {rounds[currentRound].map((player, idx) => {
                  const isCurrentPlayer = idx === currentPlayerIndex;
                  const isCompleted = idx < currentPlayerIndex;
                  const isSold = player.status === 'sold';
                  const isUnsold = player.status === 'unsold';

                  return (
                    <div
                      key={player.id}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        isCurrentPlayer
                          ? 'bg-cricket-accent text-black ring-2 ring-cricket-accent/50'
                          : isCompleted && isSold
                          ? 'bg-green-900/30 text-green-400 line-through opacity-60'
                          : isCompleted && isUnsold
                          ? 'bg-red-900/30 text-red-400 line-through opacity-60'
                          : isCompleted
                          ? 'bg-gray-700 text-gray-400 opacity-60'
                          : 'bg-bg-tertiary text-text-secondary'
                      }`}
                      title={`${player.name} - ${player.role}`}
                    >
                      {player.name.split(' ').pop()}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="auction-tab-nav border-b border-border-primary">
        <nav className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-cricket-accent text-cricket-accent'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
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
                    {skipProgress.type === 'round' ? `Skipping Round ${currentRound + 1}` :
                     skipProgress.type === 'unsold' ? 'Processing Unsold Round' : 'Fast-Forwarding Auction'}
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
            /* Auction Complete - Show Detailed Summary */
            <div className="space-y-4">
              {/* Header */}
              <h2 className="text-xl font-bold text-green-500">Auction Complete</h2>

              {/* Auction Statistics */}
              {(auctionEngine || auctionSummary) && (() => {
                // Use live auctionEngine data if available, otherwise use reconstructed summary
                let allSales, topBuys, avgPrice, teamSpending, userTeamSummary;

                if (auctionEngine) {
                  // Calculate statistics from live auction engine
                  allSales = auctionEngine.teams.flatMap(team =>
                    team.squad.map(player => ({
                      name: player.name,
                      team: team.name,
                      price: player.soldPrice,
                      isUserTeam: team.isUserControlled
                    }))
                  );

                  topBuys = [...allSales]
                    .sort((a, b) => b.price - a.price)
                    .slice(0, 5);

                  avgPrice = allSales.length > 0
                    ? allSales.reduce((sum, sale) => sum + sale.price, 0) / allSales.length
                    : 0;

                  teamSpending = auctionEngine.teams
                    .map(team => ({
                      name: team.name,
                      spent: team.totalSpent,
                      remaining: team.budgetRemaining,
                      players: team.squad.length,
                      isUserTeam: team.isUserControlled
                    }))
                    .sort((a, b) => b.spent - a.spent);

                  userTeamSummary = auctionEngine.teams.find(t => t.id === userTeamId);
                } else {
                  // Use reconstructed summary from persisted data
                  ({ allSales, topBuys, avgPrice, teamSpending, userTeamSummary } = auctionSummary);
                  // Convert team summaries to match expected format
                  teamSpending = teamSpending.map(team => ({
                    name: team.name,
                    spent: team.totalSpent,
                    remaining: team.budgetRemaining,
                    players: team.squad.length,
                    isUserTeam: team.isUserControlled
                  }));
                }

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
                              {aiCore.formatPrice(sale.price)}
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
                              {aiCore.formatPrice(avgPrice)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Your Squad Summary */}
                      {userTeamSummary && (
                        <div className="card p-4 bg-cricket-primary/10 border-2 border-cricket-primary">
                          <h3 className="text-lg font-bold text-text-primary mb-3">Your Squad Summary</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-text-secondary mb-1">Players Signed</div>
                              <div className="text-2xl font-bold text-cricket-accent">
                                {userTeamSummary.squad.length}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-text-secondary mb-1">Total Spent</div>
                              <div className="text-2xl font-bold text-text-primary">
                                {aiCore.formatPrice(userTeamSummary.totalSpent)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-text-secondary mb-1">Budget Remaining</div>
                              <div className="text-2xl font-bold text-green-500">
                                {aiCore.formatPrice(userTeamSummary.budgetRemaining)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-text-secondary mb-1">Avg. Price/Player</div>
                              <div className="text-2xl font-bold text-text-primary">
                                {aiCore.formatPrice(userTeamSummary.squad.length > 0 ? userTeamSummary.totalSpent / userTeamSummary.squad.length : 0)}
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
                                  {aiCore.formatPrice(team.spent)}
                                </td>
                                <td className="text-right py-2 px-3 font-mono text-text-primary">
                                  {aiCore.formatPrice(team.remaining)}
                                </td>
                                <td className="text-right py-2 px-3 font-mono text-text-secondary">
                                  {aiCore.formatPrice(team.players > 0 ? team.spent / team.players : 0)}
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
                        {aiCore.formatPrice(soldDetails.price)}
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
                <div className="auction-player-card lg:w-1/2">
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
                  <div className="auction-bid-display card p-3 flex-1 flex flex-col justify-between">
                    {/* Current Bid */}
                    <div className="text-center mb-2">
                      <div className="text-xxs text-text-secondary mb-0.5">Current Bid</div>
                      <div className="text-3xl font-bold text-cricket-accent">
                        {aiCore.formatPrice(currentPrice)}
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
                        {aiCore.formatPrice(currentPlayer.basePrice)}
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
                    {squadCapReached ? (
                      /* Squad Cap Reached Message with Skip to End Button */
                      <div className="bg-yellow-900/30 border-2 border-yellow-600 rounded p-3">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-yellow-500" />
                            <div className="text-left">
                              <p className="text-sm font-bold text-yellow-500">Squad Cap Reached! (25/25 players)</p>
                              <p className="text-xs text-text-secondary">You cannot bid on more players.</p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleSkipToEnd}
                          className="btn-primary w-full text-base py-2.5 flex items-center justify-center gap-2 bg-cricket-accent hover:bg-cricket-accent-dark"
                        >
                          <FastForward className="w-5 h-5" />
                          Skip to End of Auction
                        </button>
                      </div>
                    ) : highestBidder?.id !== userTeamId ? (
                      <>
                        {/* Row 1: Bid Button OR Set Custom Max Bid + Auto-Bid Toggle */}
                        <div className="auction-bid-controls flex items-center gap-3 mb-3">
                          <button
                            onClick={handleBid}
                            disabled={!userTeamData || currentPrice + getValidIncrement(currentPrice) > userTeamData.budgetRemaining || squadCapReached || userAutoBidEnabled}
                            className="btn-primary flex-1 text-base py-3"
                          >
                            <Gavel className="w-5 h-5 inline mr-2" />
                            Bid {aiCore.formatPrice(currentPrice + getValidIncrement(currentPrice))}
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
                              placeholder="e.g. 900 for 900K"
                              className="input-field flex-1 text-sm"
                              min={(currentPrice + getValidIncrement(currentPrice)) / 1000}
                              disabled={squadCapReached || userAutoBidEnabled}
                            />
                            <button
                              onClick={handleSetMaxBid}
                              disabled={!maxBidInput || squadCapReached || userAutoBidEnabled}
                              className="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
                            >
                              Set Max
                            </button>
                          </div>

                          <div className="flex items-center gap-2 border-l border-border-primary pl-3">
                            <span className={`text-xs font-medium whitespace-nowrap ${userAutoBidEnabled ? 'text-green-400' : 'text-red-400'}`}>
                              Auto-Bid {userAutoBidEnabled ? 'ON' : 'OFF'}
                            </span>
                            <button
                              onClick={toggleAutoBid}
                              className={`relative inline-flex h-6 w-6 items-center justify-center rounded transition-colors border-2 ${
                                userAutoBidEnabled
                                  ? 'bg-green-600 border-green-600'
                                  : 'bg-transparent border-red-600'
                              }`}
                              title="Toggle auto-bid"
                            >
                              {userAutoBidEnabled && (
                                <Zap className="w-3.5 h-3.5 text-white" />
                              )}
                            </button>
                            <div className="group relative">
                              <HelpCircle className="w-3.5 h-3.5 text-cricket-text-tertiary cursor-help" />
                              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 border-2 border-gray-700 rounded shadow-xl text-xs z-10">
                                <p className="text-cricket-text-primary mb-2">
                                  {userAutoBidEnabled ? (
                                    <>
                                      <strong className="text-green-400">Auto-bid ON:</strong> AI will bid for you when using skip buttons. Manual bidding is disabled.
                                    </>
                                  ) : (
                                    <>
                                      <strong className="text-red-400">Auto-bid OFF:</strong> AI will NOT bid for you when skipping. You must bid manually or skip without acquiring players.
                                    </>
                                  )}
                                </p>
                                {!userAutoBidEnabled && (
                                  <p className="text-yellow-400 text-xxs">
                                    ⚠️ With auto-bid off, ensure you have at least 18 players before ending the auction.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Max Bid Active Indicator */}
                        {userMaxBid && userMaxBidPlayerId === currentPlayer?.id && (
                          <div className="p-2 bg-green-900/20 border border-green-700/30 rounded flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-400" />
                              <span className="text-xs text-green-400">Auto-bid active: {aiCore.formatPrice(userMaxBid)}</span>
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

                        {/* Skip Buttons Row */}
                        <div className="auction-skip-controls flex items-center gap-2">
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
                            {aiCore.formatPrice(player.soldPrice)}
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
                            {aiCore.formatPrice(team.budgetRemaining)}
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
                            {aiCore.formatPrice(team.totalSpent)}
                          </div>
                        </div>
                        <div className="p-2 bg-bg-secondary rounded">
                          <div className="text-xs text-text-secondary">Avg Price</div>
                          <div className="text-sm font-bold text-text-primary">
                            {aiCore.formatPrice(team.squad.length > 0 ? team.totalSpent / team.squad.length : 0)}
                          </div>
                        </div>
                        <div className="p-2 bg-bg-secondary rounded">
                          <div className="text-xs text-text-secondary">Top Buy</div>
                          <div className="text-sm font-bold text-text-primary">
                            {team.squad.length > 0
                              ? aiCore.formatPrice(Math.max(...team.squad.map(p => p.soldPrice)))
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
        <div className="auction-squads-list space-y-2">
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
                    <span className="font-bold">{aiCore.formatPrice(team.budgetRemaining)}</span>
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
                                  {role === 'batsman' && (
                                    <span>{player.primaryPlaystyle?.batting || '—'}</span>
                                  )}
                                  {role === 'bowler' && (
                                    <span>{player.primaryPlaystyle?.bowling || '—'}</span>
                                  )}
                                  {role === 'all-rounder' && (
                                    <span>
                                      {player.primaryPlaystyle?.batting || '—'}
                                      {player.primaryPlaystyle?.bowling && ` | ${player.primaryPlaystyle.bowling}`}
                                    </span>
                                  )}
                                  {role === 'wicket-keeper' && (
                                    <span>
                                      {player.primaryPlaystyle?.batting || '—'}
                                      {player.primaryPlaystyle?.fielding && ` | ${player.primaryPlaystyle.fielding}`}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-cricket-accent font-bold mt-1">
                                  {aiCore.formatPrice(player.soldPrice)}
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

      {activeTab === 'rounds' && (
        <div className="card p-3">
          <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <List className="w-5 h-5 text-cricket-accent" />
            Auction Rounds Schedule
          </h3>
          {roundMetadata.length === 0 ? (
            <div className="text-center text-cricket-text-secondary py-8">
              Start the auction to see the round schedule
            </div>
          ) : (
            <div className="space-y-2">
              {/* Group rounds by category for display */}
              {(() => {
                const categories = ['marquee', 'wicket-keepers', 'all-rounders', 'batsmen', 'bowlers'];
                const categoryLabels = {
                  'marquee': 'Marquee (Elite)',
                  'wicket-keepers': 'Wicket-Keepers',
                  'all-rounders': 'All-Rounders',
                  'batsmen': 'Batsmen',
                  'bowlers': 'Bowlers',
                  'unsold': 'Unsold Round (50% Price)'
                };
                const categoryColors = {
                  'marquee': 'border-yellow-500 bg-yellow-500/10',
                  'wicket-keepers': 'border-purple-500 bg-purple-500/10',
                  'all-rounders': 'border-green-500 bg-green-500/10',
                  'batsmen': 'border-blue-500 bg-blue-500/10',
                  'bowlers': 'border-red-500 bg-red-500/10',
                  'unsold': 'border-orange-500 bg-orange-500/10'
                };

                return (
                  <div className="auction-rounds-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roundMetadata.map((round, idx) => {
                      const isCurrentRound = idx === currentRound;
                      const isCompleted = idx < currentRound;
                      const categoryColor = categoryColors[round.category] || 'border-gray-500 bg-gray-500/10';

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            isCurrentRound
                              ? 'border-cricket-accent bg-cricket-accent/20 ring-2 ring-cricket-accent/50'
                              : isCompleted
                              ? 'border-gray-600 bg-gray-800/50 opacity-60'
                              : categoryColor
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-bold capitalize ${
                              isCurrentRound ? 'text-cricket-accent' : 'text-text-primary'
                            }`}>
                              {round.label}
                            </span>
                            {isCurrentRound && (
                              <span className="px-2 py-0.5 bg-cricket-accent text-black text-xs font-bold rounded animate-pulse">
                                LIVE
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs font-bold rounded">
                                DONE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-text-secondary capitalize">
                              {categoryLabels[round.category] || round.category}
                            </span>
                            <span className="text-text-tertiary">
                              {round.playerCount} players
                            </span>
                          </div>
                          {isCurrentRound && (
                            <div className="mt-2 pt-2 border-t border-cricket-accent/30">
                              <div className="text-xs text-cricket-accent">
                                Player {currentPlayerIndex + 1} of {round.playerCount}
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                                <div
                                  className="h-1.5 bg-cricket-accent rounded-full transition-all"
                                  style={{ width: `${((currentPlayerIndex + 1) / round.playerCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Summary */}
              <div className="mt-4 p-3 bg-bg-secondary rounded-lg">
                <h4 className="text-sm font-semibold text-text-primary mb-2">Round Order</h4>
                <p className="text-xs text-text-secondary">
                  <span className="text-yellow-400">Marquee</span> rounds first, then interleaved:
                  <span className="text-purple-400"> WK</span> →
                  <span className="text-green-400"> AR</span> →
                  <span className="text-blue-400"> Bat</span> →
                  <span className="text-red-400"> Bowl</span> (repeat), then
                  <span className="text-orange-400"> Unsold Round</span> (50% base price)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'log' && (
        <div className="card p-2">
          <div className="auction-log-list space-y-2 max-h-[600px] overflow-y-auto">
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

      {/* Auction Tutorial */}
      {showAuctionTutorial && auctionTutorialSteps[auctionTutorialStep] && (
        <TutorialSpotlight
          targetSelector={auctionTutorialSteps[auctionTutorialStep].targetSelector}
          title={auctionTutorialSteps[auctionTutorialStep].title}
          description={auctionTutorialSteps[auctionTutorialStep].description}
          icon={auctionTutorialSteps[auctionTutorialStep].icon}
          step={auctionTutorialStep + 1}
          totalSteps={auctionTutorialTotalSteps}
          position={auctionTutorialSteps[auctionTutorialStep].position}
          onNext={advanceAuctionTutorial}
          onSkip={skipAuctionTutorial}
        />
      )}

      {/* Contextual Tip for first visit */}
      {showTip && (
        <ContextualTip
          title={screenTips.transfers.title}
          icon={screenTips.transfers.icon}
          tips={screenTips.transfers.tips}
          onDismiss={dismissTip}
        />
      )}
    </div>
  );
};

export default Transfers;
