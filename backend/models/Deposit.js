const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    mchId: {
        type: String,
        required: true
    },
    mchOrderNo: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    productId: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    realAmount: {
        type: Number,
        default: null
    },
    income: {
        type: Number,
        default: null
    },
    utr: {
        type: String,
        default: null
    },
    payOrderId: {
        type: String,
        default: null
    },
    paySuccessTime: {
        type: Number,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'timeout'],
        default: 'pending',
        index: true
    },
    notifyUrl: {
        type: String,
        required: true
    },
    returnUrl: {
        type: String,
        default: null
    },
    paymentUrl: {
        type: String,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Compound index for faster queries
depositSchema.index({ userId: 1, status: 1 });
depositSchema.index({ mchOrderNo: 1, userId: 1 });

module.exports = mongoose.model('Deposit', depositSchema);