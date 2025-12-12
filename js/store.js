const STORAGE_KEY = 'dualfit_deals';

export const Store = {
    getDeals: () => {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    getDeal: (id) => {
        const deals = Store.getDeals();
        return deals.find(d => d.id === id) || null;
    },

    saveDeal: (deal) => {
        const deals = Store.getDeals();
        const index = deals.findIndex(d => d.id === deal.id);
        
        if (index >= 0) {
            deals[index] = deal;
        } else {
            deals.push(deal);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
    },

    deleteDeal: (id) => {
        const deals = Store.getDeals().filter(d => d.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
    },

    createEmptyDeal: () => {
        return {
            id: null,
            clientName: '',
            dealName: '',
            clientContact: '',
            internalContact: '',
            solution: '',
            purchaseDate: '',
            memo: '',
            discovery: {
                awareness: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
                consideration: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
                evaluation: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
                purchase: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
            },
            assessment: {
                awareness: { 
                    biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
                    tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
                    recommendations: null 
                },
                consideration: {
                    biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
                    tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
                    recommendations: null
                },
                evaluation: {
                    biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
                    tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
                    recommendations: null
                },
                purchase: {
                    biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
                    tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
                    recommendations: null
                }
            },
            solutionMapContent: {}, // Current Active Working Draft
            savedMaps: [], // Array of saved map snapshots { id, title, content, updatedAt }
            reports: [], // Saved reports from Competitive Analysis
            updatedAt: new Date().toISOString()
        };
    },

    /* --- Solution Map Architecture Helpers --- */

    getMapContent: (dealId) => {
        const deal = Store.getDeal(dealId);
        if (!deal) return {};
        // Ensure structure exists
        if (!deal.solutionMapContent || Array.isArray(deal.solutionMapContent)) {
            deal.solutionMapContent = {};
            Store.saveDeal(deal);
        }
        return JSON.parse(JSON.stringify(deal.solutionMapContent));
    },

    saveMapContent: (dealId, content) => {
        const deal = Store.getDeal(dealId);
        if (deal) {
            deal.solutionMapContent = content;
            Store.saveDeal(deal);
        }
    },

    // --- Saved Maps Management ---
    addSavedMap: (dealId, title, content) => {
        const deal = Store.getDeal(dealId);
        if (deal) {
            if (!deal.savedMaps) deal.savedMaps = [];
            deal.savedMaps.push({
                id: Date.now().toString(36),
                title,
                content: JSON.parse(JSON.stringify(content)), // Deep copy
                updatedAt: Date.now()
            });
            Store.saveDeal(deal);
        }
    },

    deleteSavedMap: (dealId, mapId) => {
        const deal = Store.getDeal(dealId);
        if (deal && deal.savedMaps) {
            deal.savedMaps = deal.savedMaps.filter(m => m.id !== mapId);
            Store.saveDeal(deal);
        }
    },

    // --- Domain/Category/Solution Actions (Working on solutionMapContent) ---

    addDomain: (dealId, name) => {
        const content = Store.getMapContent(dealId);
        if (!name || content[name]) return false;
        
        content[name] = {};
        Store.saveMapContent(dealId, content);
        return true;
    },

    renameDomain: (dealId, oldName, newName) => {
        const content = Store.getMapContent(dealId);
        if (!newName || oldName === newName) return true;
        if (content[newName]) return false;
        
        content[newName] = content[oldName];
        delete content[oldName];
        Store.saveMapContent(dealId, content);
        return true;
    },

    deleteDomain: (dealId, name) => {
        const content = Store.getMapContent(dealId);
        if (content[name]) {
            delete content[name];
            Store.saveMapContent(dealId, content);
        }
    },

    addCategory: (dealId, domain, name) => {
        const content = Store.getMapContent(dealId);
        if (!content[domain] || content[domain][name]) return false;
        
        content[domain][name] = [];
        Store.saveMapContent(dealId, content);
        return true;
    },

    renameCategory: (dealId, domain, oldName, newName) => {
        const content = Store.getMapContent(dealId);
        if (!content[domain] || !newName || content[domain][newName]) return false;

        content[domain][newName] = content[domain][oldName];
        delete content[domain][oldName];
        Store.saveMapContent(dealId, content);
        return true;
    },

    deleteCategory: (dealId, domain, name) => {
        const content = Store.getMapContent(dealId);
        if (content[domain]) {
            delete content[domain][name];
            Store.saveMapContent(dealId, content);
        }
    },

    addSolution: (dealId, domain, category, name, share, manufacturer, painPoints, note) => {
        const content = Store.getMapContent(dealId);
        const solutions = content[domain]?.[category];
        if (!solutions) return 'INVALID_TARGET';

        if (solutions.some(s => s.name === name)) return 'DUPLICATE';
        const total = solutions.reduce((sum, s) => sum + s.share, 0);
        if (total + share > 100) return 'OVERFLOW';

        solutions.push({ name, share, manufacturer, painPoints, note });
        Store.saveMapContent(dealId, content);
        return 'SUCCESS';
    },

    updateSolution: (dealId, domain, category, index, name, share, manufacturer, painPoints, note) => {
        const content = Store.getMapContent(dealId);
        const solutions = content[domain]?.[category];
        if (!solutions || !solutions[index]) return 'INVALID_INDEX';

        if (solutions[index].name !== name && solutions.some(s => s.name === name)) return 'DUPLICATE';

        const otherSum = solutions.reduce((sum, s, i) => i === index ? sum : sum + s.share, 0);
        if (otherSum + share > 100) return 'OVERFLOW';

        solutions[index] = { name, share, manufacturer, painPoints, note };
        Store.saveMapContent(dealId, content);
        return 'SUCCESS';
    },

    deleteSolution: (dealId, domain, category, index) => {
        const content = Store.getMapContent(dealId);
        if (content[domain]?.[category]) {
            content[domain][category].splice(index, 1);
            Store.saveMapContent(dealId, content);
        }
    },

    // Report Actions
    addReport: (dealId, title, contentHTML, type = 'competitive_insight') => {
        const deal = Store.getDeal(dealId);
        if (deal) {
            if (!deal.reports) deal.reports = [];
            deal.reports.push({
                id: Date.now().toString(36),
                title,
                contentHTML,
                type,
                createdAt: Date.now()
            });
            Store.saveDeal(deal);
        }
    },

    deleteReport: (dealId, reportId) => {
        const deal = Store.getDeal(dealId);
        if (deal && deal.reports) {
            deal.reports = deal.reports.filter(r => r.id !== reportId);
            Store.saveDeal(deal);
        }
    }
};