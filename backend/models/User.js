const mongoose = require('mongoose');

// Deposit history sub-schema
const depositHistorySchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    utr: {
        type: String
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed'
    }
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    balance: {
        type: Number,
        default: 0,
        min: [0, 'Balance cannot be negative']
    },
    depositHistory: [depositHistorySchema],
    withdrawHistory: [{
        amount: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'cancelled'],
            default: 'pending'
        },
        withdrawalMethod: {
            type: String,
            enum: ['bank', 'upi', 'crypto'],
            required: true
        },
        accountDetails: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        transactionId: {
            type: String
        },
        requestedAt: {
            type: Date,
            default: Date.now
        },
        processedAt: {
            type: Date
        },
        remarks: {
            type: String
        }
    }]
}, {
    timestamps: true // Adds createdAt and updatedAt timestamps
});

module.exports = mongoose.model('User', userSchema);