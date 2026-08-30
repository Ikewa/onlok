const axios = require('axios');
const pool = require('../config/db');
const logger = require('./logger');

const getPaystackSecret = () => process.env.PAYSTACK_SECRET_KEY;

const SUBSCRIPTION_TIERS = {
    'tier1_monthly': {
        key: 'tier1_monthly',
        tier: 'bronze',
        plan_name: 'Verified Vendor Plan',
        amount: 850,
        interval: 'monthly',
        description: 'Monthly Verified Vendor Plan (Bronze Badge)'
    },
    'tier1_annually': {
        key: 'tier1_annually',
        tier: 'bronze',
        plan_name: 'Verified Vendor Plan',
        amount: 10000,
        interval: 'annually',
        description: 'Annual Verified Vendor Plan (Bronze Badge)'
    },
    'tier2_monthly': {
        key: 'tier2_monthly',
        tier: 'silver',
        plan_name: 'Verified Professional Plan',
        amount: 1500,
        interval: 'monthly',
        description: 'Monthly Verified Professional Plan (Silver Badge)'
    },
    'tier2_annually': {
        key: 'tier2_annually',
        tier: 'silver',
        plan_name: 'Verified Professional Plan',
        amount: 15000,
        interval: 'annually',
        description: 'Annual Verified Professional Plan (Silver Badge)'
    },
    'tier3_monthly': {
        key: 'tier3_monthly',
        tier: 'gold',
        plan_name: 'Premium Category Plan',
        amount: 2500,
        interval: 'monthly',
        description: 'Monthly Premium Category Plan (Gold Badge)'
    },
    'tier3_annually': {
        key: 'tier3_annually',
        tier: 'gold',
        plan_name: 'Premium Category Plan',
        amount: 25000,
        interval: 'annually',
        description: 'Annual Premium Category Plan (Gold Badge)'
    }
};

/**
 * Map plan tier string and billing cycle to tier object
 */
const resolveTierConfig = (planOrTierInput, billingCycle = 'annually') => {
    const inputStr = (planOrTierInput || '').toLowerCase();
    const cycleStr = (billingCycle || '').toLowerCase();
    const cycle = (cycleStr === 'monthly' || inputStr.includes('monthly')) ? 'monthly' : 'annually';

    let tierLevel = 'bronze';
    if (inputStr.includes('silver') || inputStr.includes('professional') || inputStr.includes('tier 2') || inputStr.includes('tier two')) {
        tierLevel = 'silver';
    } else if (inputStr.includes('gold') || inputStr.includes('premium') || inputStr.includes('tier 3') || inputStr.includes('tier three')) {
        tierLevel = 'gold';
    }

    const key = tierLevel === 'bronze' 
        ? (cycle === 'monthly' ? 'tier1_monthly' : 'tier1_annually')
        : tierLevel === 'silver'
        ? (cycle === 'monthly' ? 'tier2_monthly' : 'tier2_annually')
        : (cycle === 'monthly' ? 'tier3_monthly' : 'tier3_annually');

    return SUBSCRIPTION_TIERS[key];
};

/**
 * Fetch all plans from Paystack
 */
const fetchPaystackPlans = async () => {
    const secret = getPaystackSecret();
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');

    const res = await axios.get('https://api.paystack.co/plan', {
        headers: { Authorization: `Bearer ${secret}` }
    });
    return res.data?.data || [];
};

/**
 * Create a new Plan on Paystack
 */
const createPaystackPlan = async ({ name, amount, interval, description }) => {
    const secret = getPaystackSecret();
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');

    const res = await axios.post(
        'https://api.paystack.co/plan',
        {
            name,
            amount: Math.round(amount * 100),
            interval,
            description,
            currency: 'NGN'
        },
        {
            headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json'
            }
        }
    );
    return res.data?.data;
};

/**
 * Get or automatically create the Paystack plan_code for a tier & cycle
 */
const getOrCreatePlanCode = async (planOrTierInput, billingCycle = 'annually') => {
    const config = resolveTierConfig(planOrTierInput, billingCycle);
    const settingKey = `paystack_plan_${config.key}`;

    // 1. Check admin_settings table first
    const [rows] = await pool.query('SELECT setting_value FROM admin_settings WHERE setting_key = ?', [settingKey]);
    if (rows.length > 0 && rows[0].setting_value) {
        return { plan_code: rows[0].setting_value, config };
    }

    // 2. Search Paystack existing plans
    try {
        const existingPlans = await fetchPaystackPlans();
        const found = existingPlans.find(p => 
            (p.name === config.description || p.name === `${config.plan_name} (${config.interval})`) && 
            p.amount === Math.round(config.amount * 100)
        );
        if (found && found.plan_code) {
            await pool.query('REPLACE INTO admin_settings (setting_key, setting_value) VALUES (?, ?)', [settingKey, found.plan_code]);
            return { plan_code: found.plan_code, config };
        }
    } catch (err) {
        logger.warn('PaystackPlanService: Warning searching Paystack existing plans', { error: err, configKey: config.key });
    }

    // 3. Create plan on Paystack
    try {
        const created = await createPaystackPlan({
            name: `${config.plan_name} (${config.interval})`,
            amount: config.amount,
            interval: config.interval,
            description: config.description
        });
        const planCode = created.plan_code;
        await pool.query('REPLACE INTO admin_settings (setting_key, setting_value) VALUES (?, ?)', [settingKey, planCode]);
        return { plan_code: planCode, config };
    } catch (err) {
        logger.error('PaystackPlanService: Plan creation failed', { error: err, configKey: config.key });
        throw new Error(`Failed to initialize Paystack plan for ${config.plan_name}`);
    }
};

/**
 * Generate Paystack subscription card update management link
 */
const getSubscriptionManageLink = async (subscriptionCode) => {
    const secret = getPaystackSecret();
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');

    const res = await axios.get(`https://api.paystack.co/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`, {
        headers: { Authorization: `Bearer ${secret}` }
    });
    return res.data?.data?.link;
};

/**
 * Disable (cancel) a Paystack subscription
 */
const disablePaystackSubscription = async (code, token) => {
    const secret = getPaystackSecret();
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');

    const res = await axios.post(
        'https://api.paystack.co/subscription/disable',
        { code, token },
        {
            headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json'
            }
        }
    );
    return res.data;
};

/**
 * Infer plan tier, billing cycle, plan name, and amount accurately from a Paystack transaction record
 */
const inferPlanAndTierFromTransaction = (matchedTx) => {
    const rawAmount = matchedTx.amount ? Math.round(matchedTx.amount / 100) : 0;
    const metaTier = matchedTx.metadata?.tier;
    const metaCycle = matchedTx.metadata?.billing_cycle;
    const planName = matchedTx.metadata?.plan || matchedTx.plan?.name;

    // 1. Direct lookup by exact amount paid
    if (rawAmount === 850)   return { tier: 'bronze', cycle: 'monthly', planName: 'Verified Vendor Plan', amount: 850 };
    if (rawAmount === 10000) return { tier: 'bronze', cycle: 'annually', planName: 'Verified Vendor Plan', amount: 10000 };
    if (rawAmount === 1500)  return { tier: 'silver', cycle: 'monthly', planName: 'Verified Professional Plan', amount: 1500 };
    if (rawAmount === 15000) return { tier: 'silver', cycle: 'annually', planName: 'Verified Professional Plan', amount: 15000 };
    if (rawAmount === 2500)  return { tier: 'gold',   cycle: 'monthly', planName: 'Premium Category Plan', amount: 2500 };
    if (rawAmount === 25000) return { tier: 'gold',   cycle: 'annually', planName: 'Premium Category Plan', amount: 25000 };

    // 2. Fallback matching by plan interval or metadata
    const interval = (matchedTx.plan?.interval || metaCycle || 'annually').toLowerCase();
    const cycle = (interval === 'monthly' || interval.includes('month')) ? 'monthly' : 'annually';

    let tier = (metaTier || '').toLowerCase();
    if (!tier || !['bronze', 'silver', 'gold'].includes(tier)) {
        const name = (planName || '').toLowerCase();
        if (name.includes('gold') || name.includes('premium')) tier = 'gold';
        else if (name.includes('silver') || name.includes('professional')) tier = 'silver';
        else tier = 'bronze';
    }

    const resolvedName = tier === 'gold' ? 'Premium Category Plan' : tier === 'silver' ? 'Verified Professional Plan' : 'Verified Vendor Plan';
    const finalAmount = rawAmount || (tier === 'gold' ? (cycle === 'monthly' ? 2500 : 25000) : tier === 'silver' ? (cycle === 'monthly' ? 1500 : 15000) : (cycle === 'monthly' ? 850 : 10000));

    return { tier, cycle, planName: resolvedName, amount: finalAmount };
};

module.exports = {
    SUBSCRIPTION_TIERS,
    resolveTierConfig,
    getOrCreatePlanCode,
    getSubscriptionManageLink,
    disablePaystackSubscription,
    inferPlanAndTierFromTransaction
};
