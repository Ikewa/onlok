
const axios = require('axios');

const getPaystackSecret = () => process.env.PAYSTACK_SECRET_KEY;

// Curated static fallback list of major Nigerian banks (NUBAN)
const FALLBACK_BANKS_NGN = [
    { name: "Access Bank", code: "044" },
    { name: "Guaranty Trust Bank (GTBank)", code: "058" },
    { name: "Zenith Bank", code: "057" },
    { name: "First Bank of Nigeria", code: "011" },
    { name: "United Bank for Africa (UBA)", code: "033" },
    { name: "Kuda Bank", code: "50211" },
    { name: "Moniepoint MFB", code: "50515" },
    { name: "OPay Digital Services", code: "999992" },
    { name: "Palmpay", code: "999991" },
    { name: "Stanbic IBTC Bank", code: "221" },
    { name: "Sterling Bank", code: "232" },
    { name: "Wema Bank", code: "035" },
    { name: "First City Monument Bank (FCMB)", code: "214" },
    { name: "Fidelity Bank", code: "070" },
    { name: "Union Bank of Nigeria", code: "032" },
    { name: "Ecobank Nigeria", code: "050" },
    { name: "Heritage Bank", code: "030" },
    { name: "Keystone Bank", code: "082" },
    { name: "Polaris Bank", code: "076" },
    { name: "Providus Bank", code: "101" },
    { name: "Jaiz Bank", code: "301" },
    { name: "Taj Bank", code: "302" },
    { name: "VFD Microfinance Bank", code: "566" },
    { name: "Rubies MFB", code: "125" }
];

let bankCache = {
    data: null,
    timestamp: 0
};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch list of supported banks in Nigeria (or given currency) from Paystack
 * Includes in-memory caching and fallback to static bank list on DNS/network errors.
 */
const getBanks = async (currency = 'NGN') => {
    // 1. Return fresh cached data if available
    if (bankCache.data && (Date.now() - bankCache.timestamp < CACHE_TTL)) {
        return bankCache.data;
    }

    const secret = getPaystackSecret();
    if (!secret) {
        console.warn('Paystack Service Warning: PAYSTACK_SECRET_KEY missing, using fallback bank list');
        return { status: true, message: 'Banks retrieved (fallback)', data: FALLBACK_BANKS_NGN };
    }

    try {
        const response = await axios.get(`https://api.paystack.co/bank?currency=${currency}`, {
            headers: {
                Authorization: `Bearer ${secret}`
            },
            timeout: 8000
        });

        if (response.data && response.data.status && Array.isArray(response.data.data)) {
            bankCache.data = response.data;
            bankCache.timestamp = Date.now();
            return response.data;
        }
    } catch (error) {
        console.warn(`Paystack Service Warning: Bank list fetch failed (${error.code || error.message}). Using fallback list.`);
    }

    // 2. Return stale cached data if API call failed
    if (bankCache.data) {
        return bankCache.data;
    }

    // 3. Fallback static list
    return {
        status: true,
        message: 'Banks retrieved (offline fallback)',
        data: FALLBACK_BANKS_NGN
    };
};

/**
 * Resolve bank account number to confirm account holder name
 */
const resolveAccountNumber = async (accountNumber, bankCode) => {
    const secret = getPaystackSecret();
    if (!secret) {
        throw new Error('PAYSTACK_SECRET_KEY environment variable is not configured');
    }
    try {
        const response = await axios.get(
            `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
            {
                headers: {
                    Authorization: `Bearer ${secret}`
                },
                timeout: 10000
            }
        );
        return response.data;
    } catch (error) {
        if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            throw new Error('Network connection issue connecting to Paystack for account resolution. Please check internet connection.');
        }
        throw error;
    }
};

/**
 * Create a Transfer Recipient on Paystack
 */
const createTransferRecipient = async ({ name, account_number, bank_code, currency = 'NGN' }) => {
    const secret = getPaystackSecret();
    if (!secret) {
        throw new Error('PAYSTACK_SECRET_KEY environment variable is not configured');
    }
    const response = await axios.post(
        'https://api.paystack.co/transferrecipient',
        {
            type: 'nuban',
            name,
            account_number,
            bank_code,
            currency
        },
        {
            headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        }
    );
    return response.data;
};

/**
 * Initiate a single transfer request to Paystack
 */
const initiateSingleTransfer = async ({ amount, recipient, reference, reason = 'Referral Payout' }) => {
    const secret = getPaystackSecret();
    if (!secret) {
        throw new Error('PAYSTACK_SECRET_KEY environment variable is not configured');
    }
    const response = await axios.post(
        'https://api.paystack.co/transfer',
        {
            source: 'balance',
            amount: Math.round(amount * 100), // convert Naira to Kobo
            recipient,
            reference,
            reason
        },
        {
            headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        }
    );
    return response.data;
};

/**
 * Initiate a bulk transfer request to Paystack
 */
const initiateBulkTransfer = async (transfers) => {
    const secret = getPaystackSecret();
    if (!secret) {
        throw new Error('PAYSTACK_SECRET_KEY environment variable is not configured');
    }
    const formattedTransfers = transfers.map((item) => ({
        amount: Math.round(item.amount * 100),
        recipient: item.recipient,
        reference: item.reference,
        reason: item.reason || 'Referral Payout'
    }));

    const response = await axios.post(
        'https://api.paystack.co/transfer/bulk',
        {
            currency: 'NGN',
            source: 'balance',
            transfers: formattedTransfers
        },
        {
            headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        }
    );
    return response.data;
};

/**
 * Verify transfer status by reference
 */
const verifyTransfer = async (reference) => {
    const secret = getPaystackSecret();
    if (!secret) {
        throw new Error('PAYSTACK_SECRET_KEY environment variable is not configured');
    }
    const response = await axios.get(`https://api.paystack.co/transfer/verify/${encodeURIComponent(reference)}`, {
        headers: {
            Authorization: `Bearer ${secret}`
        },
        timeout: 10000
    });
    return response.data;
};

module.exports = {
    getBanks,
    resolveAccountNumber,
    createTransferRecipient,
    initiateSingleTransfer,
    initiateBulkTransfer,
    verifyTransfer
};
