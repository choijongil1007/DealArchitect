import { Store } from '../store.js';
import { renderStrategy } from './strategy.js';
import { showToast, showConfirmModal, setButtonLoading } from '../utils.js';

let currentDealId = null;

export function renderReports(container, dealId) {
    currentDealId = dealId;
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    // Report Data
    const strategyReport = deal.strategyReport;
    const competitiveReports = deal.reports || [];

    const hasStrategy = !!strategyReport;
    const hasCompetitive = competitiveReports.length > 0;
    const isEmpty = !hasStrategy && !hasCompetitive;

    container.innerHTML = `
        <div class="flex flex-col h-full animate-modal-in">
            <div class="mb-8 pb-4 border-b border-slate-200">
                <div class="flex items-center gap-3">
                    <button id="btn-back-reports-list" class="hidden text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-100">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Reports Center</h2>
                        <p class="text-slate-500 text-sm mt-1 font-medium">생성된 모든 분석 보고서를 한곳에서 확인하세요.</p>
                    </div>
                </div>
            </div>

            <div id="reports-list-view" class="${isEmpty ? 'flex-1 flex flex-col items-center justify-center min-h-[400px]' : ''}">
                ${isEmpty ? `
                     <div class="text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-12 w-full max-w-lg">
                        <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 mx-auto border border-slate-100">
                            <i class="fa-regular fa-folder-open text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-bold text-slate-900 mb-2">저장된 보고서가 없습니다</h3>
                        <p class="text-slate-500 text-sm font-medium">
                            <span class="font-bold text-slate-700">Win Strategy</span> 또는 
                            <span class="font-bold text-slate-700">경쟁 분석</span> 단계에서 보고서를 생성해보세요.
                        </p>
                    </div>
                ` : `
                    <div class="space-y-10">
                        <!-- Strategy Section -->
                        <section>
                             <div class="flex items-center gap-2 mb-4">
                                <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                <h3 class="text-lg font-bold text-slate-800">Win Strategy Reports</h3>
                            </div>
                            
                            ${!hasStrategy ? `
                                <div class="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400 italic">
                                    생성된 전략 보고서가 없습니다.
                                </div>
                            ` : `
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div class="card-enterprise group p-5 cursor-pointer hover:border-emerald-400 transition-all relative" id="card-strategy-report">
                                        <div class="flex justify-between items-start mb-4">
                                            <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-100 shadow-sm">
                                                <i class="fa-solid fa-chess-queen text-sm"></i>
                                            </div>
                                            <span class="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 uppercase">Latest</span>
                                        </div>
                                        <h4 class="text-base font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">Win Strategy Report</h4>
                                        <p class="text-xs text-slate-400 font-medium">최종 업데이트: ${new Date(deal.updatedAt).toLocaleDateString()}</p>
                                        
                                        <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                            <span class="text-xs font-bold text-slate-500">종합 전략 보고서</span>
                                            <i class="fa-solid fa-arrow-right text-slate-300 group-hover:text-emerald-500 transition-colors"></i>
                                        </div>
                                    </div>
                                </div>
                            `}
                        </section>

                        <!-- Competitive Section -->
                        <section>
                             <div class="flex items-center gap-2 mb-4">
                                <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                <h3 class="text-lg font-bold text-slate-800">Competitive Analysis Reports</h3>
                            </div>

                             ${!hasCompetitive ? `
                                <div class="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400 italic">
                                    저장된 경쟁 분석 보고서가 없습니다.
                                </div>
                            ` : `
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    ${competitiveReports.map(rep => `
                                        <div class="card-enterprise group p-5 cursor-pointer hover:border-blue-400 transition-all relative report-card" data-id="${rep.id}">
                                            <div class="flex justify-between items-start mb-4">
                                                <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100 shadow-sm">
                                                    <i class="fa-solid fa-chart-pie text-sm"></i>
                                                </div>
                                                <button class="btn-delete-report w-6 h-6 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center absolute top-4 right-4" data-id="${rep.id}">
                                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                                </button>
                                            </div>
                                            <h4 class="text-base font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors line-clamp-1">${rep.title}</h4>
                                            <p class="text-xs text-slate-400 font-medium">생성일: ${new Date(rep.createdAt).toLocaleDateString()}</p>
                                            
                                            <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                <span class="text-xs font-bold text-slate-500">경쟁 분석</span>
                                                <i class="fa-solid fa-arrow-right text-slate-300 group-hover:text-blue-500 transition-colors"></i>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </section>
                    </div>
                `}
            </div>
            
            <!-- Report Viewer Container (Modified for full height view) -->
            <div id="report-viewer-container" class="hidden flex-1 bg-slate-50 border border-slate-200 rounded-xl p-8 shadow-inner min-h-[600px] h-auto overflow-visible">
                 <div class="flex justify-end mb-4 px-2 no-print">
                      <button id="btn-save-pdf" class="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-sm">
                          <i class="fa-solid fa-file-pdf"></i> PDF로 저장
                      </button>
                 </div>
                 <div id="report-viewer-content" class="bg-white p-10 shadow-sm border border-slate-200 rounded-lg max-w-4xl mx-auto"></div>
            </div>
        </div>
    `;

    attachEvents(container, deal);
}

function attachEvents(container, deal) {
    const listView = container.querySelector('#reports-list-view');
    const viewerContainer = container.querySelector('#report-viewer-container');
    const viewerContent = container.querySelector('#report-viewer-content');
    const backBtn = container.querySelector('#btn-back-reports-list');
    const btnSavePdf = container.querySelector('#btn-save-pdf');
    
    // Helper to toggle views
    const showViewer = (contentHtml, reportTitle) => {
        listView.classList.add('hidden');
        viewerContainer.classList.remove('hidden');
        backBtn.classList.remove('hidden');
        
        // Strategy renderer replaces innerHTML, so we handle standard HTML content here
        if (contentHtml) {
            viewerContent.innerHTML = contentHtml;
        }

        // Store title for PDF filename
        viewerContent.dataset.reportTitle = reportTitle || `Deal_Report_${deal.id}`;
    };

    const showList = () => {
        listView.classList.remove('hidden');
        viewerContainer.classList.add('hidden');
        backBtn.classList.add('hidden');
        viewerContent.innerHTML = '';
    };

    backBtn.addEventListener('click', showList);

    // Save PDF Logic
    btnSavePdf.addEventListener('click', () => {
        const originalContent = viewerContent;
        const filename = (viewerContent.dataset.reportTitle || 'Report') + '.pdf';
        
        setButtonLoading(btnSavePdf, true, 'PDF 생성 중...');
        
        // 1. Create a clone for PDF generation
        // Using an off-screen container ensures we can manipulate styles without affecting the user's view
        const cloneWrapper = document.createElement('div');
        cloneWrapper.style.position = 'absolute';
        cloneWrapper.style.left = '-9999px';
        cloneWrapper.style.top = '0';
        cloneWrapper.style.width = '760px'; // Fixed width for A4 consistency
        cloneWrapper.style.zIndex = '-1';
        
        // Clone the content
        const clone = originalContent.cloneNode(true);
        
        // 2. Cleanup styles for PDF
        // Remove screen-specific container styles that add unnecessary padding/borders in PDF
        clone.classList.remove('p-10', 'shadow-sm', 'border', 'border-slate-200', 'rounded-lg', 'max-w-4xl', 'mx-auto');
        clone.classList.add('p-4'); // Minimal padding
        
        // Remove internal buttons (No-print)
        const internalActions = clone.querySelectorAll('.no-print');
        internalActions.forEach(el => el.remove());

        // Remove top margin from the first header to fix "Top whitespace" issue
        const firstHeader = clone.querySelector('h2');
        if (firstHeader) {
            firstHeader.classList.remove('mt-12');
            firstHeader.classList.add('mt-0');
        }

        cloneWrapper.appendChild(clone);
        document.body.appendChild(cloneWrapper);

        const opt = {
            margin:       [10, 10, 10, 10], // Top, Left, Bottom, Right
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            // Removed 'avoid-all' to prevent cutting off large sections like "5. 대응 방안"
            pagebreak:    { mode: ['css', 'legacy'] }
        };

        // Use html2pdf
        if (window.html2pdf) {
            html2pdf().set(opt).from(clone).save().then(() => {
                setButtonLoading(btnSavePdf, false);
                if (document.body.contains(cloneWrapper)) document.body.removeChild(cloneWrapper);
                showToast('PDF 다운로드가 시작되었습니다.', 'success');
            }).catch(err => {
                console.error(err);
                setButtonLoading(btnSavePdf, false);
                if (document.body.contains(cloneWrapper)) document.body.removeChild(cloneWrapper);
                showToast('PDF 생성 중 오류가 발생했습니다.', 'error');
            });
        } else {
            setButtonLoading(btnSavePdf, false);
            if (document.body.contains(cloneWrapper)) document.body.removeChild(cloneWrapper);
            showToast('PDF 라이브러리를 로드하지 못했습니다.', 'error');
        }
    });

    // Strategy Card Click
    const strategyCard = container.querySelector('#card-strategy-report');
    if (strategyCard) {
        strategyCard.addEventListener('click', () => {
            listView.classList.add('hidden');
            viewerContainer.classList.remove('hidden');
            backBtn.classList.remove('hidden');
            
            viewerContent.dataset.reportTitle = `${deal.dealName}_Win_Strategy`;

            // Reuse the existing strategy renderer
            // We pass the viewerContent as the container
            renderStrategy(viewerContent, deal.id, true);
            
            // Hide the internal "Print/PDF" button from strategy view as we have our own
            setTimeout(() => {
                const innerActionBar = viewerContent.querySelector('.no-print');
                if (innerActionBar) innerActionBar.classList.add('hidden');
            }, 100);
        });
    }

    // Competitive Report Cards Click
    container.querySelectorAll('.report-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete-report')) return;
            
            const repId = card.dataset.id;
            const report = deal.reports.find(r => r.id === repId);
            
            if (report) {
                showViewer(`
                    <div class="mb-8 pb-6 border-b border-slate-100">
                        <h1 class="text-3xl font-extrabold text-slate-900 mb-2">${report.title}</h1>
                        <p class="text-sm text-slate-500">생성일: ${new Date(report.createdAt).toLocaleString()}</p>
                    </div>
                    <div class="prose prose-sm max-w-none text-slate-700">
                        ${report.contentHTML}
                    </div>
                `, report.title);
            }
        });
    });

    // Delete Buttons
    container.querySelectorAll('.btn-delete-report').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            showConfirmModal('정말 이 보고서를 삭제하시겠습니까?', () => {
                Store.deleteReport(deal.id, id);
                renderReports(container, deal.id); 
                showToast('삭제되었습니다.', 'success');
            });
        });
    });
}