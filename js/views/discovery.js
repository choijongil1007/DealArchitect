import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showToast, setButtonLoading } from '../utils.js';
import { DISCOVERY_STAGES } from '../config.js';

let currentDealId = null;

export function renderDiscovery(container, dealId, targetStage = null) {
    currentDealId = dealId;
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    let stagesToRender = [...DISCOVERY_STAGES];
    
    if (targetStage) {
        const targetIndex = DISCOVERY_STAGES.findIndex(s => s.id === targetStage);
        if (targetIndex !== -1) {
            stagesToRender = stagesToRender.slice(0, targetIndex + 1).reverse();
        }
    }

    container.innerHTML = `
        <div class="mb-8 border-b border-slate-200 pb-5">
            <h2 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">Discovery Analysis</h2>
            <p class="text-slate-500 text-base font-medium">단계별 고객 여정 분석</p>
        </div>
        <div class="space-y-6" id="stages-container">
            ${stagesToRender.map((stage, index) => {
                const isExpanded = (targetStage && stage.id === targetStage) || (!targetStage && index === 0);
                
                let stageData = deal.discovery[stage.id];
                let isReadOnly = false;

                if (stage.id === 'purchase') {
                    stageData = deal.discovery['evaluation']; // Use evaluation data
                    isReadOnly = true;
                }

                return renderStage(stage, stageData, isExpanded, isReadOnly);
            }).join('')}
        </div>
    `;

    attachEvents(deal);
}

function renderStage(stageConfig, data, isExpanded = false, isReadOnly = false) {
    if (!data) {
        data = { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false };
    }

    const isStale = !data.frozen && data.result; 

    let statusHtml = '<span class="text-xs text-slate-400 font-bold mt-0.5 block flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-full"><i class="fa-regular fa-circle"></i> 입력 대기</span>';
    if (data.frozen) {
        statusHtml = '<span class="text-xs text-emerald-600 font-bold flex items-center gap-1.5 mt-0.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><i class="fa-solid fa-circle-check"></i> 분석 완료</span>';
    }

    if (isReadOnly) {
        statusHtml = '<span class="text-xs text-indigo-600 font-bold flex items-center gap-1.5 mt-0.5 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"><i class="fa-solid fa-lock"></i> 조회 전용</span>';
    }

    const staleAlert = (isStale && !isReadOnly) ? `
        <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-amber-800 text-sm mb-6">
            <i class="fa-solid fa-triangle-exclamation mt-0.5 text-amber-500"></i>
            <div>
                <strong class="font-bold block mb-0.5">입력 데이터 변경됨</strong>
                최신 입력을 반영하려면 인사이트를 재생성하세요.
            </div>
        </div>
    ` : '';

    const btnText = data.result ? '인사이트 재생성' : '인사이트 생성';
    const resultHtml = data.result ? renderResult(data.result, isStale) : '';
    const resultClass = (!data.result && !isStale) ? 'hidden' : '';

    const colorMap = {
        'awareness': 'rose',
        'consideration': 'amber',
        'evaluation': 'sky',
        'purchase': 'emerald'
    };
    const color = colorMap[stageConfig.id] || 'slate';

    const contentClass = isExpanded ? '' : 'hidden';
    const iconRotation = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';

    return `
        <div class="card-enterprise stage-card overflow-hidden group" data-stage="${stageConfig.id}">
            <!-- Header -->
            <div class="p-5 flex justify-between items-center cursor-pointer toggle-header select-none bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-transparent hover:border-slate-200">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm border border-${color}-100 ${stageConfig.iconStyle.replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'text-opacity-90 text-')}">
                        <i class="fa-solid ${getIconForStage(stageConfig.id)} text-lg"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 text-lg tracking-tight">${stageConfig.label.split('. ')[1]}</h3>
                        <div class="mt-1">${statusHtml}</div>
                    </div>
                </div>
                <div class="w-8 h-8 rounded-lg bg-white text-slate-400 flex items-center justify-center transition-all duration-300 icon-chevron border border-slate-200 group-hover:border-slate-300 group-hover:text-slate-600 shadow-sm" style="transform: ${iconRotation}">
                    <i class="fa-solid fa-chevron-down text-xs"></i>
                </div>
            </div>
            
            <div class="${contentClass} toggle-content border-t border-slate-100 bg-white">
                <div class="p-6 md:p-8">
                    ${staleAlert}

                    <!-- Input Area -->
                    <div class="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-inner mb-8">
                        <h4 class="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wide">
                            <i class="fa-regular fa-pen-to-square"></i> Discovery Inputs
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                            ${renderInput('고객 행동', 'behavior', data.behavior, stageConfig.id, '고객이 하는 행동', isReadOnly)}
                            ${renderInput('고객 감정', 'emotion', data.emotion, stageConfig.id, '고객이 느끼는 감정과 그 이유', isReadOnly)}
                            ${renderInput('고객 접점', 'touchpoint', data.touchpoint, stageConfig.id, '고객이 정보를 수집하는 채널', isReadOnly)}
                            ${renderInput('고객 문제', 'problem', data.problem, stageConfig.id, '고객의 Pain Point', isReadOnly)}
                        </div>
                        
                        ${!isReadOnly ? `
                        <div class="flex justify-end pt-6 mt-4 border-t border-slate-200">
                             <button class="btn-analyze bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-600 transition-all text-sm font-bold shadow-md flex items-center gap-2 active:scale-95 justify-center min-w-[160px]">
                                <i class="fa-solid fa-wand-magic-sparkles text-yellow-300 text-xs"></i> 
                                ${btnText}
                             </button>
                        </div>
                        ` : ''}
                    </div>

                    <div class="result-area transition-all duration-500 ${resultClass}">
                        ${resultHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getIconForStage(id) {
    switch(id) {
        case 'awareness': return 'fa-eye';
        case 'consideration': return 'fa-scale-balanced';
        case 'evaluation': return 'fa-magnifying-glass-chart';
        case 'purchase': return 'fa-file-signature';
        default: return 'fa-circle';
    }
}

function renderInput(label, key, value, stageId, placeholder, isReadOnly) {
    const disabledAttr = isReadOnly ? 'disabled' : '';
    const readOnlyClass = isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 focus:bg-white';

    return `
        <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 block uppercase tracking-wide ml-1">${label}</label>
            <textarea 
                class="input-enterprise w-full min-h-[100px] resize-none leading-relaxed text-sm p-4 shadow-sm ${readOnlyClass}"
                data-stage="${stageId}" 
                data-key="${key}"
                placeholder="${placeholder}"
                ${disabledAttr}
            >${value || ''}</textarea>
        </div>
    `;
}

function renderSkeleton() {
    return `
        <div class="space-y-6 animate-pulse pt-2">
            <div class="flex items-center gap-3 justify-center mb-8">
                 <div class="h-px bg-slate-200 flex-1"></div>
                 <span class="text-xs font-bold text-slate-500 tracking-wider uppercase bg-white px-3 py-1 rounded-full border border-slate-200">AI Analysis in Progress</span>
                 <div class="h-px bg-slate-200 flex-1"></div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="h-48 rounded-2xl bg-slate-100 border border-slate-200"></div>
                <div class="h-48 rounded-2xl bg-slate-100 border border-slate-200"></div>
            </div>
            <div class="h-56 rounded-2xl bg-slate-100 border border-slate-200"></div>
        </div>
    `;
}

function renderResult(result, isStale) {
    const opacity = isStale ? 'opacity-50 grayscale-[0.5]' : 'opacity-100';
    
    // 1. Handle String Response
    if (typeof result === 'string') {
        return `
            <div class="${opacity} transition-all duration-500">
                <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                    ${result.replace(/<br>/g, '\n')} 
                </div>
            </div>
        `;
    }

    if (typeof result !== 'object' || result === null) {
        return `<div class="bg-red-50 p-4 rounded-xl text-sm text-red-600 border border-red-200 font-medium">Parse Error: Invalid result format.</div>`;
    }

    const renderListItems = (inputData) => {
        let items = [];
        if (Array.isArray(inputData)) {
            items = inputData;
        } else if (typeof inputData === 'string') {
            items = inputData.split(/\n/).map(s => s.trim()).filter(s => s.length > 0);
        }

        if (items.length === 0) return '<li class="text-slate-400 italic text-sm">-</li>';

        return items.map(item => {
            const cleanText = item.replace(/^[-*•]\s*/, '');
            return `<li class="flex items-start gap-3">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0"></span>
                <span class="text-slate-700 text-sm leading-relaxed font-medium">${cleanText}</span>
            </li>`;
        }).join('');
    };

    const scItemsHtml = renderListItems(result.sc);
    const jtbdItemsHtml = renderListItems(result.jtbd);

    let todoItemsHtml = '<div class="text-sm text-slate-400 font-medium">생성된 액션 아이템이 없습니다.</div>';
    if (result.todo && typeof result.todo === 'object') {
        const todos = Object.entries(result.todo)
            .filter(([role]) => {
                const r = role.toLowerCase().replace(/\s+/g, '');
                return r !== 'techsupport' && r !== 'technicalsupport' && r !== '기술지원';
            });

        if (todos.length > 0) {
            todoItemsHtml = todos.map(([role, task]) => `
                <div class="flex items-start gap-3 p-3 rounded-lg bg-white/60 border border-slate-200 hover:bg-white hover:border-indigo-200 transition-colors">
                    <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 min-w-[70px] text-center mt-0.5 tracking-tight">${role}</span>
                    <span class="text-sm text-slate-700 leading-snug pt-0.5 font-medium">${task}</span>
                </div>
            `).join('');
        }
    }

    return `
        <div class="${opacity} space-y-6 transition-all duration-500">
            
            <div class="flex items-center gap-3 justify-center mb-6">
                 <div class="h-px bg-slate-200 flex-1"></div>
                 <span class="text-sm font-bold text-slate-400 bg-white px-4 uppercase tracking-widest">Analysis Result</span>
                 <div class="h-px bg-slate-200 flex-1"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- JTBD Card -->
                <div class="bg-blue-50/40 p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-blue-100/50 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
                    <h4 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 relative z-10 uppercase tracking-wide">
                        <i class="fa-solid fa-bullseye text-blue-600"></i> 고객이 하려는 일 (JTBD)
                    </h4>
                    <ul class="space-y-3 relative z-10">
                        ${jtbdItemsHtml}
                    </ul>
                </div>

                <!-- Success Criteria Card -->
                <div class="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
                    <h4 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 relative z-10 uppercase tracking-wide">
                        <i class="fa-solid fa-flag-checkered text-emerald-600"></i> 성공 기준
                    </h4>
                    <ul class="space-y-3 relative z-10">
                         ${scItemsHtml}
                    </ul>
                </div>
            </div>

            <!-- To-Do List -->
            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <i class="fa-solid fa-list-check text-slate-600"></i> 추천 액션 아이템
                </h4>
                <div class="grid grid-cols-1 gap-2">
                    ${todoItemsHtml}
                </div>
            </div>

            <!-- Evidence Summary -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 flex items-start gap-4 shadow-sm">
                <div class="w-10 h-10 rounded-full bg-slate-900 text-white flex-shrink-0 flex items-center justify-center shadow-md mt-0.5">
                    <i class="fa-solid fa-fingerprint text-sm"></i>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-slate-900 mb-1">감지된 신호</h4>
                    <p class="text-sm text-slate-600 leading-relaxed font-medium italic">"${result.evidenceSummary || '특이 신호가 감지되지 않았습니다.'}"</p>
                </div>
            </div>
        </div>
    `;
}

function attachEvents(deal) {
    document.querySelectorAll('.toggle-header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.parentElement;
            const content = card.querySelector('.toggle-content');
            const icon = card.querySelector('.icon-chevron');
            
            content.classList.toggle('hidden');
            if (content.classList.contains('hidden')) {
                icon.style.transform = 'rotate(0deg)';
                header.classList.remove('pb-0'); 
            } else {
                icon.style.transform = 'rotate(180deg)';
            }
        });
    });

    document.querySelectorAll('.input-enterprise').forEach(input => {
        if (input.disabled) return; 

        input.addEventListener('input', (e) => {
            const stageId = e.target.dataset.stage;
            const key = e.target.dataset.key;
            const val = e.target.value;

            if (stageId === 'purchase') return;

            deal.discovery[stageId][key] = val;
            
            if (deal.discovery[stageId].frozen) {
                deal.discovery[stageId].frozen = false;
                Store.saveDeal(deal);
                
                const stageCard = input.closest('.stage-card');
                const resultAreaContainer = stageCard.querySelector('.result-area');
                const resultArea = resultAreaContainer.querySelector('div'); 
                if (resultArea) {
                   resultArea.className = 'opacity-50 grayscale-[0.5] space-y-6 transition-all duration-500';
                }
            } else {
                Store.saveDeal(deal);
            }
        });
    });

    document.querySelectorAll('.btn-analyze').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const stageId = btn.dataset.stage;
            if (stageId === 'purchase') return;

            const stageData = deal.discovery[stageId];
            const card = btn.closest('.stage-card');
            const resultAreaContainer = card.querySelector('.result-area');

            if (!stageData.behavior && !stageData.problem && !stageData.emotion) {
                showToast('분석을 위해 정보를 먼저 입력해주세요.', 'error');
                return;
            }

            setButtonLoading(btn, true, "분석 중...");
            resultAreaContainer.classList.remove('hidden');
            resultAreaContainer.innerHTML = renderSkeleton();

            try {
                const contentDiv = card.querySelector('.toggle-content');
                contentDiv.classList.remove('hidden');

                const jsonStructure = `{
  "jtbd": ["Job 1 (Functional)", "Job 2 (Emotional)", "Job 3 (Social)"],
  "sc": ["Success Criteria 1", "Success Criteria 2", "Success Criteria 3"],
  "todo": {
    "Presales": "Specific action item",
    "Sales": "Specific action item",
    "Marketing": "Specific action item",
    "CSM": "Specific action item"
  },
  "evidenceSummary": "A concise summary (1-2 sentences) of the key pain points, budget signals, and urgency detected in this stage."
}`;

                const prompt = `
Role: B2B Sales Expert.
Goal: Analyze customer inputs and extract structured sales insights.
Language: Korean (Must output strictly in Korean).

Context:
- Deal: ${deal.dealName} (${deal.clientName})
- Solution: ${deal.solution}
- Stage: ${stageId.toUpperCase()}

User Inputs:
- Behavior: ${stageData.behavior}
- Emotion: ${stageData.emotion}
- Touchpoint: ${stageData.touchpoint}
- Problem: ${stageData.problem}

Output Instructions:
Return a SINGLE JSON object matching this structure.
IMPORTANT:
1. "jtbd" MUST be an array of strings.
2. DO NOT include 'Technical Support' or 'TechSupport' key in 'todo'.

JSON Structure:
${jsonStructure}
`;

                const result = await callGemini(prompt);
                
                deal.discovery[stageId].result = result;
                deal.discovery[stageId].frozen = true;
                Store.saveDeal(deal);
                
                resultAreaContainer.innerHTML = renderResult(result, false);
                showToast('인사이트 생성 완료', 'success');
                
                const statusSpan = card.querySelector('.toggle-header h3').nextElementSibling;
                statusSpan.innerHTML = '<span class="text-xs text-emerald-600 font-bold flex items-center gap-1.5 mt-0.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><i class="fa-solid fa-circle-check"></i> 분석 완료</span>';

            } catch (error) {
                console.error(error);
                const msg = error.message && error.message.includes('Proxy') ? "AI Service Error" : error.message;
                showToast(msg, 'error');
                
                resultAreaContainer.innerHTML = `<div class="bg-red-50 p-4 rounded-xl text-red-600 text-sm border border-red-200">
                    <strong>분석 실패:</strong> ${error.message}<br>
                    <span class="text-xs text-red-500 mt-1 block">잠시 후 다시 시도해주세요.</span>
                </div>`;
            } finally {
                setButtonLoading(btn, false);
            }
        });
    });
}