import { subMonths, startOfMonth, addDays } from 'date-fns';

// Generate realistic mock data for the last 6 months
const generateMockSales = () => {
  const sales = [];
  const now = new Date();
  
  for (let i = 0; i < 6; i++) {
    const month = subMonths(startOfMonth(now), i);
    // Random number of sales per month (between 5 and 25)
    const numSales = Math.floor(Math.random() * 20) + 5;
    
    for (let j = 0; j < numSales; j++) {
      sales.push({
        id: `sale-${i}-${j}`,
        profit: Math.floor(Math.random() * 1500) + 500, // Profit between 500 and 2000
        sale_date: addDays(month, Math.floor(Math.random() * 28)).toISOString(),
        created_date: addDays(month, Math.floor(Math.random() * 28)).toISOString(),
      });
    }
  }
  return sales;
};

const mockSales = generateMockSales();

// Generate mock iPhones
const mockIphones = [
  ...Array(15).fill({ status: 'disponivel' }),
  ...Array(mockSales.length).fill({ status: 'vendido' }),
];

export const base44 = {
  entities: {
    iPhone: {
      list: async () => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockIphones;
      }
    },
    Sale: {
      list: async () => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockSales;
      }
    }
  }
};
