import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
    {
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0.01, 'Amount must be positive']
        },
        paidBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
        },
        date: {
            type: Date,
            default: Date.now,
        },
        category: {
            type: String,
            enum: ['rent', 'groceries', 'utility', 'food', 'transport', 'entertainment', 'other'],
            default: 'other',
        },
        splits: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                amount: {
                    type: Number,
                    required: true,
                    min: [0, 'Split amount cannot be negative'],
                },
            },
        ],
        attachment: {
            type: String,
        },
    },
    { timestamps: true }
);

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;