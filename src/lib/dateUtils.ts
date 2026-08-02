import { addDays, addMonths, startOfDay, differenceInDays } from 'date-fns';

/**
 * Parses a date string (either YYYY-MM-DD or full ISO format) 
 * as a local date object, preventing timezone-induced day shifts.
 */
export function parseLocalDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  
  // Extract YYYY-MM-DD from the string
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const day = parseInt(match[3], 10);
    // Set to 12:00:00 local time to avoid any daylight savings or timezone shift
    return new Date(year, month, day, 12, 0, 0);
  }
  
  return new Date(dateStr);
}

export interface CalculatedInstallment {
  index: number;
  expectedAmount: number;
  paidAmount: number;
  dueDate: Date;
  status: 'fully_paid' | 'pending';
}

export interface NotificationItem {
  id: string;
  clientName: string;
  clientPhone: string;
  itemName: string;
  installmentIndex: number;
  expectedAmount: number;
  dueDate: Date;
  status: 'fully_paid' | 'pending';
  daysDiff: number;
  saleId: string;
  saleData: any;
  clientData?: any;
  iphoneData?: any;
  consoleData?: any;
}

/**
 * Calculates exact due date for an installment index based on sale frequency and dates.
 */
export function getInstallmentDate(sale: any, index: number): Date {
  if (!sale) return new Date();

  const hasFirstDate = Boolean(sale.first_installment_date);
  const baseDateStr = sale.first_installment_date || sale.sale_date;
  const baseDate = parseLocalDate(baseDateStr);

  const multiplier = hasFirstDate ? (index - 1) : index;
  const freq = (sale.installment_frequency || 'Mensal').toString().trim().toLowerCase();

  if (freq.startsWith('seman')) {
    return addDays(baseDate, multiplier * 7);
  } else if (freq.startsWith('quinzen')) {
    return addDays(baseDate, multiplier * 15);
  } else {
    return addMonths(baseDate, multiplier);
  }
}

/**
 * Generates the precise installment schedule, paid amounts, and pending amounts for a sale.
 */
export function getCalculatedInstallments(
  sale: any,
  customPayments?: { [key: number]: number } | string
): CalculatedInstallment[] {
  if (!sale) return [];

  const sellPrice = Number(sale.sell_price || 0);
  const downPayment = Number(sale.down_payment || 0);
  const totalAmount = Number((sellPrice - downPayment).toFixed(2));
  const baseInstCount = Math.max(1, Number(sale.installments) || 1);
  const instAmount = Number((totalAmount / baseInstCount).toFixed(2));

  let paymentsMap: { [key: number]: number } = {};

  if (typeof customPayments === 'string') {
    try {
      paymentsMap = JSON.parse(customPayments);
    } catch (e) {}
  } else if (customPayments && typeof customPayments === 'object' && Object.keys(customPayments).length > 0) {
    paymentsMap = customPayments;
  } else {
    // 1. Check sale.custom_payments on record
    if (sale.custom_payments) {
      try {
        paymentsMap = typeof sale.custom_payments === 'string' ? JSON.parse(sale.custom_payments) : sale.custom_payments;
      } catch (e) {}
    }

    // 2. Check localStorage if in browser environment
    if (Object.keys(paymentsMap).length === 0 && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`inst_payments_${sale.id}`);
        if (stored) {
          paymentsMap = JSON.parse(stored);
        }
      } catch (e) {}
    }

    // 3. Fallback to sale.installments_paid count
    if (Object.keys(paymentsMap).length === 0) {
      const paidCount = Number(sale.installments_paid) || 0;
      for (let i = 1; i <= baseInstCount; i++) {
        paymentsMap[i] = i <= paidCount ? instAmount : 0;
      }
    }
  }

  const list: CalculatedInstallment[] = [];
  let totalPaid = 0;
  const paidIndices: number[] = [];
  const unpaidIndices: number[] = [];

  for (let i = 1; i <= baseInstCount; i++) {
    const p = paymentsMap[i] || 0;
    if (p > 0.005) {
      totalPaid += p;
      paidIndices.push(i);
    } else {
      unpaidIndices.push(i);
    }
  }

  let remainingUnpaid = Number((totalAmount - totalPaid).toFixed(2));
  let extraIndex = baseInstCount + 1;
  while (true) {
    const p = paymentsMap[extraIndex] || 0;
    if (p > 0.005) {
      totalPaid += p;
      remainingUnpaid = Number((totalAmount - totalPaid).toFixed(2));
      paidIndices.push(extraIndex);
      extraIndex++;
    } else {
      break;
    }
  }

  if (remainingUnpaid > 0.01 && unpaidIndices.length === 0) {
    unpaidIndices.push(extraIndex);
  }

  const allIndices = Array.from(new Set([...paidIndices, ...unpaidIndices])).sort((a, b) => a - b);

  if (unpaidIndices.length > 0) {
    const expectedPerUnpaid = Number((remainingUnpaid / unpaidIndices.length).toFixed(2));
    const totalPaidExpected = paidIndices.reduce((sum, idx) => sum + (paymentsMap[idx] || 0), 0);
    const countExceptLast = unpaidIndices.length - 1;
    const sumExceptLast = countExceptLast * expectedPerUnpaid;
    const lastUnpaidIndex = unpaidIndices[unpaidIndices.length - 1];
    const lastExpected = Number((totalAmount - totalPaidExpected - sumExceptLast).toFixed(2));

    const expectedMap: { [key: number]: number } = {};
    for (const idx of paidIndices) {
      expectedMap[idx] = paymentsMap[idx] || 0;
    }
    for (let i = 0; i < unpaidIndices.length - 1; i++) {
      expectedMap[unpaidIndices[i]] = expectedPerUnpaid;
    }
    expectedMap[lastUnpaidIndex] = lastExpected;

    for (const idx of allIndices) {
      const isPaid = paidIndices.includes(idx);
      const paidVal = paymentsMap[idx] || 0;
      const expectedVal = expectedMap[idx];

      list.push({
        index: idx,
        expectedAmount: expectedVal,
        paidAmount: paidVal,
        dueDate: getInstallmentDate(sale, idx),
        status: isPaid ? 'fully_paid' : 'pending'
      });
    }
  } else {
    for (const idx of allIndices) {
      const paidVal = paymentsMap[idx] || 0;
      list.push({
        index: idx,
        expectedAmount: paidVal,
        paidAmount: paidVal,
        dueDate: getInstallmentDate(sale, idx),
        status: 'fully_paid'
      });
    }
  }

  return list;
}

/**
 * Compiles real-time installment notifications across all sales.
 */
export function getSaleNotifications(
  salesList: any[],
  clientsList: any[] = [],
  iphonesList: any[] = [],
  consolesList: any[] = []
): NotificationItem[] {
  const notifications: NotificationItem[] = [];
  if (!salesList || salesList.length === 0) return notifications;

  const today = startOfDay(new Date());

  for (const sale of salesList) {
    if (!sale.installments || Number(sale.installments) <= 1) continue;

    const calculatedList = getCalculatedInstallments(sale);
    const client = clientsList.find((c: any) => c.id === sale.client_id);
    const iphone = iphonesList.find((p: any) => p.id === sale.iphone_id);
    const consoleObj = consolesList.find((p: any) => p.id === sale.console_id);

    const categoryName = consoleObj ? (consoleObj.category === 'tv' ? 'TV' : (consoleObj.category === 'rice_cooker' ? 'Panela Elétrica' : (consoleObj.category === 'outro' ? 'Eletro' : 'Console'))) : 'Aparelho';
    const itemName = iphone ? `${iphone.model} ${iphone.storage}` : (consoleObj ? `${categoryName} ${consoleObj.model}` : 'Aparelho');

    for (const inst of calculatedList) {
      if (inst.status === 'pending') {
        const dueDay = startOfDay(inst.dueDate);
        const daysDiff = differenceInDays(dueDay, today);

        notifications.push({
          id: `${sale.id}_inst_${inst.index}`,
          clientName: client?.name || 'Cliente Sem Nome',
          clientPhone: client?.phone ? client.phone.replace(/\D/g, '') : '',
          itemName,
          installmentIndex: inst.index,
          expectedAmount: inst.expectedAmount,
          dueDate: inst.dueDate,
          status: inst.status,
          daysDiff,
          saleId: sale.id,
          saleData: sale,
          clientData: client,
          iphoneData: iphone,
          consoleData: consoleObj
        });
      }
    }
  }

  return notifications.sort((a, b) => a.daysDiff - b.daysDiff);
}
