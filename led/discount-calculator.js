// led/discount-calculator.js - Progressive Discount Calculator Based on Days

/**
 * Discount table based on the provided CSV data
 * Key: number of days, Value: discount percentage
 */
const DISCOUNT_TABLE = {
    1: 0,      // 1 day = 0% discount (full price)
    2: 25.0,   // 2 days = 25% discount
    3: 30.0,   // 3 days = 30% discount
    4: 35.0,   // 4 days = 35% discount
    5: 40.0,   // 5 days = 40% discount
    6: 45.0,   // 6 days = 45% discount
    7: 50.0,   // 7 days = 50% discount
    8: 52.0,   // 8 days = 52% discount
    9: 54.0,   // 9 days = 54% discount
    10: 56.0,  // 10 days = 56% discount
    11: 58.0,  // 11 days = 58% discount
    12: 60.0,  // 12 days = 60% discount
    13: 62.0,  // 13 days = 62% discount
    14: 64.0,  // 14 days = 64% discount
    15: 66.0,  // 15 days = 66% discount
    16: 68.0,  // 16 days = 68% discount
    17: 70.0,  // 17 days = 70% discount
    18: 72.0,  // 18 days = 72% discount
    19: 73.0,  // 19 days = 73% discount
    20: 74.0,  // 20 days = 74% discount
    21: 75.0,  // 21 days = 75% discount
    22: 75.5,  // 22 days = 75.5% discount
    23: 76.0,  // 23 days = 76% discount
    24: 78.5,  // 24 days = 78.5% discount
    25: 79.0,  // 25 days = 79% discount
    26: 79.5,  // 26 days = 79.5% discount
    27: 80.0,  // 27 days = 80% discount
    28: 80.5,  // 28 days = 80.5% discount
    29: 81.0,  // 29 days = 81% discount
    30: 81.5,  // 30 days = 81.5% discount
    60: 85.0,  // 60 days = 85% discount
    90: 86.0,  // 90 days = 86% discount
    120: 90.0, // 120 days = 90% discount
    150: 91.0, // 150 days = 91% discount
    180: 92.0, // 180 days = 92% discount
    210: 92.5, // 210 days = 92.5% discount
    240: 93.0, // 240 days = 93% discount
    270: 93.5, // 270 days = 93.5% discount
    300: 94.0, // 300 days = 94% discount
    330: 94.0, // 330 days = 94% discount
    360: 93.5, // 360 days = 93.5% discount
    720: 96.0  // 720 days = 96% discount
};

/**
 * Calculate discount percentage based on number of days
 * @param {number} days - Number of days selected
 * @returns {number} Discount percentage (0-100)
 */
function calculateDiscountPercentage(days) {
    // If 1 day, return 0% discount (full price)
    if (days === 1) {
        return 0;
    }

    // Check if exact match exists in discount table
    if (DISCOUNT_TABLE.hasOwnProperty(days)) {
        return DISCOUNT_TABLE[days];
    }

    // Find the appropriate discount for days not explicitly in the table
    // Use the nearest lower day count for interpolation
    const sortedDays = Object.keys(DISCOUNT_TABLE).map(Number).sort((a, b) => a - b);
    
    let lowerBound = 1;
    let upperBound = null;
    
    for (let i = 0; i < sortedDays.length; i++) {
        if (sortedDays[i] <= days) {
            lowerBound = sortedDays[i];
        } else {
            upperBound = sortedDays[i];
            break;
        }
    }

    // If days is higher than the highest in our table, use the highest discount
    if (!upperBound) {
        return DISCOUNT_TABLE[lowerBound];
    }

    // Linear interpolation between lower and upper bounds
    const lowerDiscount = DISCOUNT_TABLE[lowerBound];
    const upperDiscount = DISCOUNT_TABLE[upperBound];
    
    const ratio = (days - lowerBound) / (upperBound - lowerBound);
    const interpolatedDiscount = lowerDiscount + (upperDiscount - lowerDiscount) * ratio;
    
    return Math.round(interpolatedDiscount * 10) / 10; // Round to 1 decimal place
}

/**
 * Apply discount to a price based on number of days
 * @param {number} fullPrice - Original price (daily rate)
 * @param {number} days - Number of days selected
 * @returns {Object} Object containing discountPercentage, discountAmount, and finalPrice
 */
function applyDayBasedDiscount(fullPrice, days) {
    const discountPercentage = calculateDiscountPercentage(days);
    const discountAmount = (fullPrice * discountPercentage) / 100;
    const discountedDailyPrice = fullPrice - discountAmount;
    const finalPrice = discountedDailyPrice * days;
    
    return {
        originalDailyPrice: fullPrice,
        discountPercentage: discountPercentage,
        discountAmount: discountAmount,
        discountedDailyPrice: discountedDailyPrice,
        days: days,
        finalPrice: finalPrice,
        hasDiscount: discountPercentage > 0
    };
}

/**
 * Get discount info for display purposes
 * @param {number} days - Number of days selected
 * @returns {Object} Object with discount information for UI display
 */
function getDiscountDisplayInfo(days) {
    const discountPercentage = calculateDiscountPercentage(days);
    
    return {
        days: days,
        discountPercentage: discountPercentage,
        hasDiscount: discountPercentage > 0,
        displayText: discountPercentage > 0 ? `${discountPercentage}% de desconto` : 'Preço integral'
    };
}

// Export functions for use in other modules
window.DiscountCalculator = {
    calculateDiscountPercentage,
    applyDayBasedDiscount,
    getDiscountDisplayInfo,
    DISCOUNT_TABLE
};

console.log('[discount-calculator.js] Discount calculator loaded successfully.');