const mongoose = require("mongoose");

const WithdrawalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mchId: {
      type: String,
      required: true,
    },
    mchOrderNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    productId: {
      type: String,
      required: true,
    },
    payOrderId: {
      type: String,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      comment: "Amount in paise/cents",
    },
    realAmount: {
      type: Number,
      comment: "Actual amount processed",
    },
    income: {
      type: Number,
      comment: "Income amount after fees",
    },
    clientIp: {
      type: String,
      required: true,
    },
    notifyUrl: {
      type: String,
      required: true,
    },
    // Bank details
    userName: {
      type: String,
    },
    ifscCode: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      default: "",
    },
    utr: {
      type: String,
      comment: "Bank Transaction Reference Number",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "timeout"],
      default: "pending",
      index: true,
    },
    rejectReason: {
      type: String,
    },
    paySuccessTime: {
      type: Number,
      comment: "Timestamp in milliseconds",
    },
    completedAt: {
      type: Date,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    param1: String,
    param2: String,
    param3: String,
    param4: String,
    param5: String,
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
WithdrawalSchema.index({ userId: 1, createdAt: -1 });
WithdrawalSchema.index({ mchOrderNo: 1 });
WithdrawalSchema.index({ status: 1 });

module.exports = mongoose.model("Withdrawal", WithdrawalSchema);