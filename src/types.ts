export type Position = 
  | 'Місіонерська' 
  | 'Ззаду (Doggy Style)' 
  | 'Наїздниця' 
  | 'Зворотна наїздниця' 
  | 'Ложки' 
  | 'Стоячи' 
  | 'Інше';

export type SkipReason = 
  | 'Втома' 
  | 'Стрес' 
  | 'Хвороба' 
  | 'Відсутність бажання' 
  | 'Партнер не готовий' 
  | 'Місячні'
  | 'Інше';

export type Problem = 
  | 'Проблеми з ерекцією' 
  | 'Передчасна еякуляція' 
  | 'Затримана еякуляція' 
  | 'Біль' 
  | 'Втрата інтересу' 
  | 'Немає';

export interface DiaryEntry {
  id: string;
  uid?: string;
  date: string; // ISO string
  type: 'activity' | 'skip';
  
  // Activity details
  positions?: Position[];
  count?: number;
  herCount?: number;
  initiator?: string;
  duration?: number; // in minutes
  rating?: number; // 1-5
  problems?: Problem[];
  toys?: string;
  notes?: string;

  // Skip details
  skipReason?: SkipReason;
  skipNotes?: string;
}
