import { renderDeals } from './views/deals.js';
import { renderDealDetails } from './views/details.js';
import { Store } from './store.js';

// DOM Elements
const appContainer = document.getElementById('app');
const backBtn = document.getElementById('nav-back-btn');

// Expose to window to avoid circular dependency issues in views
window.app = window.app || {};
window.app.navigateTo = navigateTo;

// Simple Router
export function navigateTo(view, params = {}) {
    if (!appContainer) return;
    
    if (view === 'deals') {
        backBtn.classList.add('hidden');
        appContainer.innerHTML = '';
        renderDeals(appContainer);
    } else {
        backBtn.classList.remove('hidden');
        // Clear container handled by views typically, but good to ensure
        if (view === 'details') {
            appContainer.innerHTML = '';
            renderDealDetails(appContainer, params.id, params.tab);
        }
    }
    
    window.scrollTo(0, 0);
}

// Initialization
function init() {
    if (backBtn) {
        backBtn.addEventListener('click', () => navigateTo('deals'));
    }
    const navLogo = document.getElementById('nav-logo');
    if (navLogo) {
        navLogo.addEventListener('click', () => navigateTo('deals'));
    }
    navigateTo('deals');
}

// Ensure init runs even if module loading happens after DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}