import { Store } from '../store.js';
import { initTreemap } from './solutionMapVisual.js';
import { initTreeBuilder } from './solutionMapEditor.js';
import { showToast, showWarningModal, showConfirmModal } from '../utils.js';

let currentDealId = null;
let viewMode = 'list';

export function renderSolutionMap(container, dealId, stageId) {
    currentDealId = dealId;
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    if (!container.dataset.initialized) {
        viewMode = 'list';
        container.dataset.initialized = 'true';
    }

    if (viewMode === 'list') {
        renderList(container, deal);
    } else {
        renderWorkspace(container, deal);
    }
}

function renderList(container, deal) {
    const savedMaps = deal.savedMaps || [];
    const hasItems = savedMaps.length > 0;

    container.innerHTML = `
        <div class="flex flex-col h-full animate-modal-in">
            <div class="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 pb-4 border-b border-slate-200">
                <div>
                    <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Solution Map</h2>
                    <p class="text-slate-500 text-sm mt-1 font-medium">저장된 솔루션 맵을 관리하세요.</p>
                </div>
                ${hasItems ? `
                <button id="btn-create-map-header" class="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-sm flex items-center gap-2 text-sm">
                    <i class="fa-solid fa-plus"></i> 맵 생성
                </button>
                ` : ''}
            </div>

            ${!hasItems ? `
                <div class="flex flex-col items-center justify-center flex-1 min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 text-indigo-200 border border-indigo-50">
                        <i class="fa-solid fa-map-location-dot text-3xl text-indigo-500"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-2">솔루션 맵을 만드세요</h3>
                    <p class="text-slate-500 text-sm mb-8 text-center max-w-xs leading-relaxed font-medium">고객의 아키텍처를 시각화하고<br>솔루션 전략을 수립해보세요.</p>
                    <button id="btn-create-map" class="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg flex items-center gap-2 active:scale-95 shadow-indigo-500/20">
                        <i class="fa-solid fa-plus"></i> 새 솔루션 맵 생성
                    </button>
                </div>
            ` : `
                <div class="grid grid-cols-1 gap-8 items-start">
                    
                    <!-- Saved Maps List -->
                    <div class="card-enterprise p-6 min-h-[400px]">
                        <div class="flex items-center justify-between mb-6">
                            <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span> 솔루션 맵
                            </h3>
                            <span class="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">${savedMaps.length}</span>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${savedMaps.map(map => `
                                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group map-card flex justify-between items-center" data-id="${map.id}">
                                    <div class="flex items-center gap-4 overflow-hidden">
                                        <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100 shrink-0 shadow-sm">
                                            <i class="fa-solid fa-sitemap text-sm"></i>
                                        </div>
                                        <div class="min-w-0">
                                            <h4 class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate text-sm md:text-base">${map.title}</h4>
                                            <p class="text-xs text-slate-400 font-medium mt-0.5">업데이트: ${new Date(map.updatedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <button class="btn-delete-map w-8 h-8 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors shrink-0" data-id="${map.id}">
                                        <i class="fa-solid fa-trash-can text-sm"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;

    const createAction = () => {
        Store.saveMapContent(deal.id, {});
        viewMode = 'workspace';
        renderWorkspace(container, deal, 'update'); 
    };

    const createBtn = document.getElementById('btn-create-map');
    if(createBtn) createBtn.addEventListener('click', createAction);
    
    const createBtnHeader = document.getElementById('btn-create-map-header');
    if(createBtnHeader) createBtnHeader.addEventListener('click', createAction);

    container.querySelectorAll('.map-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete-map')) return;
            const mapId = card.dataset.id;
            const map = deal.savedMaps.find(m => m.id === mapId);
            if (map) {
                Store.saveMapContent(deal.id, map.content);
                viewMode = 'workspace';
                renderWorkspace(container, deal, 'view');
            }
        });
    });

    container.querySelectorAll('.btn-delete-map').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            showConfirmModal('정말 이 맵을 삭제하시겠습니까?', () => {
                Store.deleteSavedMap(deal.id, id);
                renderList(container, Store.getDeal(deal.id)); 
                showToast('삭제되었습니다.', 'success');
            });
        });
    });
}

function renderWorkspace(container, deal, initialTab = 'view') {
    container.innerHTML = `
        <div class="flex flex-col h-full animate-modal-in relative">
            <div class="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4 border-b border-slate-200 pb-1">
                <div class="flex items-center gap-3">
                    <button id="btn-back-list" class="text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-100" title="리스트로 돌아가기">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Solution Map</h2>
                        <p class="text-slate-500 text-sm mt-1 font-medium">아키텍처 구성 및 분석</p>
                    </div>
                </div>
                <div class="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    <button class="sm-tab-btn px-4 py-2 rounded-md text-sm font-bold text-slate-500 hover:text-slate-900 transition-all" data-tab="view">
                        <i class="fa-regular fa-map mr-1.5"></i> 솔루션 맵
                    </button>
                    <button class="sm-tab-btn px-4 py-2 rounded-md text-sm font-bold text-slate-500 hover:text-slate-900 transition-all" data-tab="update">
                        <i class="fa-solid fa-pen-to-square mr-1.5"></i> 맵 업데이트
                    </button>
                </div>
            </div>

            <div id="sm-content-area" class="flex-1 min-h-[600px] relative pb-20">
                <!-- 1. Map View -->
                <div id="sm-view-container" class="tab-content w-full h-full">
                     <div class="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex-1 w-full min-h-[600px] shadow-inner h-full">
                        <div id="treemap-view-container" class="w-full h-full"></div>
                    </div>
                </div>

                <!-- 2. Map Update -->
                <div id="sm-update-container" class="tab-content hidden w-full h-full flex flex-col lg:flex-row gap-6 items-start">
                    <!-- Editor Area -->
                    <div class="bg-white rounded-2xl border border-slate-200 p-4 w-full lg:w-[400px] shrink-0 flex flex-col shadow-sm sticky top-0" style="height: calc(100vh - 250px); min-height: 500px;">
                        <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                            <h3 class="text-sm font-bold text-slate-800 ml-1 flex items-center gap-2 uppercase tracking-wide">
                                <i class="fa-solid fa-list-ul"></i> 구조 편집
                            </h3>
                            <button id="btn-add-domain" class="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
                                <i class="fa-solid fa-plus"></i> 대분류 추가
                            </button>
                        </div>
                        <div id="tree-editor-wrapper" class="w-full flex-1 overflow-y-auto pr-2 custom-scrollbar"></div>
                    </div>

                    <!-- Visual Area -->
                    <div class="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex-1 w-full shadow-inner h-full" style="min-height: 500px;">
                        <h3 class="text-sm font-bold text-slate-500 mb-4 ml-1 flex items-center gap-2 uppercase tracking-wide">
                             <i class="fa-solid fa-eye"></i> 실시간 맵 미리보기
                        </h3>
                        <div id="treemap-update-container" class="w-full"></div>
                    </div>
                </div>
            </div>

            <!-- Floating Save Button -->
            <div id="fab-save-container" class="absolute bottom-4 right-4 z-50 hidden">
                <button id="btn-save-map-snapshot" class="bg-slate-900 text-white px-6 py-3 rounded-full font-bold hover:bg-indigo-600 transition-all shadow-2xl hover:shadow-float flex items-center gap-3 active:scale-95 group shadow-indigo-500/30">
                    <i class="fa-solid fa-floppy-disk text-indigo-300 group-hover:text-white transition-colors"></i>
                    <span>저장하기</span>
                </button>
            </div>
        </div>

        <!-- Save Map Modal -->
        <div id="modal-save-map" class="fixed inset-0 z-[150] hidden flex items-center justify-center p-4">
            <div id="modal-save-map-bg" class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity opacity-0"></div>
            <div id="modal-save-map-panel" class="relative bg-white rounded-xl shadow-modal p-6 max-w-sm w-full transform transition-all scale-95 opacity-0 border border-slate-200">
                <h3 class="text-lg font-bold text-slate-900 mb-4">현재 맵 저장</h3>
                <div class="mb-6">
                    <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-1">맵 이름</label>
                    <input type="text" id="input-map-name" class="input-enterprise w-full" placeholder="예: Deal_2025.01.01">
                </div>
                <div class="flex gap-3 justify-end">
                    <button id="btn-cancel-save-map" class="text-slate-500 hover:text-slate-700 font-medium text-sm px-3">취소</button>
                    <button id="btn-confirm-save-map" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors text-sm shadow-md">저장</button>
                </div>
            </div>
        </div>
    `;

    let refreshViewMap, refreshUpdateMap;
    
    if (document.getElementById('treemap-view-container')) {
        refreshViewMap = initTreemap('treemap-view-container', deal.id);
    }
    
    if (document.getElementById('treemap-update-container')) {
        refreshUpdateMap = initTreemap('treemap-update-container', deal.id);
    }
    
    if (document.getElementById('tree-editor-wrapper')) {
        initTreeBuilder('tree-editor-wrapper', deal.id, () => {
            if (refreshViewMap) refreshViewMap();
            if (refreshUpdateMap) refreshUpdateMap();
        });
    }

    const tabs = container.querySelectorAll('.sm-tab-btn');
    const fab = document.getElementById('fab-save-container');

    const switchTab = (targetTab) => {
        tabs.forEach(t => {
            if (t.dataset.tab === targetTab) {
                t.classList.add('bg-white', 'text-indigo-600', 'shadow-sm', 'active');
                t.classList.remove('text-slate-500');
            } else {
                t.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm', 'active');
                t.classList.add('text-slate-500');
            }
        });

        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        
        const targetEl = document.getElementById(`sm-${targetTab}-container`);
        if (targetEl) targetEl.classList.remove('hidden');

        if (targetTab === 'update') {
            fab.classList.remove('hidden');
            if (refreshUpdateMap) setTimeout(refreshUpdateMap, 50); 
        } else if (targetTab === 'view') {
            fab.classList.add('hidden');
            if (refreshViewMap) setTimeout(refreshViewMap, 50); 
        } else {
            fab.classList.add('hidden');
        }
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    switchTab(initialTab);

    document.getElementById('btn-back-list').addEventListener('click', () => {
        viewMode = 'list';
        renderList(container, Store.getDeal(deal.id));
    });

    const saveBtn = document.getElementById('btn-save-map-snapshot');
    const saveModal = document.getElementById('modal-save-map');
    const saveBg = document.getElementById('modal-save-map-bg');
    const savePanel = document.getElementById('modal-save-map-panel');
    const confirmSave = document.getElementById('btn-confirm-save-map');
    const cancelSave = document.getElementById('btn-cancel-save-map');
    const nameInput = document.getElementById('input-map-name');

    saveBtn.addEventListener('click', () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        
        // Use first domain name if available, else fallback to deal name
        const mapContent = Store.getMapContent(deal.id);
        const domains = Object.keys(mapContent || {});
        let namePrefix = deal.dealName || 'Map'; 
        
        if (domains.length > 0) {
            namePrefix = domains[0];
        }

        nameInput.value = `${namePrefix}_${yyyy}.${mm}.${dd}`;
        
        saveModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            saveBg.classList.remove('opacity-0');
            savePanel.classList.remove('scale-95', 'opacity-0');
            savePanel.classList.add('scale-100', 'opacity-100');
        });
        nameInput.focus();
    });

    const closeSaveModal = () => {
        saveBg.classList.add('opacity-0');
        savePanel.classList.remove('scale-100', 'opacity-100');
        savePanel.classList.add('scale-95', 'opacity-0');
        setTimeout(() => saveModal.classList.add('hidden'), 200);
    };

    cancelSave.addEventListener('click', closeSaveModal);
    
    confirmSave.addEventListener('click', () => {
        const title = nameInput.value.trim();
        if (title) {
            const content = Store.getMapContent(deal.id);
            Store.addSavedMap(deal.id, title, content);
            showToast('맵이 저장되었습니다.', 'success');
            closeSaveModal();
            viewMode = 'list';
            renderList(container, Store.getDeal(deal.id));
        } else {
            showToast('맵 이름을 입력해주세요.', 'error');
        }
    });
}