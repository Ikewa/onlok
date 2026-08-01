const axios = require('axios');

const getPaystackSecret = () => process.env.PAYSTACK_SECRET_KEY;

/**
 * Fetch list of supported banks in Nigeria (or given currency) from Paystack
 */
const getBanks = async (currency = 'NGN') => {
    const secret = getPaystackSecret();
    if (!secret) {
        throw new Error('PAYSTACK_SECRET_KEY environment variable is not configured');
    }
    const response = await axios.get(`https://api.paystack.co/bank?currency=${currency}`, {
        headers: {
            Authorization: `Bearer ${secret}`
        }
    });
    return response.data;
};

/**
 * Resolve bank account number to confirm account holder name
 */
const resolveAccountNumber = async (accountNumber, bankCode) => {
    const secret = getPaystackSecret();
    if (!secret) {
        throw new Error('PAYSTACK_SECRET_KEY environment variable is not configured');
    }
    const response = await axios.get(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
        {
            headers: {
                Authorization: `Bearer ${secret}`
            }
        }
    );
    return response.data;
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
            }
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
            }
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
    // Format amounts in kobo
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
            }
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
        }
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
