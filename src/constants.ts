import type { 
  Player, 
  GameState, 
  Cell, 
  Property, 
  AuctionState, 
  TradeOffer, 
  CasinoEvent 
} from './types.js';

export const BOARD_CONFIG: Cell[] = [
  // TOP SIDE (0-10)
  { id: 0, type: 'START', name: 'START', nameRu: 'СТАРТ', price: 0 },
  { id: 1, type: 'PROPERTY', name: 'Chanel', nameRu: 'Chanel', price: 600, color: '#00C8FF', set: 'blue' },
  { id: 2, type: 'CHANCE', name: 'CHANCE', nameRu: 'ШАНС' },
  { id: 3, type: 'PROPERTY', name: 'Boss', nameRu: 'Boss', price: 600, color: '#00C8FF', set: 'blue' },
  { id: 4, type: 'TAX', name: 'MONEY TAX', nameRu: 'НАЛОГ', price: 2000 },
  { id: 5, type: 'FLEET', name: 'Mercedes', nameRu: 'Mercedes', price: 2000, color: '#FF4081', set: 'fleet' },
  { id: 6, type: 'PROPERTY', name: 'Adidas', nameRu: 'Adidas', price: 1000, color: '#00E676', set: 'lime' },
  { id: 7, type: 'CHANCE', name: 'CHANCE', nameRu: 'ШАНС' },
  { id: 8, type: 'PROPERTY', name: 'Puma', nameRu: 'Puma', price: 1000, color: '#00E676', set: 'lime' },
  { id: 9, type: 'PROPERTY', name: 'Lacoste', nameRu: 'Lacoste', price: 1200, color: '#00E676', set: 'lime' },
  { id: 10, type: 'JAIL', name: 'PRISON', nameRu: 'ТЮРЬМА' },

  // RIGHT SIDE (11-20)
  { id: 11, type: 'PROPERTY', name: 'C+', nameRu: 'C+', price: 1400, color: '#FFEA00', set: 'yellow' },
  { id: 12, type: 'PROPERTY', name: 'Rockstar Games', nameRu: 'Rockstar Games', price: 1500, color: '#7F1F0F', set: 'brown' },
  { id: 13, type: 'PROPERTY', name: 'Friender', nameRu: 'Friender', price: 1400, color: '#FFEA00', set: 'yellow' },
  { id: 14, type: 'PROPERTY', name: 'Bird', nameRu: 'Bird', price: 1600, color: '#FFEA00', set: 'yellow' },
  { id: 15, type: 'FLEET', name: 'Audi', nameRu: 'Audi', price: 2000, color: '#FF4081', set: 'fleet' },
  { id: 16, type: 'PROPERTY', name: 'Coca-Cola', nameRu: 'Coca-Cola', price: 1800, color: '#FF9100', set: 'orange' },
  { id: 17, type: 'CHANCE', name: 'CHANCE', nameRu: 'ШАНС' },
  { id: 18, type: 'PROPERTY', name: 'Pepsi', nameRu: 'Pepsi', price: 1800, color: '#FF9100', set: 'orange' },
  { id: 19, type: 'PROPERTY', name: 'Fanta', nameRu: 'Fanta', price: 1800, color: '#FF9100', set: 'orange' },
  { id: 20, type: 'CASINO', name: 'JACKPOT', nameRu: 'ДЖЕКПОТ' },

  // BOTTOM SIDE (21-30)
  { id: 21, type: 'PROPERTY', name: 'American Airlines', nameRu: 'American Airlines', price: 2200, color: '#FF3D00', set: 'red' },
  { id: 22, type: 'CHANCE', name: 'CHANCE', nameRu: 'ШАНС' },
  { id: 23, type: 'PROPERTY', name: 'Lufthansa', nameRu: 'Lufthansa', price: 2200, color: '#FF3D00', set: 'red' },
  { id: 24, type: 'PROPERTY', name: 'British Airways', nameRu: 'British Airways', price: 2400, color: '#FF3D00', set: 'red' },
  { id: 25, type: 'FLEET', name: 'Ford', nameRu: 'Ford', price: 2000, color: '#FF4081', set: 'fleet' },
  { id: 26, type: 'PROPERTY', name: 'Max', nameRu: 'Max', price: 2600, color: '#C51162', set: 'crimson' },
  { id: 27, type: 'PROPERTY', name: 'Burger King', nameRu: 'Burger King', price: 2600, color: '#C51162', set: 'crimson' },
  { id: 28, type: 'PROPERTY', name: 'Rovio', nameRu: 'Rovio', price: 1500, color: '#7F1F0F', set: 'brown' },
  { id: 29, type: 'PROPERTY', name: 'KFC', nameRu: 'KFC', price: 2800, color: '#C51162', set: 'crimson' },
  { id: 30, type: 'POLICE', name: 'POLICE', nameRu: 'ПОЛИЦИЯ' },

  // LEFT SIDE (31-39)
  { id: 31, type: 'PROPERTY', name: 'Holiday Inn', nameRu: 'Holiday Inn', price: 3000, color: '#AA00FF', set: 'purple' },
  { id: 32, type: 'PROPERTY', name: 'Radisson', nameRu: 'Radisson', price: 3000, color: '#AA00FF', set: 'purple' },
  { id: 33, type: 'CHANCE', name: 'CHANCE', nameRu: 'ШАНС' },
  { id: 34, type: 'PROPERTY', name: 'Novotel', nameRu: 'Novotel', price: 3200, color: '#AA00FF', set: 'purple' },
  { id: 35, type: 'FLEET', name: 'Land Rover', nameRu: 'Land Rover', price: 2000, color: '#FF4081', set: 'fleet' },
  { id: 36, type: 'TAX', name: 'DIAMOND TAX', nameRu: 'НАЛОГ', price: 1000 },
  { id: 37, type: 'PROPERTY', name: 'Apple', nameRu: 'Apple', price: 3500, color: '#00E6A5', set: 'emerald' },
  { id: 38, type: 'CHANCE', name: 'CHANCE', nameRu: 'ШАНС' },
  { id: 39, type: 'PROPERTY', name: 'Nokia', nameRu: 'Nokia', price: 4000, color: '#00E6A5', set: 'emerald' },
];

export const RENT_TABLES: Record<string, number[]> = {
  blue: [50, 250, 750, 2250, 4000, 6000],
  lime: [100, 500, 1500, 4500, 6250, 7500],
  yellow: [150, 750, 2250, 6750, 8500, 10000],
  brown: [120, 600, 1800, 5400, 7000, 9000],
  orange: [200, 1000, 3000, 9000, 11000, 13000],
  red: [250, 1250, 3750, 11250, 13750, 16250],
  crimson: [300, 1500, 4500, 13500, 15500, 18000],
  purple: [350, 1750, 5000, 15000, 17500, 20000],
  emerald: [500, 2500, 7000, 20000, 25000, 30000],
};

export const FLEET_RENT = [250, 500, 1000, 2000];

export const CHANCE_EVENTS = [
  { id: 'lottery', text: 'Won the lottery', textRu: 'Вы выиграли в лотерею', amount: 500 },
  { id: 'cashback', text: 'Waffle Cashback. You found a waffle stuck in the pocket of your old jeans and $600', textRu: 'Вафельный кэшбэк. Вы нашли вафлю в кармане старых джинс и $600', amount: 600 },
  { id: 'bank_error', text: 'Bank error in your favor. The bank accidentally transferred its director’s salary to you.', textRu: 'Банковская ошибка в вашу пользу. Банк случайно перевел вам зарплату директора.', amount: 1500 },
  { id: 'selling_air', text: 'Selling Air. You sold an empty can labeled ‘Air from Start Cell’ to a collector', textRu: 'Продажа воздуха. Вы продали пустую банку с надписью «Воздух с клетки Старт» коллекционеру', amount: 1200 },
  { id: 'beach_find', text: 'Beach Find. You found the President’s lost swim trunks; there was a bill inside', textRu: 'Пляжная находка. Вы нашли потерянные плавки президента, внутри была купюра', amount: 400 },
  { id: 'tax_refund', text: 'Tax Refund', textRu: 'Возврат налогов', amount: 2000 },
  { id: 'speeding', text: 'Speeding ticket', textRu: 'Штраф за превышение скорости', amount: -300 },
  { id: 'lunch', text: 'Lunch at a high-end restaurant. You accidentally ate the chef’s complimentary dish for a fortune', textRu: 'Обед в дорогом ресторане. Вы случайно съели комплимент от шефа за целое состояние', amount: -1000 },
  { id: 'charity', text: 'Charitable donation to alcoholics', textRu: 'Благотворительное пожертвование алкоголикам', amount: -500 },
  { id: 'subscription', text: 'Paid subscription. You forgot to cancel the trial period for ‘Music for Waffles.’', textRu: 'Платная подписка. Вы забыли отменить пробный период «Музыка для вафель».', amount: -700 },
  { id: 'noise', text: 'Too loud a thud. The downstairs neighbors complained that you’re breathing too loudly.', textRu: 'Слишком громкий стук. Соседи снизу пожаловались, что вы слишком громко дышите.', amount: -300 },
  { id: 'repairs', text: 'Property repairs: $100 for each branch', textRu: 'Ремонт недвижимости: $100 за каждый филиал', amount: -100, perBranch: true },
  { id: 'jail', text: 'Go to jail', textRu: 'Отправляйтесь в тюрьму', type: 'JAIL' },
  { id: 'skip', text: 'Skip a Turn', textRu: 'Пропуск хода', type: 'SKIP' },
  { id: 'lucky_jump', text: 'Lucky Jump: Move 3 spaces forward', textRu: 'Счастливый прыжок: Вперед на 3 клетки', type: 'JUMP', value: 3 },
];
