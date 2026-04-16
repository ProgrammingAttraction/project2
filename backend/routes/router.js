const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal"); // ← NEW Withdrawal model
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const crypto = require("crypto");

// ─── Config ───────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const PAYMENT_GATEWAY = "https://dgpaymapi.dgpaym.com";
const PAYMENT_SECRET_KEY = "BD9EE7BE3AB07614BAC1B4FF1FEA2739";
const GATEWAY_BASE_URL = "https://dgpaymapi.dgpaym.com";

// ─── Axios instance for payment gateway ──────────────────────────────────────
const gatewayAxios = axios.create({
  baseURL: PAYMENT_GATEWAY,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  validateStatus: () => true,
});

// ─── Safe gateway call ────────────────────────────────────────────────────────
async function safePost(url, body) {
  try {
    const res = await gatewayAxios.post(url, body);
    return { ok: true, data: res.data ?? null, status: res.status };
  } catch (err) {
    return { ok: false, data: null, status: 0, error: err.message };
  }
}

// ─── Generate MD5 Signature ───────────────────────────────────────────────────
function generateSign(payload, secretKey) {
  const signData = { ...payload };
  delete signData.sign;

  const sortedKeys = Object.keys(signData).sort();

  const signString = sortedKeys
    .map((key) => {
      let value = signData[key];
      if (typeof value === "boolean") value = value.toString();
      else if (typeof value === "number") value = value.toString();
      else value = String(value).trim();
      return `${key}=${value}`;
    })
    .join("&");

  const stringToSign = `${signString}&secretKey=${secretKey}`;
  console.log("🔐 String to sign:", stringToSign);

  return crypto
    .createHash("md5")
    .update(stringToSign)
    .digest("hex")
    .toUpperCase();
}

// ─── Middleware: Verify JWT Token ─────────────────────────────────────────────
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
//  USER ROUTES
// ════════════════════════════════════════════════════════════════════════════

router.get("/users", verifyToken, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching users", error: error.message });
  }
});

router.get("/users/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching user", error: error.message });
  }
});

router.post("/users/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User with this email or username already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({ username, email, password: hashedPassword, balance: 0 });
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    user.password = undefined;
    res.status(201).json({ success: true, message: "User created successfully", data: user, token });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error creating user", error: error.message });
  }
});

router.post("/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    user.password = undefined;
    res.status(200).json({ success: true, message: "Login successful", data: user, token });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error during login", error: error.message });
  }
});

router.put("/users/:id", verifyToken, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, message: "User updated successfully", data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error updating user", error: error.message });
  }
});

router.delete("/users/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting user", error: error.message });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching user", error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  DEPOSIT ROUTES (Collection)
// ════════════════════════════════════════════════════════════════════════════

// ─── 1. Create Payment Order (Deposit) ────────────────────────────────────────
router.post("/payment/order/create", verifyToken, async (req, res) => {
  try {
    const {
      mchId,
      productId,
      mchOrderNo,
      amount,
      clientIp,
      notifyUrl,
      returnUrl,
      subject,
      body,
      param2,
      validateUserName,
      requestCardInfo,
    } = req.body;

    // Validate required fields
    if (!mchId || !productId || !mchOrderNo || !amount || !clientIp || !notifyUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: mchId, productId, mchOrderNo, amount, clientIp, notifyUrl",
      });
    }

    // ── Save deposit as PENDING in DB before calling gateway ──────────────
    const deposit = await Deposit.create({
      userId: req.userId,
      mchId: String(mchId).trim(),
      mchOrderNo: String(mchOrderNo).trim(),
      productId: String(productId).trim(),
      amount: Number(amount),
      status: "pending",
      notifyUrl: String(notifyUrl).trim(),
      returnUrl: returnUrl ? String(returnUrl).trim() : null,
    });

    console.log("💾 Deposit saved as pending:", deposit._id);

    // ── Build payload for gateway ─────────────────────────────────────────
    const payload = {
      mchId: String(mchId).trim(),
      productId: String(productId).trim(),
      mchOrderNo: String(mchOrderNo).trim(),
      amount: Number(amount)*100,
      clientIp: String(clientIp).trim(),
      notifyUrl: String(notifyUrl).trim(),
      param1: String(req.userId),
    };

    if (returnUrl && returnUrl.trim()) payload.returnUrl = String(returnUrl).trim();
    if (subject && subject.trim()) payload.subject = String(subject).trim();
    if (body && body.trim()) payload.body = String(body).trim();
    if (param2 && param2.trim()) payload.param2 = String(param2).trim();
    if (validateUserName && validateUserName.trim()) payload.validateUserName = String(validateUserName).trim();
    if (requestCardInfo !== undefined) payload.requestCardInfo = requestCardInfo;

    // Generate signature
    payload.sign = generateSign(payload, PAYMENT_SECRET_KEY);

    console.log("📤 Final payload:", JSON.stringify(payload, null, 2));

    // Call gateway
    const response = await axios.post(
      `${GATEWAY_BASE_URL}/v1.0/api/order/create`,
      payload,
      { headers: { "Content-Type": "application/json" }, timeout: 30000 }
    );

    console.log("📥 Gateway response:", response.data);

    // Save payment URL from gateway if returned
    if (response.data?.data?.payUrl) {
      await Deposit.findByIdAndUpdate(deposit._id, {
        paymentUrl: response.data.data.payUrl,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      data: response.data,
      depositId: deposit._id,
    });

  } catch (error) {
    console.error("❌ Error creating order:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Error creating payment order",
      error: error.response?.data || error.message,
    });
  }
});

// ─── 2. Query Collection Order ────────────────────────────────────────────────
router.post("/payment/order/query", async (req, res) => {
  try {
    const { mchId, mchOrderNo } = req.body;

    if (!mchId || !mchOrderNo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: mchId, mchOrderNo",
      });
    }

    const payload = { mchId, mchOrderNo };
    payload.sign = generateSign(payload, PAYMENT_SECRET_KEY);

    console.log("📤 [order/query] payload →", JSON.stringify(payload, null, 2));

    const { ok, data, status, error: netErr } = await safePost("/v1.0/api/order/query", payload);

    if (!ok) {
      console.error("❌ [order/query] network error:", netErr);
      return res.status(502).json({
        success: false,
        message: "Could not reach payment gateway",
        error: netErr,
      });
    }

    console.log(`📥 [order/query] gateway HTTP ${status} →`, data);

    const localDeposit = await Deposit.findOne({ mchOrderNo });

    res.status(200).json({
      success: true,
      message: "Order query successful",
      data,
      localDeposit: localDeposit || null,
    });
  } catch (error) {
    console.error("❌ [order/query] exception:", error);
    res.status(500).json({ success: false, message: "Error querying payment order", error: error.message });
  }
});

// ─── 3. Collection Result Notification / Callback ────────────────────────────
router.post("/payment/callback", async (req, res) => {
  try {
    console.log("📥 Callback received:", req.body);
    
    const callbackData = req.body;
    
    const {
      mchOrderNo,
      mchId,
      payOrderId,
      amount,
      realAmount,
      income,
      status,
      paySuccessTime,
      utr,
      param1,
      param2,
      sign
    } = callbackData;
    
    if (!mchOrderNo || !mchId || !payOrderId) {
      console.error("❌ Missing required fields in callback");
      return res.status(200).send("success");
    }
    
    const payloadForSign = { ...callbackData };
    delete payloadForSign.sign;
    
    const calculatedSign = generateSign(payloadForSign, PAYMENT_SECRET_KEY);
    
    if (calculatedSign !== sign) {
      console.error("❌ Invalid signature in callback");
      return res.status(200).send("success");
    }
    
    console.log("✅ Signature verified successfully");
    
    const deposit = await Deposit.findOne({ mchOrderNo });
    
    if (!deposit) {
      console.error(`❌ Deposit not found for order: ${mchOrderNo}`);
      return res.status(200).send("success");
    }
    
    if (deposit.status === "completed") {
      console.log(`⚠️ Deposit ${mchOrderNo} already completed, skipping`);
      return res.status(200).send("success");
    }
    
    if (status === 1) {
      // Convert from smallest currency unit (cents/paisa) to main unit
      const amountInMainUnit = amount / 100;
      const realAmountInMainUnit = realAmount / 100;
      const incomeInMainUnit = income / 100;
      
      deposit.status = "completed";
      deposit.realAmount = realAmountInMainUnit;  // Fixed: using realAmount
      deposit.income = incomeInMainUnit;
      deposit.utr = utr;
      deposit.payOrderId = payOrderId;
      deposit.paySuccessTime = paySuccessTime;
      deposit.completedAt = new Date();
      await deposit.save();
      
      console.log(`✅ Deposit ${mchOrderNo} marked as completed`);
      console.log(`   Amount: ${amountInMainUnit}, Real Amount: ${realAmountInMainUnit}, Income: ${incomeInMainUnit}`);
      
      const userId = param1 || deposit.userId;
      const user = await User.findById(userId);
      if (user) {
        if (user.balance === undefined) user.balance = 0;
        const amountToAdd = amountInMainUnit;  // Using the converted amount
        user.balance = (user.balance || 0) + amountToAdd;
        
        if (!user.depositHistory) user.depositHistory = [];
        
        user.depositHistory.push({
          amount: amountToAdd,
          orderId: payOrderId,
          utr: utr,
          date: new Date(),
          status: "completed"
        });
        
        await user.save();
        console.log(`💰 Added ${amountToAdd} to user ${userId}'s balance. New balance: ${user.balance}`);
      } else {
        console.error(`❌ User not found: ${userId}`);
      }
    } else {
      deposit.status = status === 2 ? "failed" : "timeout";
      deposit.completedAt = new Date();
      await deposit.save();
      console.log(`⚠️ Deposit ${mchOrderNo} marked as ${deposit.status}`);
    }
    
    res.status(200).send("success");
    
  } catch (error) {
    console.error("❌ [callback] exception:", error.message);
    return res.status(200).send("success");
  }
});

// ─── 4. Get Deposit Status ────────────────────────────────────────────────────
router.get("/payment/deposit/status", verifyToken, async (req, res) => {
  try {
    const { mchOrderNo } = req.query;

    if (!mchOrderNo) {
      return res.status(400).json({ success: false, message: "mchOrderNo is required" });
    }

    const deposit = await Deposit.findOne({
      mchOrderNo,
      userId: req.userId,
    });

    if (!deposit) {
      return res.status(404).json({ success: false, message: "Deposit not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        mchOrderNo: deposit.mchOrderNo,
        status: deposit.status,
        amount: deposit.amount,
        realAmount: deposit.realAmount,
        income: deposit.income,
        utr: deposit.utr,
        paySuccessTime: deposit.paySuccessTime,
        createdAt: deposit.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching deposit status", error: error.message });
  }
});

// ─── 5. Deposit History ───────────────────────────────────────────────────────
router.get("/payment/deposits", verifyToken, async (req, res) => {
  try {
    const deposits = await Deposit.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-__v");

    res.status(200).json({ success: true, count: deposits.length, data: deposits });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching deposits", error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  WITHDRAWAL ROUTES (Payment on Behalf / Payout)
// ════════════════════════════════════════════════════════════════════════════

// ─── 1. Create Withdrawal Order (Payment on Behalf) ───────────────────────────
router.post("/payment/order/create-withdrawal", verifyToken, async (req, res) => {
  try {
    const {
      mchId,
      productId,
      mchOrderNo,
      amount,
      clientIp,
      notifyUrl,
      userName,
      cardNumber,
      ifscCode,
      bankName,
      accountType, // New parameter: 'bank' (default) or 'UPI'
      param1,
      param2,
    } = req.body;
     console.log("",req.body)
    // Validate required fields
    if (!mchId || !productId || !mchOrderNo || !amount || !clientIp || !notifyUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: mchId, productId, mchOrderNo, amount, clientIp, notifyUrl",
      });
    }

 console.log("ifscCode",ifscCode)
    // Validate IFSC code for bank payments (skip for UPI)
    const paymentType = accountType;

    // Check user's balance
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
 console.log("ifscCode3",ifscCode)

    const withdrawalAmount = Number(amount); // Convert from paise/cents
    if (user.balance < withdrawalAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
        balance: user.balance,
        requested: withdrawalAmount,
      });
    }
      console.log("dsfsdf")

    // Create withdrawal record as PENDING
    const withdrawal = await Withdrawal.create({
      userId: req.userId,
      mchId: String(mchId).trim(),
      mchOrderNo: String(mchOrderNo).trim(),
      productId: String(productId).trim(),
      amount: withdrawalAmount,
      clientIp: String(clientIp).trim(),
      notifyUrl: String(notifyUrl).trim(),
      ifscCode: paymentType === 'bank' ? String(ifscCode).trim() : null,
      bankName: bankName ? String(bankName).trim() : "",
      accountType: paymentType,
      status: "pending",
      param1: param1 ? String(param1).trim() : null,
      param2: param2 ? String(param2).trim() : null,
    });

    console.log("💾 Withdrawal saved as pending:", withdrawal._id);

    // Build payload for gateway based on documentation
    const payload = {
      mchId: String(mchId).trim(),
      productId: String(productId).trim(),
      mchOrderNo: String(mchOrderNo).trim(),
      amount:withdrawalAmount*100, // Keep original amount (paise/cents)
      clientIp: String(clientIp).trim(),
      notifyUrl: String(notifyUrl).trim(),
      userName: String(userName).trim(),
      cardNumber: String(cardNumber).trim(),
      bankName: String(bankName).trim(),
      ifscCode:ifscCode,
    };

    // Add IFSC code only for bank payments
    if (paymentType === 'bank' && ifscCode) {
      payload.ifscCode = String(ifscCode).trim();
    }

    // Add extended parameters as per documentation
    if (param1) payload.param1 = String(param1).trim();
    if (param2) payload.param2 = String(param2).trim();

    // Add user tracking
    payload.memberIPAddress = clientIp; // Add client IP as memberIPAddress
    payload.userId = String(req.userId); // Track internal user ID

    // Generate signature - include all parameters except sign itself
    const signPayload = { ...payload };
    delete signPayload.sign; // Remove sign if it exists
    payload.sign = generateSign(signPayload, PAYMENT_SECRET_KEY);

    console.log("📤 Withdrawal payload:", JSON.stringify(payload, null, 2));

    // Call gateway
    const response = await axios.post(
      `${GATEWAY_BASE_URL}/v1.0/api/order/create`,
      payload,
      { headers: { "Content-Type": "application/json" }, timeout: 30000 }
    );

    console.log("📥 Gateway withdrawal response:", response.data);

    // Update withdrawal with gateway response
    if (response.data) {
      await Withdrawal.findByIdAndUpdate(withdrawal._id, {
        gatewayResponse: response.data,
        payOrderId: response.data?.data?.payOrderId,
        gatewayStatus: response.data?.code,
      });
    }

    // Check if withdrawal was successful immediately
    if (response.data?.retCode === "SUCCESS") {
      // Deduct balance immediately for successful withdrawal
      user.balance = user.balance - withdrawalAmount;
      
      if (!user.withdrawalHistory) user.withdrawalHistory = [];
      user.withdrawalHistory.push({
        amount: withdrawalAmount,
        orderId: response.data?.data?.payOrderId || mchOrderNo,
        bankAccount: cardNumber,
        ifscCode: paymentType === 'bank' ? ifscCode : null,
        upiId: paymentType === 'UPI' ? cardNumber : null,
        date: new Date(),
        status: "processing"
      });
      
      await user.save();
      
      await Withdrawal.findByIdAndUpdate(withdrawal._id, {
        status: "processing",
      });
      
      console.log(`💰 Deducted ${withdrawalAmount} from user ${req.userId}'s balance. New balance: ${user.balance}`);
    }

    return res.status(200).json({
      success: true,
      message: "Withdrawal order created successfully",
      data: response.data,
      withdrawalId: withdrawal._id,
    });

  } catch (error) {
    console.error("❌ Error creating withdrawal:", error.response?.data || error.message);
    
    // If there was an error, mark the withdrawal as failed
    if (error.response?.data) {
      try {
        await Withdrawal.findOneAndUpdate(
          { mchOrderNo: req.body.mchOrderNo },
          { 
            status: "failed",
            gatewayResponse: error.response.data,
            errorMessage: error.response.data.message || error.message
          }
        );
      } catch (updateError) {
        console.error("Failed to update withdrawal status:", updateError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: "Error creating withdrawal order",
      error: error.response?.data || error.message,
    });
  }
});

// ─── 2. Query Withdrawal Order ────────────────────────────────────────────────
router.post("/withdrawal/query", verifyToken, async (req, res) => {
  try {
    const { mchId, mchOrderNo } = req.body;

    if (!mchId || !mchOrderNo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: mchId, mchOrderNo",
      });
    }

    const payload = { 
      mchId: String(mchId).trim(), 
      mchOrderNo: String(mchOrderNo).trim() 
    };
    payload.sign = generateSign(payload, PAYMENT_SECRET_KEY);

    console.log("📤 [withdrawal/query] payload →", JSON.stringify(payload, null, 2));

    const { ok, data, status, error: netErr } = await safePost("/v1.0/api/pay/query", payload);

    if (!ok) {
      console.error("❌ [withdrawal/query] network error:", netErr);
      return res.status(502).json({
        success: false,
        message: "Could not reach payment gateway",
        error: netErr,
      });
    }

    console.log(`📥 [withdrawal/query] gateway HTTP ${status} →`, data);

    const localWithdrawal = await Withdrawal.findOne({ mchOrderNo });

    // Update local status if gateway shows completed
    if (data?.data?.status === 1 && localWithdrawal && localWithdrawal.status !== "completed") {
      localWithdrawal.status = "completed";
      localWithdrawal.completedAt = new Date();
      localWithdrawal.gatewayResponse = data;
      await localWithdrawal.save();
    } else if (data?.data?.status === 5 && localWithdrawal && localWithdrawal.status !== "failed") {
      localWithdrawal.status = "failed";
      localWithdrawal.completedAt = new Date();
      localWithdrawal.rejectReason = data?.data?.rejectReason;
      localWithdrawal.gatewayResponse = data;
      await localWithdrawal.save();
      
      // Refund balance if withdrawal failed
      if (localWithdrawal.status === "failed") {
        const user = await User.findById(localWithdrawal.userId);
        if (user) {
          const refundAmount = localWithdrawal.amount / 100;
          user.balance = (user.balance || 0) + refundAmount;
          await user.save();
          console.log(`💰 Refunded ${refundAmount} to user ${localWithdrawal.userId} for failed withdrawal`);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Withdrawal query successful",
      data,
      localWithdrawal: localWithdrawal || null,
    });
  } catch (error) {
    console.error("❌ [withdrawal/query] exception:", error);
    res.status(500).json({ success: false, message: "Error querying withdrawal order", error: error.message });
  }
});

// ─── 3. Withdrawal Result Notification / Callback (GET based on docs) ─────────
// router.post("/withdrawal/callback", async (req, res) => {
//   try {
//     console.log("📥 Withdrawal callback received:", req.body);
    
//     const callbackData = req.body;
    
//     const {
//       mchOrderNo,
//       mchId,
//       payOrderId,
//       amount,
//       realAmount,
//       income,
//       status,
//       paySuccessTime,
//       utr,
//       param1,
//       param2,
//       sign
//     } = callbackData;
    
//     // Validate required fields
//     if (!mchOrderNo || !mchId || !payOrderId) {
//       console.error("❌ Missing required fields in withdrawal callback");
//       return res.status(200).send("SUCCESS");
//     }
    
//     // Verify signature
//     const payloadForSign = { ...callbackData };
//     delete payloadForSign.sign;
    
//     const calculatedSign = generateSign(payloadForSign, PAYMENT_SECRET_KEY);
    
//     if (calculatedSign !== sign) {
//       console.error("❌ Invalid signature in withdrawal callback");
//       console.log(`Expected: ${calculatedSign}, Received: ${sign}`);
//       return res.status(200).send("SUCCESS");
//     }
    
//     console.log("✅ Withdrawal callback signature verified successfully");
    
//     // Find the withdrawal record
//     const withdrawal = await Withdrawal.findOne({ mchOrderNo });
    
//     if (!withdrawal) {
//       console.error(`❌ Withdrawal not found for order: ${mchOrderNo}`);
//       return res.status(200).send("SUCCESS");
//     }
    
//     // Check if already processed
//     if (withdrawal.status === "completed" || withdrawal.status === "failed") {
//       console.log(`⚠️ Withdrawal ${mchOrderNo} already ${withdrawal.status}, skipping`);
//       return res.status(200).send("SUCCESS");
//     }
    
//     // Convert amounts from paise/cents to rupees
//     const amountInRupees =income ? income / 100 : 0;
//     const incomeInRupees = income ? income / 100 : 0;
    
//     // Update withdrawal based on status (status: 1 = success)
//     if (status === 1) {
//       // Withdrawal successful - Balance was already deducted when withdrawal was created
//       // So we don't deduct again, just update the status
//       withdrawal.status = "completed";
//       withdrawal.realAmount = amountInRupees; // Store in rupees
//       withdrawal.income = incomeInRupees;
//       withdrawal.utr = utr;
//       withdrawal.payOrderId = payOrderId;
//       withdrawal.paySuccessTime = paySuccessTime;
//       withdrawal.completedAt = new Date();
//       await withdrawal.save();
      
//       console.log(`✅ Withdrawal ${mchOrderNo} marked as completed`);
//       console.log(`💰 Amount ${amountInRupees} was already deducted when withdrawal was created`);
      
//       // Update user's withdrawal history
//       const user = await User.findById(withdrawal.userId);
      
//       if (user) {
//         // Find and update the withdrawal in user's withdrawHistory
//         if (user.withdrawHistory && user.withdrawHistory.length > 0) {
//           // Try to find by order ID or by matching amount and date
//           let found = false;
//           for (let i = 0; i < user.withdrawHistory.length; i++) {
//             if (user.withdrawHistory[i].status === "pending" && 
//                 user.withdrawHistory[i].amount === amountInRupees) {
//               user.withdrawHistory[i].status = "completed";
//               user.withdrawHistory[i].transactionId = utr || payOrderId;
//               user.withdrawHistory[i].processedAt = new Date();
//               found = true;
//               break;
//             }
//           }
          
//           if (!found) {
//             // If not found in pending, add as completed
//             user.withdrawHistory.push({
//               amount: amountInRupees,
//               status: "completed",
//               withdrawalMethod: withdrawal.accountType === 'UPI' ? 'upi' : 'bank',
//               accountDetails: {
//                 bankName: withdrawal.bankName,
//                 ifscCode: withdrawal.ifscCode,
//                 transactionId: utr || payOrderId
//               },
//               transactionId: utr || payOrderId,
//               requestedAt: withdrawal.createdAt,
//               processedAt: new Date()
//             });
//           }
//         } else {
//           // Create withdrawHistory array if it doesn't exist
//           user.withdrawHistory = [{
//             amount: amountInRupees,
//             status: "completed",
//             withdrawalMethod: withdrawal.accountType === 'UPI' ? 'upi' : 'bank',
//             accountDetails: {
//               bankName: withdrawal.bankName,
//               ifscCode: withdrawal.ifscCode,
//               transactionId: utr || payOrderId
//             },
//             transactionId: utr || payOrderId,
//             requestedAt: withdrawal.createdAt,
//             processedAt: new Date()
//           }];
//         }
        
//         await user.save();
//         console.log(`📝 Updated user ${withdrawal.userId}'s withdrawal history`);
//       }
      
//     } else if (status === 2) {
//       // Withdrawal FAILED - Need to REFUND the balance back to user
//       withdrawal.status = "failed";
//       withdrawal.rejectReason = callbackData.rejectReason || "Payment gateway rejected";
//       withdrawal.completedAt = new Date();
//       withdrawal.gatewayResponse = callbackData;
//       await withdrawal.save();
      
//       console.log(`❌ Withdrawal ${mchOrderNo} marked as failed`);
      
//       // REFUND the amount back to user's balance (amount is in paise, convert to rupees)
//       const user = await User.findById(withdrawal.userId);
      
//       if (user) {
//         const refundAmount = amountInRupees;
//         user.balance = (user.balance || 0) + refundAmount;
        
//         // Update withdrawal history status
//         if (user.withdrawHistory && user.withdrawHistory.length > 0) {
//           for (let i = 0; i < user.withdrawHistory.length; i++) {
//             if (user.withdrawHistory[i].status === "pending" && 
//                 user.withdrawHistory[i].amount === amountInRupees) {
//               user.withdrawHistory[i].status = "failed";
//               user.withdrawHistory[i].remarks = withdrawal.rejectReason;
//               user.withdrawHistory[i].processedAt = new Date();
//               break;
//             }
//           }
//         }
        
//         await user.save();
//         console.log(`💰 REFUNDED ${refundAmount} to user ${withdrawal.userId}'s balance. New balance: ${user.balance}`);
//       }
      
//     } else if (status === 3) {
//       // Withdrawal timeout/expired - Also REFUND
//       withdrawal.status = "timeout";
//       withdrawal.completedAt = new Date();
//       withdrawal.gatewayResponse = callbackData;
//       await withdrawal.save();
      
//       console.log(`⏰ Withdrawal ${mchOrderNo} marked as timeout`);
      
//       const user = await User.findById(withdrawal.userId);
      
//       if (user) {
//         const refundAmount = amountInRupees;
//         user.balance = (user.balance || 0) + refundAmount;
        
//         if (user.withdrawHistory && user.withdrawHistory.length > 0) {
//           for (let i = 0; i < user.withdrawHistory.length; i++) {
//             if (user.withdrawHistory[i].status === "pending" && 
//                 user.withdrawHistory[i].amount === amountInRupees) {
//               user.withdrawHistory[i].status = "failed";
//               user.withdrawHistory[i].remarks = "Transaction timeout";
//               user.withdrawHistory[i].processedAt = new Date();
//               break;
//             }
//           }
//         }
        
//         await user.save();
//         console.log(`💰 REFUNDED ${refundAmount} to user ${withdrawal.userId} due to timeout. New balance: ${user.balance}`);
//       }
      
//     } else {
//       // Unknown status - Also refund to be safe
//       withdrawal.status = "failed";
//       withdrawal.rejectReason = `Unknown status: ${status}`;
//       withdrawal.completedAt = new Date();
//       withdrawal.gatewayResponse = callbackData;
//       await withdrawal.save();
      
//       const user = await User.findById(withdrawal.userId);
      
//       if (user) {
//         const refundAmount = amountInRupees;
//         user.balance = (user.balance || 0) + refundAmount;
//         await user.save();
//         console.log(`💰 REFUNDED ${refundAmount} to user ${withdrawal.userId} due to unknown status. New balance: ${user.balance}`);
//       }
      
//       console.log(`⚠️ Withdrawal ${mchOrderNo} received unknown status: ${status}`);
//     }
    
//     // Always return SUCCESS to acknowledge receipt
//     res.status(200).send("SUCCESS");
    
//   } catch (error) {
//     console.error("❌ [withdrawal/callback] exception:", error.message);
//     console.error(error.stack);
//     // Always return success to avoid retries
//     return res.status(200).send("SUCCESS");
//   }
// });


router.post("/withdrawal/callback", async (req, res) => {
  try {
    console.log("📥 Withdrawal callback received:", req.body);
    
    const callbackData = req.body;
    
    const {
      mchOrderNo,
      mchId,
      payOrderId,
      amount,
      realAmount,
      income,
      status,
      paySuccessTime,
      utr,
      param1,
      param2,
      rejectReason,
      sign
    } = callbackData;
    
    // Validate required fields
    if (!mchOrderNo || !mchId || !payOrderId) {
      console.error("❌ Missing required fields in withdrawal callback");
      return res.status(200).send("SUCCESS");
    }
    
    // Verify signature
    const payloadForSign = { ...callbackData };
    delete payloadForSign.sign;
    
    const calculatedSign = generateSign(payloadForSign, PAYMENT_SECRET_KEY);
    
    if (calculatedSign !== sign) {
      console.error("❌ Invalid signature in withdrawal callback");
      console.log(`Expected: ${calculatedSign}, Received: ${sign}`);
      return res.status(200).send("SUCCESS");
    }
    
    console.log("✅ Withdrawal callback signature verified successfully");
    
    // Find the withdrawal record
    const withdrawal = await Withdrawal.findOne({ mchOrderNo });
    
    if (!withdrawal) {
      console.error(`❌ Withdrawal not found for order: ${mchOrderNo}`);
      return res.status(200).send("SUCCESS");
    }
    
    // Check if already processed
    if (withdrawal.status === "completed" || withdrawal.status === "failed") {
      console.log(`⚠️ Withdrawal ${mchOrderNo} already ${withdrawal.status}, skipping`);
      return res.status(200).send("SUCCESS");
    }
    
    // FIX: Use 'amount' field for refund, not 'income' (income is 0 for failed transactions)
    const amountInRupees = amount;
    const incomeInRupees = income;
    
    console.log(`💰 Amount in rupees: ${amountInRupees} (from amount field: ${amount})`);
    console.log(`💰 Income in rupees: ${incomeInRupees} (from income field: ${income})`);
    
    // Update withdrawal based on status
    if (status === 1) {
      // Withdrawal successful - Balance was already deducted when withdrawal was created
      withdrawal.status = "completed";
      withdrawal.realAmount = amountInRupees;
      withdrawal.income = incomeInRupees;
      withdrawal.utr = utr;
      withdrawal.payOrderId = payOrderId;
      withdrawal.paySuccessTime = paySuccessTime;
      withdrawal.completedAt = new Date();
      await withdrawal.save();
      
      console.log(`✅ Withdrawal ${mchOrderNo} marked as completed`);
      console.log(`💰 Amount ${amountInRupees} was already deducted when withdrawal was created`);
      
      // Update user's withdrawal history
      const user = await User.findById(withdrawal.userId);
      
      if (user) {
        if (user.withdrawHistory && user.withdrawHistory.length > 0) {
          let found = false;
          for (let i = 0; i < user.withdrawHistory.length; i++) {
            if (user.withdrawHistory[i].status === "pending" && 
                user.withdrawHistory[i].amount === amountInRupees) {
              user.withdrawHistory[i].status = "completed";
              user.withdrawHistory[i].transactionId = utr || payOrderId;
              user.withdrawHistory[i].processedAt = new Date();
              found = true;
              break;
            }
          }
          
          if (!found) {
            user.withdrawHistory.push({
              amount: amountInRupees,
              status: "completed",
              withdrawalMethod: withdrawal.accountType === 'UPI' ? 'upi' : 'bank',
              accountDetails: {
                bankName: withdrawal.bankName,
                ifscCode: withdrawal.ifscCode,
                transactionId: utr || payOrderId
              },
              transactionId: utr || payOrderId,
              requestedAt: withdrawal.createdAt,
              processedAt: new Date()
            });
          }
        } else {
          user.withdrawHistory = [{
            amount: amountInRupees,
            status: "completed",
            withdrawalMethod: withdrawal.accountType === 'UPI' ? 'upi' : 'bank',
            accountDetails: {
              bankName: withdrawal.bankName,
              ifscCode: withdrawal.ifscCode,
              transactionId: utr || payOrderId
            },
            transactionId: utr || payOrderId,
            requestedAt: withdrawal.createdAt,
            processedAt: new Date()
          }];
        }
        
        await user.save();
        console.log(`📝 Updated user ${withdrawal.userId}'s withdrawal history`);
      }
    } 
    else if (status === 2 || status === 4 || status === 5) {
      // Withdrawal FAILED/REJECTED/ERROR - Need to REFUND the balance back to user
      withdrawal.status = "failed";
      withdrawal.rejectReason = rejectReason || callbackData.rejectReason || "Payment gateway rejected";
      withdrawal.completedAt = new Date();
      withdrawal.gatewayResponse = callbackData;
      withdrawal.failedAt = new Date();
      await withdrawal.save();
      
      console.log(`❌ Withdrawal ${mchOrderNo} marked as failed (status: ${status})`);
      console.log(`❌ Reject reason: ${withdrawal.rejectReason}`);
      
      // REFUND the amount back to user's balance - USING AMOUNT FIELD (not income)
      const user = await User.findById(withdrawal.userId);
      
      if (user) {
        const refundAmount = amountInRupees; // This now uses 'amount' field, not 'income'
        const oldBalance = user.balance;
        user.balance = (user.balance || 0) + refundAmount;
        
        console.log(`💰 Refund amount calculated: ${refundAmount} (from amount field: ${amount})`);
        
        // Update withdrawal history status
        if (user.withdrawHistory && user.withdrawHistory.length > 0) {
          let found = false;
          for (let i = 0; i < user.withdrawHistory.length; i++) {
            if (user.withdrawHistory[i].status === "pending" && 
                user.withdrawHistory[i].amount === withdrawal.amount) {
              user.withdrawHistory[i].status = "failed";
              user.withdrawHistory[i].remarks = withdrawal.rejectReason;
              user.withdrawHistory[i].processedAt = new Date();
              user.withdrawHistory[i].transactionId = payOrderId;
              found = true;
              break;
            }
          }
          
          if (!found) {
            // If not found in pending, add as failed
            user.withdrawHistory.push({
              amount: withdrawal.amount,
              status: "failed",
              withdrawalMethod: withdrawal.accountType === 'UPI' ? 'upi' : 'bank',
              accountDetails: {
                bankName: withdrawal.bankName,
                ifscCode: withdrawal.ifscCode
              },
              remarks: withdrawal.rejectReason,
              requestedAt: withdrawal.createdAt,
              processedAt: new Date(),
              transactionId: payOrderId
            });
          }
        } else {
          user.withdrawHistory = [{
            amount: withdrawal.amount,
            status: "failed",
            withdrawalMethod: withdrawal.accountType === 'UPI' ? 'upi' : 'bank',
            accountDetails: {
              bankName: withdrawal.bankName,
              ifscCode: withdrawal.ifscCode
            },
            remarks: withdrawal.rejectReason,
            requestedAt: withdrawal.createdAt,
            processedAt: new Date(),
            transactionId: payOrderId
          }];
        }
        
        await user.save();
        console.log(`💰 REFUNDED ${refundAmount} to user ${withdrawal.userId}. Old balance: ${oldBalance}, New balance: ${user.balance}`);
      } else {
        console.error(`❌ User ${withdrawal.userId} not found for refund!`);
      }
    } 
    else if (status === 3) {
      // Withdrawal timeout/expired - Also REFUND
      withdrawal.status = "timeout";
      withdrawal.rejectReason = "Transaction timeout";
      withdrawal.completedAt = new Date();
      withdrawal.gatewayResponse = callbackData;
      await withdrawal.save();
      
      console.log(`⏰ Withdrawal ${mchOrderNo} marked as timeout`);
      
      const user = await User.findById(withdrawal.userId);
      
      if (user) {
        const refundAmount = amountInRupees; // Using amount field
        const oldBalance = user.balance;
        user.balance = (user.balance || 0) + refundAmount;
        
        if (user.withdrawHistory && user.withdrawHistory.length > 0) {
          for (let i = 0; i < user.withdrawHistory.length; i++) {
            if (user.withdrawHistory[i].status === "pending" && 
                user.withdrawHistory[i].amount === withdrawal.amount) {
              user.withdrawHistory[i].status = "failed";
              user.withdrawHistory[i].remarks = "Transaction timeout";
              user.withdrawHistory[i].processedAt = new Date();
              break;
            }
          }
        }
        
        await user.save();
        console.log(`💰 REFUNDED ${refundAmount} to user ${withdrawal.userId} due to timeout. Old balance: ${oldBalance}, New balance: ${user.balance}`);
      }
    } 
    else {
      // Unknown status - Also refund to be safe
      withdrawal.status = "failed";
      withdrawal.rejectReason = `Unknown status: ${status}`;
      withdrawal.completedAt = new Date();
      withdrawal.gatewayResponse = callbackData;
      await withdrawal.save();
      
      console.log(`⚠️ Withdrawal ${mchOrderNo} received unknown status: ${status}`);
      
      const user = await User.findById(withdrawal.userId);
      
      if (user) {
        const refundAmount = amountInRupees; // Using amount field
        const oldBalance = user.balance;
        user.balance = (user.balance || 0) + refundAmount;
        await user.save();
        console.log(`💰 REFUNDED ${refundAmount} to user ${withdrawal.userId} due to unknown status. Old balance: ${oldBalance}, New balance: ${user.balance}`);
      }
    }
    
    // Always return SUCCESS to acknowledge receipt
    res.status(200).send("SUCCESS");
    
  } catch (error) {
    console.error("❌ [withdrawal/callback] exception:", error.message);
    console.error(error.stack);
    // Always return success to avoid retries
    return res.status(200).send("SUCCESS");
  }
});


// ─── 4. Get Withdrawal Status ─────────────────────────────────────────────────
router.get("/withdrawal/status", verifyToken, async (req, res) => {
  try {
    const { mchOrderNo } = req.query;

    if (!mchOrderNo) {
      return res.status(400).json({ success: false, message: "mchOrderNo is required" });
    }

    const withdrawal = await Withdrawal.findOne({
      mchOrderNo,
      userId: req.userId,
    });

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        mchOrderNo: withdrawal.mchOrderNo,
        status: withdrawal.status,
        amount: withdrawal.amount,
        realAmount: withdrawal.realAmount,
        utr: withdrawal.utr,
        rejectReason: withdrawal.rejectReason,
        paySuccessTime: withdrawal.paySuccessTime,
        createdAt: withdrawal.createdAt,
        completedAt: withdrawal.completedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching withdrawal status", error: error.message });
  }
});

// ─── 5. Withdrawal History ────────────────────────────────────────────────────
router.get("/withdrawal/history", verifyToken, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-__v");

    res.status(200).json({ success: true, count: withdrawals.length, data: withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching withdrawals", error: error.message });
  }
});

// ─── 6. Get User Balance ──────────────────────────────────────────────────────
router.get("/balance", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("balance");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      data: {
        balance: user.balance || 0,
        currency: "INR",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching balance", error: error.message });
  }
});


// ─── 9. Get All User Transactions (Combined) ───────────────────────────────────
// ─── 9. Get All User Transactions (Combined) ───────────────────────────────────
router.get("/transactions/all", verifyToken, async (req, res) => {
  try {
    // Fetch deposits
    const deposits = await Deposit.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    
    // Fetch withdrawals
    const withdrawals = await Withdrawal.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    
    // Format deposits
    const formattedDeposits = deposits.map(deposit => ({
      id: deposit._id,
      type: "deposit",
      amount: deposit.realAmount ? deposit.realAmount / 100 : deposit.amount / 100,
      status: deposit.status,
      date: deposit.createdAt,
      orderId: deposit.mchOrderNo,
      utr: deposit.utr,
      details: {
        productId: deposit.productId,
        payOrderId: deposit.payOrderId,
        paymentMethod: "Online Payment"
      }
    }));
    
    // Format withdrawals
    const formattedWithdrawals = withdrawals.map(withdraw => ({
      id: withdraw._id,
      type: "withdraw",
      amount:withdraw.amount,
      status: withdraw.status,
      date: withdraw.createdAt,
      orderId: withdraw.mchOrderNo,
      utr: withdraw.utr,
      details: {
        method: withdraw.bankName || "Bank Transfer",
        accountDetails: {
          bankName: withdraw.bankName,
          ifscCode: withdraw.ifscCode,
          userName: withdraw.userName
        },
        remarks: withdraw.rejectReason || null
      }
    }));
    
    // Combine and sort
    const allTransactions = [...formattedDeposits, ...formattedWithdrawals]
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Calculate stats
    const stats = {
      totalDeposits: formattedDeposits
        .filter(t => t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0),
      totalWithdrawals: formattedWithdrawals
        .filter(t => t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0),
      pendingWithdrawals: formattedWithdrawals
        .filter(t => t.status === "pending" || t.status === "processing")
        .reduce((sum, t) => sum + t.amount, 0)
    };
    
    // Get user balance
    const user = await User.findById(req.userId).select("balance");
    
    res.status(200).json({
      success: true,
      data: {
        transactions: allTransactions,
        stats,
        balance: user?.balance || 0
      }
    });
    
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: error.message
    });
  }
});

module.exports = router;