import Settlement from "../models/Settlement.model.js";
import Group from '../models/Group.model.js';
import ApiError from "../utils/ApiError.js";
import { io } from '../../server.js'

export const createSettlement = async (req, res, next) => {
  try {
    const {
      groupId,
      toUserId,
      amount,
      description = 'Settlement payment',
      expenseId,       
      splitUserId,     
    } = req.body;

    if (!groupId || !toUserId || !amount || amount <= 0) {
      throw new ApiError(400, 'groupId, toUserId, and positive amount required');
    }

    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found');

    // Check membership
    const isFromMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    const isToMember = group.members.some(m => m.user.toString() === toUserId);
    if (!isFromMember || !isToMember) {
      throw new ApiError(403, 'Both users must be members of the group');
    }

    let linkedExpense = null;
    let remainingOwed = amount;

    // If linking to expense → validate and check remaining owed
    if (expenseId) {
      const expense = await Expense.findById(expenseId);
      if (!expense || expense.group?.toString() !== groupId) {
        throw new ApiError(404, 'Expense not found or not in this group');
      }

      // Find the specific split (if splitUserId provided)
      const split = expense.splits.find(s => s.user.toString() === (splitUserId || toUserId));
      if (!split) {
        throw new ApiError(400, 'Specified user is not in this expense splits');
      }

      // Calculate how much is still owed by this user in this expense
      // (simple version: we assume no prior settlements,you can make it more accurate later)
      remainingOwed = split.amount;

      if (amount > remainingOwed) {
        throw new ApiError(400, `Cannot settle more than owed (${remainingOwed}) for this split`);
      }

      linkedExpense = expenseId;
    }

    const settlement = new Settlement({
      group: groupId,
      from: req.user._id,
      to: toUserId,
      amount: Number(Number(amount).toFixed(2)),
      description,
      expense: linkedExpense,
      splitUser: splitUserId || null,
    });

    await settlement.save();

    
    io.to(`group_${groupId}`).emit('settlementAdded', settlement);

    res.status(201).json({
      success: true,
      message: 'Settlement recorded successfully',
      settlement,
    });
  } catch (error) {
    next(error);
  }
};

export const getGroupSettlements = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) throw new ApiError(404, 'Group not found');

        const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
        if (!isMember) throw new ApiError(403, 'Access denied');

        const settlements = await Settlement.find({ group: groupId })
            .populate('from', 'username email')
            .populate('to', 'username email')
            .sort({ paidAt: -1 });

        res.json({
            success: true,
            count: settlements.length,
            settlements,
        });
    } catch (error) {
        next(error);
    }
};

// Get single settlement
export const getSettlementById = async (req, res, next) => {
  try {
    const { settlementId } = req.params;

    const settlement = await Settlement.findById(settlementId)
      .populate('group', 'name')
      .populate('from', 'username email')
      .populate('to', 'username email')
      .populate('expense', 'description amount')
      .populate('splitUser', 'username email');

    if (!settlement) {
      throw new ApiError(404, 'Settlement not found');
    }

    // Check if user is part of the group
    const group = await Group.findById(settlement.group);
    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      throw new ApiError(403, 'Access denied');
    }

    res.json({
      success: true,
      settlement,
    });
  } catch (error) {
    next(error);
  }
};

// Delete / cancel settlement
export const deleteSettlement = async (req, res, next) => {
  try {
    const { settlementId } = req.params;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      throw new ApiError(404, 'Settlement not found');
    }

    // Only the person who made the settlement (from) can delete it
    if (settlement.from.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only delete your own settlements');
    }

    await Settlement.findByIdAndDelete(settlementId);

    res.json({
      success: true,
      message: 'Settlement deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};