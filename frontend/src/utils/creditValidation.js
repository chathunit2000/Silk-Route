/**
 * Corporate Credit Validation Utilities
 * Silk Route Airport Services
 */

export function getTodayDateString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatCurrencyLKR(val) {
  const num = Number(val || 0);
  return `Rs. ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Validates a company's corporate credit status.
 * Returns { canProceed, isExpired, isLimitReached, remainingCredit, creditLimit, currentAmount, expiredOn, reason }
 */
export function getCompanyCreditStatus(company) {
  if (!company) {
    return {
      canProceed: false,
      isExpired: false,
      isLimitReached: false,
      remainingCredit: 0,
      creditLimit: 0,
      currentAmount: 0,
      expiredOn: null,
      reason: "No corporate client selected.",
    };
  }

  const todayStr = getTodayDateString();

  // Expiration check:
  // Normalize expired_on string (YYYY-MM-DD)
  let rawExpiredOn = company.expired_on ? String(company.expired_on).trim() : "";
  if (rawExpiredOn.includes("T")) {
    rawExpiredOn = rawExpiredOn.split("T")[0];
  } else if (rawExpiredOn.includes(" ")) {
    rawExpiredOn = rawExpiredOn.split(" ")[0];
  }

  const isInvalidDate =
    !rawExpiredOn ||
    rawExpiredOn === "0000-00-00" ||
    rawExpiredOn.startsWith("1899") ||
    rawExpiredOn.startsWith("1900") ||
    rawExpiredOn === "null";

  const cleanExpiredOn = isInvalidDate ? null : rawExpiredOn;

  const isExpired = Boolean(
    company.is_expired ||
    (cleanExpiredOn && cleanExpiredOn < todayStr)
  );

  // Remaining credit check:
  const creditLimit = Number(company.credit_limit || 0);
  const currentAmount = Number(company.current_amount || 0);
  const remainingCredit = Number(
    company.remaining_credit !== undefined
      ? company.remaining_credit
      : (creditLimit - currentAmount).toFixed(2)
  );

  const isLimitReached = Boolean(
    company.is_limit_reached ||
    creditLimit <= 0 ||
    remainingCredit <= 0
  );

  let reason = "";
  if (isExpired && isLimitReached) {
    reason = "Corporate credit limit has been reached and bank guarantee has expired.";
  } else if (isExpired) {
    reason = "Corporate bank guarantee / credit period has expired.";
  } else if (isLimitReached) {
    reason = "Corporate credit limit has been reached. No remaining credits available.";
  }

  const canProceed = !isExpired && !isLimitReached;

  return {
    canProceed,
    isExpired,
    isLimitReached,
    remainingCredit: Math.max(0, remainingCredit),
    creditLimit,
    currentAmount,
    expiredOn: cleanExpiredOn,
    reason,
  };
}
