// ONLOK Landing Page Interactive Logic

document.addEventListener('DOMContentLoaded', () => {
  // 1. Pricing Billing Cycle Toggle
  const billingToggleMonthly = document.getElementById('billing-monthly');
  const billingToggleAnnual = document.getElementById('billing-annual');
  const priceTier1 = document.getElementById('price-tier-1');
  const priceTier2 = document.getElementById('price-tier-2');
  const priceTier3 = document.getElementById('price-tier-3');
  const cycleLabel1 = document.getElementById('cycle-label-1');
  const cycleLabel2 = document.getElementById('cycle-label-2');
  const cycleLabel3 = document.getElementById('cycle-label-3');

  if (billingToggleMonthly && billingToggleAnnual) {
    billingToggleMonthly.addEventListener('click', () => {
      // Activate Monthly
      billingToggleMonthly.classList.add('bg-white', 'text-[#0F172A]', 'shadow-sm');
      billingToggleMonthly.classList.remove('text-[#64748B]', 'bg-transparent');
      billingToggleAnnual.classList.remove('bg-white', 'text-[#0F172A]', 'shadow-sm');
      billingToggleAnnual.classList.add('text-[#64748B]', 'bg-transparent');

      if (priceTier1) priceTier1.textContent = '₦850';
      if (priceTier2) priceTier2.textContent = '₦1,300';
      if (priceTier3) priceTier3.textContent = '₦2,150';

      if (cycleLabel1) cycleLabel1.textContent = '/month';
      if (cycleLabel2) cycleLabel2.textContent = '/month';
      if (cycleLabel3) cycleLabel3.textContent = '/month';
    });

    billingToggleAnnual.addEventListener('click', () => {
      // Activate Annual
      billingToggleAnnual.classList.add('bg-white', 'text-[#0F172A]', 'shadow-sm');
      billingToggleAnnual.classList.remove('text-[#64748B]', 'bg-transparent');
      billingToggleMonthly.classList.remove('bg-white', 'text-[#0F172A]', 'shadow-sm');
      billingToggleMonthly.classList.add('text-[#64748B]', 'bg-transparent');

      if (priceTier1) priceTier1.textContent = '₦10,000';
      if (priceTier2) priceTier2.textContent = '₦15,000';
      if (priceTier3) priceTier3.textContent = '₦25,000';

      if (cycleLabel1) cycleLabel1.textContent = '/year';
      if (cycleLabel2) cycleLabel2.textContent = '/year';
      if (cycleLabel3) cycleLabel3.textContent = '/year';
    });
  }

  // 2. FAQ Accordion Logic
  const accordionButtons = document.querySelectorAll('.accordion-header');
  accordionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.accordion-item');
      if (!item) return;

      const isActive = item.classList.contains('active');

      // Close all other items
      document.querySelectorAll('.accordion-item').forEach((i) => {
        i.classList.remove('active');
        const content = i.querySelector('.accordion-content') as HTMLElement;
        if (content) content.style.maxHeight = '0px';
      });

      // Toggle current item
      if (!isActive) {
        item.classList.add('active');
        const content = item.querySelector('.accordion-content') as HTMLElement;
        if (content) {
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      }
    });
  });

  // 3. Mobile Navigation Menu Toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
  const mobileMenuClose = document.getElementById('mobile-menu-close');

  if (mobileMenuBtn && mobileMenuDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenuDrawer.classList.remove('hidden');
    });
  }

  if (mobileMenuClose && mobileMenuDrawer) {
    mobileMenuClose.addEventListener('click', () => {
      mobileMenuDrawer.classList.add('hidden');
    });
  }

  // Close mobile menu on clicking any link inside it
  const mobileNavLinks = document.querySelectorAll('#mobile-menu-drawer a');
  mobileNavLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (mobileMenuDrawer) mobileMenuDrawer.classList.add('hidden');
    });
  });
});
