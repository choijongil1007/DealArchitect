import { Store } from '../store.js';
import { showSolutionDetailModal } from '../utils.js';

export function initTreemap(elementId, dealId) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const render = () => {
        container.innerHTML = '';
        const rawData = Store.getMapContent(dealId);
        
        // Transform Data for D3 Hierarchy
        // Root -> Domain -> Category -> Solution
        const rootData = { name: "Root", children: [] };

        Object.keys(rawData).forEach(domain => {
            const domainNode = { name: domain, type: 'domain', children: [] };
            const categories = rawData[domain];
            
            if (categories && typeof categories === 'object') {
                Object.keys(categories).forEach(cat => {
                    const catNode = { name: cat, type: 'category', children: [] };
                    const solutions = categories[cat];
                    
                    if (Array.isArray(solutions)) {
                        solutions.forEach(sol => {
                            catNode.children.push({
                                name: sol.name,
                                type: 'solution',
                                value: sol.share || 10, // Size by share
                                data: sol // Keep full data
                            });
                        });
                    }
                    domainNode.children.push(catNode);
                });
            }
            rootData.children.push(domainNode);
        });

        if (rootData.children.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-slate-400">
                    <i class="fa-solid fa-map-location-dot text-4xl mb-4 opacity-20"></i>
                    <p class="text-sm font-medium">데이터가 없습니다.</p>
                </div>
            `;
            return;
        }

        const width = container.clientWidth;
        const height = container.clientHeight || 600;

        // D3 Setup
        if (!window.d3) {
            container.innerHTML = '<div class="text-red-500 p-4">D3.js library not loaded.</div>';
            return;
        }

        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("font-family", "'Inter', sans-serif");

        const root = d3.hierarchy(rootData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        d3.treemap()
            .size([width, height])
            .paddingTop(28)
            .paddingRight(6)
            .paddingInner(4)
            (root);

        const colorScale = d3.scaleOrdinal()
            .domain(rootData.children.map(d => d.name))
            .range(['#EEF2FF', '#F0FDF4', '#FEF2F2', '#FFFBEB', '#F5F3FF']); // Soft backgrounds

        // Render Nodes
        const nodes = svg.selectAll("g")
            .data(root.descendants())
            .enter()
            .append("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        // 1. Domain Headers (Level 1)
        nodes.filter(d => d.depth === 1)
            .append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => colorScale(d.data.name))
            .attr("stroke", "#E2E8F0")
            .attr("rx", 12);

        nodes.filter(d => d.depth === 1)
            .append("text")
            .attr("x", 8)
            .attr("y", 18)
            .text(d => d.data.name)
            .attr("font-size", "11px")
            .attr("font-weight", "bold")
            .attr("fill", "#64748B")
            .style("text-transform", "uppercase")
            .style("letter-spacing", "0.05em");

        // 2. Category Boxes (Level 2) - optional visual separation
        // We might skip drawing rects for categories to keep it clean, or use transparent strokes.

        // 3. Solution Leaf Nodes (Level 3)
        const leaves = nodes.filter(d => d.depth === 3);

        leaves.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", "white")
            .attr("stroke", d => {
                // Highlight our solution vs competitors? For now, standard border.
                return "#CBD5E1"; 
            })
            .attr("rx", 6)
            .style("cursor", "pointer")
            .on("mouseover", function() { d3.select(this).attr("stroke", "#4F46E5").attr("stroke-width", 2); })
            .on("mouseout", function() { d3.select(this).attr("stroke", "#CBD5E1").attr("stroke-width", 1); })
            .on("click", (event, d) => {
                showSolutionDetailModal(d.data.data);
            });

        // Solution Labels
        leaves.append("text")
            .attr("x", 8)
            .attr("y", 20)
            .text(d => d.data.name)
            .attr("font-size", "12px")
            .attr("font-weight", "600")
            .attr("fill", "#1E293B")
            .each(function(d) {
                const width = d.x1 - d.x0 - 16;
                // Simple truncation
                const self = d3.select(this);
                let textLength = self.node().getComputedTextLength();
                let text = self.text();
                while (textLength > width && text.length > 0) {
                    text = text.slice(0, -1);
                    self.text(text + "...");
                    textLength = self.node().getComputedTextLength();
                }
            })
            .style("pointer-events", "none");

        // Share Badge
        leaves.append("text")
            .attr("x", 8)
            .attr("y", 36)
            .text(d => `${d.data.value}%`)
            .attr("font-size", "10px")
            .attr("font-weight", "500")
            .attr("fill", "#64748B")
            .style("pointer-events", "none")
            .style("display", d => (d.y1 - d.y0) > 40 ? "block" : "none");

    };

    render();
    
    // Return render function so editor can trigger refresh
    return render;
}