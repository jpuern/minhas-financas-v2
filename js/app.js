// ========================================
// MINHAS FINANÇAS - APP DE CONTROLE FINANCEIRO
// COM SUPABASE
// ========================================

// Estado da aplicação
const state = {
    user: null,
    transactions: [],
    categories: {
        income: [],
        expense: []
    },
    currentMonth: new Date(),
    currentSection: 'dashboard',
    editingTransaction: null,
    charts: {},
    isLoading: false
};

// Meses em português
const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Maio', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Mostra loading
    showPageLoading(true);
    
    try {
        // Verifica se está logado
        const user = await auth.getUser();
        
        if (!user) {
            // Não está logado, redireciona para login
            window.location.href = 'login.html';
            return;
        }
        
        // Salva usuário no state
        state.user = user;
        
        // Carrega dados do banco
        await loadDataFromDB();
        
        // Inicializa o app
        initializeApp();
        setupEventListeners();
        updateUI();
        
        // Mostra nome do usuário (opcional)
        showUserInfo();
        updateSidebarUserInfo();
        updateConnectionStatus();
        initClearDataModal();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao carregar dados. Tente novamente.', 'error');
    } finally {
        showPageLoading(false);
    }
});

// Carrega dados do Supabase
async function loadDataFromDB() {
    try {
        // Carrega categorias
        const categories = await db.categories.getAll();
        state.categories = {
            income: categories.filter(c => c.type === 'income'),
            expense: categories.filter(c => c.type === 'expense')
        };
        
        // Carrega transações do mês atual
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth();
        state.transactions = await db.transactions.getByMonth(year, month);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    }
}

function initializeApp() {
    updateMonthDisplay();
    setDefaultDate();
}

// Mostra informações do usuário
function showUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    
    if (userNameEl && state.user) {
        userNameEl.textContent = state.user.user_metadata?.name || 
                                  state.user.email?.split('@')[0] || 
                                  'Usuário';
    }
    
    if (userEmailEl && state.user) {
        userEmailEl.textContent = state.user.email;
    }
}

// Loading da página
function showPageLoading(show) {
    let loader = document.getElementById('pageLoader');
    
    if (!loader && show) {
        loader = document.createElement('div');
        loader.id = 'pageLoader';
        loader.className = 'page-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="spinner"></div>
                <span>Carregando...</span>
            </div>
        `;
        document.body.appendChild(loader);
    }
    
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}
// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });
    
    // Menu mobile
    document.getElementById('menuToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarClose')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);
    
    // Fechar sidebar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSidebar();
    });
    
    // Seletor de mês
    document.getElementById('prevMonth')?.addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth')?.addEventListener('click', () => changeMonth(1));
    
    // Modal de transação
    document.getElementById('btnAddTransaction')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('closeModal')?.addEventListener('click', closeTransactionModal);
    document.getElementById('cancelTransaction')?.addEventListener('click', closeTransactionModal);
    document.getElementById('transactionForm')?.addEventListener('submit', handleTransactionSubmit);
    
    // Tipo de transação
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', handleTypeToggle);
    });
    
    // Modal de categoria
    document.querySelectorAll('.btn-add-category').forEach(btn => {
        btn.addEventListener('click', openCategoryModal);
    });
    document.getElementById('closeCategoryModal')?.addEventListener('click', closeCategoryModal);
    document.getElementById('cancelCategory')?.addEventListener('click', closeCategoryModal);
    document.getElementById('categoryForm')?.addEventListener('submit', handleCategorySubmit);
    
    // Icon picker
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.addEventListener('click', handleIconSelect);
    });
    
    // Color picker
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', handleColorSelect);
    });
    
    // Filtros de transações
    document.getElementById('filterType')?.addEventListener('change', filterTransactions);
    document.getElementById('filterCategory')?.addEventListener('change', filterTransactions);
    document.getElementById('searchTransaction')?.addEventListener('input', filterTransactions);
    
    // Máscara de valor
    document.getElementById('amount')?.addEventListener('input', handleAmountInput);
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    // Fechar modal clicando fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Logout
async function handleLogout() {
    if (confirm('Deseja sair da sua conta?')) {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            showToast('Erro ao sair. Tente novamente.', 'error');
        }
    }
}

// ========================================
// NAVEGAÇÃO
// ========================================
function handleNavigation(e) {
    e.preventDefault();
    const section = e.currentTarget.dataset.section;
    
    // Atualiza nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // Atualiza seção
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(section)?.classList.add('active');
    
    // Atualiza título
    const titles = {
        dashboard: 'Dashboard',
        transacoes: 'Transações',
        categorias: 'Categorias',
        relatorios: 'Relatórios'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[section];
    
    state.currentSection = section;
    
    // Fecha sidebar em mobile
    closeSidebar();
    
    // Atualiza UI da seção
    if (section === 'transacoes') updateTransactionsTable();
    if (section === 'categorias') updateCategoriesUI();
    if (section === 'relatorios') updateReportsUI();
}

// ========================================
// SIDEBAR MOBILE
// ========================================
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const isOpen = sidebar?.classList.contains('active');
    
    if (isOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

function openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar?.classList.add('active');
    overlay?.classList.add('active');
    document.body.classList.add('sidebar-open');
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar?.classList.remove('active');
    overlay?.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

// ========================================
// CONTROLE DE MÊS
// ========================================
async function changeMonth(delta) {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + delta);
    updateMonthDisplay();
    
    // Recarrega transações do novo mês do banco
    showPageLoading(true);
    try {
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth();
        state.transactions = await db.transactions.getByMonth(year, month);
        updateUI();
    } catch (error) {
        console.error('Erro ao carregar mês:', error);
        showToast('Erro ao carregar transações', 'error');
    } finally {
        showPageLoading(false);
    }
}

function updateMonthDisplay() {
    const month = monthNames[state.currentMonth.getMonth()];
    const year = state.currentMonth.getFullYear();
    const el = document.getElementById('currentMonth');
    if (el) el.textContent = `${month} ${year}`;
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = today;
}

// ========================================
// MODAL DE TRANSAÇÃO
// ========================================
function openTransactionModal(transaction = null) {
    const modal = document.getElementById('transactionModal');
    const form = document.getElementById('transactionForm');
    
    if (transaction) {
        // Modo edição
        state.editingTransaction = transaction;
        document.getElementById('modalTitle').textContent = 'Editar Transação';
        document.getElementById('transactionId').value = transaction.id;
        document.getElementById('description').value = transaction.description;
        document.getElementById('amount').value = formatCurrency(transaction.amount).replace('R$ ', '');
        document.getElementById('date').value = transaction.date;
        document.getElementById('notes').value = transaction.notes || '';
        
        // Seleciona tipo
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === transaction.type);
        });
        
        updateCategorySelect(transaction.type);
        setTimeout(() => {
            document.getElementById('category').value = transaction.category_id || transaction.categoryId;
        }, 100);
    } else {
        // Modo novo
        state.editingTransaction = null;
        document.getElementById('modalTitle').textContent = 'Nova Transação';
        form.reset();
        setDefaultDate();
        
        // Reset tipo para receita
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === 'income');
        });
        
        updateCategorySelect('income');
    }
    
    modal?.classList.add('active');
}

function closeTransactionModal() {
    document.getElementById('transactionModal')?.classList.remove('active');
    state.editingTransaction = null;
}

function handleTypeToggle(e) {
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    const type = e.currentTarget.dataset.type;
    updateCategorySelect(type);
}

function updateCategorySelect(type) {
    const select = document.getElementById('category');
    const categories = state.categories[type] || [];
    
    if (select) {
        select.innerHTML = '<option value="">Selecione uma categoria</option>';
        categories.forEach(cat => {
            select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    }
    
    // Atualiza também o filtro de categorias
    updateFilterCategories();
}

function handleAmountInput(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value) {
        value = (parseInt(value) / 100).toFixed(2);
        value = value.replace('.', ',');
        value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    e.target.value = value;
}

// Submit da transação - SALVA NO BANCO
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const type = document.querySelector('.type-btn.active')?.dataset.type;
    const description = document.getElementById('description').value.trim();
    const amountStr = document.getElementById('amount').value.replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(amountStr);
    const date = document.getElementById('date').value;
    const categoryId = parseInt(document.getElementById('category').value);
    const notes = document.getElementById('notes').value.trim();
    
    if (!description || !amount || !date || !categoryId) {
        showToast('Preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    // Desabilita botão durante o salvamento
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }
    
    try {
        if (state.editingTransaction) {
            // Atualiza transação existente no banco
            const updated = await db.transactions.update(state.editingTransaction.id, {
                type,
                description,
                amount,
                date,
                category_id: categoryId,
                notes
            });
            
            // Atualiza no state local
            const index = state.transactions.findIndex(t => t.id === state.editingTransaction.id);
            if (index !== -1) {
                state.transactions[index] = updated;
            }
            
            showToast('Transação atualizada com sucesso!', 'success');
        } else {
            // Cria nova transação no banco
            const created = await db.transactions.create({
                type,
                description,
                amount,
                date,
                category_id: categoryId,
                notes
            });
            
            // Adiciona no state local
            state.transactions.unshift(created);
            
            showToast('Transação adicionada com sucesso!', 'success');
        }
        
        closeTransactionModal();
        updateUI();
        
    } catch (error) {
        console.error('Erro ao salvar transação:', error);
        showToast('Erro ao salvar transação. Tente novamente.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Salvar';
        }
    }
}

// ========================================
// MODAL DE CATEGORIA
// ========================================
function openCategoryModal(e) {
    const type = e.currentTarget.dataset.type;
    document.getElementById('categoryType').value = type;
    document.getElementById('categoryModalTitle').textContent = 
        `Nova Categoria de ${type === 'income' ? 'Receita' : 'Despesa'}`;
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryModal').classList.add('active');
    
    // Reset seleções
    document.querySelectorAll('.icon-option').forEach((btn, i) => {
        btn.classList.toggle('active', i === 0);
    });
    document.querySelectorAll('.color-option').forEach((btn, i) => {
        btn.classList.toggle('active', i === 0);
    });
    document.getElementById('categoryIcon').value = 'fas fa-question';
    document.getElementById('categoryColor').value = '#4CAF50';
}

function closeCategoryModal() {
    document.getElementById('categoryModal')?.classList.remove('active');
}

function handleIconSelect(e) {
    document.querySelectorAll('.icon-option').forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    document.getElementById('categoryIcon').value = e.currentTarget.dataset.icon;
}

function handleColorSelect(e) {
    document.querySelectorAll('.color-option').forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    document.getElementById('categoryColor').value = e.currentTarget.dataset.color;
}

// Submit da categoria - SALVA NO BANCO
async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('categoryType').value;
    const name = document.getElementById('categoryName').value.trim();
    const icon = document.getElementById('categoryIcon').value;
    const color = document.getElementById('categoryColor').value;
    
    if (!name) {
        showToast('Digite o nome da categoria', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }
    
    try {
        // Cria categoria no banco
        const created = await db.categories.create({
            type,
            name,
            icon,
            color
        });
        
        // Adiciona no state local
        state.categories[type].push(created);
        
        closeCategoryModal();
        updateCategoriesUI();
        updateFilterCategories();
        showToast('Categoria criada com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        showToast('Erro ao criar categoria. Tente novamente.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Salvar';
        }
    }
}

// Deleta categoria - REMOVE DO BANCO
async function deleteCategory(type, id) {
    // Verifica se há transações usando esta categoria
    const hasTransactions = state.transactions.some(t => 
        (t.category_id || t.categoryId) === id
    );
    
    if (hasTransactions) {
        showToast('Não é possível excluir uma categoria com transações', 'error');
        return;
    }
    
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
        try {
            await db.categories.delete(id);
            
            // Remove do state local
            state.categories[type] = state.categories[type].filter(c => c.id !== id);
            
            updateCategoriesUI();
            updateFilterCategories();
            showToast('Categoria excluída', 'success');
            
        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
            showToast('Erro ao excluir categoria', 'error');
        }
    }
}

// ========================================
// TRANSAÇÕES
// ========================================
function getFilteredTransactions() {
    // No modo banco de dados, as transações já vêm filtradas por mês
    return state.transactions;
}

// Deleta transação - REMOVE DO BANCO
async function deleteTransaction(id) {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
        try {
            await db.transactions.delete(id);
            
            // Remove do state local
            state.transactions = state.transactions.filter(t => t.id !== id);
            
            updateUI();
            showToast('Transação excluída', 'success');
            
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            showToast('Erro ao excluir transação', 'error');
        }
    }
}

function editTransaction(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (transaction) {
        openTransactionModal(transaction);
    }
}

function filterTransactions() {
    updateTransactionsTable();
}

function updateFilterCategories() {
    const select = document.getElementById('filterCategory');
    if (!select) return;
    
    const allCategories = [...state.categories.income, ...state.categories.expense];
    
    select.innerHTML = '<option value="all">Todas as categorias</option>';
    allCategories.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
}

// ========================================
// ATUALIZAÇÃO DA UI
// ========================================
function updateUI() {
    updateSummaryCards();
    updateRecentTransactions();
    updateExpenseChart();
    updateProgressBars();
    updateTransactionsTable();
    updateCategoriesUI();
    updateFilterCategories();
}

function updateSummaryCards() {
    const transactions = getFilteredTransactions();
    
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const balance = income - expense;
    const economyRate = income > 0 ? ((income - expense) / income * 100) : 0;
    
    const balanceEl = document.getElementById('totalBalance');
    const incomeEl = document.getElementById('totalIncome');
    const expenseEl = document.getElementById('totalExpense');
    const economyEl = document.getElementById('totalEconomy');
    
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(balance);
        balanceEl.style.color = balance >= 0 ? '#818cf8' : '#ef4444';
    }
    if (incomeEl) incomeEl.textContent = formatCurrency(income);
    if (expenseEl) expenseEl.textContent = formatCurrency(expense);
    if (economyEl) economyEl.textContent = `${economyRate.toFixed(1)}%`;
}

function updateRecentTransactions() {
    const container = document.getElementById('recentTransactionsList');
    if (!container) return;
    
    const transactions = getFilteredTransactions()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Nenhuma transação neste mês</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = transactions.map(t => {
        const category = getCategoryById(t.category_id || t.categoryId) || t.category;
        return `
            <div class="transaction-item">
                <div class="transaction-left">
                    <div class="transaction-icon" style="background: ${category?.color}20; color: ${category?.color}">
                        <i class="${category?.icon || 'fas fa-question'}"></i>
                    </div>
                    <div class="transaction-info">
                        <h4>${t.description}</h4>
                        <span>${formatDate(t.date)} • ${category?.name || 'Sem categoria'}</span>
                    </div>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                </div>
            </div>
        `;
    }).join('');
}

function updateExpenseChart() {
    const transactions = getFilteredTransactions().filter(t => t.type === 'expense');
    
    const categoryTotals = {};
    transactions.forEach(t => {
        const category = getCategoryById(t.category_id || t.categoryId) || t.category;
        if (category) {
            if (!categoryTotals[category.name]) {
                categoryTotals[category.name] = { total: 0, color: category.color };
            }
            categoryTotals[category.name].total += parseFloat(t.amount);
        }
    });
    
    const labels = Object.keys(categoryTotals);
    const data = labels.map(l => categoryTotals[l].total);
    const colors = labels.map(l => categoryTotals[l].color);
    
    const legendContainer = document.getElementById('chartLegend');
    if (legendContainer) {
        legendContainer.innerHTML = labels.map((label, i) => `
            <div class="legend-item">
                <span class="legend-color" style="background: ${colors[i]}"></span>
                <span>${label}: ${formatCurrency(data[i])}</span>
            </div>
        `).join('');
    }
    
    const canvas = document.getElementById('expenseChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (state.charts.expense) {
        state.charts.expense.destroy();
    }
    
    if (data.length === 0) {
        if (legendContainer) {
            legendContainer.innerHTML = '<p style="color: var(--text-muted)">Sem despesas neste mês</p>';
        }
        return;
    }
    
    state.charts.expense = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            cutout: '70%'
        }
    });
}

function updateProgressBars() {
    const transactions = getFilteredTransactions();
    
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const maxValue = Math.max(income, expense, 1);
    
    const incomeProgressEl = document.getElementById('incomeProgress');
    const expenseProgressEl = document.getElementById('expenseProgress');
    const incomeBarEl = document.getElementById('incomeBar');
    const expenseBarEl = document.getElementById('expenseBar');
    
    if (incomeProgressEl) incomeProgressEl.textContent = formatCurrency(income);
    if (expenseProgressEl) expenseProgressEl.textContent = formatCurrency(expense);
    if (incomeBarEl) incomeBarEl.style.width = `${(income / maxValue) * 100}%`;
    if (expenseBarEl) expenseBarEl.style.width = `${(expense / maxValue) * 100}%`;
}

// ========================================
// TABELA DE TRANSAÇÕES
// ========================================
function updateTransactionsTable() {
    const filterType = document.getElementById('filterType')?.value || 'all';
    const filterCategory = document.getElementById('filterCategory')?.value || 'all';
    const search = document.getElementById('searchTransaction')?.value?.toLowerCase() || '';
    
    let transactions = getFilteredTransactions();
    
    // Aplicar filtros
    if (filterType !== 'all') {
        transactions = transactions.filter(t => t.type === filterType);
    }
    
    if (filterCategory !== 'all') {
        transactions = transactions.filter(t => 
            (t.category_id || t.categoryId) === parseInt(filterCategory)
        );
    }
    
    if (search) {
        transactions = transactions.filter(t => 
            t.description.toLowerCase().includes(search)
        );
    }
    
    // Ordenar por data (mais recente primeiro)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;
    
    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Nenhuma transação encontrada</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = transactions.map(t => {
        const category = getCategoryById(t.category_id || t.categoryId) || t.category;
        return `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td>${t.description}</td>
                <td>
                    <span style="color: ${category?.color}">
                        <i class="${category?.icon}"></i> ${category?.name || 'N/A'}
                    </span>
                </td>
                <td>
                    <span class="type-badge ${t.type}">
                        <i class="fas fa-arrow-${t.type === 'income' ? 'up' : 'down'}"></i>
                        ${t.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                </td>
                <td style="color: ${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}; font-weight: 600">
                    ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action btn-edit" onclick="editTransaction(${t.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteTransaction(${t.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ========================================
// CATEGORIAS UI
// ========================================
function updateCategoriesUI() {
    // Categorias de receita
    const incomeList = document.getElementById('incomeCategoriesList');
    if (incomeList) {
        incomeList.innerHTML = state.categories.income.map(cat => `
            <div class="category-item">
                <div class="category-left">
                    <div class="category-icon" style="background: ${cat.color}">
                        <i class="${cat.icon}"></i>
                    </div>
                    <span class="category-name">${cat.name}</span>
                </div>
                <div class="category-actions">
                    <button class="btn-action btn-delete" onclick="deleteCategory('income', ${cat.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Categorias de despesa
    const expenseList = document.getElementById('expenseCategoriesList');
    if (expenseList) {
        expenseList.innerHTML = state.categories.expense.map(cat => `
            <div class="category-item">
                <div class="category-left">
                    <div class="category-icon" style="background: ${cat.color}">
                        <i class="${cat.icon}"></i>
                    </div>
                    <span class="category-name">${cat.name}</span>
                </div>
                <div class="category-actions">
                    <button class="btn-action btn-delete" onclick="deleteCategory('expense', ${cat.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// ========================================
// RELATÓRIOS
// ========================================
async function updateReportsUI() {
    // Para relatórios, precisamos de todas as transações do ano
    try {
        const allTransactions = await db.transactions.getAll();
        updateYearlyChart(allTransactions);
        updateTopExpenses();
        updateCategoryBalance();
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
    }
}

function updateYearlyChart(allTransactions = state.transactions) {
    const year = state.currentMonth.getFullYear();
    const monthlyData = {
        income: Array(12).fill(0),
        expense: Array(12).fill(0)
    };
    
    allTransactions.forEach(t => {
        const date = new Date(t.date);
        if (date.getFullYear() === year) {
            monthlyData[t.type][date.getMonth()] += parseFloat(t.amount);
        }
    });
    
    const canvas = document.getElementById('yearlyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (state.charts.yearly) {
        state.charts.yearly.destroy();
    }
    
    state.charts.yearly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthNames.map(m => m.substring(0, 3)),
            datasets: [
                {
                    label: 'Receitas',
                    data: monthlyData.income,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                },
                {
                    label: 'Despesas',
                    data: monthlyData.expense,
                    backgroundColor: '#ef4444',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8' }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function updateTopExpenses() {
    const transactions = getFilteredTransactions().filter(t => t.type === 'expense');
    
    const categoryTotals = {};
    transactions.forEach(t => {
        const category = getCategoryById(t.category_id || t.categoryId) || t.category;
        if (category) {
            if (!categoryTotals[category.name]) {
                categoryTotals[category.name] = { total: 0, icon: category.icon, color: category.color };
            }
            categoryTotals[category.name].total += parseFloat(t.amount);
        }
    });
    
    const sorted = Object.entries(categoryTotals)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);
    
    const container = document.getElementById('topExpensesList');
    if (!container) return;
    
    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <p>Sem despesas neste mês</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = sorted.map(([name, data], index) => `
        <div class="top-expense-item">
            <div class="top-expense-rank">${index + 1}</div>
            <div class="top-expense-info">
                <h4><i class="${data.icon}" style="color: ${data.color}"></i> ${name}</h4>
            </div>
            <div class="top-expense-value">${formatCurrency(data.total)}</div>
        </div>
    `).join('');
}

function updateCategoryBalance() {
    const transactions = getFilteredTransactions().filter(t => t.type === 'expense');
    const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const categoryTotals = {};
    transactions.forEach(t => {
        const category = getCategoryById(t.category_id || t.categoryId) || t.category;
        if (category) {
            if (!categoryTotals[category.name]) {
                categoryTotals[category.name] = { total: 0, count: 0 };
            }
            categoryTotals[category.name].total += parseFloat(t.amount);
            categoryTotals[category.name].count++;
        }
    });
    
    const tbody = document.getElementById('categoryBalanceBody');
    if (!tbody) return;
    
    if (Object.keys(categoryTotals).length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 40px">
                    Sem dados para exibir
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = Object.entries(categoryTotals)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, data]) => `
            <tr>
                <td>${name}</td>
                <td style="font-weight: 600">${formatCurrency(data.total)}</td>
                <td>${total > 0 ? ((data.total / total) * 100).toFixed(1) : 0}%</td>
                <td>${formatCurrency(data.total / (data.count || 1))}</td>
            </tr>
        `).join('');
}

// ========================================
// UTILITÁRIOS
// ========================================
function getCategoryById(id) {
    if (!id) return null;
    return [...state.categories.income, ...state.categories.expense]
        .find(c => c.id === id);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// EXPORTAR / IMPORTAR DADOS (BACKUP LOCAL)
// ========================================
async function exportData() {
    try {
        // Pega todas as transações do banco
        const allTransactions = await db.transactions.getAll();
        
        const data = {
            transactions: allTransactions,
            categories: state.categories,
            exportDate: new Date().toISOString(),
            version: '2.0',
            user: state.user?.email
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `minhas-financas-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Backup exportado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao exportar:', error);
        showToast('Erro ao exportar dados', 'error');
    }
}

async function importData(file) {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.transactions || !data.categories) {
                throw new Error('Arquivo inválido');
            }
            
            if (confirm(`Importar backup de ${formatDate(data.exportDate?.split('T')[0])}?\n\nIsso adicionará as transações ao seu banco de dados.`)) {
                showPageLoading(true);
                
                // Importa categorias que não existem
                for (const type of ['income', 'expense']) {
                    for (const cat of data.categories[type] || []) {
                        const exists = state.categories[type].some(c => c.name === cat.name);
                        if (!exists) {
                            try {
                                await db.categories.create({
                                    type,
                                    name: cat.name,
                                    icon: cat.icon,
                                    color: cat.color
                                });
                            } catch (err) {
                                console.warn('Categoria já existe:', cat.name);
                            }
                        }
                    }
                }
                
                // Importa transações
                let imported = 0;
                for (const t of data.transactions) {
                    try {
                        await db.transactions.create({
                            type: t.type,
                            description: t.description,
                            amount: t.amount,
                            date: t.date,
                            category_id: t.category_id || t.categoryId,
                            notes: t.notes
                        });
                        imported++;
                    } catch (err) {
                        console.warn('Erro ao importar transação:', err);
                    }
                }
                
                // Recarrega dados
                await loadDataFromDB();
                updateUI();
                
                showToast(`${imported} transações importadas!`, 'success');
            }
        } catch (error) {
            showToast('Erro ao importar: arquivo inválido', 'error');
            console.error('Import error:', error);
        } finally {
            showPageLoading(false);
        }
    };
    
    reader.readAsText(file);
}

// ========================================
// SIDEBAR - PERFIL E AÇÕES
// ========================================

// Atualiza informações do usuário no sidebar
function updateSidebarUserInfo() {
    const user = supabaseClient.auth.getUser();
    user.then(({ data }) => {
        if (data.user) {
            const userName = data.user.user_metadata?.name || data.user.email.split('@')[0];
            const userEmail = data.user.email;
            
            const nameEl = document.getElementById('sidebarUserName');
            const emailEl = document.getElementById('sidebarUserEmail');
            
            if (nameEl) nameEl.textContent = userName;
            if (emailEl) emailEl.textContent = userEmail;
        }
    });
}

// Verifica status de conexão
function updateConnectionStatus() {
    const statusContainer = document.querySelector('.sync-status');
    const statusText = document.getElementById('syncStatusText');
    
    if (navigator.onLine) {
        statusContainer?.classList.remove('offline');
        if (statusText) statusText.textContent = 'Conectado';
    } else {
        statusContainer?.classList.add('offline');
        if (statusText) statusText.textContent = 'Offline';
    }
}

// Listeners para conexão
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// ========================================
// LIMPAR DADOS COM CONFIRMAÇÃO
// ========================================

function initClearDataModal() {
    const clearDataBtn = document.getElementById('clearDataBtn');
    const clearDataModal = document.getElementById('clearDataModal');
    const closeClearDataModal = document.getElementById('closeClearDataModal');
    const cancelClearDataBtn = document.getElementById('cancelClearDataBtn');
    const confirmClearDataBtn = document.getElementById('confirmClearDataBtn');
    const confirmInput = document.getElementById('clearDataConfirmInput');
    
    // Abrir modal
    clearDataBtn?.addEventListener('click', () => {
        clearDataModal.classList.add('active');
        confirmInput.value = '';
        confirmClearDataBtn.disabled = true;
    });
    
    // Fechar modal
    const closeModal = () => {
        clearDataModal.classList.remove('active');
        confirmInput.value = '';
        confirmClearDataBtn.disabled = true;
    };
    
    closeClearDataModal?.addEventListener('click', closeModal);
    cancelClearDataBtn?.addEventListener('click', closeModal);
    
    // Fechar ao clicar fora
    clearDataModal?.addEventListener('click', (e) => {
        if (e.target === clearDataModal) closeModal();
    });
    
    // Validar input de confirmação
    confirmInput?.addEventListener('input', (e) => {
        const isValid = e.target.value.toUpperCase() === 'CONFIRMAR';
        confirmClearDataBtn.disabled = !isValid;
    });
    
    // Confirmar exclusão
    confirmClearDataBtn?.addEventListener('click', async () => {
        if (confirmInput.value.toUpperCase() !== 'CONFIRMAR') return;
        
        confirmClearDataBtn.disabled = true;
        confirmClearDataBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Limpando...';
        
        try {
            // Limpar transações
            const { error: transError } = await supabaseClient
                .from('transactions')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo
            
            if (transError) throw transError;
            
            // Limpar categorias (mantém as padrão ou limpa tudo?)
            const { error: catError } = await supabaseClient
                .from('categories')
                .delete()
                .eq('is_custom', true); // Remove só as personalizadas
            
            if (catError) throw catError;
            
            // Limpar localStorage
            localStorage.removeItem('financas_transactions');
            localStorage.removeItem('financas_categories');
            
            showToast('Dados limpos com sucesso!', 'success');
            closeModal();
            
            // Recarregar dados
            await loadCategories();
            await loadTransactions();
            updateUI();
            
        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            showToast('Erro ao limpar dados. Tente novamente.', 'error');
        } finally {
            confirmClearDataBtn.disabled = false;
            confirmClearDataBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Limpar Tudo';
        }
    });
}