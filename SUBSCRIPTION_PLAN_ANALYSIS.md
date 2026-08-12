# Subscription Plan Selection — Code Analysis & Implementation Report

Date: 2026-08-12  
Author: Copilot (for ahmadktn)

Repository: Ikewa/onlok  — https://github.com/Ikewa/onlok

Summary
-------
You asked: allow users to select an initial subscription plan (during sign-up or first flow) instead of requiring that they can only change plan after verification from the subscription page.

I analyzed the repository and prepared this actionable report with: findings from the codebase, recommended data-model and API changes, concrete code snippets to implement, and a migration/rollout plan. I reference specific files in the repo so you (or I, in a follow-up PR) can implement the changes.

Notes about analysis coverage
-----------------------------
- I performed a code search limited to the repository; results may be incomplete (search responses are capped). To view more code search results in GitHub use: https://github.com/Ikewa/onlok/search?q=subscription&type=code

Key findings (repository pointers)
---------------------------------
- Subscription client API: frontend/src/api/subscriptions.ts
  https://github.com/Ikewa/onlok/blob/main/frontend/src/api/subscriptions.ts

- User-facing subscription pages:
  - Public pricing/checkout: frontend/src/pages/SubscriptionPage.tsx
    https://github.com/Ikewa/onlok/blob/main/frontend/src/pages/SubscriptionPage.tsx
  - Dashboard subscription management: frontend/src/pages/VendorSubscriptionPage.tsx
    https://github.com/Ikewa/onlok/blob/main/frontend/src/pages/VendorSubscriptionPage.tsx

- Register flow (multi-step): frontend/src/pages/RegisterPage.tsx
  https://github.com/Ikewa/onlok/blob/main/frontend/src/pages/RegisterPage.tsx

- Backend: subscription controller (partial): backend/controllers/subscriptionController.js
  https://github.com/Ikewa/onlok/blob/main/backend/controllers/subscriptionController.js

- Backend: payment verification and provisioning logic (webhook/process): backend/controllers/paymentController.js
  https://github.com/Ikewa/onlok/blob/main/backend/controllers/paymentController.js

- Paystack helper: backend/utils/paystackPlanService.js
  https://github.com/Ikewa/onlok/blob/main/backend/utils/paystackPlanService.js

- DB schema / auto migration includes subscriptions table: backend/config/autoMigrate.js
  https://github.com/Ikewa/onlok/blob/main/backend/config/autoMigrate.js

What the current flow shows
---------------------------
- The app currently initializes payment in SubscriptionPage.handleSubscribe via initializePayment which ultimately redirects the user to Paystack authorization (frontend). The backend verifies payments in paymentController.js and calls processSuccessfulSubscription() which provisions/updates subscriptions and badges when payment verification is complete. This implies subscriptions are created/activated only after payment verification (and verification likely also includes admin verification flow for vendor status).

- The subscriptions table exists already (autoMigrate). Its `status` enum values are: 'active','non-renewing','attention','completed','cancelled'. There is no explicit `pending` or `pending_verification` value.

Requirements implied by your request
-----------------------------------
- Let users pick an initial plan at account creation or at first use, persisting their intent, and allowing them to change plan before verification and before payment activation.
- Preserve existing billing/payment flow but record plan choice earlier so the UX shows selected plan and can later activate it when payment completes or verification finishes.

Recommended approach (summary)
------------------------------
- Add an explicit "pending" subscription creation path that stores the user's chosen plan locally immediately when they select a plan (during signup or from the pricing page), with status = `pending` or `pending_verification`.
- Keep the actual Paystack subscription/payment creation on the existing payment path (when payment is completed/verified). Use the persisted pending subscription record to reconcile and provision when payment is confirmed.
- Allow updating the pending subscription (plan changes) prior to payment/activation.
- Add a short TTL and cleanup job for stale pending subscriptions.

Why this approach
------------------
- Avoids charging users before verification/payment step completes.
- Preserves intent and improves UX (user sees their selected plan on dashboard even before activation).
- Keeps payment provider integration unchanged and uses existing processSuccessfulSubscription helper for provisioning after payment verification.

Concrete changes — data model
----------------------------
1) Add a new enum value for subscriptions.status (or create a migration to add a `state` column). Example: add `pending` or `pending_verification`.

Suggested SQL migration (run during startup or via migration flow):

```sql
-- Add a new allowed status value "pending" for subscriptions.status (MySQL example)
ALTER TABLE subscriptions MODIFY COLUMN status ENUM('pending', 'active', 'non-renewing', 'attention', 'completed', 'cancelled') DEFAULT 'pending';
```

Alternatively, add a new column `lifecycle_status` or `provision_status` to avoid modifying enum order in place.

2) (Optional) Add a `selected_plan_at` timestamp to subscriptions or users if you prefer storing intent on users.

Backend API changes
-------------------
Add endpoints to create and update pending subscriptions:

- POST /api/subscriptions
  - body: { plan: string (tier), plan_name?: string, billingCycle?: 'monthly'|'annually', amount?: number }
  - behavior: validate plan against server SIDE TIER config (not trusting client), create subscriptions row with status='pending', return subscription record.

- PATCH /api/subscriptions/:id
  - body: { plan, billingCycle, amount }
  - behavior: allow edits while status='pending' (or other non-active states) and return updated record.

- GET /api/subscriptions/me already exists; it will show the latest subscription row — ensure it returns pending records as well.

Implementation sketch (backend/controllers/subscriptionController.js additions)
```javascript
// POST /api/subscriptions
const createPendingSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tier, plan_name, billing_cycle } = req.body;

    // validate allowed tiers against SUBSCRIPTION_TIERS from paystackPlanService or APP config
    const allowed = SUBSCRIPTION_TIERS.map(t => t.key);
    if (!allowed.includes((tier||'').toLowerCase())) {
      return res.status(400).json({ message: 'Invalid plan tier' });
    }

    const amount = /* resolve amount from tier config */ 0;

    const [result] = await pool.query(
      'INSERT INTO subscriptions (user_id, tier, plan_name, billing_cycle, amount, status, created_at) VALUES (?, ?, ?, ?, ?, "pending", NOW())',
      [userId, tier, plan_name || tier, billing_cycle || 'annually', amount]
    );

    const [rows] = await pool.query('SELECT * FROM subscriptions WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create pending subscription' });
  }
};

// PATCH /api/subscriptions/:id
const updatePendingSubscription = async (req, res) => {
  const userId = req.user.id;
  const id = req.params.id;
  // fetch and ensure ownership and status==='pending' then update fields
};
```

Important: For amount and plan resolution use backend utils backend/utils/paystackPlanService.js resolveTierConfig() to maintain canonical plan definitions and amounts.

Integration with existing payment flow
-------------------------------------
- When initializePayment is called in SubscriptionPage, the client should ensure there's a pending subscription record for that user and send metadata (local subscription id) in the payment initialization request so paymentController can reconcile.

Modify initializePayment (API) to accept optional `local_subscription_id` and include it in Paystack metadata. Then in paymentController.verify you can read metadata.user_id and metadata.local_subscription_id to avoid creating duplicates.

Frontend changes
----------------
1) SubscriptionPage.tsx (pricing flow)
- Before calling initializePayment, call POST /api/subscriptions to create or update a pending subscription (if not authenticated, redirect to /register but preserve chosen plan in URL or localStorage).
- Pass returned subscription id to initializePayment so server metadata contains it.

Example change in SubscriptionPage.handleSubscribe (pseudo):
```ts
// 1. ensure pending subscription exists
const createRes = await api.post('/subscriptions', { plan: tier, billingCycle, plan_name: 'Verified Vendor' });
const localSubId = createRes.data.id;

// 2. initialize payment with metadata
const res = await initializePayment({ email: user.email, amount, plan: tier, billingCycle, metadata: { user_id: user.id, local_subscription_id: localSubId } });
```

2) RegisterPage.tsx (allow choosing plan during signup)
- Add a plan selection step (small UI) that calls the same POST /api/subscriptions after registration completes (or during registration if you want to attach to the `registerUser` call). Save returned subscription id in client state (or in user's session). If user is redirected to pricing/checkout flow immediately after register, include the local subscription id in the payment initialization.

3) VendorSubscriptionPage.tsx (dashboard)
- The GET /subscriptions/me already returns latest subscription; ensure it surfaces `pending` status and shows a CTA to complete payment/verification.

Code-level specifics & snippets
-----------------------------
- Use the existing paystackPlanService.resolveTierConfig to validate tiers and compute amount.
- When creating pending row, set status 'pending' and fill paystack_plan_code if you pre-create plan codes, but don't set paystack_subscription_code or paystack_email_token until Paystack verification completes.
- Add index on subscriptions(user_id, status) for quick lookups.

Migration and cleanup
---------------------
- Add DB migration to add `'pending'` status to enum or add a new lifecycle column.
- Add a scheduled job (cron) to delete or mark stale pending subscriptions older than 7 days.

Testing and QA
--------------
- Unit tests for new controller endpoints (create/update pending subscriptions).
- Integration test: create pending subscription, run initializePayment (sandbox), simulate Paystack webhook/payment verification, assert processSuccessfulSubscription reconciles to the existing pending row (updates status -> active and writes paystack codes).
- UI tests: sign-up with plan selection, verify pending status on dashboard; pricing flow selects plan, creates pending row and leads to payment.

Edge cases & decisions you must make
-----------------------------------
- When to create Paystack subscription: I recommend creating provider subscription only after payment verification (current flow). Do not create subscriptions on Paystack before user verification unless you have clear refund/cancellation policies.
- If a user changes plan before payment, update the pending row. If the payment metadata plan differs, reconcile by using the local_subscription_id saved in payment metadata.

Files to change (implementation checklist)
-----------------------------------------
- backend/config/autoMigrate.js — add new enum value or add new column
- backend/controllers/subscriptionController.js — add createPendingSubscription and updatePendingSubscription endpoints
- backend/routes (where subscriptions routes declared) — expose POST /api/subscriptions and PATCH /api/subscriptions/:id (not fully discovered in code search; add routes file or update existing router)
- backend/controllers/paymentController.js — ensure it reads metadata.local_subscription_id and uses it during processSuccessfulSubscription to update the pending record instead of creating new duplicate rows.
- frontend/src/pages/SubscriptionPage.tsx — ensure create pending subscription before initializePayment and include local_subscription_id in initialize call
- frontend/src/pages/RegisterPage.tsx — add optional plan selection step and POST to create pending subscription after register
- frontend/src/pages/VendorSubscriptionPage.tsx — update UI to show pending status
- frontend/src/api/subscriptions.ts — add createPendingSubscription and updatePendingSubscription helpers (client)

Next steps I can take for you
----------------------------
I can open a PR that implements the above changes. For that I need confirmation on:
- Which subscription status string to use: `pending` or `pending_verification`? I recommend `pending` for brevity.
- Whether to persist plan selection on the users table (desired_plan_id) instead of creating a subscriptions row earlier. I recommend creating a subscriptions row with status 'pending'.

If you confirm I will:
- Create DB migration (modify autoMigrate.js),
- Add backend endpoints and tests,
- Update frontend to call the new endpoints and include the local subscription id in initializePayment,
- Add a short cron/cleanup job for stale pending records.

Appendix — helpful code snippets referenced
-------------------------------------------
- Existing getMySubscription (backend/controllers/subscriptionController.js):
```javascript
// @desc    Get current user subscription and badge status
// @route   GET /api/subscriptions/me
// @access  Private
const getMySubscription = async (req, res) => {
  // ... implementation returns latest subscription row
};
```

- Existing SubscriptionPage.handleSubscribe (frontend/src/pages/SubscriptionPage.tsx):
```tsx
// inside handleSubscribe
const res = await initializePayment({
  email: user.email,
  amount: amount,
  plan: tier,
  billingCycle: billingCycle === 'annual' ? 'annually' : 'monthly',
});
if (res && res.data && res.data.authorization_url) {
  window.location.href = res.data.authorization_url;
}
```

Contact me which option you prefer (create pending subscription row vs desired_plan on users) and whether I should open a PR to implement the changes now. I can draft the PR and include the DB migration, backend endpoints, frontend changes and tests.
