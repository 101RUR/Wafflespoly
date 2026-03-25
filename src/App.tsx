import React, { useEffect, useState, useRef } from 'react';
import socket from './socket';
import { GameState, Player, Cell, Property } from './types';
import { BOARD_CONFIG } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, User, Home, Building2, Landmark, ShieldAlert, Zap, Coins, History, Gavel, X } from 'lucide-react';

import { soundManager } from './sounds';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [inLobby, setInLobby] = useState(true);
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const [bidPopping, setBidPopping] = useState(false);
  const [slotResult, setSlotResult] = useState<string[] | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [auctionWinner, setAuctionWinner] = useState<string | null>(null);
  const [tradePartnerId, setTradePartnerId] = useState<string | null>(null);
  const [myTradeCash, setMyTradeCash] = useState(0);
  const [partnerTradeCash, setPartnerTradeCash] = useState(0);
  const [myTradeProps, setMyTradeProps] = useState<number[]>([]);
  const [partnerTradeProps, setPartnerTradeProps] = useState<number[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const t = (en: string, ru: string) => lang === 'en' ? en : ru;

  useEffect(() => {
    // Check for room ID in URL
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      setRoomId(roomFromUrl.toUpperCase());
    }

    socket.on('roomCreated', (state: GameState) => {
      setGameState(state);
      setInLobby(false);
    });

    socket.on('slotResult', ({ result, win }: { result: string[], win: number }) => {
      setIsSpinning(true);
      soundManager.play('SLOT_CLATTER');
      
      setTimeout(() => {
        setSlotResult(result);
        setIsSpinning(false);
        if (win > 0) {
          soundManager.play('JACKPOT');
        } else {
          soundManager.play('SAD');
        }
        
        setTimeout(() => {
          socket.emit('closeCasino', { roomId: gameState?.roomId });
          setSlotResult(null);
        }, 2000);
      }, 2000);
    });

    socket.on('gameStateUpdate', (state: GameState) => {
      const oldState = gameState;
      setGameState(state);

      // Sound Triggers
      if (state.gameStarted) {
        // Turn Start Ding
        if (oldState && state.turnIndex !== oldState.turnIndex) {
          if (state.players[state.turnIndex].id === socket.id) {
            soundManager.play('TURN_START');
          }
        }

        // Auction Start Gong
        if (!oldState?.auction && state.auction) {
          soundManager.play('GONG');
          soundManager.play('AUCTION_TENSION', true);
        }
        if (oldState?.auction && !state.auction) {
          soundManager.stop('AUCTION_TENSION');
          if (oldState.auction.highestBidderId) {
            const winner = oldState.players.find(p => p.id === oldState.auction?.highestBidderId);
            setAuctionWinner(winner?.name || null);
            soundManager.play('GAVEL');
            setTimeout(() => setAuctionWinner(null), 2000);
          }
        }

        // Bid Pop Effect
        if (oldState?.auction && state.auction && state.auction.currentBid > oldState.auction.currentBid) {
          setBidPopping(true);
          setTimeout(() => setBidPopping(false), 300);
          soundManager.play('COIN_CLINK');
        }

        // Casino Sounds
        if (!oldState?.casino && state.casino?.type === 'DUEL') {
          soundManager.play('DRUM_ROLL');
        }
      }
    });

    socket.on('error', (msg: string) => alert(msg));

    return () => {
      socket.off('roomCreated');
      socket.off('slotResult');
      socket.off('gameStateUpdate');
      socket.off('error');
    };
  }, [gameState]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState?.logs]);

  const createRoom = () => {
    if (!playerName) return alert('Enter name');
    socket.emit('createRoom', playerName);
  };

  const joinRoom = () => {
    if (!playerName || !roomId) return alert('Enter name and room ID');
    socket.emit('joinRoom', { roomId, name: playerName });
    setInLobby(false);
  };

  const startGame = () => {
    if (gameState) socket.emit('startGame', gameState.roomId);
  };

  const rollDice = () => {
    if (gameState) socket.emit('rollDice', gameState.roomId);
  };

  const sendAction = (action: string, data: any = null) => {
    if (gameState) socket.emit('actionResponse', { roomId: gameState.roomId, action, data });
  };

  const bid = (amount: number) => {
    if (gameState?.auction) {
      socket.emit('bidAuction', { roomId: gameState.roomId, amount });
    }
  };

  if (inLobby) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#E4E3E0] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00bc7d] opacity-10 blur-[120px] rounded-full" />
        
        <div className="max-w-md w-full space-y-8 bg-[#111] p-10 border border-white/5 rounded-2xl shadow-2xl relative z-10">
          <div className="text-center space-y-2">
            <motion.h1 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-6xl font-black tracking-tighter text-[#00bc7d] italic"
            >
              WAFFLES POLY
            </motion.h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold">The Ultimate Waffle Empire</p>
            
            <div className="flex justify-center gap-2 mt-4">
              <button 
                onClick={() => setLang('en')}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded transition-all",
                  lang === 'en' ? "bg-[#00bc7d] text-black" : "bg-white/5 text-gray-500 hover:bg-white/10"
                )}
              >
                ENGLISH
              </button>
              <button 
                onClick={() => setLang('ru')}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded transition-all",
                  lang === 'ru' ? "bg-[#00bc7d] text-black" : "bg-white/5 text-gray-500 hover:bg-white/10"
                )}
              >
                РУССКИЙ
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">{t('Your Nickname', 'Ваш никнейм')}</label>
              <input
                type="text"
                placeholder="WAFFLE_KING"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-center focus:border-[#00bc7d] outline-none transition-all font-bold tracking-wide"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={createRoom}
                className="bg-[#00bc7d] text-black p-5 rounded-xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(0,188,125,0.2)]"
              >
                {t('CREATE ROOM', 'СОЗДАТЬ КОМНАТУ')}
              </button>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-600 bg-[#111] px-4">{t('or join existing', 'или войти в существующую')}</div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ROOM ID"
                  className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-center text-sm focus:border-[#00C8FF] outline-none font-mono"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                />
                <button 
                  onClick={joinRoom}
                  className="bg-[#00C8FF] text-black px-8 rounded-xl font-bold hover:bg-[#00B0E0] transition-all"
                >
                  {t('JOIN', 'ВОЙТИ')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  if (!gameState.gameStarted) {
    const inviteLink = `${window.location.origin}?room=${gameState.roomId}`;

    const copyInvite = () => {
      navigator.clipboard.writeText(inviteLink);
      alert(t('Link copied!', 'Ссылка скопирована!'));
    };

    return (
      <div className="min-h-screen bg-[#141414] text-[#E4E3E0] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1A1A1A] p-8 border border-[#333] rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-center">LOBBY: {gameState.roomId}</h2>
          
          <button 
            onClick={copyInvite}
            className="w-full mb-6 bg-[#333] text-white p-2 text-xs font-bold hover:bg-[#444] transition-colors flex items-center justify-center gap-2"
          >
            <Zap size={14} /> {t('COPY INVITE LINK', 'КОПИРОВАТЬ ССЫЛКУ')}
          </button>

          <div className="space-y-2 mb-8">
            {gameState.players.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-[#0A0A0A] border-l-4" style={{ borderColor: p.color }}>
                <User size={20} />
                <span className="font-bold">{p.name}</span>
                {p.id === gameState.players[0].id && <span className="text-[10px] bg-[#333] px-2 py-0.5 rounded ml-auto">{t('HOST', 'ХОСТ')}</span>}
              </div>
            ))}
          </div>
          {socket.id === gameState.players[0].id ? (
            <button 
              onClick={startGame}
              disabled={gameState.players.length < 2}
              className="w-full bg-[#00E676] text-black p-4 font-bold disabled:opacity-50"
            >
              {t('START GAME', 'НАЧАТЬ ИГРУ')} ({gameState.players.length}/4)
            </button>
          ) : (
            <p className="text-center text-gray-500 animate-pulse">{t('Waiting for host to start...', 'Ожидание хоста...')}</p>
          )}
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.turnIndex];
  const isMyTurn = socket.id === currentPlayer.id;

  return (
    <div className="h-screen bg-[#050505] text-[#E4E3E0] flex overflow-hidden font-sans">
      {/* Left Sidebar: Players */}
      <div className="w-64 border-r border-[#1A1A1A] p-4 flex flex-col gap-4 bg-[#0A0A0A]">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('Players', 'Игроки')}</div>
        {gameState.players.map((p, idx) => (
          <div 
            key={p.id} 
            onClick={() => p.id !== socket.id && setTradePartnerId(p.id)}
            className={cn(
              "p-4 border border-[#1A1A1A] transition-all relative cursor-pointer hover:border-[#333]",
              idx === gameState.turnIndex && "ring-2 ring-offset-2 ring-offset-[#0A0A0A]"
            )}
            style={{ 
              backgroundColor: idx === gameState.turnIndex ? p.color + '20' : 'transparent',
              borderColor: idx === gameState.turnIndex ? p.color : '#1A1A1A',
              boxShadow: idx === gameState.turnIndex ? `0 0 15px ${p.color}20` : 'none'
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold truncate max-w-[120px]" style={{ color: p.color }}>{p.name}</span>
              <span className="text-xs font-mono">${p.balance.toLocaleString()}</span>
            </div>
            <div className="h-1 bg-[#1A1A1A] w-full rounded-full overflow-hidden">
              <div className="h-full" style={{ backgroundColor: p.color, width: '100%' }} />
            </div>
            {p.inJail && <div className="absolute top-2 right-2 text-[8px] bg-red-500 text-white px-1 rounded">{t('IN JAIL', 'В ТЮРЬМЕ')}</div>}
          </div>
        ))}
      </div>

      {/* Main Game Area */}
      <div className="flex-1 relative flex items-center justify-center bg-[#050505]">
        <div className="aspect-square h-[90vh] relative border-4 border-[#1A1A1A] bg-white grid grid-cols-11 grid-rows-11 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          {/* Board Cells */}
          {BOARD_CONFIG.map((cell, idx) => {
            const side = idx <= 10 ? 'top' : idx <= 20 ? 'right' : idx <= 30 ? 'bottom' : 'left';
            const gridArea = getGridArea(idx);
            const prop = gameState.properties[cell.id];
            
            return (
              <div 
                key={cell.id}
                className={cn(
                  "relative border border-[#E5E5E5] flex flex-col items-center justify-center text-[8px] font-bold uppercase overflow-hidden",
                  cell.type === 'START' || cell.type === 'JAIL' || cell.type === 'CASINO' || cell.type === 'POLICE' ? 'bg-[#F5F5F5]' : 'bg-white'
                )}
                style={{ gridArea }}
              >
                {/* Color Bar */}
                {cell.color && (
                  <div 
                    className={cn(
                      "absolute bg-current",
                      side === 'top' && "top-0 left-0 right-0 h-1/4 border-b border-[#E5E5E5]",
                      side === 'right' && "right-0 top-0 bottom-0 w-1/4 border-l border-[#E5E5E5]",
                      side === 'bottom' && "bottom-0 left-0 right-0 h-1/4 border-t border-[#E5E5E5]",
                      side === 'left' && "left-0 top-0 bottom-0 w-1/4 border-r border-[#E5E5E5]"
                    )}
                    style={{ color: cell.color }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-white text-[6px]">
                      {cell.price > 0 && `$${cell.price}`}
                    </div>
                  </div>
                )}

                <div className="p-1 text-center leading-tight text-black z-10">
                  {t(cell.name, cell.nameRu)}
                </div>

                {/* Icons for special cells */}
                {cell.type === 'CHANCE' && <span className="text-2xl text-[#FF4081]">?</span>}
                {cell.type === 'TAX' && <Coins size={16} className="text-gray-400" />}
                {cell.type === 'CASINO' && <Zap size={16} className="text-[#FFEA00]" />}
                {cell.type === 'START' && <History size={20} className="text-[#00E676]" />}
                {cell.type === 'POLICE' && <ShieldAlert size={20} className="text-[#FF3D00]" />}

                {/* Property Owner Indicator */}
                {prop?.ownerId && (
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundColor: gameState.players.find(p => p.id === prop.ownerId)?.color }}
                  />
                )}

                {/* Tokens */}
                <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-0.5 p-1 pointer-events-none z-20">
                  {gameState.players.filter(p => p.position === idx).map(p => (
                    <motion.div
                      key={p.id}
                      layoutId={`token-${p.id}`}
                      className="w-4 h-4 rounded-full shadow-lg border-2 border-white/50"
                      style={{ backgroundColor: p.color }}
                      initial={false}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Center Panel */}
          <div className="col-start-2 col-end-11 row-start-2 row-end-11 bg-[#0A0A0A] flex flex-col p-8 border-4 border-[#1A1A1A]">
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <h1 className="text-6xl font-black italic tracking-tighter text-[#FF4081] opacity-20 select-none">WAFFLES POLY</h1>
              
              {/* Dice */}
              <div className="flex gap-4">
                <DiceIcon value={gameState.lastDice[0]} />
                <DiceIcon value={gameState.lastDice[1]} />
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-4">
                {isMyTurn && !gameState.waitingForAction && !gameState.players[gameState.turnIndex].inJail && (
                  <button 
                    onClick={rollDice}
                    className="bg-[#FF4081] text-white px-12 py-4 text-xl font-black hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,64,129,0.3)]"
                  >
                    {t('ROLL THE DICE', 'БРОСИТЬ КУБИКИ')}
                  </button>
                )}

                {isMyTurn && gameState.players[gameState.turnIndex].inJail && (
                  <div className="flex gap-4">
                    {gameState.players[gameState.turnIndex].jailTurns < 3 && (
                      <button onClick={() => socket.emit('jailAction', { roomId: gameState.roomId, action: 'ROLL' })} className="bg-white text-black px-8 py-3 font-bold">{t('TRY DOUBLES', 'ПОПЫТАТЬ УДАЧУ')}</button>
                    )}
                    <button onClick={() => socket.emit('jailAction', { roomId: gameState.roomId, action: 'PAY' })} className="bg-[#FF4081] text-white px-8 py-3 font-bold">{t('PAY BAIL', 'ВЫЙТИ ПОД ЗАЛОГ')} (${gameState.players[gameState.turnIndex].jailTurns >= 3 ? 700 : 500})</button>
                  </div>
                )}

                {gameState.waitingForAction && isMyTurn && (
                  <div className="flex gap-4">
                    {gameState.actionType === 'BUY' && (
                      <>
                        <button onClick={() => sendAction('BUY')} className="bg-[#00E676] text-black px-8 py-3 font-bold">{t('BUY PROPERTY', 'КУПИТЬ ОБЪЕКТ')}</button>
                        <button onClick={() => sendAction('AUCTION')} className="bg-[#333] text-white px-8 py-3 font-bold">{t('AUCTION', 'АУКЦИОН')}</button>
                      </>
                    )}
                    {gameState.actionType === 'RENT' && (
                      <button onClick={() => sendAction('PAY_RENT')} className="bg-[#FF3D00] text-white px-8 py-3 font-bold">{t('PAY RENT', 'ОПЛАТИТЬ АРЕНДУ')}</button>
                    )}
                    {gameState.actionType === 'TAX' && (
                      <button onClick={() => sendAction('PAY_TAX')} className="bg-[#FF3D00] text-white px-8 py-3 font-bold">{t('PAY TAX', 'ОПЛАТИТЬ НАЛОГ')}</button>
                    )}
                    {gameState.actionType === 'CASINO' && !gameState.casino && (
                      <div className="flex gap-4">
                        <button onClick={() => socket.emit('casinoAction', { roomId: gameState.roomId, type: 'SLOT' })} className="bg-[#FFEA00] text-black px-8 py-3 font-bold">{t('SPIN SLOT ($1000)', 'КРУТИТЬ СЛОТ ($1000)')}</button>
                        <button onClick={() => {
                          const opp = gameState.players.find(p => p.id !== socket.id && !p.isBankrupt && p.balance >= 600);
                          if (opp) socket.emit('initDuel', { roomId: gameState.roomId, opponentId: opp.id });
                        }} className="bg-[#FF4081] text-white px-8 py-3 font-bold">{t('DUEL ($600)', 'ДУЭЛЬ ($600)')}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Casino Overlay */}
            <AnimatePresence>
              {gameState.actionType === 'CASINO' && gameState.casino && (
                <motion.div className="absolute inset-0 z-50 backdrop-blur-md bg-black/60 flex items-center justify-center p-8">
                  <div className="bg-[#003333] border-4 border-[#CC0099] p-12 w-full max-w-2xl text-center space-y-8 shadow-[0_0_50px_rgba(204,0,153,0.3)] rounded-[3rem] relative overflow-hidden">
                    {/* Neon Outlines */}
                    <div className="absolute inset-0 border-2 border-[#d20202] opacity-50 animate-pulse pointer-events-none" />
                    
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black text-[#FFD700] italic tracking-tighter uppercase">{t('CASINO', 'КАЗИНО')}</h2>
                      <p className="text-sm font-bold text-[#CC0099] uppercase tracking-widest">
                        {gameState.casino.type === 'DUEL' ? t('DEADLY DOUBLE', 'СМЕРТЕЛЬНЫЙ ДУБЛЬ') : t('WAFFLE JACKPOT', 'ВАФЕЛЬНЫЙ ДЖЕКПОТ')}
                      </p>
                    </div>

                    {gameState.casino.type === 'DUEL' ? (
                      <div className="space-y-8">
                        <div className="flex justify-around items-center">
                          <div className="space-y-4">
                            <div className="text-xl font-bold" style={{ color: gameState.players.find(p => p.id === gameState.casino?.activePlayerId)?.color }}>
                              {gameState.players.find(p => p.id === gameState.casino?.activePlayerId)?.name}
                            </div>
                            {gameState.casino.playerRoll !== undefined ? <div className="text-4xl font-mono">{gameState.casino.playerRoll}</div> : <div className="animate-pulse text-gray-500">{t('WAITING...', 'ОЖИДАНИЕ...')}</div>}
                          </div>
                          <div className="text-6xl font-black text-white/10">{t('VS', 'ПРОТИВ')}</div>
                          <div className="space-y-4">
                            <div className="text-xl font-bold" style={{ color: gameState.players.find(p => p.id === gameState.casino?.opponentId)?.color }}>
                              {gameState.players.find(p => p.id === gameState.casino?.opponentId)?.name}
                            </div>
                            {gameState.casino.opponentRoll !== undefined ? <div className="text-4xl font-mono">{gameState.casino.opponentRoll}</div> : <div className="animate-pulse text-gray-500">{t('WAITING...', 'ОЖИДАНИЕ...')}</div>}
                          </div>
                        </div>
                        {(socket.id === gameState.casino.activePlayerId || socket.id === gameState.casino.opponentId) && (
                          <button 
                            onClick={() => socket.emit('rollDuel', { roomId: gameState.roomId })}
                            className="bg-white text-black px-12 py-4 font-black hover:scale-105 transition-transform rounded-xl"
                          >
                            {t('ROLL DUEL DICE', 'БРОСИТЬ КУБИКИ')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="flex justify-center gap-4">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="w-24 h-32 bg-[#050505] border-2 border-[#CC0099] rounded-2xl flex items-center justify-center text-5xl overflow-hidden">
                              <motion.div
                                animate={isSpinning ? { y: [0, -500] } : { y: 0 }}
                                transition={isSpinning ? { repeat: Infinity, duration: 0.1, ease: 'linear' } : {}}
                              >
                                {slotResult ? slotResult[i] : '🧇'}
                              </motion.div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-center gap-4">
                          {!isSpinning && !slotResult && (
                            <button 
                              onClick={() => socket.emit('casinoAction', { roomId: gameState.roomId, type: 'SLOT' })}
                              disabled={gameState.players.find(p => p.id === socket.id)!.balance < 1000}
                              className="bg-[#FFD700] text-black px-12 py-4 font-black hover:scale-105 transition-transform rounded-xl disabled:opacity-50"
                            >
                              SPIN ($1000)
                            </button>
                          )}
                          {!isSpinning && (
                            <button 
                              onClick={() => socket.emit('closeCasino', { roomId: gameState.roomId })}
                              className="bg-white/10 text-white px-8 py-4 font-bold rounded-xl hover:bg-white/20"
                            >
                              {t('CLOSE', 'ЗАКРЫТЬ')}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trade Builder Overlay */}
            <AnimatePresence>
              {tradePartnerId && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 md:p-8"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-[#0A0A0A] border border-[#1A1A1A] w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    <div className="p-6 border-b border-[#1A1A1A] flex justify-between items-center bg-[#111]">
                      <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{t('PROPOSE TRADE', 'ПРЕДЛОЖИТЬ ОБМЕН')}</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                          {t('TRADING WITH', 'ОБМЕН С')}: <span className="text-[#00C8FF]">{gameState.players.find(p => p.id === tradePartnerId)?.name}</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => setTradePartnerId(null)}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* My Side */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest">{t('YOUR ASSETS', 'ВАШИ АКТИВЫ')}</h3>
                          <div className="text-right">
                            <div className="text-[10px] text-gray-500 uppercase font-bold">{t('CASH', 'НАЛИЧНЫЕ')}</div>
                            <input 
                              type="number" 
                              value={myTradeCash}
                              onChange={(e) => setMyTradeCash(Math.min(parseInt(e.target.value) || 0, gameState.players.find(p => p.id === socket.id)!.balance))}
                              className="bg-transparent border-b border-[#333] text-right font-mono text-xl focus:border-[#00C8FF] outline-none w-32"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {(Object.values(gameState.properties) as Property[])
                            .filter(p => p.ownerId === socket.id)
                            .map(p => {
                              const cell = BOARD_CONFIG[p.id];
                              const isSelected = myTradeProps.includes(p.id);
                              return (
                                <div 
                                  key={p.id}
                                  onClick={() => setMyTradeProps(prev => isSelected ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                                  className={cn(
                                    "p-3 border transition-all cursor-pointer flex items-center gap-3",
                                    isSelected ? "border-[#00C8FF] bg-[#00C8FF]/10" : "border-[#1A1A1A] hover:border-[#333]"
                                  )}
                                >
                                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: cell.color || '#333' }} />
                                  <div className="flex-1 text-[10px] font-bold uppercase">{lang === 'ru' ? cell.nameRu : cell.name}</div>
                                  <div className="text-[10px] font-mono text-gray-500">${cell.price}</div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Partner Side */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                            {t('ASSETS', 'АКТИВЫ')} {gameState.players.find(p => p.id === tradePartnerId)?.name}
                          </h3>
                          <div className="text-right">
                            <div className="text-[10px] text-gray-500 uppercase font-bold">{t('CASH', 'НАЛИЧНЫЕ')}</div>
                            <input 
                              type="number" 
                              value={partnerTradeCash}
                              onChange={(e) => setPartnerTradeCash(Math.min(parseInt(e.target.value) || 0, gameState.players.find(p => p.id === tradePartnerId)!.balance))}
                              className="bg-transparent border-b border-[#333] text-right font-mono text-xl focus:border-[#00C8FF] outline-none w-32"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {(Object.values(gameState.properties) as Property[])
                            .filter(p => p.ownerId === tradePartnerId)
                            .map(p => {
                              const cell = BOARD_CONFIG[p.id];
                              const isSelected = partnerTradeProps.includes(p.id);
                              return (
                                <div 
                                  key={p.id}
                                  onClick={() => setPartnerTradeProps(prev => isSelected ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                                  className={cn(
                                    "p-3 border transition-all cursor-pointer flex items-center gap-3",
                                    isSelected ? "border-[#00C8FF] bg-[#00C8FF]/10" : "border-[#1A1A1A] hover:border-[#333]"
                                  )}
                                >
                                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: cell.color || '#333' }} />
                                  <div className="flex-1 text-[10px] font-bold uppercase">{lang === 'ru' ? cell.nameRu : cell.name}</div>
                                  <div className="text-[10px] font-mono text-gray-500">${cell.price}</div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    <div className="p-8 border-t border-[#1A1A1A] bg-[#111] flex flex-col items-center gap-6">
                      <div className="flex gap-12 items-center">
                        <div className="text-center">
                          <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('YOUR TOTAL', 'ВАШ ИТОГ')}</div>
                          <div className="text-2xl font-black font-mono">
                            ${(myTradeCash + myTradeProps.reduce((sum, id) => sum + (BOARD_CONFIG[id].price || 0), 0)).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-4xl font-black text-[#1A1A1A]">VS</div>
                        <div className="text-center">
                          <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('THEIR TOTAL', 'ИХ ИТОГ')}</div>
                          <div className={cn(
                            "text-2xl font-black font-mono",
                            (() => {
                              const myVal = myTradeCash + myTradeProps.reduce((sum, id) => sum + (BOARD_CONFIG[id].price || 0), 0);
                              const theirVal = partnerTradeCash + partnerTradeProps.reduce((sum, id) => sum + (BOARD_CONFIG[id].price || 0), 0);
                              if (theirVal === 0) return myVal > 0 ? "text-red-500" : "text-white";
                              const ratio = myVal / theirVal;
                              return (ratio < 0.5 || ratio > 1.5) ? "text-red-500" : "text-white";
                            })()
                          )}>
                            ${(partnerTradeCash + partnerTradeProps.reduce((sum, id) => sum + (BOARD_CONFIG[id].price || 0), 0)).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <button 
                        disabled={(() => {
                          const myVal = myTradeCash + myTradeProps.reduce((sum, id) => sum + (BOARD_CONFIG[id].price || 0), 0);
                          const theirVal = partnerTradeCash + partnerTradeProps.reduce((sum, id) => sum + (BOARD_CONFIG[id].price || 0), 0);
                          if (myVal === 0 && theirVal === 0) return true;
                          if (theirVal === 0) return myVal > 0;
                          const ratio = myVal / theirVal;
                          return ratio < 0.5 || ratio > 1.5;
                        })()}
                        onClick={() => {
                          socket.emit('proposeTrade', {
                            roomId: gameState.roomId,
                            offer: {
                              fromId: socket.id,
                              toId: tradePartnerId,
                              fromProperties: myTradeProps,
                              fromCash: myTradeCash,
                              toProperties: partnerTradeProps,
                              toCash: partnerTradeCash
                            }
                          });
                          setTradePartnerId(null);
                          setMyTradeCash(0);
                          setPartnerTradeCash(0);
                          setMyTradeProps([]);
                          setPartnerTradeProps([]);
                        }}
                        className="w-full max-w-md bg-[#00C8FF] text-black py-4 rounded-2xl font-black text-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:bg-gray-600"
                      >
                        {t('OFFER TRADE', 'ПРЕДЛОЖИТЬ ОБМЕН')}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trade Overlay */}
            <AnimatePresence>
              {gameState.trade && gameState.trade.toId === socket.id && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 md:p-8"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-[#0A0A0A] border border-[#1A1A1A] w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    <div className="p-6 border-b border-[#1A1A1A] bg-[#111] text-center">
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{t('TRADE PROPOSAL', 'ПРЕДЛОЖЕНИЕ ОБМЕНА')}</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                        {t('FROM', 'ОТ')}: <span className="text-[#00C8FF]">{gameState.players.find(p => p.id === gameState.trade.fromId)?.name}</span>
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Offered to You */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase text-[#00E676] tracking-widest border-b border-[#00E676]/20 pb-2">
                          {t('YOU ARE OFFERED', 'ВАМ ПРЕДЛАГАЮТ')}
                        </h3>
                        <div className="space-y-2">
                          {gameState.trade.fromCash > 0 && (
                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <Coins className="text-[#00C8FF]" size={20} />
                                <span className="text-sm font-bold uppercase">{t('CASH', 'НАЛИЧНЫЕ')}</span>
                              </div>
                              <span className="text-xl font-black font-mono text-[#00C8FF]">${gameState.trade.fromCash.toLocaleString()}</span>
                            </div>
                          )}
                          {gameState.trade.fromProperties.map(id => {
                            const cell = BOARD_CONFIG[id];
                            return (
                              <div key={id} className="p-3 border border-[#1A1A1A] bg-[#111] flex items-center gap-3 rounded-xl">
                                <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: cell.color || '#333' }} />
                                <div className="flex-1">
                                  <div className="text-[10px] font-bold uppercase text-white">{lang === 'ru' ? cell.nameRu : cell.name}</div>
                                  <div className="text-[8px] font-bold text-gray-500 uppercase">{t('PROPERTY', 'НЕДВИЖИМОСТЬ')}</div>
                                </div>
                                <div className="text-xs font-mono text-gray-400">${cell.price}</div>
                              </div>
                            );
                          })}
                          {gameState.trade.fromCash === 0 && gameState.trade.fromProperties.length === 0 && (
                            <div className="text-center py-8 text-gray-600 font-bold uppercase text-[10px] italic">
                              {t('NOTHING OFFERED', 'НИЧЕГО НЕ ПРЕДЛОЖЕНО')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Requested from You */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase text-[#FF3D00] tracking-widest border-b border-[#FF3D00]/20 pb-2">
                          {t('YOU ARE ASKED FOR', 'ОТ ВАС ТРЕБУЮТ')}
                        </h3>
                        <div className="space-y-2">
                          {gameState.trade.toCash > 0 && (
                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <Coins className="text-[#FF3D00]" size={20} />
                                <span className="text-sm font-bold uppercase">{t('CASH', 'НАЛИЧНЫЕ')}</span>
                              </div>
                              <span className="text-xl font-black font-mono text-[#FF3D00]">${gameState.trade.toCash.toLocaleString()}</span>
                            </div>
                          )}
                          {gameState.trade.toProperties.map(id => {
                            const cell = BOARD_CONFIG[id];
                            return (
                              <div key={id} className="p-3 border border-[#1A1A1A] bg-[#111] flex items-center gap-3 rounded-xl">
                                <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: cell.color || '#333' }} />
                                <div className="flex-1">
                                  <div className="text-[10px] font-bold uppercase text-white">{lang === 'ru' ? cell.nameRu : cell.name}</div>
                                  <div className="text-[8px] font-bold text-gray-500 uppercase">{t('PROPERTY', 'НЕДВИЖИМОСТЬ')}</div>
                                </div>
                                <div className="text-xs font-mono text-gray-400">${cell.price}</div>
                              </div>
                            );
                          })}
                          {gameState.trade.toCash === 0 && gameState.trade.toProperties.length === 0 && (
                            <div className="text-center py-8 text-gray-600 font-bold uppercase text-[10px] italic">
                              {t('NOTHING REQUESTED', 'НИЧЕГО НЕ ТРЕБУЕТСЯ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-8 border-t border-[#1A1A1A] bg-[#111] flex gap-4">
                      <button 
                        onClick={() => socket.emit('respondTrade', { roomId: gameState.roomId, accept: false })}
                        className="flex-1 bg-white/5 text-white py-4 rounded-2xl font-black text-xl hover:bg-red-500/20 hover:text-red-500 transition-all border border-white/10"
                      >
                        {t('REJECT', 'ОТКЛОНИТЬ')}
                      </button>
                      <button 
                        onClick={() => socket.emit('respondTrade', { roomId: gameState.roomId, accept: true })}
                        className="flex-1 bg-[#00E676] text-black py-4 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,230,118,0.3)]"
                      >
                        {t('ACCEPT', 'ПРИНЯТЬ')}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auction Overlay */}
            <AnimatePresence>
              {gameState.auction && (
                <motion.div 
                  initial={{ opacity: 0, backdropFilter: 'blur(0px) brightness(1)' }}
                  animate={{ opacity: 1, backdropFilter: 'blur(2px) brightness(0.6)' }}
                  exit={{ opacity: 0, backdropFilter: 'blur(0px) brightness(1)' }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 z-50 flex items-center justify-center p-8"
                >
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                      x: gameState.auction.timeLeft <= 3 ? [0, -1, 1, -1, 1, 0] : 0
                    }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ 
                      scale: { type: 'spring', damping: 15, stiffness: 100, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }, // backOut
                      x: { repeat: Infinity, duration: 0.1 }
                    }}
                    className="bg-[#111] border border-white/10 p-10 rounded-[2rem] w-full max-w-md text-center space-y-8 shadow-2xl relative overflow-hidden"
                  >
                    {/* Top Progress Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5">
                      <motion.div 
                        className={cn(
                          "h-full transition-all duration-1000 linear",
                          gameState.auction.isStarting ? "bg-[#FFEA00]" :
                          gameState.auction.timeLeft > 5 ? "bg-[#00bc7d]" : 
                          gameState.auction.timeLeft > 2 ? "bg-[#F19C38]" : "bg-[#EB4D4B]"
                        )}
                        initial={{ width: '100%' }}
                        animate={{ width: `${(gameState.auction.timeLeft / (gameState.auction.isStarting ? 3 : 10)) * 100}%` }}
                        style={{
                          animation: (!gameState.auction.isStarting && gameState.auction.timeLeft <= 3) ? 'pulse 0.5s infinite' : 'none'
                        }}
                      />
                    </div>

                    {gameState.auction.isStarting ? (
                      <div className="space-y-6 py-10">
                        <div className="w-20 h-20 bg-[#FFEA00]/10 rounded-full flex items-center justify-center text-[#FFEA00] mx-auto animate-pulse">
                          <Landmark size={40} />
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{t('AUCTION STARTING', 'АУКЦИОН НАЧИНАЕТСЯ')}</h2>
                          <p className="text-gray-400 font-mono text-sm uppercase">{t('PREPARING LOT', 'ПОДГОТОВКА ЛОТА')}: <span className="text-[#FFEA00]">{BOARD_CONFIG[gameState.auction.propertyId].name}</span></p>
                        </div>
                        <div className="text-5xl font-black text-white font-mono">
                          {gameState.auction.timeLeft}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#00bc7d]/10 rounded-xl flex items-center justify-center text-[#00bc7d]">
                              <Landmark size={20} />
                            </div>
                            <div className="text-left">
                              <h2 className="text-xl font-black tracking-tight text-white uppercase">{t('AUCTION', 'АУКЦИОН')}</h2>
                              <p className="text-[10px] text-gray-500 font-bold uppercase">{BOARD_CONFIG[gameState.auction.propertyId].name}</p>
                            </div>
                          </div>
                          <motion.div 
                            key={gameState.auction.timeLeft}
                            initial={{ scale: 1.3 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.1 }}
                            className={cn(
                              "text-3xl font-mono font-black",
                              gameState.auction.timeLeft <= 3 ? "text-[#EB4D4B]" : "text-white"
                            )}
                          >
                            0:{gameState.auction.timeLeft.toString().padStart(2, '0')}
                          </motion.div>
                        </div>

                        <div 
                          className="bg-white/5 rounded-3xl p-10 border border-white/5 relative transition-all duration-500"
                          style={{
                            boxShadow: gameState.auction.highestBidderId ? `inset 0 0 40px ${gameState.players.find(p => p.id === gameState.auction?.highestBidderId)?.color}40, 0 0 20px ${gameState.players.find(p => p.id === gameState.auction?.highestBidderId)?.color}20` : 'none'
                          }}
                        >
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">{t('CURRENT BID', 'ТЕКУЩАЯ СТАВКА')}</p>
                          <motion.div 
                            key={gameState.auction.currentBid}
                            initial={{ scale: 1.4 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.1 }}
                            className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                          >
                            ${gameState.auction.currentBid.toLocaleString()}
                          </motion.div>
                          {gameState.auction.highestBidderId && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-4 flex items-center justify-center gap-2"
                            >
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: gameState.players.find(p => p.id === gameState.auction?.highestBidderId)?.color }} />
                              <span className="text-[10px] font-bold uppercase" style={{ color: gameState.players.find(p => p.id === gameState.auction?.highestBidderId)?.color }}>
                                {gameState.players.find(p => p.id === gameState.auction?.highestBidderId)?.name} {t('IS LEADING', 'ЛИДИРУЕТ')}
                              </span>
                            </motion.div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => bid(100)} 
                            disabled={gameState.players.find(p => p.id === socket.id)!.balance < gameState.auction.currentBid + 100}
                            className="bg-[#00bc7d] text-black p-5 rounded-2xl font-black text-lg hover:scale-105 disabled:opacity-50 disabled:bg-gray-600 disabled:hover:scale-100 transition-all shadow-lg"
                          >
                            +$100
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => bid(500)} 
                            disabled={gameState.players.find(p => p.id === socket.id)!.balance < gameState.auction.currentBid + 500}
                            className="bg-[#00bc7d] text-black p-5 rounded-2xl font-black text-lg hover:scale-105 disabled:opacity-50 disabled:bg-gray-600 disabled:hover:scale-100 transition-all shadow-lg"
                          >
                            +$500
                          </motion.button>
                        </div>
                      </>
                    )}

                    <div className="text-[9px] text-gray-600 font-bold uppercase flex justify-center gap-4">
                      <span>{t('MIN BID', 'МИН. СТАВКА')}: ${gameState.auction.currentBid + 100}</span>
                      <span>•</span>
                      <span>{t('YOUR BALANCE', 'ВАШ БАЛАНС')}: ${(gameState.players.find(p => p.id === socket.id)?.balance || 0).toLocaleString()}</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auction Winner Banner */}
            <AnimatePresence>
              {auctionWinner && (
                <motion.div 
                  initial={{ y: -100, opacity: 0 }}
                  animate={{ y: 50, opacity: 1 }}
                  exit={{ y: -100, opacity: 0 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 z-[60] bg-[#00bc7d] text-black px-12 py-4 rounded-full font-black text-2xl shadow-[0_0_50px_rgba(0,188,125,0.5)] flex items-center gap-4"
                >
                  <motion.div
                    animate={{ rotate: [-30, 0] }}
                    transition={{ duration: 0.2, repeat: 3 }}
                  >
                    <Gavel size={32} />
                  </motion.div>
                  <motion.span
                    initial={{ scale: 1.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="inline-block"
                  >
                    {auctionWinner} {t('WINS THE LOT!', 'ВЫИГРАЛ ЛОТ!')}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Game Log */}
            <div className="h-48 bg-[#050505] border border-[#1A1A1A] p-4 font-mono text-[10px] overflow-y-auto flex flex-col gap-1">
              {gameState.logs.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-gray-600">[{new Date(parseInt(log.id)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                  <span style={{ color: log.color || '#888' }}>{lang === 'ru' && log.textRu ? log.textRu : log.text}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Assets */}
      <div className="w-80 border-l border-[#1A1A1A] p-4 bg-[#0A0A0A] flex flex-col gap-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('Your Real Estate', 'Ваша недвижимость')}</div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {(Object.values(gameState.properties) as Property[])
            .filter(p => p.ownerId === socket.id)
            .map(p => {
              const cell = BOARD_CONFIG.find(c => c.id === p.id);
              if (!cell) return null;
              return (
                <div key={p.id} className="bg-[#141414] border border-[#1A1A1A] p-3 flex items-center gap-3 group hover:border-[#333] transition-colors">
                  <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: cell.color || '#333' }} />
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase">{t(cell.name, cell.nameRu)}</div>
                    <div className="text-[8px] text-gray-500 font-mono">{t('RENT', 'АРЕНДА')}: ${cell.price / 10}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1 justify-end">
                      {[...Array(p.branches)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-[#FFEA00] rounded-full" />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {isMyTurn && !gameState.waitingForAction && !gameState.hasRolled && (
                        <>
                          {(() => {
                            const cell = BOARD_CONFIG[p.id];
                            const setCells = BOARD_CONFIG.filter(c => c.set === cell.set);
                            const ownsAll = setCells.every(c => gameState.properties[c.id].ownerId === socket.id);
                            const isMaxed = p.branches >= 5;
                            const isPledged = p.isPledged;

                            if (!ownsAll || isMaxed || isPledged) return null;

                            const isUpgradedThisTurn = gameState.upgradedThisTurn.includes(p.id);
                            const otherProps = setCells.map(c => gameState.properties[c.id]);
                            const minBranches = Math.min(...otherProps.map(pr => pr.branches));
                            const isUniformViolation = p.branches > minBranches;
                            const canUpgradeNow = !isUpgradedThisTurn && !isUniformViolation;

                            return (
                              <button 
                                onClick={() => canUpgradeNow && socket.emit('upgradeProperty', { roomId: gameState.roomId, propertyId: p.id })}
                                disabled={!canUpgradeNow}
                                title={isUpgradedThisTurn ? t("Turn limit exhausted", "Лимит хода исчерпан") : isUniformViolation ? t("Uniform development required", "Требуется равномерное развитие") : ""}
                                className={cn(
                                  "text-[8px] px-1 transition-colors",
                                  canUpgradeNow ? "bg-[#333] hover:bg-[#444]" : "bg-[#1A1A1A] text-gray-600 cursor-not-allowed"
                                )}
                              >
                                {t('UP', 'УЛУЧ')}
                              </button>
                            );
                          })()}
                          <button 
                            onClick={() => socket.emit('pledgeProperty', { roomId: gameState.roomId, propertyId: p.id })}
                            className="text-[8px] bg-[#333] px-1 hover:bg-[#444]"
                          >
                            {t('PAWN', 'ЗАЛОГ')}
                          </button>
                        </>
                      )}
                      {p.isPledged && (
                        <button 
                          onClick={() => socket.emit('redeemProperty', { roomId: gameState.roomId, propertyId: p.id })}
                          className="text-[8px] bg-[#FF4081] px-1"
                        >
                          {t('FIX', 'ВЫКУП')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        
        {/* Stats */}
        <div className="border-t border-[#1A1A1A] pt-4 mt-auto">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>{t('NET WORTH', 'КАПИТАЛ')}</span>
            <span className="text-white font-mono">${(gameState.players.find(p => p.id === socket.id)?.balance || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>{t('PROPERTIES', 'ОБЪЕКТЫ')}</span>
            <span className="text-white font-mono">{(Object.values(gameState.properties) as Property[]).filter(p => p.ownerId === socket.id).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiceIcon({ value }: { value: number }) {
  const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  const Icon = icons[value - 1] || Dice1;
  return (
    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg text-black">
      <Icon size={40} />
    </div>
  );
}

function getGridArea(idx: number) {
  // Top row: 0-10
  if (idx <= 10) return `1 / ${idx + 1}`;
  // Right side: 11-20
  if (idx <= 20) return `${idx - 10 + 1} / 11`;
  // Bottom row: 21-30 (right to left)
  if (idx <= 30) return `11 / ${11 - (idx - 20)}`;
  // Left side: 31-39 (bottom to top)
  if (idx <= 39) return `${11 - (idx - 30)} / 1`;
  return '';
}
