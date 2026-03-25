export type CellType = 'START' | 'PROPERTY' | 'CHANCE' | 'TAX' | 'FLEET' | 'JAIL' | 'CASINO' | 'POLICE';

export interface Cell {
  id: number;
  type: CellType;
  name: string;
  nameRu: string;
  price?: number;
  color?: string;
  set?: string;
}

export interface Property {
  id: number;
  ownerId: string | null;
  branches: number;
  isPledged: boolean;
  pledgeMovesLeft: number | null;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  position: number;
  balance: number;
  isBankrupt: boolean;
  inJail: boolean;
  jailTurns: number;
  skipNextTurn: boolean;
}

export interface GameLog {
  id: string;
  text: string;
  textRu?: string;
  color?: string;
}

export interface AuctionState {
  propertyId: number;
  currentBid: number;
  highestBidderId: string | null;
  timeLeft: number;
  participants: string[];
  isStarting?: boolean;
}

export interface TradeOffer {
  fromId: string;
  toId: string;
  fromProperties: number[];
  fromCash: number;
  toProperties: number[];
  toCash: number;
}

export interface CasinoEvent {
  type: 'DUEL' | 'SLOT';
  activePlayerId: string;
  opponentId?: string;
  pot?: number;
  playerRoll?: number;
  opponentRoll?: number;
  slotResult?: string[];
}

export interface GameState {
  roomId: string;
  players: Player[];
  properties: Record<number, Property>;
  turnIndex: number;
  gameStarted: boolean;
  gameStartTime: number;
  logs: GameLog[];
  auction: AuctionState | null;
  trade: TradeOffer | null;
  casino: CasinoEvent | null;
  economicStage: 1 | 2 | 3 | 4;
  lastDice: [number, number];
  doublesCount: number;
  hasRolled: boolean;
  upgradedThisTurn: number[];
  waitingForAction: boolean;
  actionType: 'BUY' | 'RENT' | 'TAX' | 'CHANCE' | 'CASINO' | 'JAIL' | null;
  actionData: any;
}
