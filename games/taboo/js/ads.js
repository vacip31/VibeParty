/* VibeTabu AdMob Reklam Yönetim Modülü - Web Portal Stub */

export let AdMob = null;
export let isAdMobInitialized = false;
export let isInterstitialPrepared = false;
export let isRewardedAdPrepared = false;

let adFreeNudgeCallback = null;

export const getAdFreeNudgeCallback = () => adFreeNudgeCallback;
export const setAdFreeNudgeCallback = (cb) => { adFreeNudgeCallback = cb; };

export const clearAndCallAdFreeNudgeCallback = () => {
    if (adFreeNudgeCallback) {
        const cb = adFreeNudgeCallback;
        adFreeNudgeCallback = null;
        cb();
    }
};

export async function initAdMob() {
    console.log('AdMob disabled in Web Portal mode.');
}

export async function preloadInterstitial() {}
export async function preloadRewardedAd() {}

export async function showInterstitialWithFrequency(callback) {
    // Web portalda reklam gösterilmez, doğrudan devam et
    if (callback) callback();
}

export async function showRewardedAd() {
    console.log('Rewarded ads are disabled on the Web Portal.');
}

export function setupAdsEventListeners(clickEvent, initAudio) {}
