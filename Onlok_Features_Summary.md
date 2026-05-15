# Onlok Platform: Comprehensive Feature & Implementation Details

## 1. Multi-Step Vendor Registration & Onboarding
- **What it is**: A secure, comprehensive onboarding process that guides new vendors through creating an account and verifying their business.
- **How it is applied**: Built using custom React Stepper UI components (`RegisterPage`, `VerificationPage`). It includes complex form validation, interactive drag-and-drop file upload zones for business documents, and visual status indicators before final submission to the backend API.

## 2. Public Vendor Search & Discovery
- **What it is**: The main public-facing search engine (`SearchPage`, `LandingPage`) where customers can discover, filter, and verify businesses on the Onlok platform.
- **How it is applied**: Integrates a robust search bar and category pill-filter system. Connects to backend search APIs to dynamically render a grid of responsive vendor cards with instant visual verification indicators.

## 3. Dynamic Public Profiles
- **What it is**: A dedicated, public-facing landing page for every verified vendor (`PublicProfilePage`), serving as their digital storefront and proof of authenticity.
- **How it is applied**: Dynamically routes based on the vendor's unique slug/ID. Renders the vendor's verified badge, contact channels, bio, and business details fetched via REST APIs from the backend.

## 4. Vendor Dashboard & Analytics
- **What it is**: The central hub for vendors to manage their presence, view their status, and track referrals.
- **How it is applied**: A fully responsive dashboard (`DashboardPage`) constructed using a dynamic two-column Flexbox architecture. Features horizontally scrollable step trackers and live API-driven business information cards.

## 5. Live QR Code Generation
- **What it is**: A personalized QR code block linking directly to the vendor's public profile, allowing customers to easily scan and verify business authenticity in person.
- **How it is applied**: Integrated the `react-qr-code` library. The `QRCode` component renders on-the-fly using the user's unique profile link. Styled within a Material UI (MUI) card and accompanied by a fully-rounded pill button for quick sharing.

## 6. Dynamic Onlok Verified Badge
- **What it is**: A custom, high-fidelity verified vendor badge (`OnlokBadge`) that displays the user's specific Onlok ID directly onto the design.
- **How it is applied**: Built as a reusable React component that utilizes advanced SVG text paths (`<textPath>`). It calculates and maps the user's dynamic string (`vendorId`) perfectly along a curved quadratic bezier path overlaid on the gold, silver, or bronze badge graphic.

## 7. Referral & Rewards Tracking
- **What it is**: A dedicated system (`ReferralsPage`) designed to drive platform growth by making profile sharing effortless and tracking successful referrals.
- **How it is applied**: Renders dynamic referral links with `wordBreak: 'break-all'` to ensure text wrapping. Utilizes the browser's `navigator.clipboard.writeText` API for one-click copying, paired with `react-hot-toast` notifications, alongside direct WhatsApp sharing integration.

## 8. Subscription & Payment Processing
- **What it is**: A secure checkout flow allowing vendors to pay for profile updates, premium badges, or verification fees.
- **How it is applied**: Encompasses the `SubscriptionPage`, `CheckoutPage`, and `PaymentSuccessPage`. Built to handle dynamic pricing tiers and securely interface with payment gateways, managing transaction states and order confirmation UI.

## 9. Admin Management Portal
- **What it is**: A secure backend portal for Onlok administrators to manage users, review vendor verification applications, and monitor platform health.
- **How it is applied**: Implemented within protected `/admin` routes. Features a data-rich `AdminDashboard` and a detailed `AdminVerificationReview` view where admins can safely inspect uploaded business documents and execute Approve/Reject API calls.

## 10. Strict Mobile-Responsive Architecture
- **What it is**: A foundational design system ensuring the entire platform adapts seamlessly across desktop, tablet, and mobile devices without horizontal scrolling or layout breakage.
- **How it is applied**: Leverages Material UI's breakpoint system (`xs`, `sm`, `md`). Critical layout stability is achieved by applying strict CSS constraints (like `minWidth: 0`, `overflowX: 'hidden'`, and `boxSizing: 'border-box'`) to all flex containers to prevent content blowout.
