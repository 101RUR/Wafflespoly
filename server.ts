import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import type { GameState, Player, Property, Cell, TradeOffer } from "./src/types.js";
import { BOARD_CONFIG, CHANCE_EVENTS, RENT_TABLES, FLEET_RENT } from "./src/constants.js";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const rooms: Record<string, GameState> = {};

  const generateId = () => Date.now().toString() + Math.random().toString(36).substring(2, 5);

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("createRoom", (name: string) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const player: Player = {
        id: socket.id,
        name,
        color: "#FF4081",
        position: 0,
        balance: 15000,
        isBankrupt: false,
        inJail: false,
        jailTurns: 0,
        skipNextTurn: false,
      };

      rooms[roomId] = {
        roomId,
        players: [player],
        properties: BOARD_CONFIG.reduce((acc, cell) => {
          if (cell.type === 'PROPERTY' || cell.type === 'FLEET') {
            acc[cell.id] = {
              id: cell.id,
              ownerId: null,
              branches: 0,
              isPledged: false,
              pledgeMovesLeft: null,
            };
          }
          return acc;
        }, {} as Record<number, Property>),
        turnIndex: 0,
        gameStarted: false,
        gameStartTime: Date.now(),
        logs: [{ id: generateId(), text: `Room created by ${name}` }],
        auction: null,
        trade: null,
        casino: null,
        economicStage: 1,
        lastDice: [1, 1],
        doublesCount: 0,
        hasRolled: false,
        upgradedThisTurn: [],
        waitingForAction: false,
        actionType: null,
        actionData: null,
      };

      socket.join(roomId);
      socket.emit("roomCreated", rooms[roomId]);
    });

    socket.on("joinRoom", ({ roomId, name }: { roomId: string; name: string }) => {
      const room = rooms[roomId];
      if (!room) return socket.emit("error", "Room not found");
      if (room.gameStarted) return socket.emit("error", "Game already started");
      if (room.players.length >= 4) return socket.emit("error", "Room full");

      const colors = ["#FF4081", "#00C8FF", "#00E676", "#FFEA00"];
      const player: Player = {
        id: socket.id,
        name,
        color: colors[room.players.length],
        position: 0,
        balance: 15000,
        isBankrupt: false,
        inJail: false,
        jailTurns: 0,
        skipNextTurn: false,
      };

      room.players.push(player);
      socket.join(roomId);
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("startGame", (roomId: string) => {
      const room = rooms[roomId];
      if (!room || room.players[0].id !== socket.id) return;
      if (room.players.length < 2) return;

      room.gameStarted = true;
      room.gameStartTime = Date.now();
      room.logs.push({ id: generateId(), text: "Game started!", textRu: "Игра началась!" });
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("rollDice", (roomId: string) => {
      const room = rooms[roomId];
      if (!room || !room.gameStarted || room.waitingForAction) return;
      
      const currentPlayer = room.players[room.turnIndex];
      if (currentPlayer.id !== socket.id || room.hasRolled) return;

      // Check for Jail
      if (currentPlayer.inJail) {
        // Handled via separate jail actions
        return;
      }

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      room.lastDice = [d1, d2];
      room.hasRolled = true;
      const total = d1 + d2;

      room.logs.push({ 
        id: generateId(), 
        text: `${currentPlayer.name} rolls ${d1}:${d2}`,
        textRu: `${currentPlayer.name} выбрасывает ${d1}:${d2}`,
        color: currentPlayer.color 
      });

      if (d1 === d2) {
        room.doublesCount++;
        if (room.doublesCount === 3) {
          currentPlayer.position = 10;
          currentPlayer.inJail = true;
          currentPlayer.jailTurns = 0;
          room.doublesCount = 0;
          room.logs.push({ 
            id: generateId(), 
            text: `${currentPlayer.name} is arrested for speeding!`, 
            textRu: `${currentPlayer.name} арестован за превышение скорости!`,
            color: currentPlayer.color 
          });
          nextTurn(room);
          io.to(roomId).emit("gameStateUpdate", room);
          return;
        }
      } else {
        room.doublesCount = 0;
      }

      movePlayer(room, currentPlayer, total);
      handleLanding(room, currentPlayer);
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("jailAction", ({ roomId, action }: { roomId: string; action: 'ROLL' | 'PAY' }) => {
      const room = rooms[roomId];
      if (!room) return;
      const player = room.players[room.turnIndex];
      if (player.id !== socket.id || !player.inJail) return;

      if (action === 'PAY') {
        const cost = player.jailTurns >= 3 ? 700 : 500;
        if (player.balance >= cost) {
          player.balance -= cost;
          player.inJail = false;
          player.jailTurns = 0;
          room.logs.push({ 
            id: generateId(), 
            text: `${player.name} paid $${cost} bail`, 
            textRu: `${player.name} заплатил $${cost} залога`,
            color: player.color 
          });
        }
      } else {
        if (player.jailTurns >= 3) return; // Cannot roll after 3 turns

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        room.lastDice = [d1, d2];
        if (d1 === d2) {
          player.inJail = false;
          player.jailTurns = 0;
          room.logs.push({ 
            id: generateId(), 
            text: `${player.name} rolled doubles and escaped!`, 
            textRu: `${player.name} выбросил дубль и сбежал!`,
            color: player.color 
          });
          movePlayer(room, player, d1 + d2);
          handleLanding(room, player);
        } else {
          player.jailTurns++;
          room.logs.push({ 
            id: generateId(), 
            text: `${player.name} failed to roll doubles`, 
            textRu: `${player.name} не выбросил дубль`,
            color: player.color 
          });
          if (player.jailTurns < 3) {
            nextTurn(room);
          }
          // If jailTurns is now 3, they must pay, so we don't call nextTurn automatically.
          // They are stuck in jail until they pay.
        }
      }
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("upgradeProperty", ({ roomId, propertyId }: { roomId: string; propertyId: number }) => {
      const room = rooms[roomId];
      if (!room || room.waitingForAction || room.hasRolled) return;
      const player = room.players[room.turnIndex];
      if (player.id !== socket.id) return;

      const cell = BOARD_CONFIG[propertyId];
      const prop = room.properties[propertyId];
      if (prop.ownerId !== player.id || prop.isPledged) return;

      // Check turn limit
      if (room.upgradedThisTurn.includes(propertyId)) {
        return socket.emit("error", "Turn limit exhausted for this property");
      }

      // Check set ownership
      const setCells = BOARD_CONFIG.filter(c => c.set === cell.set);
      const ownsAll = setCells.every(c => room.properties[c.id].ownerId === player.id);
      if (!ownsAll) return;

      // Check even distribution
      const otherProps = setCells.map(c => room.properties[c.id]);
      const minBranches = Math.min(...otherProps.map(p => p.branches));
      if (prop.branches > minBranches) return;
      if (prop.branches >= 5) return;

      const cost = 500; // Simplified cost
      if (player.balance >= cost) {
        player.balance -= cost;
        prop.branches++;
        room.upgradedThisTurn.push(propertyId);
        room.logs.push({ 
          id: generateId(), 
          text: `${player.name} upgraded ${cell.name} to level ${prop.branches}`, 
          textRu: `${player.name} улучшил ${cell.nameRu || cell.name} до уровня ${prop.branches}`,
          color: player.color 
        });
      }
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("pledgeProperty", ({ roomId, propertyId }: { roomId: string; propertyId: number }) => {
      const room = rooms[roomId];
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      const prop = room.properties[propertyId];
      if (prop.ownerId !== player.id || prop.branches > 0 || prop.isPledged) return;

      const cell = BOARD_CONFIG[propertyId];
      const value = Math.floor(cell.price * 0.6);
      player.balance += value;
      prop.isPledged = true;
      prop.pledgeMovesLeft = 15;
      room.logs.push({ 
        id: generateId(), 
        text: `${player.name} pledged ${cell.name} for $${value}`, 
        textRu: `${player.name} заложил ${cell.nameRu || cell.name} за $${value}`,
        color: player.color 
      });
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("redeemProperty", ({ roomId, propertyId }: { roomId: string; propertyId: number }) => {
      const room = rooms[roomId];
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      const prop = room.properties[propertyId];
      if (prop.ownerId !== player.id || !prop.isPledged) return;

      const cell = BOARD_CONFIG[propertyId];
      const cost = Math.floor(cell.price * 0.6 * 1.1);
      if (player.balance >= cost) {
        player.balance -= cost;
        prop.isPledged = false;
        prop.pledgeMovesLeft = null;
        room.logs.push({ 
          id: generateId(), 
          text: `${player.name} redeemed ${cell.name} for $${cost}`, 
          textRu: `${player.name} выкупил ${cell.nameRu || cell.name} за $${cost}`,
          color: player.color 
        });
      }
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("bidAuction", ({ roomId, amount }: { roomId: string; amount: number }) => {
      const room = rooms[roomId];
      if (!room || !room.auction) return;
      if (!room.auction.participants.includes(socket.id)) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      // Validation
      const nextBid = room.auction.currentBid + amount;
      if (player.balance < nextBid) {
        return socket.emit("error", "Insufficient funds!");
      }

      // Concurrency check (simple first-come-first-served)
      if (room.auction.highestBidderId === socket.id) {
        // Optional: prevent bidding against yourself if no one else has bid yet
      }

      room.auction.currentBid = nextBid;
      room.auction.highestBidderId = socket.id;
      room.auction.timeLeft = 5; // Reset to 5s on every bid as per spec
      
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("proposeTrade", ({ roomId, offer }: { roomId: string; offer: TradeOffer }) => {
      const room = rooms[roomId];
      if (!room || room.waitingForAction) return;
      
      // Validate trade value (50% corridor)
      const getVal = (props: number[], cash: number) => {
        const propVal = props.reduce((sum, id) => sum + (BOARD_CONFIG[id].price || 0), 0);
        return propVal + cash;
      };

      const fromVal = getVal(offer.fromProperties, offer.fromCash);
      const toVal = getVal(offer.toProperties, offer.toCash);

      // Avoid division by zero
      if (toVal === 0) {
        if (fromVal > 0) return socket.emit("error", "Trade value difference too high (max 50%)");
      } else {
        const ratio = fromVal / toVal;
        if (ratio < 0.5 || ratio > 1.5) {
          return socket.emit("error", "Trade value difference too high (max 50%)");
        }
      }

      room.trade = offer;
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("respondTrade", ({ roomId, accept }: { roomId: string; accept: boolean }) => {
      const room = rooms[roomId];
      if (!room || !room.trade) return;
      if (room.trade.toId !== socket.id) return;

      if (accept) {
        const from = room.players.find(p => p.id === room.trade!.fromId);
        const to = room.players.find(p => p.id === room.trade!.toId);
        
        if (from && to) {
          // Validate trade still valid
          const fromPropsValid = room.trade.fromProperties.every(id => room.properties[id].ownerId === from.id && !room.properties[id].isPledged);
          const toPropsValid = room.trade.toProperties.every(id => room.properties[id].ownerId === to.id && !room.properties[id].isPledged);
          const fromCashValid = from.balance >= room.trade.fromCash;
          const toCashValid = to.balance >= room.trade.toCash;

          if (!fromPropsValid || !toPropsValid || !fromCashValid || !toCashValid) {
            room.logs.push({ 
              id: generateId(), 
              text: "The deal is no longer valid.",
              textRu: "Сделка больше не действительна."
            });
            room.trade = null;
            io.to(roomId).emit("gameStateUpdate", room);
            return;
          }

          from.balance -= room.trade.fromCash;
          from.balance += room.trade.toCash;
          to.balance -= room.trade.toCash;
          to.balance += room.trade.fromCash;

          room.trade.fromProperties.forEach(id => room.properties[id].ownerId = to.id);
          room.trade.toProperties.forEach(id => room.properties[id].ownerId = from.id);
          
          room.logs.push({ 
            id: generateId(), 
            text: `Trade completed between ${from.name} and ${to.name}`,
            textRu: `Сделка завершена между ${from.name} и ${to.name}`
          });
        }
      }
      room.trade = null;
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("initDuel", ({ roomId, opponentId }: { roomId: string; opponentId: string }) => {
      const room = rooms[roomId];
      if (!room || room.actionType !== 'CASINO') return;
      const player = room.players[room.turnIndex];
      if (player.id !== socket.id) return;

      if (player.balance < 600) return;
      const opponent = room.players.find(p => p.id === opponentId);
      if (!opponent || opponent.balance < 600) return;

      room.casino = {
        type: 'DUEL',
        activePlayerId: player.id,
        opponentId: opponentId,
        pot: 1200,
      };
      player.balance -= 600;
      opponent.balance -= 600;
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("rollDuel", ({ roomId }: { roomId: string }) => {
      const room = rooms[roomId];
      if (!room || !room.casino || room.casino.type !== 'DUEL') return;
      
      const isPlayer = socket.id === room.casino.activePlayerId;
      const isOpponent = socket.id === room.casino.opponentId;
      if (!isPlayer && !isOpponent) return;

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;
      const isDouble = d1 === d2;

      if (isPlayer && room.casino.playerRoll === undefined) {
        room.casino.playerRoll = total + (isDouble ? 100 : 0);
      } else if (isOpponent && room.casino.opponentRoll === undefined) {
        room.casino.opponentRoll = total + (isDouble ? 100 : 0);
      }

      if (room.casino.playerRoll !== undefined && room.casino.opponentRoll !== undefined) {
        const winnerId = room.casino.playerRoll > room.casino.opponentRoll ? room.casino.activePlayerId : room.casino.opponentId;
        const winner = room.players.find(p => p.id === winnerId);
        if (winner) {
          winner.balance += room.casino.pot!;
          room.logs.push({ 
            id: generateId(), 
            text: `DUEL: ${winner.name} wins $1200!`, 
            textRu: `ДУЭЛЬ: ${winner.name} выигрывает $1200!`,
            color: winner.color 
          });
        }
        room.casino = null;
        room.waitingForAction = false;
        room.actionType = null;
        if (room.doublesCount === 0) nextTurn(room);
      }
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("casinoAction", ({ roomId, type }: { roomId: string; type: string }) => {
      const room = rooms[roomId];
      if (!room || room.actionType !== 'CASINO') return;
      const player = room.players[room.turnIndex];
      if (player.id !== socket.id) return;

      if (type === 'SLOT') {
        if (player.balance < 1000) return;
        player.balance -= 1000;
        const symbols = ['🧇', '💎', '🎩', '🪙', '🍽️'];
        const result = [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
        ];
        
        let win = 0;
        if (result[0] === result[1] && result[1] === result[2]) {
          if (result[0] === '🧇') win = 3000;
          else if (result[0] === '💎') win = 7000;
          else if (result[0] === '🎩') win = 1500;
          else if (result[0] === '🪙') win = 1000;
        } else if ((result[0] === result[1] || result[1] === result[2]) && result[1] !== '🍽️') {
          win = 1000;
        }

        player.balance += win;
        room.logs.push({ 
          id: generateId(), 
          text: `SLOT: ${result.join(' ')} - ${win > 0 ? 'WIN $' + win : 'LOST'}`, 
          textRu: `СЛОТ: ${result.join(' ')} - ${win > 0 ? 'ВЫИГРЫШ $' + win : 'ПРОИГРЫШ'}`,
          color: player.color 
        });
        
        io.to(roomId).emit("slotResult", { result, win });
        io.to(roomId).emit("gameStateUpdate", room);
      }
    });

    socket.on("closeCasino", ({ roomId }: { roomId: string }) => {
      const room = rooms[roomId];
      if (!room || room.actionType !== 'CASINO') return;
      const player = room.players[room.turnIndex];
      if (player.id !== socket.id) return;

      room.waitingForAction = false;
      room.actionType = null;
      room.casino = null;
      if (room.doublesCount === 0) {
        nextTurn(room);
      } else {
        room.hasRolled = false;
      }
      io.to(roomId).emit("gameStateUpdate", room);
    });

    socket.on("actionResponse", ({ roomId, action, data }: { roomId: string; action: string; data: any }) => {
      const room = rooms[roomId];
      if (!room || !room.waitingForAction) return;
      const currentPlayer = room.players[room.turnIndex];
      if (currentPlayer.id !== socket.id) return;

      if (action === "BUY") {
        const cell = BOARD_CONFIG[currentPlayer.position];
        if (currentPlayer.balance >= cell.price) {
          currentPlayer.balance -= cell.price;
          room.properties[cell.id].ownerId = currentPlayer.id;
          room.logs.push({ 
            id: generateId(), 
            text: `${currentPlayer.name} bought ${cell.name} for $${cell.price}`, 
            textRu: `${currentPlayer.name} купил ${cell.nameRu || cell.name} за $${cell.price}`,
            color: currentPlayer.color 
          });
        }
      } else if (action === "AUCTION") {
        startAuction(room, currentPlayer.position);
      } else if (action === "PAY_RENT") {
        const cell = BOARD_CONFIG[currentPlayer.position];
        const prop = room.properties[cell.id];
        const owner = room.players.find(p => p.id === prop.ownerId);
        if (owner) {
          const rent = calculateRent(room, cell, prop);
          currentPlayer.balance -= rent;
          owner.balance += rent;
          room.logs.push({ 
            id: generateId(), 
            text: `${currentPlayer.name} paid $${rent} rent to ${owner.name}`, 
            textRu: `${currentPlayer.name} заплатил $${rent} аренды игроку ${owner.name}`,
            color: currentPlayer.color 
          });
        }
      } else if (action === "PAY_TAX") {
        const cell = BOARD_CONFIG[currentPlayer.position];
        currentPlayer.balance -= cell.price;
        room.logs.push({ 
          id: generateId(), 
          text: `${currentPlayer.name} paid $${cell.price} tax`, 
          textRu: `${currentPlayer.name} заплатил $${cell.price} налога`,
          color: currentPlayer.color 
        });
      }

      room.waitingForAction = false;
      room.actionType = null;
      
      if (action !== "AUCTION") {
        if (room.doublesCount === 0) {
          nextTurn(room);
        } else {
          room.hasRolled = false;
        }
      }
      io.to(roomId).emit("gameStateUpdate", room);
    });

    // Add more handlers for Auction, Trade, Casino, Upgrades...
  });

  function movePlayer(room: GameState, player: Player, steps: number) {
    const oldPos = player.position;
    player.position = (player.position + steps) % 40;
    
    if (player.position < oldPos && room.economicStage < 2) {
      player.balance += 2000;
      room.logs.push({ 
        id: generateId(), 
        text: `${player.name} passed START and received $2000`, 
        textRu: `${player.name} прошел СТАРТ и получил $2000`,
        color: player.color 
      });
    }
  }

  function handleLanding(room: GameState, player: Player) {
    const cell = BOARD_CONFIG[player.position];
    
    switch (cell.type) {
      case 'PROPERTY':
      case 'FLEET':
        const prop = room.properties[cell.id];
        if (!prop.ownerId) {
          room.waitingForAction = true;
          room.actionType = 'BUY';
        } else if (prop.ownerId !== player.id && !prop.isPledged) {
          room.waitingForAction = true;
          room.actionType = 'RENT';
        } else {
          if (room.doublesCount === 0) {
            nextTurn(room);
          } else {
            room.hasRolled = false;
          }
        }
        break;
      case 'TAX':
        room.waitingForAction = true;
        room.actionType = 'TAX';
        break;
      case 'CHANCE':
        handleChance(room, player);
        break;
      case 'POLICE':
        player.position = 10;
        player.inJail = true;
        player.jailTurns = 0;
        room.doublesCount = 0; // Reset doubles if sent to jail
        room.logs.push({ 
          id: generateId(), 
          text: `${player.name} is arrested!`, 
          textRu: `${player.name} арестован!`,
          color: player.color 
        });
        nextTurn(room);
        break;
      case 'CASINO':
        // Selection Logic: 50/50 chance for Duel or Slot
        const casinoType = Math.random() > 0.5 ? 'DUEL' : 'SLOT';
        if (casinoType === 'DUEL') {
          // Find potential opponent
          const opponent = room.players.find(p => p.id !== player.id && !p.isBankrupt && p.balance >= 600);
          if (opponent && player.balance >= 600) {
            room.casino = {
              type: 'DUEL',
              activePlayerId: player.id,
              opponentId: opponent.id,
              pot: 1200,
            };
            player.balance -= 600;
            opponent.balance -= 600;
            room.waitingForAction = true;
            room.actionType = 'CASINO';
            room.logs.push({ 
              id: generateId(), 
              text: `CASINO: Duel initiated between ${player.name} and ${opponent.name}`, 
              textRu: `КАЗИНО: Дуэль инициирована между ${player.name} и ${opponent.name}`,
              color: player.color 
            });
          } else {
            // Fallback to slot if no opponent
            room.casino = { type: 'SLOT', activePlayerId: player.id };
            room.waitingForAction = true;
            room.actionType = 'CASINO';
          }
        } else {
          room.casino = { type: 'SLOT', activePlayerId: player.id };
          room.waitingForAction = true;
          room.actionType = 'CASINO';
        }
        break;
      default:
        if (room.doublesCount === 0) {
          nextTurn(room);
        } else {
          room.hasRolled = false;
        }
    }
  }

  function handleChance(room: GameState, player: Player) {
    const event = CHANCE_EVENTS[Math.floor(Math.random() * CHANCE_EVENTS.length)];
    room.logs.push({ 
      id: generateId(), 
      text: `CHANCE: ${event.text}`, 
      textRu: `ШАНС: ${event.textRu || event.text}`,
      color: player.color 
    });
    
    if (event.amount) {
      let finalAmount = event.amount;
      if (event.perBranch) {
        const branches = Object.values(room.properties).filter(p => p.ownerId === player.id).reduce((sum, p) => sum + p.branches, 0);
        finalAmount = branches * event.amount;
      }
      player.balance += finalAmount;
    }

    if (event.type === 'JAIL') {
      player.position = 10;
      player.inJail = true;
      player.jailTurns = 0;
      room.doublesCount = 0; // Reset doubles if sent to jail
      nextTurn(room);
      return;
    } else if (event.type === 'SKIP') {
      player.skipNextTurn = true;
    } else if (event.type === 'JUMP') {
      movePlayer(room, player, event.value!);
      handleLanding(room, player);
      return;
    }

    if (room.doublesCount === 0) {
      nextTurn(room);
    } else {
      room.hasRolled = false;
    }
  }

  function nextTurn(room: GameState) {
    room.turnIndex = (room.turnIndex + 1) % room.players.length;
    room.hasRolled = false;
    room.doublesCount = 0;
    room.upgradedThisTurn = [];
    const nextPlayer = room.players[room.turnIndex];
    if (nextPlayer.isBankrupt) return nextTurn(room);
    if (nextPlayer.skipNextTurn) {
      nextPlayer.skipNextTurn = false;
      return nextTurn(room);
    }
  }

  function calculateRent(room: GameState, cell: Cell, prop: Property): number {
    if (cell.type === 'FLEET') {
      const ownerId = prop.ownerId;
      const count = Object.values(room.properties).filter(p => {
        const c = BOARD_CONFIG[p.id];
        return c.type === 'FLEET' && p.ownerId === ownerId && !p.isPledged;
      }).length;
      return FLEET_RENT[count - 1] || 250;
    } else {
      const table = RENT_TABLES[cell.set!];
      let rent = table[prop.branches];
      if (room.economicStage >= 3) {
        // Income tax: owner gets 50%, 50% burns
        // But the player pays full amount
      }
      return rent;
    }
  }

  function startAuction(room: GameState, cellId: number) {
    const cell = BOARD_CONFIG[cellId];
    room.auction = {
      propertyId: cellId,
      currentBid: Math.ceil(cell.price * 0.8 / 10) * 10,
      highestBidderId: null,
      timeLeft: 3,
      participants: room.players.filter(p => !p.isBankrupt).map(p => p.id),
      isStarting: true,
    };
  }

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Game loop for timers
  setInterval(() => {
    Object.values(rooms).forEach(room => {
      if (!room.gameStarted) return;

      // Economic Contraction
      const elapsed = (Date.now() - room.gameStartTime) / 60000;
      if (elapsed >= 60 && room.economicStage < 4) {
        room.economicStage = 4;
        room.logs.push({ 
          id: generateId(), 
          text: "FINAL SQUEEZE: Taxes increased!",
          textRu: "ФИНАЛЬНОЕ СЖАТИЕ: Налоги увеличены!"
        });
      } else if (elapsed >= 47 && room.economicStage < 3) {
        room.economicStage = 3;
        room.logs.push({ 
          id: generateId(), 
          text: "INCOME TAX: Owners receive only 50% rent!",
          textRu: "ПОДОХОДНЫЙ НАЛОГ: Владельцы получают только 50% аренды!"
        });
      } else if (elapsed >= 35 && room.economicStage < 2) {
        room.economicStage = 2;
        room.logs.push({ 
          id: generateId(), 
          text: "BANK DEPLETED: No more START payouts!",
          textRu: "БАНК ИСТОЩЕН: Больше выплат за СТАРТ нет!"
        });
      }

      // Auction Timer
      if (room.auction) {
        room.auction.timeLeft -= 1;
        if (room.auction.timeLeft <= 0) {
          if (room.auction.isStarting) {
            room.auction.isStarting = false;
            room.auction.timeLeft = 10;
          } else {
            const winnerId = room.auction.highestBidderId;
            const propId = room.auction.propertyId;
            const cell = BOARD_CONFIG[propId];
            if (winnerId) {
              const winner = room.players.find(p => p.id === winnerId);
              if (winner) {
                winner.balance -= room.auction.currentBid;
                room.properties[propId].ownerId = winnerId;
                room.logs.push({ 
                  id: generateId(), 
                  text: `${winner.name} won ${cell.name} in auction for $${room.auction.currentBid}`, 
                  textRu: `${winner.name} выиграл ${cell.nameRu || cell.name} на аукционе за $${room.auction.currentBid}`,
                  color: winner.color 
                });
              }
            }
            room.auction = null;
            if (room.doublesCount === 0) {
              nextTurn(room);
            } else {
              room.hasRolled = false;
            }
          }
        }
        io.to(room.roomId).emit("gameStateUpdate", room);
      }
    });
  }, 1000);
}

startServer();
