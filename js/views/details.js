import { Store } from '../store.js';
import { navigateTo } from '../app.js';
import { renderDiscovery } from './discovery.js';
import { renderDealQualification } from './dealQualification.js';
import { renderSolutionMap } from './solutionMap.js';
import { renderStrategy } from './strategy.js';
import { renderReports } from './reports.js';
import { renderCompetitiveFit } from './competitiveFit.js'; 

let currentDealId = null;

export function renderDealDetails(container, dealId, activeTab = 'overview') {
    currentDealId = dealId;
    const deal = Store.getDeal(dealId);
    if (!deal) {
        navigateTo('deals');
        return;
    }

    const html = `
        <div class="flex flex-col h-full animate-modal-in">
            <!-- Header (Always Visible) -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">${deal.dealName}</h1>
                    <div class="flex items-center gap-4 mt-2 text-sm">
                         <span class="flex items-center gap-1.5 text-slate-600 font-bold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                            <i class="fa-regular fa-building text-slate-400"></i> ${deal.clientName}
                        </span>
                        <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span class="text-slate-500 font-medium">제안 솔루션: <strong class="text-slate-700">${deal.solution || '-'}</strong></span>
                        <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span class="text-slate-500 font-medium">수주 목표: ${deal.purchaseDate || '-'}</span>
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    <div class="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                        <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        Active Deal
                    </div>
                </div>
            </div>

            <!-- Horizontal Tab Navigation (Scrollable) -->
            <div class="border-b border-slate-200 mb-8 overflow-x-auto no-scrollbar">
                <div class="flex gap-8 min-w-max px-1">
                    <button class="tab-btn pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}" data-tab="overview">
                        <i class="fa-solid fa-table-columns"></i> 대시보드
                    </button>
                    <button class="tab-btn pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'discovery' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}" data-tab="discovery">
                        <i class="fa-regular fa-compass"></i> Discovery
                    </button>
                    <button class="tab-btn pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'assessment' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}" data-tab="assessment">
                        <i class="fa-solid fa-chart-pie"></i> Deal Qual.
                    </button>
                    <button class="tab-btn pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'solution' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}" data-tab="solution">
                        <i class="fa-solid fa-map-location-dot"></i> Solution Map
                    </button>
                    <button class="tab-btn pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'strategy' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}" data-tab="strategy">
                        <i class="fa-solid fa-chess-queen"></i> Win Strategy
                    </button>
                    <button class="tab-btn pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}" data-tab="reports">
                        <i class="fa-regular fa-folder-open"></i> Reports
                    </button>
                </div>
            </div>

            <!-- Dynamic Content Area -->
            <div id="tool-container" class="flex-1 min-h-[500px]"></div>
        </div>
    `;

    container.innerHTML = html;
    
    // Render initial tab content
    renderTabContent(activeTab, dealId);

    // Tab Click Events
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Update UI
            container.querySelectorAll('.tab-btn').forEach(b => {
                b.className = 'tab-btn pb-3 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all flex items-center gap-2';
            });
            btn.className = 'tab-btn pb-3 text-sm font-bold border-b-2 border-slate-900 text-slate-900 transition-all flex items-center gap-2';
            
            renderTabContent(tab, dealId);
        });
    });
}

function renderTabContent(tab, dealId) {
    const container = document.getElementById('tool-container');
    if (!container) return;

    container.innerHTML = ''; 

    switch(tab) {
        case 'overview':
            renderDashboard(container, dealId);
            break;
        case 'discovery':
            renderDiscovery(container, dealId);
            break;
        case 'assessment':
            renderDealQualification(container, dealId);
            break;
        case 'solution':
            renderSolutionMap(container, dealId);
            break;
        case 'strategy':
            renderStrategy(container, dealId, true); 
            break;
        case 'reports':
            renderReports(container, dealId);
            break;
        default:
            renderDashboard(container, dealId);
    }
}

function renderDashboard(container, dealId) {
    const deal = Store.getDeal(dealId);
    
    // Quick calculations for dashboard summary
    const discoveryProgress = Object.values(deal.discovery).filter(s => s.frozen).length;
    const isQualDone = Object.keys(deal.assessment.awareness.biz.scores).length > 0; 
    const isStrategyReady = !!deal.strategyReport;

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- 1. Discovery Status -->
            <div class="card-enterprise p-5 bg-white border-l-4 border-l-indigo-500 flex flex-col justify-between h-full relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <i class="fa-regular fa-compass text-6xl text-indigo-900"></i>
                </div>
                <div>
                    <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Discovery Progress</h3>
                    <div class="text-2xl font-extrabold text-slate-900 flex items-baseline gap-1">
                        ${discoveryProgress} <span class="text-sm font-medium text-slate-400">/ 4 Stages</span>
                    </div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
                    <div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${discoveryProgress * 25}%"></div>
                </div>
            </div>

            <!-- 2. Deal Health (Mock Logic) -->
            <div class="card-enterprise p-5 bg-white border-l-4 border-l-emerald-500 flex flex-col justify-between h-full relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <i class="fa-solid fa-heart-pulse text-6xl text-emerald-900"></i>
                </div>
                <div>
                    <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Overall Health</h3>
                    <div class="text-2xl font-extrabold text-slate-900">Healthy</div>
                </div>
                <p class="text-xs text-slate-400 mt-4 font-medium">리스크 요인이 감지되지 않았습니다.</p>
            </div>

            <!-- 3. Key Milestone -->
            <div class="card-enterprise p-5 bg-white border-l-4 border-l-amber-500 flex flex-col justify-between h-full relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <i class="fa-regular fa-calendar-check text-6xl text-amber-900"></i>
                </div>
                <div>
                    <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Target Close</h3>
                    <div class="text-xl font-extrabold text-slate-900">${deal.purchaseDate || '미정'}</div>
                </div>
                 <p class="text-xs text-slate-400 mt-4 font-medium">수주 목표일까지 전략 수립 필요</p>
            </div>

            <!-- 4. Quick Action -->
            <div class="card-enterprise p-5 bg-slate-900 text-white flex flex-col justify-center items-center text-center h-full hover:bg-slate-800 cursor-pointer shadow-lg active:scale-95 transition-all" onclick="document.querySelector('[data-tab=strategy]').click()">
                <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3 text-yellow-300">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                <h3 class="font-bold text-sm">AI 전략 보고서 생성</h3>
                <p class="text-xs text-slate-400 mt-1">데이터 기반 승리 전략 수립</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left: Workflow Guide -->
            <div class="lg:col-span-2 space-y-8">
                <div>
                    <h3 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-route text-indigo-500"></i> Deal Workflow
                    </h3>
                    <div class="space-y-4">
                        ${renderWorkflowStep(1, 'Discovery Analysis', '고객의 현황, 문제, 니즈를 단계별로 파악합니다.', 'discovery', discoveryProgress > 0)}
                        ${renderWorkflowStep(2, 'Deal Qualification', '비즈니스 및 기술 적합성을 정량적으로 평가합니다.', 'assessment', isQualDone)}
                        ${renderWorkflowStep(3, 'Solution Mapping', '고객 아키텍처 내 솔루션 위치를 정의합니다.', 'solution', Object.keys(deal.solutionMapContent || {}).length > 0)}
                        ${renderWorkflowStep(4, 'Competitive Fit', '경쟁사 대비 강점/약점을 분석합니다. (Optional)', 'compfit', false)}
                        ${renderWorkflowStep(5, 'Win Strategy', '최종 수주를 위한 AI 전략 보고서를 생성합니다.', 'strategy', isStrategyReady)}
                    </div>
                </div>
                
                <!-- Competitive Analysis Widget Placeholder -->
                <div id="competitive-analysis-widget-area"></div>
            </div>

            <!-- Right: Activity Log / Notes -->
            <div class="lg:col-span-1">
                 <h3 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <i class="fa-regular fa-note-sticky text-slate-500"></i> Quick Notes
                </h3>
                <div class="bg-yellow-50/50 border border-yellow-200 rounded-xl p-4 min-h-[300px] shadow-sm relative">
                    <div class="absolute top-0 right-0 w-12 h-12 bg-yellow-100/50 rounded-bl-full pointer-events-none"></div>
                    <textarea class="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-sm text-slate-700 leading-relaxed placeholder-slate-400" 
                        placeholder="이 Deal에 대한 간단한 메모를 남기세요..."
                        onchange="updateMemo('${dealId}', this.value)">${deal.memo || ''}</textarea>
                </div>
            </div>
        </div>
    `;

    // Render Competitive Fit Widget inside dashboard if needed
    setTimeout(() => {
        const widgetArea = document.getElementById('competitive-analysis-widget-area');
        if(widgetArea) renderCompetitiveFit(widgetArea, dealId);
    }, 100);

    // Global helper for memo update
    window.updateMemo = (id, val) => {
        const d = Store.getDeal(id);
        if(d) {
            d.memo = val;
            Store.saveDeal(d);
        }
    };
}

function renderWorkflowStep(step, title, desc, targetTab, isDone) {
    const iconClass = isDone ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-200';
    const checkIcon = isDone ? '<i class="fa-solid fa-check"></i>' : `<span class="font-bold text-xs">${step}</span>`;
    const titleClass = isDone ? 'text-slate-900' : 'text-slate-600';
    
    // Handle 'compfit' specifically since it's not a main tab but a view inside reports or dashboard
    // For simplicity, we link it to 'reports' tab or keep it static
    let clickAction = `document.querySelector('[data-tab=${targetTab}]').click()`;
    if (targetTab === 'compfit') {
         clickAction = "document.getElementById('insight-our-product').focus()"; // Focus on the widget input
    }

    return `
        <div class="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer group" onclick="${clickAction}">
            <div class="w-8 h-8 rounded-full flex items-center justify-center border-2 ${iconClass} flex-shrink-0 transition-colors">
                ${checkIcon}
            </div>
            <div class="flex-1">
                <div class="flex justify-between items-center mb-0.5">
                    <h4 class="font-bold ${titleClass} group-hover:text-indigo-600 transition-colors">${title}</h4>
                    <i class="fa-solid fa-chevron-right text-xs text-slate-300 group-hover:text-indigo-400 transition-colors"></i>
                </div>
                <p class="text-sm text-slate-500">${desc}</p>
            </div>
        </div>
    `;
}

function updateOverviewUI(container, deal, stage) {
    const card = container.querySelector('#deal-overview-card');
    if (!card) return;

    // Logic to calculate health status (Mock Data for now)
    const stageData = deal.discovery[stage] || {};
    const isFrozen = stageData.frozen;
    const hasData = stageData.behavior || stageData.problem;
    
    let status = { text: '⚪ 시작 전', color: 'text-slate-500 bg-slate-100 border-slate-200' };
    let signal = '데이터 입력 대기';
    let action = '고객 정보 입력';
    let actionClass = 'text-slate-600 hover:text-indigo-600';

    if (isFrozen) {
        status = { text: '🟢 양호 (Good)', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
        signal = 'Discovery 완료 / 리스크 없음';
        action = 'Deal Qualification 진행';
        actionClass = 'text-emerald-600 hover:text-emerald-700 font-bold';
    } else if (hasData) {
        status = { text: '🟡 조건부 진행', color: 'text-amber-600 bg-amber-50 border-amber-100' };
        signal = 'Discovery 미완 / 리스크 감지';
        action = 'Discovery 보강 필요';
        actionClass = 'text-amber-600 hover:text-amber-700 font-bold';
    }

    card.innerHTML = `
        <div class="flex flex-col gap-3">
            <!-- 1. Status (Row) -->
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-400">Deal Status</span>
                <span class="text-xs font-bold px-2 py-0.5 rounded border ${status.color}">${status.text}</span>
            </div>

            <!-- 2. Key Signal (Stacked for readability of long text) -->
            <div>
                <span class="block text-[10px] font-bold text-slate-400 mb-1">Key Signal</span>
                <div class="text-sm font-semibold text-slate-700 flex items-center gap-2">
                     <i class="fa-solid fa-wave-square text-xs text-slate-400"></i>
                     ${signal}
                </div>
            </div>

             <!-- 3. Next Action (Row) -->
             <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-400">Next Action</span>
                <div class="text-sm cursor-pointer flex items-center gap-1 transition-colors ${actionClass}">
                     ${action} <i class="fa-solid fa-arrow-right text-[10px] mt-0.5"></i>
                </div>
            </div>
        </div>
        
        <!-- Decoration -->
        <div class="absolute -bottom-4 -right-4 w-16 h-16 bg-slate-50 rounded-full opacity-50 pointer-events-none"></div>
    `;
}