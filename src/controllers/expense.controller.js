import Expense from '../models/Expense.model.js';
import Group from '../models/Group.model.js';
import ApiError from '../utils/ApiError.js';
import { io } from '../../server.js';
import Settlement from '../models/Settlement.model.js';

export const createExpense = async (req, res, next) => {
    try {
        const { description, amount, groupId, category = 'other', splitType = 'equal' } = req.body;

        if (!description || !amount || amount <= 0) {
            throw new ApiError(400, 'Valid description and positive amount are required');
        }

        let splits = [];

        if (groupId) {
            const group = await Group.findById(groupId);
            if (!group) throw new ApiError(404, 'Group not found');

            const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
            if (!isMember) throw new ApiError(403, 'You are not a member of this group');

            const members = group.members.map(m => m.user.toString());

            if (splitType === 'equal') {
                const share = parseFloat(amount) / members.length;
                splits = members.map(user => ({ user, amount: Number(share.toFixed(2)) }));
            }
            else if (splitType === 'exact') {
                const { customSplits } = req.body;
                if (!customSplits || !Array.isArray(customSplits) || customSplits.length === 0) {
                    throw new ApiError(400, 'customSplits array required for exact split');
                }

                const total = customSplits.reduce((sum, s) => sum + Number(s.amount), 0);
                if (Math.abs(total - Number(amount)) > 0.01) {
                    throw new ApiError(400, 'Sum of exact splits must exactly equal the total amount');
                }

                splits = customSplits.map(s => ({
                    user: s.userId,
                    amount: Number(Number(s.amount).toFixed(2)),
                }));
            }
            else if (splitType === 'percentage') {
                const { percentages } = req.body;
                if (!percentages || !Array.isArray(percentages) || percentages.length === 0) {
                    throw new ApiError(400, 'percentages array required');
                }

                let totalPercent = 0;
                splits = percentages.map(p => {
                    totalPercent += Number(p.percent);
                    return {
                        user: p.userId,
                        amount: Number(((Number(p.percent) / 100) * Number(amount)).toFixed(2)),
                    };
                });

                if (Math.abs(totalPercent - 100) > 0.01) {
                    throw new ApiError(400, 'Percentages must sum exactly to 100%');
                }
            }
            else {
                throw new ApiError(400, 'Invalid splitType. Allowed: equal, exact, percentage');
            }
        } else {
            // Personal expense
            splits = [{ user: req.user._id, amount: Number(Number(amount).toFixed(2)) }];
        }

        const expense = new Expense({
            description,
            amount: Number(Number(amount).toFixed(2)),
            paidBy: req.user._id,
            group: groupId || null,
            category,
            splits,
            attachment: req.file ? `/uploads/${req.file.filename}` : null,
            createdBy: req.user._id,
        });

        await expense.save();

        // Emit real-time event
        if (groupId) {
            io.to(`group_${groupId}`).emit('expenseAdded', expense);
        }

        res.status(201).json({
            success: true,
            message: 'Expense created successfully',
            expense,
        });
    } catch (error) {
        next(error);
    }
};


export const getGroupExpenses = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { page = 1, limit = 10, search = '' } = req.query;

        const group = await Group.findById(groupId);
        if (!group) throw new ApiError(404, 'Group not found');

        const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) throw new ApiError(403, 'Access denied');

        const query = { group: groupId };
        if (search.trim()) {
            query.description = { $regex: search.trim(), $options: 'i' };
        }

        const expenses = await Expense.find(query)
            .populate('paidBy', 'username email avatar')
            .populate('splits.user', 'username email avatar')
            .populate('createdBy', 'username email')
            .sort({ date: -1 })
            .skip((page - 1) * Number(limit))
            .limit(Number(limit));

        const total = await Expense.countDocuments(query);

        res.json({
            success: true,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit),
            },
            expenses,
        });
    } catch (error) {
        next(error);
    }
};


export const updateExpense = async (req, res, next) => {
    try {
        const { expenseId } = req.params;
        const { description, amount, category, paidBy } = req.body;

        const expense = await Expense.findById(expenseId);
        if (!expense) throw new ApiError(404, 'Expense not found');

        // Permission: creator or payer only
        if (
            expense.createdBy.toString() !== req.user._id.toString() &&
            expense.paidBy.toString() !== req.user._id.toString()
        ) {
            throw new ApiError(403, 'You do not have permission to update this expense');
        }

        if (description) expense.description = description;
        if (amount) expense.amount = Number(Number(amount).toFixed(2));
        if (category) expense.category = category;
        if (paidBy) expense.paidBy = paidBy;

        // re-calculate splits if amount changed and it's a group expense
        if (amount && expense.group) {
            const group = await Group.findById(expense.group);
            if (group) {
                const share = Number(Number(amount).toFixed(2)) / group.members.length;
                expense.splits = group.members.map(m => ({
                    user: m.user,
                    amount: Number(share.toFixed(2)),
                }));
            }
        }

        if (req.file) {
            expense.attachment = `/uploads/${req.file.filename}`;
        }

        await expense.save();

        // Emit update event
        if (expense.group) {
            io.to(`group_${expense.group}`).emit('expenseUpdated', expense);
        }

        res.json({
            success: true,
            message: 'Expense updated successfully',
            expense,
        });
    } catch (error) {
        next(error);
    }
};


export const deleteExpense = async (req, res, next) => {
    try {
        const { expenseId } = req.params;

        const expense = await Expense.findById(expenseId);
        if (!expense) throw new ApiError(404, 'Expense not found');

        // Permission: creator or payer only
        if (
            expense.createdBy.toString() !== req.user._id.toString() &&
            expense.paidBy.toString() !== req.user._id.toString()
        ) {
            throw new ApiError(403, 'You do not have permission to delete this expense');
        }

        await Expense.findByIdAndDelete(expenseId);

        // Emit delete event
        if (expense.group) {
            io.to(`group_${expense.group}`).emit('expenseDeleted', { expenseId });
        }

        res.json({
            success: true,
            message: 'Expense deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};


// ─── Get Group Balances  with settlements  ───
export const getGroupBalances = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) throw new ApiError(404, 'Group not found');

        const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) throw new ApiError(403, 'Access denied');

        const expenses = await Expense.find({ group: groupId });
        const settlements = await Settlement.find({ group: groupId });

        const balances = {};
        group.members.forEach(m => {
            balances[m.user.toString()] = 0;
        });

        // Expenses: paidBy +amount, splits -amount
        expenses.forEach(exp => {
            if (balances[exp.paidBy.toString()] !== undefined) {
                balances[exp.paidBy.toString()] += exp.amount;
            }
            exp.splits.forEach(split => {
                if (balances[split.user.toString()] !== undefined) {
                    balances[split.user.toString()] -= split.amount;
                }
            });
        });

        // Settlements: subtract from from, add to to
        settlements.forEach(sett => {
            if (balances[sett.from.toString()] !== undefined) {
                balances[sett.from.toString()] -= sett.amount;
            }
            if (balances[sett.to.toString()] !== undefined) {
                balances[sett.to.toString()] += sett.amount;
            }
        });

        const formatted = Object.entries(balances).map(([userId, balance]) => ({
            userId,
            balance: Number(balance.toFixed(2)),
            status: balance > 0 ? 'owed' : balance < 0 ? 'owes' : 'settled',
        }));

        res.json({
            success: true,
            balances: formatted,
        });
    } catch (error) {
        next(error);
    }
};

export const getDashboardTotals = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const personalExpenses = await Expense.aggregate([
      { $match: { group: null, paidBy: userId } },
      { $group: { _id: null, totalSpent: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const personalTotal = personalExpenses[0]?.totalSpent || 0;
    const personalCount = personalExpenses[0]?.count || 0;

    const groups = await Group.find({
      $or: [{ creator: userId }, { 'members.user': userId }],
    });

    const groupSummaries = [];

    for (const group of groups) {
      const expenses = await Expense.find({ group: group._id });

      let groupTotal = 0;
      let userPaid = 0;
      let userBalance = 0;

      expenses.forEach(exp => {
        groupTotal += exp.amount;

        if (exp.paidBy.toString() === userId.toString()) {
          userPaid += exp.amount;
        }

        const userSplit = exp.splits.find(s => s.user.toString() === userId.toString());
        if (userSplit) {
          userBalance -= userSplit.amount;
        }
      });

      const settlements = await Settlement.find({ group: group._id });

      settlements.forEach(sett => {
        if (sett.from.toString() === userId.toString()) {
          userBalance -= sett.amount;
        }
        if (sett.to.toString() === userId.toString()) {
          userBalance += sett.amount;
        }
      });

      groupSummaries.push({
        groupId: group._id,
        groupName: group.name,
        currency: group.currency,
        totalExpenses: Number(groupTotal.toFixed(2)),
        yourPaid: Number(userPaid.toFixed(2)),
        yourBalance: Number(userBalance.toFixed(2)),
        status: userBalance > 0 ? 'owed' : userBalance < 0 ? 'owes' : 'settled',
        memberCount: group.members.length,
      });
    }

    const overallGroupTotal = groupSummaries.reduce((sum, g) => sum + g.totalExpenses, 0);
    const overallUserPaid = groupSummaries.reduce((sum, g) => sum + g.yourPaid, 0);
    const overallBalance = groupSummaries.reduce((sum, g) => sum + g.yourBalance, 0);

    res.json({
      success: true,
      dashboard: {
        personal: {
          totalSpent: Number(personalTotal.toFixed(2)),
          expenseCount: personalCount,
        },
        groups: groupSummaries,
        overall: {
          totalGroupExpenses: Number(overallGroupTotal.toFixed(2)),
          yourTotalPaid: Number(overallUserPaid.toFixed(2)),
          yourNetBalance: Number(overallBalance.toFixed(2)),
          currency: groupSummaries[0]?.currency || 'INR',
          status: overallBalance > 0 ? 'owed' : overallBalance < 0 ? 'owes' : 'settled',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};