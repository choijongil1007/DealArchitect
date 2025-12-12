import { Store } from '../store.js';
import { showWarningModal } from '../utils.js'; 
import { callGemini } from '../api.js';

let insightContainer = null;
let currentDealId = null;

export function renderCompetitiveFit(containerOrId, dealId) {
    if (typeof containerOrId === 'string') {
        insightContainer = document.getElementById(containerOrId);
    } else {
        insightContainer = containerOrId;
    }

    currentDealId = dealId;
    
    if (!insightContainer) {
        console.error("Competitive Fit container not found");
        return;
    }

    renderUI();
    setupSaveModal();
}

function renderUI() {
    // Default Deal context
    const deal = Store.getDeal(currentDealId);
    const solutionName = deal ? deal.solution : '';

    insightContainer.innerHTML = `
        <div class="flex flex-col gap-6 w-full max-w-full overflow-hidden animate-modal-in">
             <div class="mb-4 pb-2 border-b border-slate-200">
                <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Competitive Fit</h2>
                <p class="text-slate-500 text-sm mt-1 font-medium">경쟁 우위 분석 및 대응 전략 수립</p>
            </div>

            <!-- Input Section -->
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 class="text-lg font-bold text-slate-800 mb-4">분석 설정</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-1.5">자사 제품 (필수)</label>
                        <input type="text" id="insight-our-product" class="input-enterprise w-full" value="${solutionName}" placeholder="예: Atlassian Jira">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-1.5">경쟁사 제품 (필수)</label>
                        <input type="text" id="insight-competitor" class="input-enterprise w-full" placeholder="예: ServiceNow ITOM">
                    </div>
                </div>

                <div class="border-t border-slate-100 pt-5 mb-6">
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-bold text-slate-800">핵심 고객 요구사항</label>
                        <button id="btn-add-req" class="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
                            <i class="fa-solid fa-plus"></i> 추가
                        </button>
                    </div>
                    <p class="text-xs text-slate-400 mb-3">고객이 중요하게 생각하는 기능이나 요건을 입력하세요.</p>
                    <div id="req-input-container" class="space-y-2.5"></div>
                </div>

                <div class="flex justify-end">
                    <button id="btn-generate-insight" class="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-md shadow-indigo-500/20 active:scale-95">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> AI 경쟁 분석 실행
                    </button>
                </div>
            </div>

            <!-- Result Section -->
            <div class="flex flex-col min-h-[400px] border border-slate-100 rounded-xl bg-white shadow-inner relative w-full overflow-hidden" id="insight-result-container">
                <div class="p-8 pb-24 w-full overflow-x-hidden" id="insight-scroll-area">
                    <div id="insight-placeholder" class="flex flex-col items-center justify-center py-20 text-slate-400">
                        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                            <i class="fa-solid fa-chart-simple text-2xl"></i>
                        </div>
                        <p class="font-medium text-slate-500">분석 결과가 여기에 표시됩니다</p>
                    </div>
                    
                    <div id="insight-content" class="hidden report-content w-full prose prose-sm max-w-none text-slate-700"></div>
                </div>

                <div id="insight-loading" class="hidden absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-20 rounded-xl">
                    <div class="spinner border-indigo-600 border-t-transparent w-10 h-10 mb-3"></div>
                    <p class="text-indigo-600 font-bold animate-pulse">고객 요구사항 기반 경쟁 분석 중...</p>
                </div>

                <div id="insight-action-bar" class="hidden absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-slate-200 flex justify-end z-10 rounded-b-xl">
                    <button id="btn-save-as-report" class="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg font-bold text-sm">
                        <i class="fa-regular fa-file-lines"></i> 보고서로 저장
                    </button>
                </div>
            </div>
            
            <!-- Save Report Modal (Unique ID) -->
            <div id="modal-save-insight-report" class="fixed inset-0 z-[160] hidden flex items-center justify-center p-4">
                <div id="modal-save-insight-report-bg" class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity opacity-0"></div>
                <div id="modal-save-insight-report-panel" class="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-95 opacity-0 border border-slate-200">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">보고서 저장</h3>
                    <div class="mb-6">
                        <label class="block text-xs font-bold text-gray-500 mb-1.5 ml-1">보고서 제목</label>
                        <input type="text" id="input-insight-report-name" class="input-enterprise w-full" placeholder="예: Jira vs ServiceNow 경쟁분석">
                    </div>
                    <div class="flex gap-3 justify-end">
                        <button id="btn-cancel-save-insight-report" class="text-gray-500 hover:text-gray-700 font-medium text-sm px-3">취소</button>
                        <button id="btn-confirm-save-insight-report" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors text-sm shadow-md">저장</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    addRequirementInput("요구사항 1 (예: 기존 사내 SSO 시스템 연동 필수)");
    addRequirementInput("요구사항 2 (예: 모바일 앱 지원)");
    addRequirementInput("요구사항 3");

    const btnAddReq = document.getElementById('btn-add-req');
    if(btnAddReq) {
        btnAddReq.addEventListener('click', () => {
            const count = document.querySelectorAll('.req-input').length + 1;
            addRequirementInput(`요구사항 ${count}`);
        });
    }

    const btnGen = document.getElementById('btn-generate-insight');
    if(btnGen) btnGen.addEventListener('click', generateInsight);

    const btnSave = document.getElementById('btn-save-as-report');
    if(btnSave) btnSave.addEventListener('click', openSaveReportModal);
}

function addRequirementInput(placeholderText) {
    const container = document.getElementById('req-input-container');
    if (!container) return;

    const inputWrapper = document.createElement('div');
    inputWrapper.className = "flex items-center gap-2";
    
    const input = document.createElement('input');
    input.type = "text";
    input.className = "input-enterprise w-full req-input";
    input.placeholder = placeholderText || "추가 요구사항";
    
    const btnDel = document.createElement('button');
    btnDel.className = "p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors";
    btnDel.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
    btnDel.onclick = () => { inputWrapper.remove(); };

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(btnDel);
    container.appendChild(inputWrapper);
}

function setupSaveModal() {
    const btnCancel = document.getElementById('btn-cancel-save-insight-report');
    const btnConfirm = document.getElementById('btn-confirm-save-insight-report');
    
    if(btnCancel) btnCancel.onclick = closeSaveReportModal;
    if(btnConfirm) btnConfirm.onclick = () => {
        const input = document.getElementById('input-insight-report-name');
        const contentEl = document.getElementById('insight-content');
        
        const title = input ? input.value.trim() : "";
        const content = contentEl ? contentEl.innerHTML : "";
        
        if (title && content) {
            Store.addReport(currentDealId, title, content);
            showWarningModal("보고서가 저장되었습니다.");
            closeSaveReportModal();
        } else {
             showWarningModal("제목과 분석 내용이 필요합니다.");
        }
    };
}

function openSaveReportModal() {
    const modal = document.getElementById('modal-save-insight-report');
    const bg = document.getElementById('modal-save-insight-report-bg');
    const panel = document.getElementById('modal-save-insight-report-panel');
    const input = document.getElementById('input-insight-report-name');

    if (!modal) return;

    const ourProduct = document.getElementById('insight-our-product')?.value.trim() || "";
    const competitor = document.getElementById('insight-competitor')?.value.trim() || "";
    
    if(input) input.value = `${ourProduct} vs ${competitor} 경쟁분석`;
    
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        bg.classList.remove('opacity-0');
        panel.classList.remove('scale-95', 'opacity-0');
        panel.classList.add('scale-100', 'opacity-100');
    });
    if(input) input.focus();
}

function closeSaveReportModal() {
    const modal = document.getElementById('modal-save-insight-report');
    const bg = document.getElementById('modal-save-insight-report-bg');
    const panel = document.getElementById('modal-save-insight-report-panel');
    
    if (!modal) return;

    bg.classList.add('opacity-0');
    panel.classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function getSolutionContextString(dealId) {
    const data = Store.getMapContent(dealId);
    const lines = [];
    
    Object.entries(data).forEach(([domain, categories]) => {
        if (typeof categories !== 'object' || Array.isArray(categories)) return;

        Object.entries(categories).forEach(([category, solutions]) => {
            if (!Array.isArray(solutions)) return;
            solutions.forEach(sol => {
                const mf = sol.manufacturer ? `[${sol.manufacturer}] ` : '';
                lines.push(`- ${domain} > ${category}: ${mf}${sol.name}`);
            });
        });
    });

    if (lines.length === 0) return "No solutions defined.";
    return lines.join('\n');
}

async function generateInsight() {
    const competitor = document.getElementById('insight-competitor').value.trim();
    const ourProduct = document.getElementById('insight-our-product').value.trim();
    
    const reqInputs = document.querySelectorAll('.req-input');
    const requirements = Array.from(reqInputs).map(input => input.value.trim()).filter(val => val !== "");
    
    const requirementsString = requirements.length > 0 
        ? requirements.map((r, i) => `${i+1}. ${r}`).join('\n') 
        : "None specified.";

    const resultArea = document.getElementById('insight-content');
    const placeholder = document.getElementById('insight-placeholder');
    const loading = document.getElementById('insight-loading');
    const actionBar = document.getElementById('insight-action-bar');

    if (!competitor || !ourProduct) {
        showWarningModal("자사 제품과 경쟁사 제품명을 모두 입력해주세요.");
        return;
    }

    placeholder.classList.add('hidden');
    resultArea.classList.add('hidden');
    actionBar.classList.add('hidden');
    loading.classList.remove('hidden');
    resultArea.innerHTML = '';

    const currentMapContext = getSolutionContextString(currentDealId);
    
    const mapData = Store.getMapContent(currentDealId);
    const categoriesSet = new Set();
    Object.values(mapData).forEach(domainCats => {
        Object.keys(domainCats).forEach(cat => categoriesSet.add(cat));
    });
    const categoryListArray = Array.from(categoriesSet);
    const categoryListString = categoryListArray.length > 0 
        ? categoryListArray.join(', ') 
        : "주요 시스템(DB, API, 보안 등)";

    const prompt = `
You are an expert Solution Architect.
Perform a detailed competitive analysis comparing "**${ourProduct}**" (Our Product) and "**${competitor}**" (Competitor Product) within the context of the customer's current environment.

**Analysis Context:**
All analysis must be strictly based on compatibility and integration with the solutions **CURRENTLY REGISTERED** in the Customer's Current Architecture.
**Customer's Current Architecture:**
${currentMapContext}

**Reference Categories:**
${categoryListString}

**Key Customer Requirements:**
${requirementsString}

**Format Requirements:**
1.  **Output Format:** HTML Code (No Markdown).
2.  **Language:** Korean.
3.  **Tone:** Professional, concise. Use short noun-endings (e.g. "연동 가능함", "지원 안 됨").
4.  **Styling:** Use Tailwind CSS classes.

**Structure & Templates:**

<!-- Section 1 -->
<h2 class="text-slate-900 font-extrabold text-lg mt-12 mb-6 border-l-4 border-indigo-600 pl-4">1. 요약</h2>
<div class="text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm mb-16">
    {Executive Summary Content...}
</div>

<!-- Section 2 -->
<h2 class="text-slate-900 font-extrabold text-lg mt-12 mb-6 border-l-4 border-indigo-600 pl-4">2. 핵심 요구사항 만족도</h2>
<div class="w-full overflow-x-auto mb-16">
    <table class="w-full text-left border-collapse border border-slate-200 rounded-lg min-w-[600px] table-fixed">
        <thead class="bg-slate-100 border-b border-slate-200 font-bold text-center text-sm text-slate-700">
            <tr>
                <th class="p-3 w-[30%]">요구사항</th>
                <th class="p-3 w-[15%] text-center">${ourProduct}</th>
                <th class="p-3 w-[15%] text-center">${competitor}</th>
                <th class="p-3 w-[40%]">비고</th>
            </tr>
        </thead>
        <tbody class="text-sm">
            <!-- For each requirement -->
            <tr class="border-b border-slate-50 hover:bg-slate-50">
                <td class="p-3 font-medium text-slate-700 break-words">{Req 1}</td>
                <td class="p-3 text-center font-bold text-slate-900">{O/△/X}</td> <!-- Use specifically: ⭕, △, ❌ -->
                <td class="p-3 text-center font-bold text-slate-900">{O/△/X}</td>
                <td class="p-3 text-slate-500 break-words">{Short Remark}</td>
            </tr>
        </tbody>
    </table>
</div>

<!-- Section 3 -->
<h2 class="text-slate-900 font-extrabold text-lg mt-12 mb-6 border-l-4 border-indigo-600 pl-4">3. 고객 환경과의 통합성</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-16">
    <!-- Our Product -->
    <div class="border border-blue-200 bg-blue-50/30 rounded-xl overflow-hidden shadow-sm">
        <div class="bg-blue-100/50 px-4 py-3 border-b border-blue-200 font-bold text-blue-800 text-base text-center">${ourProduct} (자사)</div>
        <div class="p-4 space-y-3">
             <!-- Repeat for integration points -->
            <div class="grid grid-cols-[auto_1fr] items-start gap-3 p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
                <div class="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 text-sm font-extrabold border border-blue-200 leading-none">{O/△/X}</div>
                <div>
                    <div class="font-bold text-slate-700 mb-0.5">[Target Solution] 연동</div>
                    <div class="text-slate-600 text-sm leading-snug">{Short description ~함}</div>
                </div>
            </div>
        </div>
    </div>
    <!-- Competitor -->
    <div class="border border-slate-200 bg-slate-50/30 rounded-xl overflow-hidden shadow-sm">
        <div class="bg-slate-100/50 px-4 py-3 border-b border-slate-200 font-bold text-slate-700 text-base text-center">${competitor} (경쟁사)</div>
        <div class="p-4 space-y-3">
             <div class="grid grid-cols-[auto_1fr] items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                <div class="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 text-sm font-extrabold border border-slate-200 leading-none">{O/△/X}</div>
                <div>
                    <div class="font-bold text-slate-700 mb-0.5">[Target Solution] 연동</div>
                    <div class="text-slate-600 text-sm leading-snug">{Short description ~함}</div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Section 4 -->
<h2 class="text-slate-900 font-extrabold text-lg mt-12 mb-6 border-l-4 border-indigo-600 pl-4">4. 핵심 메시지</h2>
<div class="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-16">
    <!-- Repeat 3 times -->
    <div class="border border-indigo-100 bg-indigo-50/30 p-4 rounded-xl shadow-sm">
        <div class="text-indigo-700 font-bold mb-2 text-base">{Key Message Title (e.g. "Cost Efficiency")}</div>
        <div class="text-slate-700 text-sm leading-relaxed">{Message Body}</div>
    </div>
</div>

<!-- Section 5 -->
<h2 class="text-slate-900 font-extrabold text-lg mt-12 mb-6 border-l-4 border-indigo-600 pl-4">5. 대응 방안</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
    <!-- Strengths -->
    <div class="border border-blue-200 bg-blue-50/30 p-5 rounded-xl">
        <div class="font-bold text-blue-800 text-lg mb-3 border-b border-blue-200 pb-2">강점 강화</div>
        <ul class="list-disc pl-4 text-sm text-slate-700 space-y-2">
            <li>{Action item ending in ~음/임/됨}</li>
        </ul>
    </div>
    <!-- Weaknesses -->
    <div class="border border-red-200 bg-red-50/30 p-5 rounded-xl">
        <div class="font-bold text-red-800 text-lg mb-3 border-b border-red-200 pb-2">약점 보강</div>
        <ul class="list-disc pl-4 text-sm text-slate-700 space-y-2">
            <li>{Action item ending in ~음/임/됨}</li>
        </ul>
    </div>
</div>
`;

    try {
        const result = await callGemini(prompt);
        let markdownText = "";
        
        if (typeof result === 'string') markdownText = result;
        else if (result && typeof result === 'object') {
            if (result.text) markdownText = result.text;
            else if (result.content) markdownText = result.content;
            else markdownText = JSON.stringify(result);
        }

        // Cleanup markdown code blocks if any
        markdownText = markdownText.replace(/```html/g, "").replace(/```/g, "");

        if (window.marked) {
            resultArea.innerHTML = window.marked.parse(markdownText);
        } else {
            resultArea.innerText = markdownText;
        }

        loading.classList.add('hidden');
        resultArea.classList.remove('hidden');
        actionBar.classList.remove('hidden');

    } catch (error) {
        console.error("Insight Error:", error);
        loading.classList.add('hidden');
        resultArea.innerHTML = `
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <h4 class="font-bold mb-1">분석 중 오류가 발생했습니다.</h4>
                <p class="text-sm">${error.message}</p>
            </div>
        `;
        resultArea.classList.remove('hidden');
    }
}