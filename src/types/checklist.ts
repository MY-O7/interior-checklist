// ═══════════════════ 체크리스트 타입 ═══════════════════

export interface ChecklistItemData {
  checked: boolean;
  detail: string;
  value: string;
  note: string;
}

export interface RoomMeasurement {
  [roomId: string]: { checked: boolean; value: string; note: string };
}

export interface SectionItem {
  name: string;
  options?: string[];
  optionColors?: Record<string, 'green' | 'blue' | 'yellow' | 'pink' | 'white'>;
  badge?: 'high' | 'req' | 'opt';
  hasInput?: boolean;
  placeholder?: string;
  subItems?: SectionItem[];
  perRoom?: boolean;
  hasMeasurement?: boolean;
  measurementLabel?: string;
  showJwa?: boolean;
  thicknessFor?: string[];      // 선택 시 두께 칩이 나타나는 옵션들
  thicknessOptions?: string[];  // 두께 선택지 (예: 3mm/5mm/9mm/12mm)
}

export interface Section {
  id: string;
  title: string;
  subtitle: string;
  items: SectionItem[];
}

// ═══════════════════ 견적 타입 ═══════════════════

export interface LaborEntry {
  id: string;
  type: '기공' | '조공';
  days: number;
  dayRate: number;
}

export interface EstimateItem {
  id: string;
  category: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  labor: LaborEntry[];
  note: string;
}

export interface EstimateData {
  projectId?: string;
  items: EstimateItem[];
  discount: number;
  vat?: number;
  vatRate: number;
  includeVat: boolean;
  notes: string;
}

export interface CompanyInfo {
  ceoName: string;
  bizNumber: string;
  address: string;
}

// ═══════════════════ 프로젝트/사이트 타입 ═══════════════════

export interface SiteInfo {
  apartmentName: string;
  squareMeters: string;
  desiredDate: string;
  manager: string;
  floor: string;
  isOccupied: string;
  hasElevator: string;
  clientPhone: string;
  workScope: '' | 'full' | 'partial';
}

export interface Project {
  id: string;
  name: string;
  clientName?: string;
  address?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════ 태그 색상 ═══════════════════

export type TagColor = 'green' | 'blue' | 'yellow' | 'pink' | 'white';

export const TAG_COLORS: Record<TagColor, string> = {
  green:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  blue:   'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  pink:   'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
  white:  'bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
};
