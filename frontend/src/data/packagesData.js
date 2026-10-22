import loungeSeatingImg from "../assets/packages/lounge_seating.jpg";
import executiveLoungeImg from "../assets/packages/executive_lounge.jpg";
import vipSofasImg from "../assets/packages/vip_sofas.jpg";

// Helper functions for localized date and datetime strings
export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDateTimeString(hoursOffset = 0) {
  const d = new Date();
  if (hoursOffset) {
    d.setHours(d.getHours() + hoursOffset);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Tiered discount rate based on number of passengers:
 * - 1 to 4 passengers: 0% discount (standard rate)
 * - 5 to 9 passengers: 5% discount
 * - 10 to 14 passengers: 10% discount
 * - 15 to 19 passengers: 15% discount
 * - 20 to 24 passengers: 20% discount
 * - 25 and above passengers: 25% discount
 */
export function getPassengerDiscountRate(paxCount) {
  const count = parseInt(paxCount, 10) || 1;
  if (count >= 25) return 0.25;
  if (count >= 20) return 0.20;
  if (count >= 15) return 0.15;
  if (count >= 10) return 0.10;
  if (count >= 5) return 0.05;
  return 0;
}

/**
 * Calculates base price, discount, and final discounted total.
 */
export function calculatePackagePricing(unitPrice, paxCount) {
  const count = parseInt(paxCount, 10) || 1;
  const price = Number(unitPrice) || 0;
  const baseTotal = price * count;
  const discountRate = getPassengerDiscountRate(count);
  const discountPercent = Math.round(discountRate * 100);
  const discountAmount = Number((baseTotal * discountRate).toFixed(2));
  const finalTotal = Number((baseTotal - discountAmount).toFixed(2));

  return {
    baseTotal,
    discountRate,
    discountPercent,
    discountAmount,
    finalTotal,
  };
}

export function isArrivalPackage(pkg) {
  if (!pkg) return false;
  return (
    pkg.category === "arrival-departure" ||
    pkg.category === "arrival" ||
    (pkg.inclusions && pkg.inclusions.some((i) => i.toLowerCase().includes("arrival")))
  );
}

export function isDeparturePackage(pkg) {
  if (!pkg) return false;
  return (
    pkg.category === "arrival-departure" ||
    pkg.category === "departure" ||
    pkg.category === "lounge" ||
    (pkg.inclusions && pkg.inclusions.some((i) => i.toLowerCase().includes("departure") || i.toLowerCase().includes("lounge")))
  );
}

export function packageHasRefreshment(pkg) {
  if (!pkg) return false;
  if (typeof pkg === "string") {
    const s = pkg.toLowerCase();
    if (s.includes("ruby")) return true;
    if (s.includes("amethyst")) return true;
    if (s.includes("topaz") && s.includes("arrival")) return true;
    return false;
  }
  const id = (pkg.id || "").toLowerCase();
  const name = (pkg.name || "").toLowerCase();
  const category = (pkg.category || "").toLowerCase();

  // Ruby Package
  if (id === "ruby" || id.includes("ruby") || name.includes("ruby")) {
    return true;
  }
  // Amethyst Package
  if (id === "amethyst" || id.includes("amethyst") || name.includes("amethyst")) {
    return true;
  }
  // Topaz Package (only for arrival)
  if (id.includes("topaz") || name.includes("topaz")) {
    return id.includes("arrival") || name.includes("arrival") || category === "arrival";
  }
  if (pkg.inclusions && Array.isArray(pkg.inclusions)) {
    if (pkg.inclusions.some((i) => i.toLowerCase().includes("refreshment"))) {
      return true;
    }
  }
  return false;
}

export const PACKAGES_DATA = [
  {
    id: "ruby",
    name: "Ruby Package",
    subtitle: "Complete VIP airport experience",
    price: 124,
    badge: "All-Inclusive",
    featured: true,
    image: loungeSeatingImg,
    category: "arrival-departure",
    inclusions: [
      "Silk Route Arrival",
      "Silk Route Departure",
      "Executive Lounge",
      "Complimentary Refreshments"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    mapDetail: "Silk Route Dedicated Pier & Lounge Area"
  },
  {
    id: "sapphire",
    name: "Sapphire Package",
    subtitle: "Fast-track departure & relaxation",
    price: 72,
    badge: "Departure + Lounge",
    image: executiveLoungeImg,
    category: "departure",
    inclusions: [
      "Silk Route Departure",
      "Executive Lounge"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    mapDetail: "Upper Departure Level Gate 8 Pier"
  },
  {
    id: "amethyst",
    name: "Amethyst Package",
    subtitle: "Arrival & departure transit bundle",
    price: 98,
    badge: "Transit Special",
    image: executiveLoungeImg,
    category: "arrival-departure",
    inclusions: [
      "Silk Route Arrival",
      "Silk Route Departure",
      "Complimentary Refreshments"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    mapDetail: "Terminal 1 Silk Route Hub"
  },
  {
    id: "topaz-arrival",
    name: "Topaz Arrival Package",
    subtitle: "Dedicated arrival assistance",
    price: 52,
    badge: "Arrival Only",
    image: vipSofasImg,
    category: "arrival",
    inclusions: [
      "Silk Route Arrival",
      "Complimentary Refreshments"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    mapDetail: "Arrival Pier Gates 1-5 & Dedicated Immigration"
  },
  {
    id: "topaz-departure",
    name: "Topaz Departure Package",
    subtitle: "Priority departure assistance",
    price: 52,
    badge: "Departure Only",
    image: loungeSeatingImg,
    category: "departure",
    inclusions: [
      "Silk Route Departure"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    mapDetail: "Departure Pier Gate 6 Dedicated Clearance"
  },
  {
    id: "garnet",
    name: "Garnet Package",
    subtitle: "Executive lounge access & hospitality",
    price: 21,
    badge: "Lounge Only",
    image: executiveLoungeImg,
    category: "lounge",
    inclusions: [
      "Executive Lounge"
    ],
    openingHours: "24 hours",
    childrenPolicy: "Children under 02 Years free of charge",
    locationNote: "Location : Pier details..",
    mapDetail: "Main Pier Executive Lounge Wing"
  }
];
