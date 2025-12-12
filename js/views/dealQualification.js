import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showLoader, hideLoader, showToast } from '../utils.js';
import { ASSESSMENT_CONFIG } from '../config.js';

let currentDealId = null;
let currentStageId = null;
let pendingScoreChange = null;
let pendingSliderElement = null;

const STAGE_LABELS = {
    'awareness': '1. 인식 (Awareness)',
    'consideration': '2. 고려 (Consideration)',
    'evaluation': '3. 평가 (Evaluation)',
    'purchase': '4. 구매 (Purchase)'
};

export function renderDealQualification(container, dealId, stageId = 'awareness') {
    currentDealId = dealId;
    currentStageId = stageId;
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    let effectiveStageId = stageId;
    let isReadOnly = false;
    let titleSuffix = '';

    if (stageId === 'purchase') {
        effectiveStageId = 'evaluation';
        isReadOnly = true;
        titleSuffix = ' (조회만 가능)';
    }

    if (!deal.assessment[effectiveStageId]) {
        deal.assessment[effectiveStageId] = {
            biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
            tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
            recommendations: null,
            isCompleted: false
        };
        Store.saveDeal(deal);
    }

    const stageAssessment = deal.assessment[effectiveStageId];
    const isCompleted = stageAssessment.isCompleted || false;
    
    const bizWeightSum = getWeightSum(stageAssessment, 'biz');
    const techWeightSum = getWeightSum(stageAssessment, 'tech');

    let resultHtml = '';
    let resultContainerClass = 'hidden opacity-0 translate-y-4';
    
    if (isCompleted) {
        const scores = calculateScores(stageAssessment);
        resultHtml = renderResultContent(scores);
        resultContainerClass = ''; 
    }

    const bodyDisplayClass = isCompleted ? 'hidden' : '';
    const iconRotation = isCompleted ? 'rotate(0deg)' : 'rotate(180deg)';

    container.innerHTML = `
        <div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Deal Qualification${titleSuffix}</h2>
                <p class="text-slate-500 text-sm mt-1 flex items-center gap-2 font-medium">
                    <span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold border border-indigo-100">${STAGE_LABELS[stageId]}</span>
                    <span>딜 적합성(Fit) 평가</span>
                </p>
            </div>
            ${!isReadOnly ? `
            <div class="flex flex-col items-end">
                <div class="flex gap-3">
                    <button id="btn-refresh-ai" class="bg-white text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2">
                        <i class="fa-solid fa-wand-magic-sparkles text-xs text-indigo-500"></i> AI 추천 점수
                    </button>
                </div>
                <div id="ai-loading-indicator" class="hidden mt-2 text-xs font-bold text-indigo-600 flex items-center gap-2">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> AI 분석 중...
                </div>
            </div>
            ` : ''}
        </div>

        <div class="space-y-6 pb-10">
            <!-- Biz Fit Box -->
            <div class="card-enterprise overflow-hidden relative toggle-card">
                <div class="p-5 flex justify-between items-center bg-purple-50/30 border-b border-purple-100 cursor-pointer toggle-header select-none hover:bg-purple-50 transition-colors">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg shadow-sm border border-purple-100">
                            <i class="fa-solid fa-briefcase text-sm"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-slate-900 text-base tracking-tight">비즈니스 적합성 (Biz Fit)</h3>
                                <span id="biz-weight-display" class="text-[10px] font-bold px-2 py-0.5 rounded border ${getWeightColorClass(bizWeightSum)}">
                                    가중치: <span class="val">${bizWeightSum}</span>%
                                </span>
                            </div>
                            <p class="text-slate-500 text-xs font-medium mt-0.5">BANT (예산, 권한, 니즈, 일정)</p>
                        </div>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-white text-slate-400 flex items-center justify-center transition-all duration-300 icon-chevron border border-slate-200 shadow-sm" style="transform: ${iconRotation}">
                        <i class="fa-solid fa-chevron-up text-xs"></i>
                    </div>
                </div>
                <div class="toggle-body ${bodyDisplayClass}">
                    <div class="p-6 md:p-8 bg-white">
                        <div class="relative z-10 flex items-center justify-end gap-5 mb-6 text-xs text-slate-500 font-bold uppercase tracking-wider">
                            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-slate-200"></span> 1: 미흡</span>
                            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-slate-400"></span> 3: 보통</span>
                            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-600"></span> 5: 우수</span>
                        </div>
                        <div class="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                            ${renderScoreSection('biz', stageAssessment, isReadOnly)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tech Fit Box -->
            <div class="card-enterprise overflow-hidden relative toggle-card">
                <div class="p-5 flex justify-between items-center bg-blue-50/30 border-b border-blue-100 cursor-pointer toggle-header select-none hover:bg-blue-50 transition-colors">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg shadow-sm border border-blue-100">
                            <i class="fa-solid fa-server text-sm"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-slate-900 text-base tracking-tight">기술 적합성 (Tech Fit)</h3>
                                <span id="tech-weight-display" class="text-[10px] font-bold px-2 py-0.5 rounded border ${getWeightColorClass(techWeightSum)}">
                                    가중치: <span class="val">${techWeightSum}</span>%
                                </span>
                            </div>
                            <p class="text-slate-500 text-xs font-medium mt-0.5">요구사항, 아키텍처, 데이터, 운영</p>
                        </div>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-white text-slate-400 flex items-center justify-center transition-all duration-300 icon-chevron border border-slate-200 shadow-sm" style="transform: ${iconRotation}">
                        <i class="fa-solid fa-chevron-up text-xs"></i>
                    </div>
                </div>
                <div class="toggle-body ${bodyDisplayClass}">
                    <div class="p-6 md:p-8 bg-white">
                        <div class="relative z-10 flex items-center justify-end gap-5 mb-6 text-xs text-slate-500 font-bold uppercase tracking-wider">
                            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-slate-200"></span> 1: 미흡</span>
                            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-slate-400"></span> 3: 보통</span>
                            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-600"></span> 5: 우수</span>
                        </div>
                        <div class="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                            ${renderScoreSection('tech', stageAssessment, isReadOnly)}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- View Results Button Area -->
            <div class="flex justify-center pt-4 pb-2">
                <button id="btn-show-result" class="bg-slate-900 text-white px-8 py-3 rounded-xl hover:bg-indigo-600 text-base font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95 w-full md:w-auto justify-center">
                    <i class="fa-solid fa-square-poll-vertical"></i> 결과 보기
                </button>
            </div>
            
            <!-- Result Section -->
            <div id="assessment-result-container" class="transition-all duration-500 ease-in-out ${resultContainerClass}">
                 ${resultHtml}
            </div>
        </div>

        <!-- Score Confirmation Modal -->
        <div id="score-confirm-modal" class="fixed inset-0 z-[120] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-sm bg-white rounded-xl shadow-modal p-8 animate-modal-in text-center border border-slate-200">
                <div class="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5 text-amber-500 border border-amber-100">
                    <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                </div>
                <h3 class="text-lg font-bold mb-2 text-slate-900">점수 확인</h3>
                <p id="score-confirm-msg" class="text-slate-600 text-sm mb-8 leading-relaxed whitespace-pre-line font-medium">
                    AI 추천 점수와 차이가 큽니다.<br>이 점수로 확정하시겠습니까?
                </p>
                <div class="flex gap-3 justify-center">
                    <button type="button" class="btn-close-confirm-modal px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold transition-colors">취소</button>
                    <button type="button" id="btn-force-score" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors">확인</button>
                </div>
            </div>
        </div>
    `;

    attachEvents(deal, effectiveStageId, isReadOnly);
}

function getWeightSum(stageData, type) {
    const weights = stageData[type].weights;
    if (!weights) return 0;
    return Object.values(weights).reduce((a, b) => a + (parseInt(b) || 0), 0);
}

function getWeightColorClass(sum) {
    return sum === 100 
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
        : 'bg-red-50 border-red-200 text-red-600';
}

function renderScoreSection(type, stageData, isReadOnly) {
    const config = ASSESSMENT_CONFIG[type];
    const recs = stageData.recommendations ? stageData.recommendations[type] : null;
    const disabledAttr = isReadOnly ? 'disabled' : '';

    return config.categories.map(cat => {
        const aiCategoryData = recs ? recs[cat.id] : null;

        const itemsHtml = cat.items.map((itemLabel, idx) => {
            const itemId = `${cat.id}_${idx}`;
            const currentVal = stageData[type].scores[itemId] || 0;
            const displayVal = currentVal === 0 ? 1 : currentVal;
            
            let aiIndicator = '';
            let aiScore = null;

            if (aiCategoryData && Array.isArray(aiCategoryData) && aiCategoryData[idx]) {
                const aiItem = aiCategoryData[idx];
                aiScore = aiItem.score;
                const confMap = { 'High': '높음', 'Medium': '보통', 'Low': '낮음' };
                const confKo = confMap[aiItem.confidence] || '보통';

                aiIndicator = `
                    <div class="has-tooltip relative group inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold cursor-help border border-indigo-100 transition-colors hover:bg-indigo-100 ml-2">
                        <i class="fa-solid fa-wand-magic-sparkles text-[9px]"></i>
                        <span>${aiScore}</span>
                        <div class="tooltip text-left p-3 min-w-[240px] pointer-events-none bg-slate-800 text-white rounded-lg shadow-xl">
                            <div class="font-bold text-emerald-300 mb-1 pb-1 border-b border-slate-600 text-xs">AI 추천 점수: ${aiScore} (신뢰도: ${confKo})</div>
                            <div class="text-xs text-slate-300 leading-relaxed mt-1">${aiItem.reason}</div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="mb-6 last:mb-0">
                    <div class="flex justify-between items-center mb-2.5">
                        <div class="flex items-center">
                            <label class="text-xs font-bold text-slate-700">${itemLabel}</label>
                            ${aiIndicator}
                        </div>
                        <span class="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 min-w-[32px] text-center">${displayVal}</span>
                    </div>
                    <div class="relative h-6 flex items-center">
                        <input type="range" min="1" max="5" step="1" value="${displayVal}" 
                            class="score-slider slider-enterprise w-full h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            data-type="${type}" data-id="${itemId}" data-cat="${cat.id}" data-idx="${idx}"
                            ${disabledAttr}>
                    </div>
                    <div class="flex justify-between px-1 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>Low</span>
                        <span>High</span>
                    </div>
                </div>
            `;
        }).join('');

        const currentWeight = stageData[type].weights[cat.id] || cat.defaultWeight || 0;

        return `
            <div class="bg-slate-50/50 rounded-xl p-5 border border-slate-100 hover:border-slate-200 transition-colors">
                <div class="flex justify-between items-center mb-5 border-b border-slate-200 pb-3">
                    <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span class="w-1 h-4 bg-slate-300 rounded-full"></span>
                        ${cat.label}
                    </h4>
                    <div class="flex items-center bg-white border border-slate-200 rounded-md px-2 py-1 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all ${isReadOnly ? 'opacity-70 bg-slate-100' : ''}">
                        <span class="text-[10px] text-slate-500 font-bold mr-1.5">가중치</span>
                        <input type="number" 
                            class="weight-input w-10 text-right text-xs font-bold text-slate-900 bg-transparent border-none p-0 focus:ring-0 disabled:cursor-not-allowed" 
                            value="${currentWeight}" 
                            data-type="${type}" 
                            data-cat="${cat.id}"
                            min="0" max="100"
                            onclick="this.select()"
                            ${disabledAttr}>
                        <span class="text-[10px] text-slate-400 font-bold ml-0.5">%</span>
                    </div>
                </div>
                ${itemsHtml}
            </div>
        `;
    }).join('');
}

function attachEvents(deal, stageId, isReadOnly) {
    const sliders = document.querySelectorAll('.score-slider');
    const weightInputs = document.querySelectorAll('.weight-input');
    const modal = document.getElementById('score-confirm-modal');
    const confirmBtn = document.getElementById('btn-force-score');
    const stageAssessment = deal.assessment[stageId];
    
    document.querySelectorAll('.toggle-header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.toggle-card');
            const body = card.querySelector('.toggle-body');
            const icon = card.querySelector('.icon-chevron');
            
            body.classList.toggle('hidden');
            
            if (body.classList.contains('hidden')) {
                icon.style.transform = 'rotate(0deg)';
            } else {
                icon.style.transform = 'rotate(180deg)';
            }
        });
    });

    if (!isReadOnly) {
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                e.target.closest('div').previousElementSibling.querySelector('span:last-child').innerText = val;
            });

            slider.addEventListener('change', (e) => {
                const type = e.target.dataset.type;
                const itemId = e.target.dataset.id;
                const catId = e.target.dataset.cat;
                const idx = parseInt(e.target.dataset.idx);
                const newVal = parseInt(e.target.value);

                const aiCatData = stageAssessment.recommendations?.[type]?.[catId];
                const aiItemRec = (aiCatData && Array.isArray(aiCatData)) ? aiCatData[idx] : null;
                
                if (aiItemRec && Math.abs(newVal - aiItemRec.score) >= 2) {
                    pendingScoreChange = { type, id: itemId, val: newVal };
                    pendingSliderElement = e.target;
                    
                    const msg = document.getElementById('score-confirm-msg');
                    msg.innerHTML = `AI 추천 점수(${aiItemRec.score}점)와 차이가 큽니다.<br>${newVal}점으로 확정하시겠습니까?`;
                    
                    modal.classList.remove('hidden');
                } else {
                    stageAssessment[type].scores[itemId] = newVal;
                    Store.saveDeal(deal);
                }
            });
        });

        const updateWeightUI = (type) => {
            const sum = getWeightSum(stageAssessment, type);
            const display = document.getElementById(`${type}-weight-display`);
            if (display) {
                const valSpan = display.querySelector('.val');
                valSpan.innerText = sum;
                display.className = `text-[10px] font-bold px-2 py-0.5 rounded border ${getWeightColorClass(sum)}`;
            }
        };

        weightInputs.forEach(input => {
            const handleWeightChange = (e) => {
                const type = e.target.dataset.type;
                const catId = e.target.dataset.cat;
                let val = parseInt(e.target.value);
                
                if (isNaN(val) || val < 0) val = 0;
                if (val > 100) val = 100;
                
                e.target.value = val;
                
                if (!stageAssessment[type].weights) stageAssessment[type].weights = {};
                stageAssessment[type].weights[catId] = val;
                
                Store.saveDeal(deal);
                updateWeightUI(type);
            };
            input.addEventListener('input', handleWeightChange);
            input.addEventListener('change', handleWeightChange);
        });

        const refreshBtn = document.getElementById('btn-refresh-ai');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                generateAssessmentAI(deal, stageId);
            });
        }
    }

    const resultBtn = document.getElementById('btn-show-result');
    if (resultBtn) {
        resultBtn.addEventListener('click', () => {
            const bizSum = getWeightSum(stageAssessment, 'biz');
            const techSum = getWeightSum(stageAssessment, 'tech');

            if (bizSum !== 100) {
                showToast(`Biz Fit 가중치 합계는 100%여야 합니다. (현재: ${bizSum}%)`, 'error');
                return;
            }
            if (techSum !== 100) {
                showToast(`Tech Fit 가중치 합계는 100%여야 합니다. (현재: ${techSum}%)`, 'error');
                return;
            }

            const scores = calculateScores(stageAssessment);
            const container = document.getElementById('assessment-result-container');
            
            if (!isReadOnly) {
                stageAssessment.isCompleted = true;
                Store.saveDeal(deal);
            }

            container.innerHTML = renderResultContent(scores);

            container.classList.remove('hidden');
            setTimeout(() => {
                container.classList.remove('opacity-0', 'translate-y-4');
            }, 50);
            
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    const closeModal = () => {
        modal.classList.add('hidden');
        pendingScoreChange = null;
        pendingSliderElement = null;
    };

    modal.querySelectorAll('.btn-close-confirm-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            if (pendingScoreChange && pendingSliderElement) {
                const savedVal = stageAssessment[pendingScoreChange.type].scores[pendingScoreChange.id] || 0;
                const revertVal = savedVal === 0 ? 1 : savedVal;
                
                pendingSliderElement.value = revertVal;
                pendingSliderElement.closest('div').previousElementSibling.querySelector('span:last-child').innerText = revertVal;
            }
            closeModal();
        });
    });

    confirmBtn.addEventListener('click', () => {
        if (pendingScoreChange) {
            stageAssessment[pendingScoreChange.type].scores[pendingScoreChange.id] = pendingScoreChange.val;
            Store.saveDeal(deal);
            showToast('점수가 저장되었습니다.', 'success');
        }
        closeModal();
    });
}

function renderResultContent(scores) {
    return `
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-8 mt-4 shadow-inner">
            <h3 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <i class="fa-solid fa-square-poll-vertical text-indigo-600"></i> 결과 분석
            </h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div id="quadrant-wrapper" class="flex flex-col items-center">
                    ${renderQuadrant(scores.bizScore, scores.techScore)}
                </div>
                <div id="score-summary-wrapper" class="space-y-6">
                    <div>
                        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                            <i class="fa-solid fa-briefcase text-purple-600"></i>
                            <span class="font-bold text-slate-800 text-sm">Biz. Fit (Total: ${scores.bizScore})</span>
                        </div>
                        <div class="space-y-4">${renderScoreBars(scores.categoryScores.biz)}</div>
                    </div>
                    <div class="mt-6">
                        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                            <i class="fa-solid fa-server text-blue-600"></i>
                            <span class="font-bold text-slate-800 text-sm">Tech. Fit (Total: ${scores.techScore})</span>
                        </div>
                        <div class="space-y-4">${renderScoreBars(scores.categoryScores.tech)}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function calculateScores(stageAssessment) {
    let categoryScores = { biz: {}, tech: {} };
    let bizTotal = 0, techTotal = 0;
    let bizWeightTotal = 0, techWeightTotal = 0;

    ['biz', 'tech'].forEach(type => {
        const config = ASSESSMENT_CONFIG[type];
        config.categories.forEach(cat => {
            let catSum = 0;
            const scores = stageAssessment[type].scores;
            
            cat.items.forEach((_, idx) => {
                const val = scores[`${cat.id}_${idx}`] || 0;
                catSum += (val === 0 ? 1 : val); 
            });
            const avg = catSum / (cat.items.length || 1);
            const weights = stageAssessment[type].weights;
            const weight = (weights[cat.id] !== undefined) ? weights[cat.id] : (cat.defaultWeight || 0);
            
            categoryScores[type][cat.id] = avg;

            if(type === 'biz') {
                bizTotal += avg * weight;
                bizWeightTotal += weight;
            } else {
                techTotal += avg * weight;
                techWeightTotal += weight;
            }
        });
    });

    const finalBiz = bizWeightTotal > 0 ? Math.round((bizTotal / bizWeightTotal) * 20) : 0; 
    const finalTech = techWeightTotal > 0 ? Math.round((techTotal / techWeightTotal) * 20) : 0;

    return { bizScore: finalBiz, techScore: finalTech, categoryScores };
}

function renderQuadrant(bizScore, techScore) {
    return `
    <div class="quadrant-container w-full max-w-[400px] shadow-sm border border-slate-200 rounded-2xl">
        <div class="quadrant-bg">
            <div class="q-zone q-zone-tl"><span class="q-label-inner text-sm md:text-lg font-extrabold leading-tight normal-case">Tech. Fit 양호<br>Biz. Fit 부족</span></div>
            <div class="q-zone q-zone-tr"><span class="q-label-inner text-sm md:text-lg font-extrabold leading-tight text-emerald-600 normal-case">적합</span></div>
            <div class="q-zone q-zone-bl"><span class="q-label-inner text-sm md:text-lg font-extrabold leading-tight text-slate-400 normal-case">부적합</span></div>
            <div class="q-zone q-zone-br"><span class="q-label-inner text-sm md:text-lg font-extrabold leading-tight normal-case">Biz. Fit 양호<br>Tech. Fit 부족</span></div>
        </div>
        <div class="quadrant-line-x"></div>
        <div class="quadrant-line-y"></div>
        <div class="quadrant-dot" style="left: ${bizScore}%; bottom: ${techScore}%;">
            <div class="quadrant-dot-pulse"></div>
            <div class="quadrant-tooltip">Biz ${bizScore} / Tech ${techScore}</div>
        </div>
    </div>
    <div class="flex gap-4 mt-6 w-full max-w-[400px]">
        <div class="flex-1 bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 tracking-wide normal-case uppercase">Biz. Fit</span>
            <span class="text-xl font-bold text-slate-900">${bizScore}</span>
        </div>
        <div class="flex-1 bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 tracking-wide normal-case uppercase">Tech. Fit</span>
            <span class="text-xl font-bold text-slate-900">${techScore}</span>
        </div>
    </div>
    `;
}

function renderScoreBars(catScores) {
    if (!catScores) return '';
    const labels = {
        budget: "예산 (Budget)", authority: "권한 (Authority)", need: "니즈 (Need)", timeline: "일정 (Timeline)",
        req: "요구사항 적합성", arch: "아키텍처 호환성", data: "데이터 & 통합", ops: "운영 용이성"
    };

    return Object.entries(catScores).map(([key, score]) => {
        const pct = (score / 5) * 100;
        return `
            <div>
                <div class="flex justify-between text-xs font-bold text-slate-500 mb-2">
                    <span>${labels[key] || key}</span>
                    <span class="text-slate-900">${score.toFixed(1)} / 5.0</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div class="bg-slate-800 h-2 rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

async function generateAssessmentAI(deal, stageId) {
    const btn = document.getElementById('btn-refresh-ai');
    const indicator = document.getElementById('ai-loading-indicator');
    
    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (indicator) {
        indicator.classList.remove('hidden');
    }
    
    const currentDiscovery = deal.discovery[stageId];
    const jtbd = currentDiscovery.result ? currentDiscovery.result.jtbd : "No JTBD extracted.";
    const inputs = `Behavior: ${currentDiscovery.behavior}, Problem: ${currentDiscovery.problem}`;

    const stages = ['awareness', 'consideration', 'evaluation', 'purchase'];
    const idx = stages.indexOf(stageId);
    let historyContext = "";
    
    if (idx > 0) {
        historyContext = "Previous Stages Context:\n";
        for (let i = 0; i < idx; i++) {
            const prevStage = stages[i];
            const prevDisc = deal.discovery[prevStage];
            const prevJTBD = prevDisc.result ? prevDisc.result.jtbd : "N/A";
            historyContext += `- ${prevStage.toUpperCase()} JTBD: ${Array.isArray(prevJTBD) ? prevJTBD.join(', ') : prevJTBD}\n`;
        }
    }

    let structureHint = "";
    ['biz', 'tech'].forEach(type => {
        structureHint += `[${type.toUpperCase()}]\n`;
        ASSESSMENT_CONFIG[type].categories.forEach(cat => {
            structureHint += ` - ${cat.id}: [${cat.items.join(', ')}]\n`;
        });
    });

    const prompt = `
Role: B2B Deal Qualification Expert.
Goal: Evaluate Deal Fit (Biz & Tech) for the ${stageId.toUpperCase()} stage.
Language: Korean.

Current Stage Data (${stageId}):
- JTBD: ${JSON.stringify(jtbd)}
- Inputs: ${inputs}

${historyContext}

Evaluation Items:
${structureHint}

Task:
Calculate fit scores (1-5) specifically for the ${stageId} phase.
Refer to previous stage context to ensure scoring consistency (avoid unexplainable jumps), but prioritize current stage findings.

JSON Output Format:
{
  "biz": {
    "budget": [
       { "score": 3, "confidence": "High", "reason": "Reason..." },
       { "score": 2, "confidence": "Low", "reason": "Reason..." }
    ],
    ...
  },
  "tech": { ... }
}
`;

    try {
        const result = await callGemini(prompt);
        if (result && result.biz && result.tech) {
            deal.assessment[stageId].recommendations = result;
            Store.saveDeal(deal);
            const container = document.getElementById('tool-container');
            if (container) {
                renderDealQualification(container, deal.id, stageId);
                showToast('AI 추천 점수가 업데이트되었습니다.', 'success');
            }
        } else {
            throw new Error('Invalid AI response');
        }
    } catch (e) {
        console.error(e);
        showToast('AI 분석 업데이트 실패', 'error');
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }
}