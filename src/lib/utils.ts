import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getConditionLabel(condition?: string): string {
  if (!condition) return 'Seminovo (6 Meses)';
  const cond = condition.toLowerCase();
  switch (cond) {
    case 'lacrado_3m': return 'Lacrado (3 Meses)';
    case 'lacrado_6m': return 'Lacrado (6 Meses)';
    case 'lacrado_1ano': return 'Lacrado (1 Ano)';
    case 'lacrado': return 'Lacrado (1 Ano)';
    case 'seminovo_3m': return 'Seminovo (3 Meses)';
    case 'seminovo_6m': return 'Seminovo (6 Meses)';
    case 'seminovo_1ano': return 'Seminovo (1 Ano)';
    case 'seminovo': return 'Seminovo (6 Meses)';
    default:
      if (cond.includes('lacrado')) return 'Lacrado';
      if (cond.includes('seminovo')) return 'Seminovo';
      return condition;
  }
}

export function getWarrantyMonths(condition?: string): number {
  if (!condition) return 6;
  const cond = condition.toLowerCase();
  if (cond.includes('3m')) return 3;
  if (cond.includes('6m')) return 6;
  if (cond.includes('1ano') || cond.includes('1 ano')) return 12;
  if (cond === 'lacrado') return 12;
  if (cond === 'seminovo') return 6;
  return 6;
}

