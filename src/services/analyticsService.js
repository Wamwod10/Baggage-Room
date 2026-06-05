import baggageService from "./baggageService";
import expenseService from "./expenseService";
import shiftService from "./shiftService";
import { getBranchNames } from "../utils/branches";
import {
  CURRENCIES,
  getCashMovements,
  getCustomerHistory,
  getLockers,
} from "../utils/storage";

const getOrderTotal = (order) =>
  order.realPaidAmount !== undefined && order.realPaidAmount !== null
    ? Number(order.realPaidAmount || 0)
    : Number(order.finalPrice || 0) + Number(order.overtimeAmount || 0);

const hasAmount = (value) =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  Number.isFinite(Number(value));

const getLockerAnalyticsAmount = (order, locker) => {
  if (hasAmount(locker.price)) return Number(locker.price);

  const lockerCount = order.lockers?.length || order.count || 1;

  return getOrderTotal(order) / lockerCount;
};

const formatDateKey = (date) => {
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDateLabel = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return date.toLocaleDateString("uz-UZ", {
    month: "short",
    day: "2-digit",
  });
};

const getPeriodDateKeys = (period, orders, expenses) => {
  if (period === "today") {
    return [formatDateKey(new Date())];
  }

  if (period === "7d" || period === "30d") {
    const days = period === "7d" ? 7 : 30;
    const today = new Date();

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - index));
      return formatDateKey(date);
    });
  }

  return [
    ...new Set(
      [...orders, ...expenses]
        .map((item) => item.createdAt)
        .filter(Boolean)
        .map((value) => formatDateKey(new Date(value)))
        .filter(Boolean),
    ),
  ].sort();
};

const filterByPeriod = (items, period) => {
  if (period === "all") return items;

  const now = new Date();

  return items.filter((item) => {
    const itemDate = new Date(item.createdAt || item.openedAt);
    if (Number.isNaN(itemDate.getTime())) return false;

    if (period === "today") {
      return itemDate.toDateString() === now.toDateString();
    }

    const days = period === "7d" ? 7 : 30;
    const diff = now.getTime() - itemDate.getTime();

    return diff <= days * 24 * 60 * 60 * 1000;
  });
};

const paymentTypes = ["Naqd", "Karta", "Click/Payme", "O'tkazma", "Qarz"];

const matchesPayment = (order, payment) => {
  if (payment === "O'tkazma") {
    return order.payment === "O'tkazma" || order.payment === "O‘tkazma";
  }

  return order.payment === payment;
};

const analyticsService = {
  getData(period = "all", branchName = null) {
    const allOrders = baggageService.getAll(branchName);
    const allExpenses = expenseService.getAll(branchName);
    const allShifts = shiftService.getAll(branchName);
    const allCashMovements = getCashMovements(branchName);
    const allLockers = getLockers(branchName);

    const orders = filterByPeriod(allOrders, period);
    const expenses = filterByPeriod(allExpenses, period);
    const shifts = filterByPeriod(allShifts, period);
    const cashMovements = filterByPeriod(allCashMovements, period);

    const paidOrders = orders.filter((order) => order.payment !== "Qarz" || order.debtClosedAt);
    const revenue = paidOrders.reduce(
      (sum, order) => sum + getOrderTotal(order),
      0,
    );
    const debtAmount = orders.reduce(
      (sum, order) => sum + Number(order.debtAmount || 0),
      0,
    );

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );

    const activeOrders = orders.filter((order) => order.status === "Aktiv");
    const delayedOrders = orders.filter((order) => order.status === "Kechikdi");
    const cancelledOrders = orders.filter(
      (order) => order.status === "Bekor qilindi",
    );

    const getShiftOrders = (shift) => {
      const openedTime = new Date(shift.openedAt).getTime();
      const closedTime = shift.closedAt
        ? new Date(shift.closedAt).getTime()
        : Number.POSITIVE_INFINITY;

      if (Number.isNaN(openedTime)) {
        return [];
      }

      return orders.filter((order) => {
        const createdTime = new Date(order.createdAt).getTime();

        return (
          order.branch === shift.branch &&
          createdTime >= openedTime &&
          createdTime <= closedTime
        );
      });
    };

    const getShiftExpenses = (shift) => {
      const openedTime = new Date(shift.openedAt).getTime();
      const closedTime = shift.closedAt
        ? new Date(shift.closedAt).getTime()
        : Number.POSITIVE_INFINITY;

      if (Number.isNaN(openedTime)) {
        return [];
      }

      return expenses.filter((expense) => {
        const createdTime = new Date(expense.createdAt).getTime();

        return (
          expense.branch === shift.branch &&
          createdTime >= openedTime &&
          createdTime <= closedTime
        );
      });
    };

    const getShiftRevenue = (shift) => {
      const liveRevenue = getShiftOrders(shift).reduce(
        (sum, order) => sum + getOrderTotal(order),
        0,
      );

      return liveRevenue || Number(shift.totalRevenue || 0);
    };

    const getShiftExpense = (shift) => {
      const liveExpense = getShiftExpenses(shift).reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0,
      );

      return liveExpense || Number(shift.totalExpense || 0);
    };

    const visibleBranches = branchName ? [branchName] : getBranchNames();

    const branchComparison = visibleBranches.map((branch) => {
      const branchOrders = orders.filter((order) => order.branch === branch);
      const branchExpenses = expenses.filter(
        (expense) => expense.branch === branch,
      );

      const branchRevenue = branchOrders.reduce(
        (sum, order) => sum + getOrderTotal(order),
        0,
      );

      const branchExpense = branchExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0,
      );

      return {
        branch,
        revenue: branchRevenue,
        expense: branchExpense,
        profit: branchRevenue - branchExpense,
        orders: branchOrders.length,
        active: branchOrders.filter((order) => order.status === "Aktiv").length,
        delayed: branchOrders.filter((order) => order.status === "Kechikdi")
          .length,
        cancelled: branchOrders.filter(
          (order) => order.status === "Bekor qilindi",
        ).length,
      };
    });

    const maxBranchRevenue = Math.max(
      ...branchComparison.map((branch) => branch.revenue),
      0,
    );

    const branchRanking = branchComparison
      .map((branch) => {
        const revenueScore =
          maxBranchRevenue > 0
            ? Math.round((branch.revenue / maxBranchRevenue) * 50)
            : 0;

        const delayPenalty = branch.delayed * 5;
        const cancelPenalty = branch.cancelled * 5;

        const activityScore = branch.orders > 0 ? 30 : 0;
        const profitScore = branch.profit > 0 ? 20 : 0;

        const score = Math.max(
          0,
          Math.min(
            100,
            revenueScore +
              activityScore +
              profitScore -
              delayPenalty -
              cancelPenalty,
          ),
        );

        return {
          ...branch,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    const paymentAnalytics = paymentTypes.map(
      (payment) => {
        const paymentOrders = orders.filter((order) =>
          matchesPayment(order, payment),
        );
        const amount = paymentOrders.reduce(
          (sum, order) => sum + (payment === "Qarz" ? Number(order.debtAmount || 0) : getOrderTotal(order)),
          0,
        );

        return {
          payment,
          amount,
          orders: paymentOrders.length,
          percent: revenue > 0 ? Math.round((amount / revenue) * 100) : 0,
        };
      },
    );

    const baggageSizeAnalytics = ["S", "M", "L"].map((size) => {
      const sizeOrders = orders.filter((order) => {
        const orderLockers = Array.isArray(order.lockers) ? order.lockers : [];

        if (orderLockers.length) {
          return orderLockers.some((locker) => locker.size === size);
        }

        return String(order.size || "").includes(size);
      });
      const amount = sizeOrders.reduce((sum, order) => {
        const orderLockers = Array.isArray(order.lockers) ? order.lockers : [];

        if (!orderLockers.length) {
          return sum + getOrderTotal(order);
        }

        return (
          sum +
          orderLockers
            .filter((locker) => locker.size === size)
            .reduce(
              (lockerSum, locker) => lockerSum + getLockerAnalyticsAmount(order, locker),
              0,
            )
        );
      }, 0);
      const count = sizeOrders.reduce((sum, order) => {
        const orderLockers = Array.isArray(order.lockers) ? order.lockers : [];

        if (!orderLockers.length) return sum + Number(order.count || 1);

        return sum + orderLockers.filter((locker) => locker.size === size).length;
      }, 0);

      return {
        size,
        orders: sizeOrders.length,
        count,
        amount,
      };
    });

    const peakHours = Array.from({ length: 24 }, (_, hour) => {
      const hourOrders = orders.filter((order) => {
        if (!order.createdAt) return false;

        const orderHour = new Date(order.createdAt).getHours();
        return orderHour === hour;
      });

      const amount = hourOrders.reduce(
        (sum, order) => sum + getOrderTotal(order),
        0,
      );

      return {
        hour,
        label: `${String(hour).padStart(2, "0")}:00`,
        orders: hourOrders.length,
        amount,
      };
    });

    const bestHour = [...peakHours].sort((a, b) => b.orders - a.orders)[0];

    const dateKeys = getPeriodDateKeys(period, orders, expenses);

    const dailyRevenue = dateKeys.map((dateKey) => {
      const dayOrders = orders.filter((order) => {
        if (!order.createdAt) return false;
        return formatDateKey(new Date(order.createdAt)) === dateKey;
      });

      const dayExpenses = expenses.filter((expense) => {
        if (!expense.createdAt) return false;
        return formatDateKey(new Date(expense.createdAt)) === dateKey;
      });

      const dayRevenue = dayOrders.reduce(
        (sum, order) => sum + getOrderTotal(order),
        0,
      );

      const dayExpense = dayExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0,
      );

      return {
        date: dateKey,
        label: formatDateLabel(dateKey),
        revenue: dayRevenue,
        expenses: dayExpense,
        profit: dayRevenue - dayExpense,
        orders: dayOrders.length,
      };
    });

    const expenseCategories = [
      ...new Set(expenses.map((expense) => expense.category || "Other")),
    ].map((category) => {
      const categoryExpenses = expenses.filter(
        (expense) => (expense.category || "Other") === category,
      );

      return {
        category,
        amount: categoryExpenses.reduce(
          (sum, expense) => sum + Number(expense.amount || 0),
          0,
        ),
        count: categoryExpenses.length,
      };
    });

    const adminNames = [
      ...new Set(shifts.map((shift) => shift.admin).filter(Boolean)),
    ];

    const adminPerformance = adminNames.map((admin) => {
      const adminShifts = shifts.filter((shift) => shift.admin === admin);

      const adminRevenue = adminShifts.reduce(
        (sum, shift) => sum + getShiftRevenue(shift),
        0,
      );

      const adminExpense = adminShifts.reduce(
        (sum, shift) => sum + getShiftExpense(shift),
        0,
      );

      return {
        admin,
        shifts: adminShifts.length,
        orders: adminShifts.reduce(
          (sum, shift) => sum + getShiftOrders(shift).length,
          0,
        ),
        revenue: adminRevenue,
        expense: adminExpense,
        profit: adminRevenue - adminExpense,
        averageRevenue:
          adminShifts.length > 0 ? adminRevenue / adminShifts.length : 0,
      };
    });

    const bestBranch = [...branchComparison].sort(
      (a, b) => b.revenue - a.revenue,
    )[0];

    const worstBranch = [...branchComparison].sort(
      (a, b) => a.revenue - b.revenue,
    )[0];

    const insights = [];

    let healthScore = 100;

    if (cancelledOrders.length > 0 && orders.length > 0) {
      const cancelRate = cancelledOrders.length / orders.length;
      healthScore -= Math.round(cancelRate * 25);
    }

    if (delayedOrders.length > 0 && orders.length > 0) {
      const delayRate = delayedOrders.length / orders.length;
      healthScore -= Math.round(delayRate * 25);
    }

    if (revenue > 0 && totalExpenses > revenue * 0.35) {
      healthScore -= 15;
    }

    if (orders.length === 0) {
      healthScore -= 30;
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    if (bestBranch?.revenue > 0) {
      insights.push(
        `Eng ko‘p savdo ${bestBranch.branch} filialida: ${bestBranch.revenue.toLocaleString(
          "uz-UZ",
        )} so‘m.`,
      );
    }

    if (worstBranch && worstBranch.revenue === 0) {
      insights.push(`${worstBranch.branch} filialida hali savdo yo‘q.`);
    }

    if (delayedOrders.length > 0) {
      insights.push(
        `${delayedOrders.length} ta baggage kechikkan. Pickup jarayonini nazorat qilish kerak.`,
      );
    }

    if (totalExpenses > revenue * 0.35 && revenue > 0) {
      insights.push(
        "Harajatlar savdoga nisbatan yuqori. Expense kategoriyalarini tekshirish tavsiya qilinadi.",
      );
    }

    if (bestHour && bestHour.orders > 0) {
      insights.push(
        `Eng aktiv vaqt: ${bestHour.label}. Shu soatda ${bestHour.orders} ta order qabul qilingan.`,
      );
    }

    if (healthScore >= 80) {
      insights.push(
        "Biznes holati yaxshi: savdo, kassa va kechikishlar nazoratda.",
      );
    } else if (healthScore >= 50) {
      insights.push(
        "Biznes holati o‘rtacha: kechikishlar, bekor qilishlar yoki harajatlarni tekshirish kerak.",
      );
    } else {
      insights.push(
        "Biznes holati xavfli: kassa, order va expense jarayonlarini alohida audit qilish tavsiya qilinadi.",
      );
    }

    const overtimeAmount = orders.reduce(
      (sum, order) => sum + Number(order.overtimeAmount || 0),
      0,
    );
    const currencyAnalytics = CURRENCIES.map((currency) => {
      const currencyOrders = orders.filter((order) => order.currency === currency);
      const amount = currencyOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);

      return {
        currency,
        amount,
        orders: currencyOrders.length,
      };
    });

    const lockerUsage = ["Bosh", "Band", "Kechikkan", "Servisda"].map((status) => ({
      status,
      count: allLockers.filter((locker) => locker.status === status).length,
    }));

    const debtAnalytics = {
      orders: orders.filter((order) => Number(order.debtAmount || 0) > 0).length,
      amount: debtAmount,
      closed: orders.filter((order) => order.debtClosedAt).length,
    };

    const cashMovementAnalytics = {
      in: cashMovements
        .filter((item) => item.type === "IN")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      out: cashMovements
        .filter((item) => item.type === "OUT")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      count: cashMovements.length,
    };

    const customerKeys = [
      ...new Set(orders.map((order) => order.phone || order.passport).filter(Boolean)),
    ];
    const customerAnalytics = {
      unique: customerKeys.length,
      repeat: customerKeys.filter(
        (key) => getCustomerHistory({ phone: key, passport: key, branchName }).orders.length > 1,
      ).length,
      activeWarnings: orders.filter(
        (order) => order.status === "Aktiv" || order.status === "Kechikdi",
      ).length,
    };

    const openShifts = shifts.filter((shift) => shift.status === "OPEN");

    const problemAnalytics = [
      {
        title: "Kechikkan baggage",
        value: delayedOrders.length,
        description: "Check-out vaqtidan o‘tgan orderlar",
        level: delayedOrders.length > 0 ? "danger" : "success",
      },
      {
        title: "Bekor qilingan orderlar",
        value: cancelledOrders.length,
        description: "Bekor qilingan baggage orderlari",
        level: cancelledOrders.length > 0 ? "warning" : "success",
      },
      {
        title: "Overtime summasi",
        value: overtimeAmount,
        description: "Kechikishlardan qo‘shilgan summa",
        level: overtimeAmount > 0 ? "warning" : "success",
        isMoney: true,
      },
      {
        title: "Expense risk",
        value: revenue > 0 ? Math.round((totalExpenses / revenue) * 100) : 0,
        description: "Harajatlarning savdoga nisbati",
        level:
          revenue > 0 && totalExpenses > revenue * 0.35 ? "danger" : "success",
        suffix: "%",
      },
      {
        title: "Ochiq shiftlar",
        value: openShifts.length,
        description: "Hali yopilmagan kassalar",
        level: openShifts.length > 0 ? "warning" : "success",
      },
    ];

    const shiftRevenueTotal = shifts.reduce(
      (sum, shift) => sum + getShiftRevenue(shift),
      0,
    );
    const bestShift = [...shifts].sort(
      (a, b) => getShiftRevenue(b) - getShiftRevenue(a),
    )[0];

    const financeAnalytics = {
      revenue,
      totalExpenses,
      netProfit: revenue - totalExpenses,
      profitMargin:
        revenue > 0
          ? Math.round(((revenue - totalExpenses) / revenue) * 100)
          : 0,
      averageOrder: orders.length > 0 ? revenue / orders.length : 0,
      averageShiftRevenue:
        shifts.length > 0 ? shiftRevenueTotal / shifts.length : 0,
      expenseRatio:
        revenue > 0 ? Math.round((totalExpenses / revenue) * 100) : 0,
    };

    const shiftAnalytics = {
      total: shifts.length,
      open: shifts.filter((shift) => shift.status === "OPEN").length,
      closed: shifts.filter((shift) => shift.status === "CLOSED").length,
      twelveHour: shifts.filter(
        (shift) =>
          shift.shiftTime === "09:00 - 21:00" ||
          shift.shiftTime === "21:00 - 09:00",
      ).length,
      twentyFourHour: shifts.filter(
        (shift) => shift.shiftTime === "09:00 - 09:00",
      ).length,
      bestShift: bestShift
        ? {
            ...bestShift,
            analyticsRevenue: getShiftRevenue(bestShift),
          }
        : null,
      averageRevenue:
        shifts.length > 0 ? shiftRevenueTotal / shifts.length : 0,
    };

    return {
      overview: {
        revenue,
        totalExpenses,
        netProfit: revenue - totalExpenses,
        totalOrders: orders.length,
        activeOrders: activeOrders.length,
        delayedOrders: delayedOrders.length,
        cancelledOrders: cancelledOrders.length,
        debtAmount,
        totalShifts: shifts.length,
        averageOrder: orders.length > 0 ? revenue / orders.length : 0,
        profitMargin:
          revenue > 0
            ? Math.round(((revenue - totalExpenses) / revenue) * 100)
            : 0,
        healthScore,
      },
      branchComparison,
      paymentAnalytics,
      baggageSizeAnalytics,
      insights,
      adminPerformance,
      dailyRevenue,
      expenseCategories,
      healthScore,
      peakHours,
      bestHour,
      problemAnalytics,
      financeAnalytics,
      currencyAnalytics,
      lockerUsage,
      customerAnalytics,
      debtAnalytics,
      cashMovementAnalytics,
      branchRanking,
      shiftAnalytics,
    };
  },
};

export default analyticsService;
