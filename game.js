// 游戏状态管理
class GameState {
    constructor() {
        this.currentLevel = 1;
        this.levels = [];
        this.completedLevels = new Set();
        this.canvas = null;
        this.ctx = null;
        this.gates = [];
        this.connections = [];
        this.selectedGate = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.isConnecting = false;
        this.connectionStart = null;
        this.mousePos = { x: 0, y: 0 };
        this.fixedGateCount = 0;
        this.animationFrame = null;
        this.showSignalFlow = false;
        this.animationTime = 0;
        this.history = []; // 历史记录用于撤销
        this.historyIndex = -1; // 当前历史索引
        this.maxHistorySize = 50; // 最大历史记录数
        this.gateToDelete = null; // 待删除的门
        this.errorGates = []; // 有错误的门（用于高亮显示）
    }

    async loadLevels() {
        try {
            const response = await fetch('levels.json');
            this.levels = await response.json();
            this.initializeGame();
        } catch (error) {
            console.error('Failed to load level data:', error);
        }
    }

    initializeGame() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.generateLevelButtons();
        this.loadProgress();
        this.loadLevel(this.currentLevel);
        const nextBtn = document.getElementById('next-level');
        if (nextBtn) nextBtn.disabled = true;
        this.startAnimationLoop();
        this.updateCompletedCount();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));

        document.getElementById('test-circuit').addEventListener('click', this.testCircuit.bind(this));
        document.getElementById('clear-circuit').addEventListener('click', this.clearCircuit.bind(this));
        document.getElementById('next-level').addEventListener('click', this.nextLevel.bind(this));
        document.getElementById('next-level-modal').addEventListener('click', this.nextLevel.bind(this));
        document.getElementById('close-modal').addEventListener('click', this.closeModal.bind(this));
        document.getElementById('undo-btn').addEventListener('click', this.undo.bind(this));
        document.getElementById('redo-btn').addEventListener('click', this.redo.bind(this));
        
        // 删除确认对话框按钮
        document.getElementById('delete-yes').addEventListener('click', () => this.confirmDelete(true));
        document.getElementById('delete-no').addEventListener('click', () => this.confirmDelete(false));
        
        // 撤销/重做快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            } else if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
                e.preventDefault();
                this.redo();
            }
        });

        const connectBtn = document.getElementById('connect-mode');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.isConnecting = !this.isConnecting;
                this.connectionStart = null;
                connectBtn.classList.toggle('active', this.isConnecting);
                const hint = document.getElementById('canvas-hint');
                if (hint) {
                    hint.textContent = this.isConnecting
                        ? 'Connect Mode: Click start gate, then click target gate to connect'
                        : 'Hint: Click input gate to toggle 0/1; Drag to move gate; Right-click to delete connection';
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList && e.target.classList.contains('gate-item')) {
                this.addGate(e.target.dataset.type);
            }
        });
    }

    loadLevel(levelId) {
        const level = this.levels.find(l => l.level_id === levelId) || this.levels[0];
        if (!level) return;
        this.currentLevel = level.level_id;

        const currentLevelEl = document.getElementById('current-level');
        const levelNameEl = document.getElementById('level-name');
        if (currentLevelEl) currentLevelEl.textContent = `Level ${level.level_id}`;
        if (levelNameEl) levelNameEl.textContent = level.name;

        const descEl = document.getElementById('level-desc');
        if (descEl) descEl.textContent = level.description || '';
        
        // 显示布尔公式（如果有）
        const formulaContainer = document.getElementById('formula-container');
        const formulaDisplay = document.getElementById('formula-display');
        if (level.formula) {
            if (formulaContainer) formulaContainer.style.display = 'block';
            if (formulaDisplay) formulaDisplay.textContent = level.formula;
        } else {
            if (formulaContainer) formulaContainer.style.display = 'none';
        }

        const palette = document.getElementById('gate-palette');
        if (palette) {
            palette.innerHTML = '';
            (level.available_gates || []).forEach(type => {
                const btn = document.createElement('button');
                btn.className = 'gate-item';
                btn.dataset.type = type;
                
                // 创建SVG门图标
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 0 60 40');
                svg.setAttribute('width', '60');
                svg.setAttribute('height', '40');
                
                const color = this.getGateColor(type);
                let pathD = '';
                
                switch(type) {
                    case 'AND':
                        // D形状
                        pathD = 'M5,5 L30,5 A15,15 0 0,1 30,35 L5,35 Z';
                        break;
                    case 'OR':
                        // 弧形
                        pathD = 'M5,5 Q20,20 5,35 Q35,25 45,20 Q35,15 5,5';
                        break;
                    case 'NOT':
                        // 三角形
                        pathD = 'M5,5 L5,35 L45,20 Z';
                        break;
                    case 'NAND':
                        // D形状 + 小圆圈
                        pathD = 'M5,5 L30,5 A15,15 0 0,1 30,35 L5,35 Z';
                        break;
                    case 'NOR':
                        // 弧形 + 小圆圈
                        pathD = 'M5,5 Q20,20 5,35 Q35,25 45,20 Q35,15 5,5';
                        break;
                    case 'XOR':
                        // 弧形 + 额外弧线
                        pathD = 'M5,5 Q20,20 5,35 Q35,25 45,20 Q35,15 5,5';
                        break;
                }
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathD);
                path.setAttribute('fill', color);
                path.setAttribute('stroke', '#fff');
                path.setAttribute('stroke-width', '2');
                svg.appendChild(path);
                
                // 对于NAND和NOR，添加小圆圈
                if (type === 'NAND' || type === 'NOR') {
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', type === 'NAND' ? '48' : '50');
                    circle.setAttribute('cy', '20');
                    circle.setAttribute('r', '4');
                    circle.setAttribute('fill', '#fff');
                    circle.setAttribute('stroke', '#fff');
                    svg.appendChild(circle);
                }
                
                // 对于NOT，添加小圆圈
                if (type === 'NOT') {
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', '50');
                    circle.setAttribute('cy', '20');
                    circle.setAttribute('r', '4');
                    circle.setAttribute('fill', '#fff');
                    circle.setAttribute('stroke', '#fff');
                    svg.appendChild(circle);
                }
                
                // 添加文字
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', '30');
                text.setAttribute('y', '24');
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('fill', '#fff');
                text.setAttribute('font-size', '10');
                text.setAttribute('font-weight', 'bold');
                text.textContent = type;
                svg.appendChild(text);
                
                btn.appendChild(svg);
                palette.appendChild(btn);
            });
        }

        this.renderTruthTable(level);

        const hintsList = document.getElementById('hints-list');
        if (hintsList) {
            hintsList.innerHTML = '';
            (level.hints || []).forEach(h => {
                const li = document.createElement('li');
                li.textContent = h;
                hintsList.appendChild(li);
            });
        }

        const maxEl = document.getElementById('max-gates');
        if (maxEl) maxEl.textContent = level.max_gates || 20;

        this.gates = [];
        this.connections = [];
        this.fixedGateCount = 0;
        this.history = [];
        this.historyIndex = -1;
        
        // 为输入门分配名称 A, B, C, D, E...
        let inputIndex = 0;
        (level.fixed_gates || []).forEach(fg => {
            const gate = new Gate(fg.type, fg.x, fg.y, fg.value ?? false);
            gate.isFixed = true;
            if (fg.type === 'INPUT') {
                gate.label = String.fromCharCode(65 + inputIndex); // A, B, C, D...
                inputIndex++;
            }
            this.gates.push(gate);
            this.fixedGateCount++;
        });
        
        this.saveState(); // 保存初始状态
        this.updateUndoRedoButtons(); // 更新撤销/重做按钮状态

        const resultEl = document.getElementById('test-result');
        if (resultEl) { resultEl.textContent = 'Ready to start...'; resultEl.className = ''; }
        const nextBtn = document.getElementById('next-level');
        if (nextBtn) nextBtn.disabled = true;

        this.updateGateCount();
        this.draw();
    }

    renderTruthTable(level) {
        const table = document.getElementById('truth-table');
        const tableContainer = document.querySelector('.truth-table-container');
        if (!table || !tableContainer) return;
        
        // 如果是布尔公式关卡，隐藏真值表
        if (level.formula) {
            tableContainer.style.display = 'none';
            return;
        } else {
            tableContainer.style.display = 'block';
        }
        
        table.innerHTML = '';
        
        const inputGates = (level.fixed_gates || []).filter(g => g.type === 'INPUT');
        const inputCount = inputGates.length;
        const outputGates = (level.fixed_gates || []).filter(g => g.type === 'OUTPUT');
        const outputCount = outputGates.length || 1;
        
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        
        for (let i = 0; i < inputCount; i++) {
            const th = document.createElement('th');
            th.textContent = String.fromCharCode(65 + i); // A, B, C, D...
            headRow.appendChild(th);
        }
        
        for (let i = 0; i < outputCount; i++) {
            const th = document.createElement('th');
            th.textContent = `Output`;
            headRow.appendChild(th);
        }
        
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        (level.truth_table || []).forEach(row => {
            const tr = document.createElement('tr');
            (row.inputs || []).forEach(val => {
                const td = document.createElement('td');
                td.textContent = val ? '1' : '0';
                td.className = val ? 'value-1' : 'value-0';
                tr.appendChild(td);
            });
            
            const outputs = Array.isArray(row.output) ? row.output : [row.output];
            outputs.forEach(val => {
                const tdOut = document.createElement('td');
                tdOut.textContent = val ? '1' : '0';
                tdOut.className = val ? 'value-1 output-cell' : 'value-0 output-cell';
                tr.appendChild(tdOut);
            });
            
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
    }

    generateLevelButtons() {
        const container = document.getElementById('level-buttons');
        if (!container) return;
        container.innerHTML = '';
        this.levels.forEach(level => {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            
            const levelNum = document.createElement('span');
            levelNum.textContent = `Level ${level.level_id}`;
            btn.appendChild(levelNum);
            
            if (this.completedLevels.has(level.level_id)) {
                const checkmark = document.createElement('span');
                checkmark.textContent = ' ✓';
                checkmark.style.color = '#48bb78';
                btn.appendChild(checkmark);
            }
            
            btn.addEventListener('click', () => {
                this.loadLevel(level.level_id);
            });
            container.appendChild(btn);
        });
        
        const totalEl = document.getElementById('total-levels');
        if (totalEl) totalEl.textContent = this.levels.length;
    }

    updateCompletedCount() {
        const completedEl = document.getElementById('completed-count');
        if (completedEl) completedEl.textContent = this.completedLevels.size;
    }

    addGate(type) {
        const level = this.levels.find(l => l.level_id === this.currentLevel);
        const currentCount = this.gates.filter(g => !g.isFixed).length;
        const maxGates = level?.max_gates ?? 20;
        if (currentCount >= maxGates) {
            this.showTestResult('Maximum gate limit reached', false);
            return;
        }
        
        // 计算不重叠的位置
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const spacing = 80; // 门之间的间距
        
        let x = centerX;
        let y = centerY;
        let found = false;
        let attempts = 0;
        const maxAttempts = 100;
        
        // 螺旋搜索找到不重叠的位置
        while (!found && attempts < maxAttempts) {
            found = true;
            
            // 检查是否与现有门重叠
            for (const gate of this.gates) {
                const dx = x - gate.x;
                const dy = y - gate.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < spacing) {
                    found = false;
                    break;
                }
            }
            
            if (!found) {
                // 螺旋搜索下一个位置
                const angle = attempts * 0.5; // 每次旋转角度
                const radius = spacing * (1 + Math.floor(attempts / 10) * 0.5); // 逐渐扩大半径
                x = centerX + Math.cos(angle) * radius;
                y = centerY + Math.sin(angle) * radius;
                attempts++;
            }
        }
        
        // 确保位置在画布范围内
        x = Math.max(60, Math.min(this.canvas.width - 60, x));
        y = Math.max(40, Math.min(this.canvas.height - 40, y));
        
        const gate = new Gate(type, x, y, false);
        gate.isFixed = false;
        this.gates.push(gate);
        this.saveState(); // 保存状态用于撤销
        this.updateGateCount();
        this.updateUndoRedoButtons();
        this.draw();
    }

    updateGateCount() {
        const countEl = document.getElementById('gate-count');
        const level = this.levels.find(l => l.level_id === this.currentLevel);
        const used = this.gates.filter(g => !g.isFixed).length;
        if (countEl) countEl.textContent = used;
        const maxEl = document.getElementById('max-gates');
        if (maxEl) maxEl.textContent = level?.max_gates ?? 20;
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedGate = this.gates.find(gate => gate.contains(x, y));
        if (clickedGate) {
            if (e.button === 0) {
                if (this.isConnecting) {
                    if (!this.connectionStart) {
                        this.connectionStart = clickedGate;
                    } else {
                        if (clickedGate !== this.connectionStart) {
                            this.createConnection(this.connectionStart, clickedGate);
                            this.connectionStart = null;
                            this.isConnecting = false;
                            const connectBtn = document.getElementById('connect-mode');
                            if (connectBtn) connectBtn.classList.remove('active');
                            const hint = document.getElementById('canvas-hint');
                            if (hint) hint.textContent = 'Hint: Click input gate to toggle 0/1; Drag to move gate; Right-click to delete connection';
                        }
                    }
                } else {
                    if (clickedGate.type === 'INPUT') {
                        clickedGate.value = !clickedGate.value;
                        this.saveState(); // 保存状态用于撤销
                        this.evaluateOnce();
                        this.updateUndoRedoButtons();
                        this.showSignalFlow = true;
                        setTimeout(() => { this.showSignalFlow = false; }, 1000);
                        this.draw();
                        return;
                    }
                    this.selectedGate = clickedGate;
                    this.isDragging = !['INPUT', 'OUTPUT'].includes(clickedGate.type);
                    this.dragOffset.x = x - clickedGate.x;
                    this.dragOffset.y = y - clickedGate.y;
                }
            }
        }
    }

    handleContextMenu(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 检查是否点击了门
        const clickedGate = this.gates.find(gate => gate.contains(x, y));
        if (clickedGate && !clickedGate.isFixed) {
            // 显示自定义确认对话框
            this.gateToDelete = clickedGate;
            const deleteModal = document.getElementById('delete-modal');
            const deleteMessage = document.getElementById('delete-message');
            if (deleteModal && deleteMessage) {
                deleteMessage.textContent = `Delete ${clickedGate.type} gate?`;
                deleteModal.style.display = 'flex';
            }
            return;
        }

        // 检查是否点击了连接线
        const clickedConnection = this.connections.find(conn => {
            const fromPoint = getGateOutputPoint(conn.from);
            const fromX = fromPoint.x;
            const fromY = fromPoint.y;
            
            // 计算目标门的输入点偏移
            const toGate = conn.to;
            const connectionsToTarget = this.connections.filter(c => c.to === toGate);
            const connectionIndex = connectionsToTarget.indexOf(conn);
            const totalConnections = connectionsToTarget.length;
            
            let yOffset = 0;
            if (totalConnections > 1) {
                const availableHeight = toGate.height * 0.7;
                const spacing = availableHeight / (totalConnections - 1);
                yOffset = -availableHeight / 2 + spacing * connectionIndex;
            }
            
            const toPoint = getGateInputPoint(toGate, yOffset);
            const toX = toPoint.x;
            const toY = toPoint.y;
            
            // 计算贝塞尔曲线的控制点
            const dx = toX - fromX;
            const dy = toY - fromY;
            const length = Math.sqrt(dx * dx + dy * dy);
            const controlOffset = Math.min(length * 0.5, 100);
            const cp1x = fromX + controlOffset;
            const cp1y = fromY;
            const cp2x = toX - controlOffset;
            const cp2y = toY;
            
            // 采样贝塞尔曲线上的点，计算最小距离
            let minDist = Infinity;
            const samples = 20;
            for (let i = 0; i <= samples; i++) {
                const t = i / samples;
                const mt = 1 - t;
                const bx = mt * mt * mt * fromX + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * toX;
                const by = mt * mt * mt * fromY + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * toY;
                const dist = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);
                minDist = Math.min(minDist, dist);
            }
            
            return minDist < 10; // 10像素范围内
        });

        if (clickedConnection) {
            this.deleteConnection(clickedConnection);
        }
    }
    
    // 删除门
    deleteGate(gate) {
        // 删除与该门相关的所有连接
        this.connections = this.connections.filter(conn => {
            if (conn.from === gate || conn.to === gate) {
                // 从目标门的输入列表中移除
                if (conn.to.inputs) {
                    const inputIndex = conn.to.inputs.indexOf(conn.from);
                    if (inputIndex > -1) {
                        conn.to.inputs.splice(inputIndex, 1);
                    }
                }
                return false;
            }
            return true;
        });
        
        // 从门列表中删除
        const index = this.gates.indexOf(gate);
        if (index > -1) {
            this.gates.splice(index, 1);
        }
        
        this.saveState();
        this.updateGateCount();
        this.updateUndoRedoButtons();
        this.evaluateOnce();
        this.draw();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.mousePos = { x, y };

        if (this.isDragging && this.selectedGate && !['INPUT', 'OUTPUT'].includes(this.selectedGate.type)) {
            this.selectedGate.x = x - this.dragOffset.x;
            this.selectedGate.y = y - this.dragOffset.y;
            this.draw();
        } else if (this.isConnecting || this.mousePos) {
            // 鼠标移动时也需要重绘（显示连接预览）
            this.draw();
        }
    }

    handleMouseUp(e) {
        if (this.isDragging && this.selectedGate) {
            this.saveState(); // 拖动结束后保存状态
            this.updateUndoRedoButtons();
        }
        this.isDragging = false;
        this.selectedGate = null;
        this.draw();
    }

    drawGrid() {
        const step = 25;
        this.ctx.save();
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();

        // 先计算所有门的值（用于信号流动）
        this.evaluateOnce();

        // 临时存储 gameState 引用到 canvas 上，供 Connection.draw 使用
        this.canvas.gameState = this;

        // 绘制连接线（带信号流动动画）
        this.connections.forEach(connection => {
            connection.draw(this.ctx, this.showSignalFlow, this.animationTime);
        });

        // 绘制连接预览
        if (this.isConnecting && this.connectionStart && this.mousePos) {
            const startPoint = getGateOutputPoint(this.connectionStart);
            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(59,130,246,0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([6, 4]);
            this.ctx.beginPath();
            this.ctx.moveTo(startPoint.x, startPoint.y);
            this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
            this.ctx.stroke();
            this.ctx.restore();
        }

        // 绘制逻辑门
        this.gates.forEach(gate => {
            const isError = this.errorGates && this.errorGates.includes(gate);
            gate.draw(this.ctx, isError);
        });
    }

    // 启动动画循环
    startAnimationLoop() {
        const animate = () => {
            this.animationTime += 0.02; // 增加动画时间
            if (this.animationTime > 10) this.animationTime = 0; // 循环
            this.draw();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    // 停止动画循环
    stopAnimationLoop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    createConnection(from, to) {
        if (!from || !to || from === to) return;
        
        // 防止输入端之间连接
        if (from.type === 'INPUT' && to.type === 'INPUT') {
            this.showTestResult('Cannot connect INPUT to INPUT', false);
            return;
        }
        
        // 防止输出端作为源
        if (from.type === 'OUTPUT') {
            this.showTestResult('Cannot connect from OUTPUT gate', false);
            return;
        }
        
        // 检查是否已存在连接
        if (this.connections.some(c => c.from === from && c.to === to)) return;
        
        // 检查目标门的输入数量限制
        const currentInputs = this.connections.filter(c => c.to === to).length;
        const maxInputs = this.getMaxInputs(to.type);
        if (currentInputs >= maxInputs) {
            this.showTestResult(`${to.type} gate can only have ${maxInputs} input(s)`, false);
            return;
        }
        
        this.connections.push(new Connection(from, to));
        to.inputs = to.inputs || [];
        if (!to.inputs.includes(from)) to.inputs.push(from);
        
        this.saveState(); // 保存状态用于撤销
        this.evaluateOnce();
        this.updateUndoRedoButtons();
        this.showSignalFlow = true;
        setTimeout(() => { this.showSignalFlow = false; }, 1000);
        this.draw();
    }
    
    getMaxInputs(gateType) {
        switch (gateType) {
            case 'NOT': return 1;
            case 'AND':
            case 'OR':
            case 'NAND':
            case 'NOR':
            case 'XOR': return 2;
            case 'OUTPUT': return 1;
            default: return 2;
        }
    }

    deleteConnection(connection) {
        const index = this.connections.indexOf(connection);
        if (index > -1) {
            this.connections.splice(index, 1);
            if (connection.to.inputs) {
                const inputIndex = connection.to.inputs.indexOf(connection.from);
                if (inputIndex > -1) {
                    connection.to.inputs.splice(inputIndex, 1);
                }
            }
            this.saveState(); // 保存状态用于撤销
            this.evaluateOnce();
            this.updateUndoRedoButtons();
            this.draw();
        }
    }

    evaluateOnce() {
        const nonInputGates = this.gates.filter(g => g.type !== 'INPUT');
        for (let i = 0; i < 4; i++) {
            nonInputGates.forEach(gate => {
                const inputs = (gate.inputs || []).map(src => src.value ?? false);
                gate.value = computeGateValue(gate.type, inputs);
            });
        }
    }

    testCircuit() {
        const level = this.levels.find(l => l.level_id === this.currentLevel);
        if (!level) return;
        const inputGates = this.gates.filter(g => g.type === 'INPUT');
        const outputGates = this.gates.filter(g => g.type === 'OUTPUT');
        if (outputGates.length === 0) {
            this.showTestResult('❌ Missing output gate, please build circuit as instructed', false);
            return;
        }
        
        // 检查每个门的输入是否足够
        this.errorGates = []; // 存储有错误的门
        const gateInputErrors = [];
        for (const gate of this.gates) {
            if (gate.type === 'INPUT' || gate.type === 'OUTPUT') continue;
            
            const inputCount = gate.inputs ? gate.inputs.length : 0;
            let requiredInputs = 1;
            if (gate.type === 'AND' || gate.type === 'OR' || gate.type === 'NAND' || gate.type === 'NOR' || gate.type === 'XOR') {
                requiredInputs = 2;
            }
            
            if (inputCount < requiredInputs) {
                gateInputErrors.push(`${gate.type} gate needs ${requiredInputs} input(s) but only has ${inputCount}`);
                this.errorGates.push(gate); // 记录有错误的门
            }
        }
        
        if (gateInputErrors.length > 0) {
            this.showTestResult('❌ ' + gateInputErrors.join('; '), false);
            this.draw(); // 重新绘制以显示高亮
            return;
        }
        
        // 保存INPUT门的原始值
        const originalValues = inputGates.map(g => g.value);
        
        const truth = level.truth_table || [];
        let allPass = true;
        let failReason = '';
        
        if (truth.length > 0) {
            for (let rowIndex = 0; rowIndex < truth.length; rowIndex++) {
                const row = truth[rowIndex];
                (row.inputs || []).forEach((v, i) => {
                    if (inputGates[i]) inputGates[i].value = !!v;
                });
                this.evaluateOnce();
                const outs = outputGates.map(g => g.value ?? false);
                const expected = Array.isArray(row.output) ? row.output : [row.output];
                if (outs.length !== expected.length || outs.some((v, i) => v !== !!expected[i])) {
                    allPass = false;
                    // 生成错误信息
                    const inputStr = (row.inputs || []).map((v, i) => `${inputGates[i]?.label || String.fromCharCode(65+i)}=${v?1:0}`).join(', ');
                    const expectedStr = expected.map(v => v?1:0).join(',');
                    const actualStr = outs.map(v => v?1:0).join(',');
                    failReason = `Test case failed: ${inputStr}. Expected output: ${expectedStr}, but got: ${actualStr}`;
                    break;
                }
            }
        } else {
            this.evaluateOnce();
            const outs = outputGates.map(g => g.value ?? false);
            const target = level.target_outputs || [];
            if (outs.length !== target.length || outs.some((v, i) => v !== !!target[i])) {
                allPass = false;
                const expectedStr = target.map(v => v?1:0).join(',');
                const actualStr = outs.map(v => v?1:0).join(',');
                failReason = `Expected output: ${expectedStr}, but got: ${actualStr}`;
            }
        }
        
        // 恢复INPUT门的原始值
        inputGates.forEach((gate, i) => {
            gate.value = originalValues[i];
        });
        this.evaluateOnce();
        
        if (allPass) {
            this.errorGates = []; // 清除错误高亮
            this.showTestResult('✅ Test passed, ready for next level', true);
            this.openModal();
            this.completedLevels.add(this.currentLevel);
            this.saveProgress();
            this.updateCompletedCount();
            this.generateLevelButtons();
            this.showSignalFlow = true;
            setTimeout(() => { this.showSignalFlow = false; }, 2000);
        } else {
            this.showTestResult(`❌ ${failReason}`, false);
        }
        this.draw();
    }

    showTestResult(message, success) {
        const resultElement = document.getElementById('test-result');
        const resultContainer = document.getElementById('test-result-container');
        if (resultElement) { resultElement.textContent = message; }
        if (resultContainer) {
            resultContainer.className = 'test-result-container ' + (success ? 'success' : (message.includes('Ready') || message.includes('Undo') || message.includes('Redo') || message.includes('Cleared') ? 'info' : 'error'));
        }
        const nextBtn = document.getElementById('next-level');
        if (nextBtn) nextBtn.disabled = !success;
    }

    clearCircuit() {
        this.gates = this.gates.filter(gate => gate.isFixed);
        this.connections = [];
        this.gates.forEach(g => { g.inputs = []; });
        this.saveState(); // 保存状态用于撤销
        this.updateGateCount();
        this.updateUndoRedoButtons();
        const nextBtn = document.getElementById('next-level');
        if (nextBtn) nextBtn.disabled = true;
        const res = document.getElementById('test-result');
        if (res) { res.textContent = 'Circuit cleared'; res.className = ''; }
        this.draw();
    }
    
    // 确认删除门
    confirmDelete(confirmed) {
        const deleteModal = document.getElementById('delete-modal');
        if (deleteModal) {
            deleteModal.style.display = 'none';
        }
        
        if (confirmed && this.gateToDelete) {
            this.deleteGate(this.gateToDelete);
        }
        this.gateToDelete = null;
    }
    
    // 获取门的颜色
    getGateColor(type) {
        switch(type) {
            case 'AND': return '#4299e1';
            case 'OR': return '#ed8936';
            case 'NOT': return '#9f7aea';
            case 'NAND': return '#38b2ac';
            case 'NOR': return '#e53e3e';
            case 'XOR': return '#d69e2e';
            default: return '#718096';
        }
    }
    
    // 保存当前状态到历史记录
    saveState() {
        // 移除当前索引之后的所有历史记录
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // 保存当前状态
        const state = {
            gates: this.gates.map(g => ({
                type: g.type,
                x: g.x,
                y: g.y,
                value: g.value,
                isFixed: g.isFixed,
                label: g.label
            })),
            connections: this.connections.map(c => ({
                fromIndex: this.gates.indexOf(c.from),
                toIndex: this.gates.indexOf(c.to)
            }))
        };
        
        this.history.push(state);
        this.historyIndex++;
        
        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    // 撤销
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            this.showTestResult('Undo', false);
        }
        this.updateUndoRedoButtons();
    }
    
    // 重做
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            this.showTestResult('Redo', false);
        }
        this.updateUndoRedoButtons();
    }
    
    // 更新撤销/重做按钮状态
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }
    
    // 恢复状态
    restoreState(state) {
        // 恢复门
        this.gates = state.gates.map(g => {
            const gate = new Gate(g.type, g.x, g.y, g.value);
            gate.isFixed = g.isFixed;
            gate.label = g.label;
            return gate;
        });
        
        // 恢复连接
        this.connections = state.connections.map(c => {
            const from = this.gates[c.fromIndex];
            const to = this.gates[c.toIndex];
            to.inputs = to.inputs || [];
            if (!to.inputs.includes(from)) to.inputs.push(from);
            return new Connection(from, to);
        });
        
        this.updateGateCount();
        this.evaluateOnce();
        this.updateUndoRedoButtons();
        this.draw();
    }

    nextLevel() {
        const nextId = this.currentLevel + 1;
        if (this.levels.some(l => l.level_id === nextId)) {
            this.closeModal();
            this.loadLevel(nextId);
        } else {
            this.closeModal();
            this.showTestResult('All levels completed, great job!', true);
        }
    }

    openModal() {
        const modal = document.getElementById('success-modal');
        if (modal) modal.style.display = 'flex';
    }
    closeModal() {
        const modal = document.getElementById('success-modal');
        if (modal) modal.style.display = 'none';
    }

    // 保存进度到localStorage
    saveProgress() {
        const progress = {
            currentLevel: this.currentLevel,
            completedLevels: Array.from(this.completedLevels),
            timestamp: Date.now()
        };
        try {
            localStorage.setItem('circuitGameProgress', JSON.stringify(progress));
        } catch (e) {
            console.warn('Unable to save progress:', e);
        }
    }

    // 从localStorage加载进度
    loadProgress() {
        try {
            const saved = localStorage.getItem('circuitGameProgress');
            if (saved) {
                const progress = JSON.parse(saved);
                this.currentLevel = progress.currentLevel || this.currentLevel;
                this.completedLevels = new Set(progress.completedLevels || []);
            }
        } catch (e) {
            console.warn('Unable to load progress:', e);
        }
    }
}

// 逻辑门类
class Gate {
    constructor(type, x, y, value = false) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.value = value;
        this.width = 60;
        this.height = 40;
        this.inputs = [];
        this.isFixed = false;
        this.label = ''; // 用于输入门的标签 (A, B, C...)
    }

    contains(x, y) {
        return x >= this.x - this.width / 2 && x <= this.x + this.width / 2 &&
               y >= this.y - this.height / 2 && y <= this.y + this.height / 2;
    }

    draw(ctx, isError = false) {
        ctx.save();
        
        // 如果有错误，绘制红色高亮边框
        if (isError) {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 4;
            ctx.strokeRect(this.x - this.width / 2 - 5, this.y - this.height / 2 - 5, this.width + 10, this.height + 10);
            ctx.shadowBlur = 0;
        }
        
        const color = this.getColor();
        ctx.fillStyle = color;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        
        // 根据门类型绘制不同形状
        if (this.type === 'INPUT' || this.type === 'OUTPUT') {
            // INPUT 和 OUTPUT 保持矩形
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        } else if (this.type === 'NOT') {
            // NOT 门 - 三角形 + 圆圈
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 2, this.y - this.height / 2);
            ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
            ctx.lineTo(this.x + this.width / 3, this.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // 输出端的小圆圈
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2 - 5, this.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'AND') {
            // AND 门 - D形状
            const centerX = this.x - this.width / 6;
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 2, this.y - this.height / 2);
            ctx.lineTo(centerX, this.y - this.height / 2);
            ctx.arc(centerX, this.y, this.height / 2, -Math.PI / 2, Math.PI / 2, false);
            ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'OR') {
            // OR 门 - 弧形
            ctx.beginPath();
            // 左侧输入弧线
            ctx.moveTo(this.x - this.width / 2, this.y - this.height / 2);
            ctx.quadraticCurveTo(this.x - this.width / 3, this.y, this.x - this.width / 2, this.y + this.height / 2);
            // 底部到输出
            ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
            ctx.quadraticCurveTo(this.x, this.y + this.height / 3, this.x + this.width / 3, this.y);
            // 输出到顶部
            ctx.quadraticCurveTo(this.x, this.y - this.height / 3, this.x - this.width / 2, this.y - this.height / 2);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'NAND') {
            // NAND 门 - AND + 圆圈
            const centerX = this.x - this.width / 6;
            const bubbleRadius = 5;
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 2, this.y - this.height / 2);
            ctx.lineTo(centerX - bubbleRadius, this.y - this.height / 2);
            ctx.arc(centerX - bubbleRadius, this.y, this.height / 2, -Math.PI / 2, Math.PI / 2, false);
            ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // 输出端的小圆圈
            ctx.beginPath();
            ctx.arc(centerX - bubbleRadius + this.height / 2 + bubbleRadius, this.y, bubbleRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'NOR') {
            // NOR 门 - OR + 圆圈
            const bubbleRadius = 5;
            ctx.beginPath();
            // 左侧输入弧线
            ctx.moveTo(this.x - this.width / 2, this.y - this.height / 2);
            ctx.quadraticCurveTo(this.x - this.width / 3, this.y, this.x - this.width / 2, this.y + this.height / 2);
            // 底部到输出（留出圆圈空间）
            ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
            ctx.quadraticCurveTo(this.x, this.y + this.height / 3, this.x + this.width / 3 - bubbleRadius * 2, this.y);
            // 输出到顶部
            ctx.quadraticCurveTo(this.x, this.y - this.height / 3, this.x - this.width / 2, this.y - this.height / 2);
            ctx.fill();
            ctx.stroke();
            
            // 输出端的小圆圈
            ctx.beginPath();
            ctx.arc(this.x + this.width / 3, this.y, bubbleRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'XOR') {
            // XOR 门 - OR + 额外弧线
            // 额外的输入弧线
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 2 - 8, this.y - this.height / 2);
            ctx.quadraticCurveTo(this.x - this.width / 2 - 5, this.y, this.x - this.width / 2 - 8, this.y + this.height / 2);
            ctx.stroke();
            
            // 主体
            ctx.beginPath();
            // 左侧输入弧线
            ctx.moveTo(this.x - this.width / 2, this.y - this.height / 2);
            ctx.quadraticCurveTo(this.x - this.width / 3, this.y, this.x - this.width / 2, this.y + this.height / 2);
            // 底部到输出
            ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
            ctx.quadraticCurveTo(this.x, this.y + this.height / 3, this.x + this.width / 3, this.y);
            // 输出到顶部
            ctx.quadraticCurveTo(this.x, this.y - this.height / 3, this.x - this.width / 2, this.y - this.height / 2);
            ctx.fill();
            ctx.stroke();
        }
        
        // 绘制文本
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        
        // 显示门类型或标签
        if (this.type === 'INPUT' && this.label) {
            ctx.fillText(this.label, this.x, this.y - 5);
            ctx.fillText(this.value ? '1' : '0', this.x, this.y + 8);
        } else if (this.type === 'OUTPUT') {
            ctx.fillText('OUT', this.x, this.y - 5);
            ctx.fillText(this.value ? '1' : '0', this.x, this.y + 8);
        } else {
            // 对于逻辑门，根据形状调整文字位置
            let textX = this.x;
            if (this.type === 'AND' || this.type === 'NAND') {
                // AND 和 NAND 门的文字向左偏移更多
                textX = this.x - this.width / 5;
            } else if (this.type === 'OR' || this.type === 'NOR' || this.type === 'XOR') {
                // OR 系列门的文字稍微向左偏移
                textX = this.x - this.width / 10;
            } else if (this.type === 'NOT') {
                // NOT 门的文字向左偏移
                textX = this.x - this.width / 5;
            }
            ctx.fillText(this.type, textX, this.y);
        }
        
        ctx.restore();
    }

    getColor() {
        switch (this.type) {
            case 'INPUT': return this.value ? '#48bb78' : '#f56565';
            case 'OUTPUT': return this.value ? '#48bb78' : '#f56565'; // 改为1绿色0红色
            case 'AND': return '#4299e1';
            case 'OR': return '#ed8936';
            case 'NOT': return '#9f7aea';
            case 'NAND': return '#38b2ac';
            case 'NOR': return '#e53e3e';
            case 'XOR': return '#d69e2e';
            default: return '#718096';
        }
    }
}

// 连接类
class Connection {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }

    // 获取门的输出连接点（右侧）
    getOutputPoint(gate) {
        return getGateOutputPoint(gate);
    }

    // 获取门的输入连接点（左侧）
    getInputPoint(gate, yOffset = 0) {
        return getGateInputPoint(gate, yOffset);
    }

    draw(ctx, showSignalFlow = false, animationTime = 0) {
        ctx.save();

        // 获取源门的输出点
        const fromPoint = this.getOutputPoint(this.from);
        const fromX = fromPoint.x;
        const fromY = fromPoint.y;

        // 计算到达目标门的偏移量（处理多个输入）
        const toGate = this.to;
        const connectionsToTarget = ctx.canvas.gameState.connections.filter(c => c.to === toGate);
        const connectionIndex = connectionsToTarget.indexOf(this);
        const totalConnections = connectionsToTarget.length;

        // 根据连接数量计算垂直偏移 - 将输入点分布在门的左侧
        let yOffset = 0;
        if (totalConnections > 1) {
            // 使用更大的间距来避免重叠
            const availableHeight = toGate.height * 0.7; // 使用门高度的70%
            const spacing = availableHeight / (totalConnections - 1);
            yOffset = -availableHeight / 2 + spacing * connectionIndex;
        }

        // 获取目标门的输入点
        const toPoint = this.getInputPoint(toGate, yOffset);
        const toX = toPoint.x;
        const toY = toPoint.y;
        
        // 计算线的长度和方向
        const dx = toX - fromX;
        const dy = toY - fromY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // 根据信号值选择颜色
        const signalValue = this.from.value ?? false;
        const baseColor = signalValue ? '#48bb78' : '#4a5568';
        const activeColor = signalValue ? '#22c55e' : '#94a3b8';
        
        // 使用贝塞尔曲线绘制连接线，避免直线重叠
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        
        // 计算控制点，使曲线更平滑并减少重叠
        // 根据连接顺序给控制点添加垂直偏移，确保从同一源门出发的线不重叠
        const controlOffset = Math.min(length * 0.5, 100);
        
        // 计算源门的发射偏移（多条线从同一个门出发时分散）
        const connectionsFromSource = ctx.canvas.gameState.connections.filter(c => c.from === this.from);
        const fromIndex = connectionsFromSource.indexOf(this);
        const fromTotal = connectionsFromSource.length;
        let fromYOffset = 0;
        if (fromTotal > 1) {
            const fromSpacing = 30; // 源门发射点的间距
            fromYOffset = -fromSpacing * (fromTotal - 1) / 2 + fromSpacing * fromIndex;
        }
        
        const cp1x = fromX + controlOffset;
        const cp1y = fromY + fromYOffset; // 源门控制点添加偏移
        const cp2x = toX - controlOffset;
        const cp2y = toY; // 目标门控制点保持yOffset
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toX, toY);
        ctx.stroke();
        
        // 绘制箭头 - 在曲线末端
        const arrowSize = 8;
        // 计算箭头方向（使用曲线末端的切线方向）
        const arrowAngle = Math.atan2(toY - cp2y, toX - cp2x);
        const arrowX = toX - arrowSize * Math.cos(arrowAngle);
        const arrowY = toY - arrowSize * Math.sin(arrowAngle);
        
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            arrowX - arrowSize * 0.5 * Math.sin(arrowAngle),
            arrowY + arrowSize * 0.5 * Math.cos(arrowAngle)
        );
        ctx.lineTo(
            arrowX + arrowSize * 0.5 * Math.sin(arrowAngle),
            arrowY - arrowSize * 0.5 * Math.cos(arrowAngle)
        );
        ctx.closePath();
        ctx.fill();
        
        // 如果显示信号流动，绘制动画效果
        if (showSignalFlow && signalValue) {
            // 计算信号脉冲的位置（沿贝塞尔曲线移动）
            const pulseSpeed = 0.3; // 脉冲速度
            const t = (animationTime * pulseSpeed) % 1;
            
            // 计算贝塞尔曲线上的点
            const mt = 1 - t;
            const pulseX = mt * mt * mt * fromX + 
                          3 * mt * mt * t * cp1x + 
                          3 * mt * t * t * cp2x + 
                          t * t * t * toX;
            const pulseY = mt * mt * mt * fromY + 
                          3 * mt * mt * t * cp1y + 
                          3 * mt * t * t * cp2y + 
                          t * t * t * toY;
            
            // 绘制信号脉冲（一个移动的亮点）
            ctx.save();
            ctx.fillStyle = '#ffff00'; // 黄色脉冲
            ctx.beginPath();
            ctx.arc(pulseX, pulseY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制脉冲光晕
            const gradient = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, 10);
            gradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pulseX, pulseY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // 绘制高亮连接线
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toX, toY);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// 获取门的输出连接点（右侧）
function getGateOutputPoint(gate) {
    switch (gate.type) {
        case 'INPUT':
        case 'OUTPUT':
            return { x: gate.x + gate.width / 2, y: gate.y };
        case 'NOT':
            return { x: gate.x + gate.width / 2, y: gate.y };
        case 'AND':
        case 'NAND':
            const centerX = gate.x - gate.width / 6;
            return { x: centerX + gate.height / 2, y: gate.y };
        case 'OR':
        case 'XOR':
            return { x: gate.x + gate.width / 3, y: gate.y };
        case 'NOR':
            return { x: gate.x + gate.width / 3 + 5, y: gate.y };
        default:
            return { x: gate.x + gate.width / 2, y: gate.y };
    }
}

// 获取门的输入连接点（左侧）
function getGateInputPoint(gate, yOffset = 0) {
    switch (gate.type) {
        case 'INPUT':
        case 'OUTPUT':
            return { x: gate.x - gate.width / 2, y: gate.y + yOffset };
        case 'NOT':
            return { x: gate.x - gate.width / 2, y: gate.y + yOffset };
        case 'AND':
        case 'NAND':
            return { x: gate.x - gate.width / 2, y: gate.y + yOffset };
        case 'OR':
        case 'NOR':
        case 'XOR':
            return { x: gate.x - gate.width / 2 + 5, y: gate.y + yOffset };
        default:
            return { x: gate.x - gate.width / 2, y: gate.y + yOffset };
    }
}

// 逻辑门输出计算
function computeGateValue(type, inputs) {
    switch (type) {
        case 'OUTPUT': return inputs[0] ?? false;
        case 'AND': return inputs.length > 0 && inputs.every(Boolean);
        case 'OR': return inputs.some(Boolean);
        case 'NOT': return !(inputs[0] ?? false);
        case 'NAND': return !(inputs.length > 0 && inputs.every(Boolean));
        case 'NOR': return !inputs.some(Boolean);
        case 'XOR': return (inputs.filter(Boolean).length % 2) === 1;
        default: return false;
    }
}

// 初始化游戏
const game = new GameState();
window.addEventListener('DOMContentLoaded', () => { game.loadLevels(); });