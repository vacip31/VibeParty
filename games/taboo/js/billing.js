/* VibeTabu Google Play Faturalandırma ve Satın Alma Modülü - Web Portal Stub */

export async function initBilling() {
    console.log('Google Play Billing disabled in Web Portal mode.');
    updatePremiumUI();
}

export async function purchasePremium() {
    console.log('Premium purchasing is disabled on the Web Portal.');
}

export async function restorePurchases() {
    console.log('Restoring purchases is disabled on the Web Portal.');
}

export function updatePremiumUI() {
    // Web portalda her şey zaten premium (state.isPremium = true) olduğ için UI'ı buna göre günceller
    const buyBtn = document.getElementById('btn-open-premium');
    if (buyBtn) {
        buyBtn.classList.add('hidden');
    }
}
