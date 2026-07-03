let INITIAL_STATE = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Init theme
    const savedTheme = localStorage.getItem('nerja_theme');
    const themeCheckbox = document.getElementById('theme-checkbox');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeCheckbox) themeCheckbox.checked = true;
    }

    initNavigation();
    await initState();
    renderAll();
    setupEventListeners();
});

// --- NAVIGATION ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(section => section.classList.remove('active'));
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

// --- STATE MANAGEMENT (LocalStorage) ---
async function initState() {
    if (localStorage.getItem('nerja_app_state')) {
        return;
    }

    if (window.INITIAL_DATA) {
        saveState(window.INITIAL_DATA);
        return;
    }

    try {
        const response = await fetch('data.json');
        INITIAL_STATE = await response.json();
        saveState(INITIAL_STATE);
    } catch (error) {
        console.error('Error cargando data.json:', error);
        // Fallback mínimo
        saveState({
            presupuesto: {
                inicial: 1170,
                gastos: []
            },
            importante: [],
            dani: [],
            afri: []
        });
    }
}

function getState() {
    return JSON.parse(localStorage.getItem('nerja_app_state'));
}

function saveState(state) {
    localStorage.setItem('nerja_app_state', JSON.stringify(state));
}

// --- RENDER FUNCTIONS ---
function renderAll() {
    const state = getState();

    // Sync initial budget input with current state value
    const initialInput = document.getElementById('presupuesto-inicial-input');
    if (initialInput && state.presupuesto) {
        initialInput.value = state.presupuesto.inicial;
    }

    renderPresupuesto(state.presupuesto);
    renderList('lista-importante', state.importante, 'importante', 'fa-check');
    renderList('lista-dani', state.dani, 'dani', 'fa-check');
    renderList('lista-afri', state.afri, 'afri', 'fa-check');
}

function renderPresupuesto(presupuesto) {
    const ul = document.getElementById('lista-gastos');
    const saldoEl = document.getElementById('saldo-total');

    ul.innerHTML = '';
    let totalGastos = 0;

    presupuesto.gastos.forEach(gasto => {
        totalGastos += gasto.monto;
        const li = document.createElement('li');
        li.className = 'flex-between';

        // Format to handle decimals properly
        const montoFormateado = parseFloat(gasto.monto).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

        li.innerHTML = `
            <span>${gasto.desc}</span> 
            <div style="display:flex; align-items:center; gap:10px;">
                <span>${montoFormateado}</span>
                <button class="btn-icon btn-delete" onclick="eliminarGasto(${gasto.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        ul.appendChild(li);
    });

    const restante = presupuesto.inicial - totalGastos;
    saldoEl.textContent = restante.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

    // Cambiar color si está en negativo
    if (restante < 0) {
        saldoEl.style.color = 'var(--red)';
    } else {
        saldoEl.style.color = 'inherit';
    }
}

function renderList(elementId, items, listName, iconClass) {
    const ul = document.getElementById(elementId);
    ul.innerHTML = '';

    items.forEach(item => {
        const li = document.createElement('li');
        li.style.justifyContent = 'space-between';
        li.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center;">
                <i class="fa-solid ${iconClass}"></i> ${item.text}
            </div>
            <button class="btn-icon btn-delete" onclick="eliminarItem('${listName}', ${item.id})"><i class="fa-solid fa-xmark"></i></button>
        `;
        ul.appendChild(li);
    });
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    const themeCheckbox = document.getElementById('theme-checkbox');
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('nerja_theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('nerja_theme', 'light');
            }
        });
    }

    // Escuchar cambios en el presupuesto inicial
    const initialInput = document.getElementById('presupuesto-inicial-input');
    if (initialInput) {
        initialInput.addEventListener('input', (e) => {
            const valor = parseFloat(e.target.value);
            if (!isNaN(valor)) {
                const state = getState();
                state.presupuesto.inicial = valor;
                saveState(state);
                renderPresupuesto(state.presupuesto);
            }
        });
    }

    // Reset State
    document.getElementById('btn-reset-presupuesto').addEventListener('click', async () => {
        if (confirm('¿Seguro que quieres reiniciar todo al estado inicial? Se borrarán tus cambios.')) {
            let freshData = null;
            if (window.INITIAL_DATA) {
                freshData = window.INITIAL_DATA;
            } else {
                try {
                    const response = await fetch('data.json');
                    freshData = await response.json();
                } catch (error) {
                    console.error('Error al obtener los datos para reiniciar:', error);
                }
            }

            if (freshData) {
                saveState(freshData);
                renderAll();
            } else if (INITIAL_STATE) {
                saveState(INITIAL_STATE);
                renderAll();
            }
        }
    });

    // Form Gasto
    document.getElementById('form-gasto').addEventListener('submit', (e) => {
        e.preventDefault();
        const desc = document.getElementById('desc-gasto').value;
        const monto = parseFloat(document.getElementById('monto-gasto').value);

        if (desc && !isNaN(monto)) {
            const state = getState();
            const newId = Date.now();
            state.presupuesto.gastos.push({ id: newId, desc, monto });
            saveState(state);
            renderPresupuesto(state.presupuesto);
            e.target.reset();
        }
    });

    // Form Importante
    setupListForm('form-importante', 'nuevo-importante', 'importante');
    setupListForm('form-dani', 'nuevo-dani', 'dani');
    setupListForm('form-afri', 'nuevo-afri', 'afri');
}

function setupListForm(formId, inputId, listName) {
    document.getElementById(formId).addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById(inputId).value;
        if (text) {
            const state = getState();
            state[listName].push({ id: Date.now(), text });
            saveState(state);
            renderList(`lista-${listName}`, state[listName], listName, 'fa-check');
            e.target.reset();
        }
    });
}

// --- GLOBAL ACTIONS (Used in HTML onclick) ---
window.eliminarGasto = function (id) {
    const state = getState();
    state.presupuesto.gastos = state.presupuesto.gastos.filter(g => g.id !== id);
    saveState(state);
    renderPresupuesto(state.presupuesto);
};

window.eliminarItem = function (listName, id) {
    const state = getState();
    state[listName] = state[listName].filter(item => item.id !== id);
    saveState(state);
    renderList(`lista-${listName}`, state[listName], listName, 'fa-check');
};
