// led/shared-utils.js - Centralized utilities for the LED calculator suite
// Loaded before all other calculator scripts

// --- Debug flag ---
window.LED_DEBUG = false;

function ledLog(...args) {
    if (window.LED_DEBUG) console.log(...args);
}

// --- Product Name Constants ---
const PRODUCT_NAMES = Object.freeze({
    LED_MODULE: 'LED Module',
    MX40_PROCESSOR: 'MX-40 Pro Processor',
    DISGUISE_VX4N_BASE: 'Disguise VX4n (Base)',
    DISGUISE_VX4N_BACKUP: 'Disguise VX4n (Backup)',
    DISGUISE_RXII: 'Disguise RXII Unit',
    STYPE_TRACKING: 'Stype Tracking',
    ESTUDIO: 'Estúdio',
    EQUIPE_TECNICA: 'Equipe Técnica da Diária',
    EQUIPE_TECNICA_ALT: 'Equipe Técnica Diária'
});

// --- Currency Formatting ---

/**
 * Format a number as Brazilian currency without decimals (for sidebar prices).
 * e.g. 23680 => "R$ 23.680"
 * @param {number|string} value
 * @returns {string}
 */
function formatPrice(value) {
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
        console.warn('[formatPrice] Input value is not a number:', value);
        return 'R$ 0';
    }
    return 'R$ ' + numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Format a number as Brazilian currency with 2 decimals (for cart/proposal).
 * e.g. 23680 => "R$ 23.680,00"
 * @param {number|string} value
 * @returns {string}
 */
function formatCurrencyDetailed(value) {
    if (typeof value !== 'number') {
        value = parseFloat(value) || 0;
    }
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a number without R$ prefix (for legacy uses in led-wall.js).
 * e.g. 23680 => "23.680"
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return '0';
    return numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Parse a Brazilian currency string back to a number.
 * e.g. "R$ 23.680,00" => 23680
 * @param {string} value
 * @returns {number}
 */
function parseCurrencyString(value) {
    if (typeof value !== 'string') return 0;
    const cleanedValue = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
    const number = parseFloat(cleanedValue);
    return isNaN(number) ? 0 : number;
}

// --- Product Price Cache (singleton) ---

const ProductPriceCache = {
    _prices: null,
    _promise: null,
    _retryCount: 0,
    _maxRetries: 3,

    /**
     * Get product prices. Fetches once and caches.
     * @returns {Promise<Object>} Map of product name => price (number)
     */
    async get() {
        // Return cached prices if available
        if (this._prices && Object.keys(this._prices).length > 0) {
            return this._prices;
        }

        // If a fetch is already in progress, wait for it
        if (this._promise) {
            return this._promise;
        }

        // Start a new fetch
        this._promise = this._fetchWithRetry();
        try {
            this._prices = await this._promise;
            return this._prices;
        } finally {
            this._promise = null;
        }
    },

    /**
     * Force a refresh of the cached prices.
     * @returns {Promise<Object>}
     */
    async refresh() {
        this._prices = null;
        this._promise = null;
        this._retryCount = 0;
        return this.get();
    },

    async _fetchWithRetry() {
        while (this._retryCount < this._maxRetries) {
            try {
                this._retryCount++;
                ledLog(`[ProductPriceCache] Fetch attempt ${this._retryCount}/${this._maxRetries}`);
                const prices = await this._doFetch();
                if (prices && Object.keys(prices).length > 0) {
                    this._retryCount = 0;
                    ledLog('[ProductPriceCache] Prices loaded:', Object.keys(prices).length, 'products');
                    return prices;
                }
                throw new Error('Empty price data returned');
            } catch (error) {
                console.error(`[ProductPriceCache] Fetch attempt ${this._retryCount} failed:`, error.message);
                if (this._retryCount < this._maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, this._retryCount * 1500));
                }
            }
        }

        console.error('[ProductPriceCache] All fetch attempts failed');
        return {};
    },

    async _doFetch() {
        // Wait for Supabase library and key
        let attempts = 0;
        const maxWait = 50;
        while ((!window.supabase || !window.SUPABASE_KEY) && attempts < maxWait) {
            ledLog(`[ProductPriceCache] Waiting for Supabase... attempt ${attempts + 1}/${maxWait}`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.supabase) throw new Error('Supabase library not loaded');
        if (!window.SUPABASE_KEY) throw new Error('Supabase key not loaded');

        // Try to get existing client from auth, otherwise create a public one
        let supabaseClient = window.auth?.getSupabaseClient?.();

        if (!supabaseClient) {
            let supabaseUrl = 'https://qhhjvpsxkfjcxitpnhxi.supabase.co';
            try {
                if (window.APP_CONFIG?.current?.supabaseUrl) {
                    supabaseUrl = window.APP_CONFIG.current.supabaseUrl;
                }
            } catch (e) { /* use fallback */ }

            supabaseClient = window.supabase.createClient(supabaseUrl, window.SUPABASE_KEY);
        }

        const { data, error } = await supabaseClient
            .from('products')
            .select('name, price');

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('No products found in database');

        return data.reduce((acc, product) => {
            acc[product.name] = parseFloat(product.price);
            return acc;
        }, {});
    },

    /**
     * Get a single product price with optional default.
     * @param {string} productName
     * @param {number} defaultValue
     * @returns {number}
     */
    getPrice(productName, defaultValue = 0) {
        if (!this._prices) return defaultValue;
        const price = this._prices[productName];
        if (price === undefined) {
            // Try the alternate name for Equipe Técnica
            if (productName === PRODUCT_NAMES.EQUIPE_TECNICA) {
                const alt = this._prices[PRODUCT_NAMES.EQUIPE_TECNICA_ALT];
                if (alt !== undefined) return alt;
            }
            return defaultValue;
        }
        return price;
    },

    /**
     * Check if prices are loaded.
     * @returns {boolean}
     */
    isLoaded() {
        return this._prices !== null && Object.keys(this._prices).length > 0;
    }
};

// --- Helper functions for DOM value extraction ---

function getTextContentById(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.textContent?.trim() : null;
}

function getValueOrTextById(id) {
    const element = document.getElementById(id);
    if (!element) return '';
    const value = (element.value !== undefined ? element.value : element.textContent) || '';
    return value.trim();
}

function getNumberById(id) {
    const value = getValueOrTextById(id);
    const cleanedValue = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
    const number = parseFloat(cleanedValue);
    return isNaN(number) ? 0 : number;
}

function getIntegerById(id) {
    const value = getValueOrTextById(id);
    const integer = parseInt(value.replace(/\D/g, ''), 10);
    return isNaN(integer) ? 0 : integer;
}

// Expose on window for global access
window.PRODUCT_NAMES = PRODUCT_NAMES;
window.ProductPriceCache = ProductPriceCache;
window.formatPrice = formatPrice;
window.formatCurrencyDetailed = formatCurrencyDetailed;
window.formatNumber = formatNumber;
window.parseCurrencyString = parseCurrencyString;
window.ledLog = ledLog;
window.getTextContentById = getTextContentById;
window.getValueOrTextById = getValueOrTextById;
window.getNumberById = getNumberById;
window.getIntegerById = getIntegerById;

console.log('[shared-utils.js] Shared utilities loaded');
