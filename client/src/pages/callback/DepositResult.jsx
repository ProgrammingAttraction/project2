import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiLoader,
  FiCopy,
  FiHome,
  FiRefreshCw,
  FiDollarSign,
  FiHash,
  FiCalendar,
  FiShield,
} from "react-icons/fi";

const BASE_URL = import.meta.env.VITE_API_KEY_Base_URL;

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  loading: {
    icon: FiLoader,
    label: "Checking Payment...",
    color: "#6366f1",
    bg: "from-slate-900 via-indigo-950 to-slate-900",
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    spin: true,
  },
  completed: {
    icon: FiCheckCircle,
    label: "Payment Successful",
    color: "#22c55e",
    bg: "from-slate-900 via-emerald-950 to-slate-900",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    spin: false,
  },
  pending: {
    icon: FiClock,
    label: "Payment Processing",
    color: "#f59e0b",
    bg: "from-slate-900 via-amber-950 to-slate-900",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    spin: false,
  },
  timeout: {
    icon: FiClock,
    label: "Payment Timed Out",
    color: "#f59e0b",
    bg: "from-slate-900 via-orange-950 to-slate-900",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    spin: false,
  },
  failed: {
    icon: FiXCircle,
    label: "Payment Failed",
    color: "#ef4444",
    bg: "from-slate-900 via-red-950 to-slate-900",
    badge: "bg-red-500/20 text-red-300 border-red-500/30",
    spin: false,
  },
  not_found: {
    icon: FiXCircle,
    label: "Order Not Found",
    color: "#ef4444",
    bg: "from-slate-900 via-red-950 to-slate-900",
    badge: "bg-red-500/20 text-red-300 border-red-500/30",
    spin: false,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatAmount(cents) {
  if (!cents && cents !== 0) return "—";
  return "৳ " + (cents / 100).toLocaleString("en-BD", { minimumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shortOrder(str) {
  if (!str) return "—";
  return str.length > 24 ? str.slice(0, 12) + "…" + str.slice(-8) : str;
}

// ── Copy Button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className="ml-2 p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-all"
      title="Copy"
    >
      {copied ? (
        <FiCheckCircle size={13} className="text-emerald-400" />
      ) : (
        <FiCopy size={13} />
      )}
    </button>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, copyable }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-white/5 last:border-0 gap-4">
      <div className="flex items-center gap-2 text-slate-400 text-sm shrink-0">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <div className="flex items-center text-sm text-slate-200 text-right font-mono break-all">
        <span>{value}</span>
        {copyable && value && value !== "—" && <CopyBtn text={value} />}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DepositResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderNo = searchParams.get("order");

  const [status, setStatus] = useState("loading");
  const [deposit, setDeposit] = useState(null);
  const [gatewayData, setGatewayData] = useState(null);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);
  const mountedRef = useRef(true);

  // ── Fetch status from your backend ─────────────────────────────────────────
  const fetchStatus = async () => {
    if (!orderNo) {
      setStatus("not_found");
      setError("No order number provided in URL.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      // 1. Check local DB status first
      const localRes = await axios.get(
        `${BASE_URL}/api/payment/deposit/status`,
        {
          params: { mchOrderNo: orderNo },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!mountedRef.current) return;

      if (localRes.data?.success) {
        const dep = localRes.data.data;
        setDeposit(dep);

        if (dep.status === "completed") {
          setStatus("completed");
          clearInterval(pollRef.current);
          return;
        }

        if (dep.status === "failed") {
          setStatus("failed");
          clearInterval(pollRef.current);
          return;
        }

        if (dep.status === "timeout") {
          setStatus("timeout");
          clearInterval(pollRef.current);
          return;
        }
      }

      // 2. If still pending — query gateway directly
      const mchId = import.meta.env.VITE_MCH_ID;
      if (mchId) {
        const queryRes = await axios.post(
          `${BASE_URL}/api/payment/order/query`,
          { mchId, mchOrderNo: orderNo },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        if (!mountedRef.current) return;

        if (queryRes.data?.success) {
          setGatewayData(queryRes.data.data);

          const gwStatus = queryRes.data.data?.data?.status;
          if (gwStatus === 1) setStatus("completed");
          else if (gwStatus === 3) setStatus("timeout");
          else if (gwStatus === 11) setStatus("failed");
          else setStatus("pending");
        }
      } else {
        setStatus("pending");
      }

      setPollCount((c) => c + 1);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error("Status fetch error:", err);
      if (err.response?.status === 404) {
        setStatus("not_found");
        setError("Order not found in our system.");
      } else {
        setStatus("pending");
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchStatus();

    // Poll every 5 seconds for up to 2 minutes
    pollRef.current = setInterval(() => {
      if (pollCount >= 24) {
        clearInterval(pollRef.current);
        return;
      }
      fetchStatus();
    }, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(pollRef.current);
    };
  }, [orderNo]);

  // Stop polling when resolved
  useEffect(() => {
    if (["completed", "failed", "not_found"].includes(status)) {
      clearInterval(pollRef.current);
    }
  }, [status]);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.loading;
  const Icon = cfg.icon;

  const displayAmount =
    deposit?.realAmount ?? deposit?.amount ?? gatewayData?.data?.amount ?? null;
  const displayIncome = deposit?.income ?? null;
  const displayUtr = deposit?.utr ?? gatewayData?.data?.utr ?? null;
  const displayTime =
    deposit?.paySuccessTime ?? gatewayData?.data?.paySuccessTime ?? null;

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${cfg.bg} flex items-center justify-center p-4 transition-all duration-700`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow orb */}
      <div
        className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-10 transition-all duration-1000"
        style={{ background: cfg.color }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

          {/* Top color strip */}
          <div
            className="h-1 w-full transition-all duration-700"
            style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }}
          />

          <div className="p-8">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-8">
              {/* Icon */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 transition-all duration-700"
                style={{
                  background: `${cfg.color}18`,
                  border: `1px solid ${cfg.color}40`,
                  boxShadow: `0 0 40px ${cfg.color}20`,
                }}
              >
                <Icon
                  size={38}
                  style={{ color: cfg.color }}
                  className={cfg.spin ? "animate-spin" : ""}
                />
              </div>

              {/* Status badge */}
              <span
                className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full border mb-3 ${cfg.badge}`}
              >
                {cfg.label}
              </span>

              {/* Amount */}
              {displayAmount !== null && (
                <div className="text-4xl font-bold text-white mt-1 tracking-tight">
                  {formatAmount(displayAmount)}
                </div>
              )}

              {/* Sub message */}
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                {status === "loading" && "Please wait while we verify your payment…"}
                {status === "completed" && "Your deposit has been credited to your account."}
                {status === "pending" && "Payment is being processed. This may take a moment."}
                {status === "timeout" && "Your payment timed out. Please contact support if amount was deducted."}
                {status === "failed" && "Your payment could not be completed. Please try again."}
                {status === "not_found" && (error || "We could not find this order.")}
              </p>
            </div>

            {/* Details card */}
            {orderNo && (
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl px-5 py-1 mb-6">
                <InfoRow
                  icon={FiHash}
                  label="Order No"
                  value={shortOrder(orderNo)}
                  copyable
                />
                {displayUtr && (
                  <InfoRow
                    icon={FiShield}
                    label="UTR"
                    value={displayUtr}
                    copyable
                  />
                )}
                {displayIncome !== null && (
                  <InfoRow
                    icon={FiDollarSign}
                    label="Credited"
                    value={formatAmount(displayIncome)}
                  />
                )}
                {displayTime && (
                  <InfoRow
                    icon={FiCalendar}
                    label="Paid At"
                    value={formatDate(displayTime)}
                  />
                )}
              </div>
            )}

            {/* Polling indicator */}
            {status === "pending" && (
              <div className="flex items-center gap-2 justify-center mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                </span>
                <span className="text-xs text-slate-400">
                  Auto-checking status… ({pollCount} checks)
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {/* Retry button — show on pending/timeout/failed */}
              {["pending", "timeout", "failed"].includes(status) && (
                <button
                  onClick={fetchStatus}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium transition-all active:scale-95"
                >
                  <FiRefreshCw size={15} />
                  Check Again
                </button>
              )}

              {/* Home button */}
              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color}88)`,
                  color: "#fff",
                  boxShadow: `0 4px 20px ${cfg.color}30`,
                }}
              >
                <FiHome size={15} />
                Back to Home
              </button>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="px-8 py-4 border-t border-white/5 flex items-center justify-center gap-2">
            <FiShield size={12} className="text-slate-500" />
            <span className="text-xs text-slate-500">
              Secured by DGPay Payment Gateway
            </span>
          </div>
        </div>

        {/* Full order no below card */}
        {orderNo && (
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-600 font-mono break-all">{orderNo}</p>
          </div>
        )}
      </div>
    </div>
  );
}