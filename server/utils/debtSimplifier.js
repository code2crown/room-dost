/**
 * Calculates per-member balances and simplified minimum-transfer settlement plan.
 * Positive netBalance => roommate ko paisa LENA hai (is owed money).
 * Negative netBalance => roommate ko paisa DENA hai (owes money).
 */
function calculateSettlements(members, expenses, settlements) {
  const memberMap = {};

  members.forEach((m) => {
    const id = m._id.toString();
    memberMap[id] = {
      user: {
        _id: id,
        name: m.name,
        email: m.email,
        upiId: m.upiId || '',
        avatarColor: m.avatarColor || '#4F46E5',
      },
      totalPaid: 0,
      totalShare: 0,
      totalSettledOut: 0,
      totalSettledIn: 0,
      netBalance: 0,
    };
  });

  // Process expenses
  expenses.forEach((exp) => {
    const payerId = (exp.paidBy._id || exp.paidBy).toString();
    if (memberMap[payerId]) {
      memberMap[payerId].totalPaid += exp.amount;
      memberMap[payerId].netBalance += exp.amount;
    }
    exp.splits.forEach((sp) => {
      const uid = (sp.user._id || sp.user).toString();
      if (memberMap[uid]) {
        memberMap[uid].totalShare += sp.share;
        memberMap[uid].netBalance -= sp.share;
      }
    });
  });

  // Process recorded settlements
  settlements.forEach((st) => {
    const fromId = (st.from._id || st.from).toString();
    const toId = (st.to._id || st.to).toString();
    if (memberMap[fromId]) {
      memberMap[fromId].totalSettledOut += st.amount;
      memberMap[fromId].netBalance += st.amount;
    }
    if (memberMap[toId]) {
      memberMap[toId].totalSettledIn += st.amount;
      memberMap[toId].netBalance -= st.amount;
    }
  });

  // Round to 2 decimals
  const balances = Object.values(memberMap).map((b) => ({
    ...b,
    totalPaid: Number(b.totalPaid.toFixed(2)),
    totalShare: Number(b.totalShare.toFixed(2)),
    totalSettledOut: Number(b.totalSettledOut.toFixed(2)),
    totalSettledIn: Number(b.totalSettledIn.toFixed(2)),
    netBalance: Number(b.netBalance.toFixed(2)),
  }));

  // Greedy debt simplification
  const debtors = balances
    .filter((b) => b.netBalance < -0.5)
    .map((b) => ({ user: b.user, amount: Math.abs(b.netBalance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .filter((b) => b.netBalance > 0.5)
    .map((b) => ({ user: b.user, amount: b.netBalance }))
    .sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0.5) {
      transfers.push({
        from: debtor.user,
        to: creditor.user,
        amount: Number(settleAmount.toFixed(2)),
      });
    }

    debtor.amount = Number((debtor.amount - settleAmount).toFixed(2));
    creditor.amount = Number((creditor.amount - settleAmount).toFixed(2));

    if (debtor.amount <= 0.5) i++;
    if (creditor.amount <= 0.5) j++;
  }

  return { balances, transfers };
}

module.exports = { calculateSettlements };
