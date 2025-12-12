import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showToast, setButtonLoading } from '../utils.js';

let currentDealId = null;

export function renderStrategy(container, dealId, isReadOnly = false) {
    currentDealId = dealId;
    const deal = Store.getDeal(dealId);
    
    if (!deal) return;

    if (deal.strategyReport) {
        renderReportView(container, deal.strategyReport, isReadOnly);
    } else {
        renderEmptyState(container, isReadOnly);
    }
}

function renderEmptyState(container, isReadOnly) {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[500px] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 animate-modal-in p-8 text-center">
            <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-slate-100">
                <i class="fa-solid fa-chess-queen text-3xl text-indigo-500"></i>
            </div>
            <h2 class="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Win Strategy</h2>
            <p class="text-slate-500 text-sm max-w-md leading-relaxed mb-8 font-medium">
                현재까지 수집된 Discovery 데이터, 적합성 평가, 솔루션 맵을 바탕으로<br>
                AI가 최적의 수주 전략 보고서를 생성합니다.
            </p>
            ${!isReadOnly ? `
                <button id="btn-create-strategy" class="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg flex items-center gap-3 active:scale-95 text-sm shadow-indigo-500/20">
                    <i class="fa-solid fa-wand-magic-sparkles text-yellow-300"></i> 전략 보고서 생성
                </button>
            ` : '<p class="text-sm text-slate-400 font-bold bg-slate-200 px-4 py-1.5 rounded-full">생성된 전략 보고서가 없습니다.</p>'}
        </div>
    `;

    if (!isReadOnly) {
        const btn = document.getElementById('btn-create-strategy');
        if(btn) btn.addEventListener('click', generateStrategy);
    }
}

function renderReportView(container, reportHtml, isReadOnly) {
    container.innerHTML = `
        <div class="animate-modal-in h-full flex flex-col">
            <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 no-print">
                <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <i class="fa-solid fa-chess-queen text-indigo-600"></i> Win Strategy Report
                </h2>
                ${!isReadOnly ? `
                    <div class="flex gap-2">
                        <button id="btn-regenerate-strategy" class="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-rotate-right"></i> 재생성
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <div class="bg-white border border-slate-200 rounded-xl p-8 lg:p-12 shadow-inner overflow-y-auto custom-scrollbar flex-1 relative">
                <!-- Report Header Decor -->
                <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <div id="strategy-content" class="prose prose-sm max-w-none text-slate-700 leading-relaxed">
                    ${reportHtml}
                </div>
            </div>
        </div>
    `;

    if (!isReadOnly) {
        const regenBtn = document.getElementById('btn-regenerate-strategy');
        if(regenBtn) regenBtn.addEventListener('click', generateStrategy);
    }
}

async function generateStrategy() {
    const btn = document.getElementById('btn-create-strategy') || document.getElementById('btn-regenerate-strategy');
    const container = document.getElementById('tool-container');
    const deal = Store.getDeal(currentDealId);

    if (btn) setButtonLoading(btn, true, "전략 수립 중...");

    // Gather Context
    const discoveryData = deal.discovery;
    const assessmentData = deal.assessment;
    const mapContent = deal.solutionMapContent || {};

    let discoverySummary = "";
    ['awareness', 'consideration', 'evaluation'].forEach(stage => {
        const d = discoveryData[stage];
        if (d && d.result) {
            discoverySummary += `[${stage.toUpperCase()}] JTBD: ${d.result.jtbd.join(', ')}\n`;
        }
    });

    let assessmentSummary = "";
    ['awareness', 'consideration', 'evaluation'].forEach(stage => {
        const a = assessmentData[stage];
        // Simplified check if assessment exists
        if (a && a.biz && a.tech) {
             // Just indicate completion
             assessmentSummary += `[${stage.toUpperCase()}] Qualification completed.\n`;
        }
    });

    const domains = Object.keys(mapContent).join(', ');

    const prompt = `
Role: Senior Enterprise Sales Strategist.
Goal: Create a comprehensive "Win Strategy Report" for a B2B software deal.
Language: Korean.
Output Format: HTML (Tailwind CSS styled).

Deal Context:
- Client: ${deal.clientName}
- Deal Name: ${deal.dealName}
- Solution: ${deal.solution}
- Target Date: ${deal.purchaseDate}

Discovery Insights:
${discoverySummary || "No detailed discovery data yet."}

Assessment Status:
${assessmentSummary || "No detailed qualification data yet."}

Solution Map Scope:
Domains involved: ${domains || "Not defined yet."}

Instructions:
Generate a professional HTML report with the following sections. Use <h2>, <h3>, <ul>, <p> tags with Tailwind CSS classes for styling (e.g., text-slate-900, font-bold, bg-slate-50, p-4, rounded-lg, etc.).

Structure:
1. Executive Summary (요약)
2. Customer Analysis (고객 분석 - Key Pain Points & Drivers)
3. Competitive Strategy (경쟁 승리 전략 - Why Us?)
4. Risk Management (리스크 및 대응 방안)
5. Action Plan (단계별 실행 계획)

Style Guide:
- Use 'text-indigo-600' for headings.
- Use 'bg-slate-50 p-4 rounded-lg border border-slate-100' for sections.
- Make it look like a formal consulting report.
`;

    try {
        const resultRaw = await callGemini(prompt);
        let reportHtml = "";

        if (typeof resultRaw === 'string') reportHtml = resultRaw;
        else if (resultRaw && resultRaw.content) reportHtml = resultRaw.content; // proxy wrapper
        else if (resultRaw && resultRaw.text) reportHtml = resultRaw.text;
        else reportHtml = JSON.stringify(resultRaw);

        // Clean markdown code blocks
        reportHtml = reportHtml.replace(/```html/g, "").replace(/```/g, "");

        deal.strategyReport = reportHtml;
        Store.saveDeal(deal);
        
        renderStrategy(container, currentDealId);
        showToast('전략 보고서가 생성되었습니다.', 'success');

    } catch (error) {
        console.error(error);
        showToast('전략 생성 실패: ' + error.message, 'error');
        if (btn) setButtonLoading(btn, false);
    }
}