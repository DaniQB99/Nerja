// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://moogukwmbndkmwftrqsn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vb2d1a3dtYm5ka213ZnRycXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODU4OTEsImV4cCI6MjA5ODY2MTg5MX0.2bxsYkoJiV0fT1lUKgCFt91wlkBZ6x7VOkCaTtWI9FA';

let supabaseClient = null;
let isSyncing = false; // Prevent loops when receiving realtime updates

// Initialize Supabase client
function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false // Previene el error de history.replaceState en file://
            }
        });
    }
}

// --- MAIN INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    // Init theme
    const savedTheme = localStorage.getItem('nerja_theme');
    const themeCheckbox = document.getElementById('theme-checkbox');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeCheckbox) themeCheckbox.checked = true;
    }

    // Navigation FIRST — must always work
    initNavigation();

    try {
        initSupabase();
    } catch (e) {
        console.warn('Supabase init failed:', e);
    }

    try {
        await initState();
    } catch (e) {
        console.warn('initState failed:', e);
    }

    renderAll();
    setupEventListeners();

    try {
        setupRealtime();
    } catch (e) {
        console.warn('Realtime setup failed:', e);
    }
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

// --- STATE MANAGEMENT (Supabase + LocalStorage cache) ---
async function initState() {
    // Try loading from Supabase first (source of truth)
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('app_state')
                .select('data')
                .eq('id', 'nerja')
                .single();

            if (data && !error) {
                saveLocal(data.data);
                return;
            }
        } catch (e) {
            console.warn('Supabase no disponible, usando datos locales:', e);
        }
    }

    // Fallback: localStorage
    if (localStorage.getItem('nerja_app_state')) {
        return;
    }

    // Default empty state if no Supabase and no cache
    saveLocal({
        presupuesto: { inicial: 1170, gastos: [] },
        importante: [],
        dani: [],
        afri: []
    });
}

// Save to localStorage only (used for local cache)
function saveLocal(state) {
    localStorage.setItem('nerja_app_state', JSON.stringify(state));
}

// Save to both Supabase and localStorage
async function saveState(state) {
    saveLocal(state);

    if (supabaseClient && !isSyncing) {
        try {
            await supabaseClient
                .from('app_state')
                .upsert({
                    id: 'nerja',
                    data: state,
                    updated_at: new Date().toISOString()
                });
        } catch (e) {
            console.warn('Error guardando en Supabase:', e);
        }
    }
}

function getState() {
    return JSON.parse(localStorage.getItem('nerja_app_state'));
}

// --- REALTIME SUBSCRIPTION ---
function setupRealtime() {
    if (!supabaseClient) return;

    supabaseClient
        .channel('app_state_changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'app_state', filter: 'id=eq.nerja' },
            (payload) => {
                if (payload.new && payload.new.data) {
                    isSyncing = true;
                    saveLocal(payload.new.data);
                    renderAll();
                    isSyncing = false;
                }
            }
        )
        .subscribe();
}

// --- RENDER FUNCTIONS ---
function renderAll() {
    const state = getState();
    if (!state) return;

    // Sync initial budget input with current state value
    const initialInput = document.getElementById('presupuesto-inicial-input');
    if (initialInput && state.presupuesto && document.activeElement !== initialInput) {
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
        if (confirm('¿Seguro que quieres reiniciar todo al estado inicial? Se borrarán tus cambios en todos los dispositivos.')) {
            const freshData = {
                presupuesto: { inicial: 1170, gastos: [] },
                importante: [],
                dani: [],
                afri: []
            };

            await saveState(freshData);
            renderAll();
        }
    });

    // Form Gasto
    document.getElementById('form-gasto').addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = document.getElementById('desc-gasto').value;
        const monto = parseFloat(document.getElementById('monto-gasto').value);

        if (desc && !isNaN(monto)) {
            const state = getState();
            const newId = Date.now();
            state.presupuesto.gastos.push({ id: newId, desc, monto });
            await saveState(state);
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
    document.getElementById(formId).addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById(inputId).value;
        if (text) {
            const state = getState();
            state[listName].push({ id: Date.now(), text });
            await saveState(state);
            renderList(`lista-${listName}`, state[listName], listName, 'fa-check');
            e.target.reset();
        }
    });
}

// --- GLOBAL ACTIONS (Used in HTML onclick) ---
window.eliminarGasto = async function (id) {
    const state = getState();
    state.presupuesto.gastos = state.presupuesto.gastos.filter(g => g.id !== id);
    await saveState(state);
    renderPresupuesto(state.presupuesto);
};

window.eliminarItem = async function (listName, id) {
    const state = getState();
    state[listName] = state[listName].filter(item => item.id !== id);
    await saveState(state);
    renderList(`lista-${listName}`, state[listName], listName, 'fa-check');
};
