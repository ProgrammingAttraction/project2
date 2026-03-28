const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mchId: {
      type: String,
      required: true,
    },
    mchOrderNo: {
      type: String,
      required: true,
      unique: true,
    },
    payOrderId: {
      type: String, // Platform order ID (from gateway callback)
      default: null,
    },
    productId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number, // in cents
      required: true,
    },
    realAmount: {
      type: Number, // actual paid amount in cents (may differ)
      default: null,
    },
    income: {
      type: Number, // after fee deduction
      default: null,
    },
    utr: {
      type: String, // UTR reference from gateway
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "timeout", "failed"],
      default: "pending",
    },
    paySuccessTime: {
      type: Date,
      default: null,
    },
    paymentUrl: {
      type: String, // redirect URL returned by gateway
      default: null,
    },
    notifyUrl: {
      type: String,
    },
    returnUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deposit", depositSchema);