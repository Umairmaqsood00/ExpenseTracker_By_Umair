import { Balance, Expense } from "./storage";

function getPayers(expense: any): Array<{ name: string; amount: number }> {
  if (Array.isArray(expense.paidBy)) return expense.paidBy;
  if (typeof expense.paidBy === "string")
    return [{ name: expense.paidBy, amount: expense.amount }];
  return [];
}

export const calculateBalances = (expenses: Expense[]): Balance[] => {
  if (expenses.length === 0) return [];

  const allParticipants = new Set<string>();
  expenses.forEach((expense) => {
    getPayers(expense).forEach((payer) => allParticipants.add(payer.name));
    expense.splitBetween.forEach((participant) =>
      allParticipants.add(participant)
    );
  });

  const participants = Array.from(allParticipants);
  const netAmounts = new Map<string, number>();
  participants.forEach((participant) => netAmounts.set(participant, 0));

  expenses.forEach((expense) => {
    const paidAmount = expense.amount;
    const splitAmount = paidAmount / expense.splitBetween.length;
    getPayers(expense).forEach((payer) => {
      netAmounts.set(
        payer.name,
        (netAmounts.get(payer.name) || 0) + payer.amount
      );
    });
    expense.splitBetween.forEach((participant) => {
      netAmounts.set(
        participant,
        (netAmounts.get(participant) || 0) - splitAmount
      );
    });
  });
  const debtors: Array<{ name: string; amount: number }> = [];
  const creditors: Array<{ name: string; amount: number }> = [];

  netAmounts.forEach((amount, participant) => {
    if (amount < 0) {
      debtors.push({ name: participant, amount: Math.abs(amount) });
    } else if (amount > 0) {
      creditors.push({ name: participant, amount });
    }
  });
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  const balances: Balance[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    if (debtor.name === creditor.name) {
      debtorIndex++;
      continue;
    }

    const amount = Math.min(debtor.amount, creditor.amount);

    balances.push({
      from: debtor.name,
      to: creditor.name,
      amount: parseFloat(amount.toFixed(2)),
      isSettled: false,
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) debtorIndex++;
    if (creditor.amount === 0) creditorIndex++;
  }

  return balances;
};

export const calculateTripSummary = (expenses: Expense[]) => {
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Math.abs(expense.amount),
    0
  );
  const uniqueParticipants = new Set<string>();
  expenses.forEach((expense) => {
    getPayers(expense).forEach((payer) => uniqueParticipants.add(payer.name));
    expense.splitBetween.forEach((participant) =>
      uniqueParticipants.add(participant)
    );
  });
  return {
    totalExpenses,
    expenseCount: expenses.length,
    participantCount: uniqueParticipants.size,
    averagePerExpense:
      expenses.length > 0 ? totalExpenses / expenses.length : 0,
  };
};

export const calculateParticipantSummary = (
  expenses: Expense[],
  participantName: string
) => {
  let totalPaid = 0;
  let totalOwed = 0;
  let expenseCount = 0;
  expenses.forEach((expense) => {
    getPayers(expense).forEach((payer) => {
      if (payer.name === participantName) {
        totalPaid += payer.amount;
        expenseCount++;
      }
    });
    if (expense.splitBetween.includes(participantName)) {
      totalOwed += expense.amount / expense.splitBetween.length;
    }
  });
  const netAmount = totalPaid - totalOwed;
  return {
    totalPaid,
    totalOwed,
    netAmount,
    expenseCount,
    isCreditor: netAmount > 0,
    isDebtor: netAmount < 0,
    isSettled: netAmount === 0,
  };
};

export const markBalanceAsSettled = (
  balances: Balance[],
  from: string,
  to: string
): Balance[] => {
  return balances.map((balance) => {
    if (balance.from === from && balance.to === to && !balance.isSettled) {
      return {
        ...balance,
        isSettled: true,
        settledAt: new Date().toISOString(),
      };
    }
    return balance;
  });
};

export const getSettledBalances = (balances: Balance[]): Balance[] => {
  return balances.filter((balance) => balance.isSettled);
};

export const getUnsettledBalances = (balances: Balance[]): Balance[] => {
  return balances.filter((balance) => !balance.isSettled);
};

export const getTotalSettledAmount = (balances: Balance[]): number => {
  return balances
    .filter((balance) => balance.isSettled)
    .reduce((sum, balance) => sum + balance.amount, 0);
};

export const getTotalUnsettledAmount = (balances: Balance[]): number => {
  return balances
    .filter((balance) => !balance.isSettled)
    .reduce((sum, balance) => sum + balance.amount, 0);
};
