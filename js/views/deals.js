import { Store } from '../store.js';
import { generateId, showToast } from '../utils.js';

let deleteTargetId = null;
let editTargetId = null;

export function renderDeals(container) {
    const deals = Store.getDeals();

    const html = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Deals</h1>
                <p class="text-slate-500 mt-1 text-sm font-medium">고객 관리</p>
            </div>
            <button id="btn-create-deal" class="bg-slate-900 hover:bg-indigo-600 text-white pl-4 pr-5 py-2.5 rounded-lg shadow-sm transition-all text-sm font-bold flex items-center gap-2 active:scale-95 border border-transparent">
                <i class="fa-solid fa-plus text-xs"></i> New Deal
            </button>
        </div>

        <div id="deals-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${deals.length === 0 ? `
                <div class="col-span-full flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                        <i class="fa-regular fa-folder-open text-slate-400 text-2xl"></i>
                    </div>
                    <p class="text-slate-900 font-bold text-lg">등록된 Deal이 없습니다</p>
                    <p class="text-slate-500 text-sm mt-1">새로운 Deal을 생성하여 관리를 시작하세요.</p>
                </div>
            ` : deals.map(deal => createDealCard(deal)).join('')}
        </div>

        <!-- Create Modal (Enterprise Style) -->
        <div id="create-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-modal p-8 animate-modal-in border border-slate-200">
                <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors btn-close-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600">
                        <i class="fa-solid fa-plus text-sm"></i>
                    </div>
                    <h2 class="text-xl font-bold text-slate-900 tracking-tight">새 Deal 등록</h2>
                </div>
                
                <form id="create-form" class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">고객사명 (Client)</label>
                        <input type="text" name="clientName" required class="input-enterprise w-full" placeholder="예: 삼성전자">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">프로젝트명 (Deal Name)</label>
                        <input type="text" name="dealName" required class="input-enterprise w-full" placeholder="예: 클라우드 마이그레이션">
                    </div>
                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">고객 담당자</label>
                            <input type="text" name="clientContact" class="input-enterprise w-full">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">내부 담당자</label>
                            <input type="text" name="internalContact" class="input-enterprise w-full">
                        </div>
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">제안 솔루션</label>
                         <input type="text" name="solution" class="input-enterprise w-full">
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">수주 목표일</label>
                         <input type="date" name="purchaseDate" class="input-enterprise w-full">
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">메모</label>
                         <textarea name="memo" class="input-enterprise w-full resize-none" rows="3"></textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                        <button type="button" class="btn-close-modal px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold transition-colors">취소</button>
                        <button type="submit" class="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all text-sm shadow-md shadow-indigo-500/20">등록</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Edit Modal (Enterprise Style) -->
        <div id="edit-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm edit-modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-modal p-8 animate-modal-in border border-slate-200">
                <button type="button" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors btn-close-edit-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-600">
                        <i class="fa-solid fa-pen text-sm"></i>
                    </div>
                    <h2 class="text-xl font-bold text-slate-900 tracking-tight">Deal 정보 수정</h2>
                </div>
                
                <form id="edit-form" class="space-y-5">
                    <input type="hidden" name="id">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">고객사명 (Client)</label>
                        <input type="text" name="clientName" required class="input-enterprise w-full">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">프로젝트명 (Deal Name)</label>
                        <input type="text" name="dealName" required class="input-enterprise w-full">
                    </div>
                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">고객 담당자</label>
                            <input type="text" name="clientContact" class="input-enterprise w-full">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">내부 담당자</label>
                            <input type="text" name="internalContact" class="input-enterprise w-full">
                        </div>
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">제안 솔루션</label>
                         <input type="text" name="solution" class="input-enterprise w-full">
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">수주 목표일</label>
                         <input type="date" name="purchaseDate" class="input-enterprise w-full">
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">메모</label>
                         <textarea name="memo" class="input-enterprise w-full resize-none" rows="3"></textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                        <button type="button" class="btn-close-edit-modal px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold transition-colors">취소</button>
                        <button type="submit" class="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all text-sm shadow-md shadow-blue-500/20">저장</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Modal (Enterprise Alert) -->
        <div id="delete-modal" class="fixed inset-0 z-[110] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm delete-modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-modal p-6 animate-modal-in text-center border border-slate-200">
                
                <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-red-500 border border-red-100">
                    <i class="fa-solid fa-trash-can text-lg"></i>
                </div>
                
                <h3 class="text-lg font-bold mb-2 text-slate-900">Deal 삭제</h3>
                <p class="text-slate-500 text-sm mb-6 leading-relaxed">
                    삭제된 데이터는 복구할 수 없습니다.<br>정말 삭제하시겠습니까?
                </p>
                
                <div class="flex gap-3 justify-center">
                    <button type="button" class="btn-close-delete-modal px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold transition-colors">취소</button>
                    <button type="button" id="btn-confirm-delete" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">삭제</button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    attachEvents();
}

function createDealCard(deal) {
    const discoveryStages = Object.values(deal.discovery).filter(s => s.frozen).length;
    const discoveryPct = Math.round((discoveryStages / 4) * 100);
    
    const bizScores = Object.keys(deal.assessment.biz.scores).length;
    const techScores = Object.keys(deal.assessment.tech.scores).length;
    const totalItems = 16; 
    const assessPct = Math.round(((bizScores + techScores) / totalItems) * 100);

    return `
        <div class="group relative card-enterprise p-0 flex flex-col h-full cursor-pointer deal-card overflow-hidden" data-id="${deal.id}">
            <!-- Top Color Bar -->
            <div class="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            
            <div class="p-6 flex flex-col h-full">
                <div class="flex justify-between items-start mb-4">
                    <div class="overflow-hidden pr-2">
                        <span class="text-xs font-bold text-slate-500 mb-1.5 inline-block uppercase tracking-wide">${deal.clientName}</span>
                        <h3 class="font-bold text-lg text-slate-900 truncate leading-snug group-hover:text-indigo-600 transition-colors">${deal.dealName}</h3>
                    </div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 -mr-2 -mt-1">
                        <button type="button" class="btn-edit-deal text-slate-400 hover:text-indigo-600 p-2 rounded-md hover:bg-indigo-50 transition-colors" title="수정">
                            <i class="fa-solid fa-pen text-sm"></i>
                        </button>
                        <button type="button" class="btn-delete-deal text-slate-400 hover:text-red-500 p-2 rounded-md hover:bg-red-50 transition-colors" title="삭제">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </div>
                </div>
                
                <div class="flex-grow">
                    <p class="text-sm text-slate-500 line-clamp-2 leading-relaxed font-normal">${deal.memo || '메모 없음'}</p>
                </div>
                
                <div class="space-y-4 mt-6 pt-5 border-t border-slate-100">
                    <div>
                        <div class="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
                            <span class="flex items-center gap-1.5"><i class="fa-regular fa-compass text-indigo-500"></i> Discovery</span>
                            <span class="text-slate-700 font-bold">${discoveryPct}%</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div class="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style="width: ${discoveryPct}%"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
                            <span class="flex items-center gap-1.5"><i class="fa-solid fa-chart-pie text-emerald-500"></i> Assessment</span>
                            <span class="text-slate-700 font-bold">${assessPct}%</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style="width: ${assessPct}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function attachEvents() {
    /* Create Modal Events */
    const createModal = document.getElementById('create-modal');
    const createBtn = document.getElementById('btn-create-deal');
    const createForm = document.getElementById('create-form');

    const toggleCreateModal = (show) => createModal.classList.toggle('hidden', !show);

    if (createBtn) createBtn.addEventListener('click', () => toggleCreateModal(true));

    createModal.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => toggleCreateModal(false));
    });
    createModal.querySelector('.modal-backdrop').addEventListener('click', () => toggleCreateModal(false));
    
    createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(createForm);
        const newDeal = Store.createEmptyDeal();
        
        newDeal.id = generateId();
        newDeal.clientName = formData.get('clientName');
        newDeal.dealName = formData.get('dealName');
        newDeal.clientContact = formData.get('clientContact');
        newDeal.internalContact = formData.get('internalContact');
        newDeal.solution = formData.get('solution');
        newDeal.purchaseDate = formData.get('purchaseDate');
        newDeal.memo = formData.get('memo');
        
        Store.saveDeal(newDeal);
        toggleCreateModal(false);
        showToast('성공적으로 등록되었습니다.', 'success');
        renderDeals(document.getElementById('app'));
    });

    /* Edit Modal Events */
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    
    const toggleEditModal = (show) => editModal.classList.toggle('hidden', !show);

    // Close Edit Modal
    editModal.querySelectorAll('.btn-close-edit-modal').forEach(btn => {
        btn.addEventListener('click', () => toggleEditModal(false));
    });
    editModal.querySelector('.edit-modal-backdrop').addEventListener('click', () => toggleEditModal(false));

    // Submit Edit Form
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(editForm);
        const dealId = editTargetId;
        const existingDeal = Store.getDeal(dealId);
        
        if (existingDeal) {
            existingDeal.clientName = formData.get('clientName');
            existingDeal.dealName = formData.get('dealName');
            existingDeal.clientContact = formData.get('clientContact');
            existingDeal.internalContact = formData.get('internalContact');
            existingDeal.solution = formData.get('solution');
            existingDeal.purchaseDate = formData.get('purchaseDate');
            existingDeal.memo = formData.get('memo');
            existingDeal.updatedAt = new Date().toISOString();
            
            Store.saveDeal(existingDeal);
            toggleEditModal(false);
            showToast('수정되었습니다.', 'success');
            renderDeals(document.getElementById('app'));
        }
    });

    /* Delete Modal Events */
    const deleteModal = document.getElementById('delete-modal');
    
    const toggleDeleteModal = (show) => {
        deleteModal.classList.toggle('hidden', !show);
        if (!show) deleteTargetId = null;
    };

    deleteModal.querySelectorAll('.btn-close-delete-modal').forEach(btn => {
        btn.addEventListener('click', () => toggleDeleteModal(false));
    });
    deleteModal.querySelector('.delete-modal-backdrop').addEventListener('click', () => toggleDeleteModal(false));

    document.getElementById('btn-confirm-delete').addEventListener('click', () => {
        if (deleteTargetId) {
            Store.deleteDeal(deleteTargetId);
            showToast('삭제되었습니다.', 'success');
            toggleDeleteModal(false);
            renderDeals(document.getElementById('app'));
        }
    });

    /* Card Events */
    document.querySelectorAll('.btn-edit-deal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const card = btn.closest('.deal-card');
            const dealId = card.dataset.id;
            const deal = Store.getDeal(dealId);
            
            if (deal) {
                editTargetId = dealId;
                // Populate Edit Form
                editForm.elements['id'].value = deal.id;
                editForm.elements['clientName'].value = deal.clientName;
                editForm.elements['dealName'].value = deal.dealName;
                editForm.elements['clientContact'].value = deal.clientContact || '';
                editForm.elements['internalContact'].value = deal.internalContact || '';
                editForm.elements['solution'].value = deal.solution || '';
                editForm.elements['purchaseDate'].value = deal.purchaseDate || '';
                editForm.elements['memo'].value = deal.memo || '';
                
                toggleEditModal(true);
            }
        });
    });

    document.querySelectorAll('.btn-delete-deal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const card = btn.closest('.deal-card');
            if (card) {
                deleteTargetId = card.dataset.id;
                toggleDeleteModal(true);
            }
        });
    });

    document.querySelectorAll('.deal-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            if (window.app && window.app.navigateTo) {
                window.app.navigateTo('details', { id });
            }
        });
    });
}