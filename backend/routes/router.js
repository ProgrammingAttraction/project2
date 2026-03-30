const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Deposit = require("../models/Deposit"); // ← NEW
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const crypto = require("crypto");

// ─── Config ───────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const PAYMENT_GATEWAY = "https://dgpaymapi.dgpaym.com";
const PAYMENT_SECRET_KEY = "ECD81E933F8ABDAC1FB6A1622D2A437B";
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
    const user = await User.create({ username, email, password: hashedPassword });
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


// ─── 1. Create Payment Order ──────────────────────────────────────────────────
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
      userId: req.userId,        // from JWT token
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
      amount:100*100,
      clientIp: String(clientIp).trim(),
      notifyUrl: String(notifyUrl).trim(),
      // Store userId in param1 so callback can credit the user
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

    // Also return our local deposit record
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
     console.log("callback response :",req.body)
  } catch (error) {
    console.error("❌ [callback] exception:", error.message);
    // Always return success even on error to prevent infinite retries
    return res.status(200).send("success");
  }
});

// ─── 4. Get Deposit Status (for frontend polling after redirect) ──────────────
router.get("/payment/deposit/status", verifyToken, async (req, res) => {
  try {
    const { mchOrderNo } = req.query;

    if (!mchOrderNo) {
      return res.status(400).json({ success: false, message: "mchOrderNo is required" });
    }

    const deposit = await Deposit.findOne({
      mchOrderNo,
      userId: req.userId, // Security: only owner can check
    });

    if (!deposit) {
      return res.status(404).json({ success: false, message: "Deposit not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        mchOrderNo: deposit.mchOrderNo,
        status: deposit.status,         // "pending" | "completed" | "timeout" | "failed"
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

module.exports = router;