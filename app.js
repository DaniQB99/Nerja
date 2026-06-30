const INITIAL_STATE = {
    presupuesto: {
        inicial: 1100,
        gastos: [
            { id: 1, desc: "Apartamento", monto: 530.18 },
            { id: 2, desc: "Gasoil (aprox)", monto: 150 },
            { id: 3, desc: "Restaurante (restante)", monto: 220 }
        ]
    },
    importante: [
        { id: 1, text: "Aceite, vinagre, sal" },
        { id: 2, text: "Tapers chino" },
        { id: 3, text: "Servilletas" },
        { id: 4, text: "Bolsa de basura" }
    ],
    dani: [
        { id: 1, text: "Butaca" },
        { id: 2, text: "Mesa playa" }
    ],
    afri: [
        { id: 1, text: "Palas" },
        { id: 2, text: "Mochila nevera" },
        { id: 3, text: "Nevera rígida" },
        { id: 4, text: "Cartas" }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initState();
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
function initState() {
    if (!localStorage.getItem('nerja_app_state')) {
        saveState(INITIAL_STATE);
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
    // Reset State
    document.getElementById('btn-reset-presupuesto').addEventListener('click', () => {
        if (confirm('¿Seguro que quieres reiniciar todo al estado inicial? Se borrarán tus cambios.')) {
            saveState(INITIAL_STATE);
            renderAll();
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
window.eliminarGasto = function(id) {
    const state = getState();
    state.presupuesto.gastos = state.presupuesto.gastos.filter(g => g.id !== id);
    saveState(state);
    renderPresupuesto(state.presupuesto);
};

window.eliminarItem = function(listName, id) {
    const state = getState();
    state[listName] = state[listName].filter(item => item.id !== id);
    saveState(state);
    renderList(`lista-${listName}`, state[listName], listName, 'fa-check');
};
