// --- CONFIGURACIÓN ---
const API_URL = '/api';
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let socket = null;

// --- ELEMENTOS DOM ---
const authSection = document.getElementById('auth-section');
const productsSection = document.getElementById('products-section');
const cartSection = document.getElementById('cart-section');
const adminUsersSection = document.getElementById('adminUsers-section');
const adminOrdersSection = document.getElementById('adminOrders-section');

// --- HELPER GRAPHQL ---
async function graphqlFetch(query, variables = {}) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query, variables })
        });
        return await response.json();
    } catch (e) { console.error(e); return null; }
}

// --- AUTH ---
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isRegister = document.getElementById('authTitle').innerText.includes('Registrarse');
    
    const res = await fetch(`${API_URL}/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (res.ok) {
        if (isRegister) { alert('Registro OK. Entra.'); toggleAuthMode(); }
        else { localStorage.setItem('token', data.token); initApp(); }
    } else { alert(data.message); }
});

function parseJwt(token) { try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; } }

function initApp() {
    const token = localStorage.getItem('token');
    if (!token) return showAuth();

    currentUser = parseJwt(token);
    authSection.classList.add('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');
    
    if (currentUser.role === 'admin') {
        document.getElementById('navAdminUsers').classList.remove('hidden');
        document.getElementById('navAdminOrders').classList.remove('hidden');
        document.getElementById('btnShowCreateProduct').classList.remove('hidden');
    }

    showSection('products');
    updateCartUI();
    initChat(token);
}

function showAuth() {
    authSection.classList.remove('hidden');
    document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
    document.getElementById('logoutBtn').classList.add('hidden');
}

document.getElementById('toggleAuth').addEventListener('click', toggleAuthMode);
function toggleAuthMode() {
    const title = document.getElementById('authTitle');
    const isLogin = title.innerText.includes('Iniciar');
    title.innerText = isLogin ? 'Registrarse' : 'Iniciar Sesión';
    document.querySelector('#authForm button').innerText = isLogin ? 'Registrarse' : 'Entrar';
}

document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.removeItem('token'); location.reload(); });

// --- NAVEGACIÓN ---
function showSection(name) {
    document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
    if (name === 'products') { productsSection.classList.remove('hidden'); loadProducts(); }
    else if (name === 'cart') { cartSection.classList.remove('hidden'); renderCart(); }
    else if (name === 'adminUsers') { adminUsersSection.classList.remove('hidden'); loadUsers(); }
    else if (name === 'adminOrders') { adminOrdersSection.classList.remove('hidden'); loadOrders(); }
}

// --- GESTIÓN PRODUCTOS (CREAR Y EDITAR) ---

function prepareCreateMode() {
    document.getElementById('productForm').reset();
    document.getElementById('productForm').classList.remove('hidden');
    document.getElementById('editProductId').value = ''; // Vacío = Crear
    document.getElementById('formTitle').innerText = 'Nuevo Producto';
    document.getElementById('btnSaveProduct').innerText = 'Guardar';
    document.getElementById('imageHelp').style.display = 'none';
    document.getElementById('productImage').required = true;
}

function prepareEditMode(id, name, desc, price, cat) {
    document.getElementById('productForm').classList.remove('hidden');
    document.getElementById('editProductId').value = id; // Con ID = Editar
    document.getElementById('productName').value = name;
    document.getElementById('productDescription').value = desc;
    document.getElementById('productPrice').value = price;
    document.getElementById('productCategory').value = cat;
    
    document.getElementById('formTitle').innerText = 'Editar Producto';
    document.getElementById('btnSaveProduct').innerText = 'Actualizar';
    document.getElementById('imageHelp').style.display = 'inline';
    document.getElementById('productImage').required = false; // Imagen opcional al editar
    
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

function hideProductForm() { document.getElementById('productForm').classList.add('hidden'); }

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const editId = document.getElementById('editProductId').value;
    const file = document.getElementById('productImage').files[0];

    let imageBase64 = null;
    if (file) {
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    const payload = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        price: document.getElementById('productPrice').value,
        category: document.getElementById('productCategory').value,
        imageUrl: imageBase64 // Si es null (al editar sin cambiar foto), el backend lo gestiona
    };

    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `${API_URL}/products/${editId}` : `${API_URL}/products`;

    const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert(editId ? 'Producto actualizado' : 'Producto creado');
        hideProductForm();
        loadProducts();
    } else {
        alert('Error al guardar');
    }
});

async function deleteProduct(id) {
    if (!confirm('¿Borrar producto?')) return;
    const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) loadProducts();
}

// --- LISTAR PRODUCTOS ---
async function loadProducts() {
    const result = await graphqlFetch(`query { getProducts { id name description price category imageUrl } }`);
    if (result && result.data) renderProducts(result.data.getProducts);
}

function renderProducts(products) {
    const container = document.getElementById('products-grid');
    container.innerHTML = '';
    products.forEach(p => {
        // Escapamos strings para evitar errores en onclick
        const safeName = p.name.replace(/'/g, "\\'");
        const safeDesc = (p.description || "").replace(/'/g, "\\'");
        
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `
            <img src="${p.imageUrl}" alt="${p.name}">
            <div class="card-info">
                <h3>${p.name}</h3>
                <p class="price">${p.price} €</p>
                <button onclick="addToCart('${p.id}', '${safeName}', ${p.price})" class="btn-primary">Añadir</button>
                
                ${currentUser.role === 'admin' ? `
                    <div style="margin-top:10px; display:flex; gap:5px;">
                        <button onclick="prepareEditMode('${p.id}', '${safeName}', '${safeDesc}', ${p.price}, '${p.category}')" class="btn-warning" style="flex:1">Editar</button>
                        <button onclick="deleteProduct('${p.id}')" class="btn-danger" style="flex:1">Borrar</button>
                    </div>
                ` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

// --- CARRITO ---
function addToCart(id, name, price) {
    const existing = cart.find(i => i.productId === id);
    if (existing) existing.quantity++;
    else cart.push({ productId: id, name, price, quantity: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    document.getElementById('cartCount').innerText = cart.reduce((acc, i) => acc + i.quantity, 0);
}

function renderCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        const div = document.createElement('div');
        div.style.padding = '10px'; div.style.borderBottom = '1px solid #eee';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <b>${item.name}</b>
                <button onclick="removeFromCart(${index})" style="color:red; background:none; border:none; cursor:pointer;">X</button>
            </div>
            <p>${item.quantity} x ${item.price}€ = ${(item.quantity * item.price).toFixed(2)}€</p>
        `;
        container.appendChild(div);
    });
    document.getElementById('cartTotal').innerText = total.toFixed(2);
}

function removeFromCart(idx) {
    cart.splice(idx, 1); localStorage.setItem('cart', JSON.stringify(cart));
    renderCart(); updateCartUI();
}

async function checkout() {
    if (cart.length === 0) return alert('Carrito vacío');
    const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const input = cart.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity }));
    
    const query = `mutation CreateOrder($products: [ProductInput]!, $total: Float!) { createOrder(products: $products, total: $total) { id } }`;
    const res = await graphqlFetch(query, { products: input, total });
    
    if (res && res.data) {
        alert('Pedido realizado'); cart = []; localStorage.removeItem('cart');
        renderCart(); updateCartUI();
    }
}

// --- ADMIN USUARIOS ---
async function loadUsers() {
    const res = await graphqlFetch(`query { getUsers { id email role } }`);
    if (res && res.data) {
        document.getElementById('usersTableBody').innerHTML = res.data.getUsers.map(u => `
            <tr>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td>
                    <button onclick="changeRole('${u.id}', '${u.role}')" class="btn-secondary">Cambiar Rol</button>
                    <button onclick="deleteUser('${u.id}')" class="btn-danger">Borrar</button>
                </td>
            </tr>
        `).join('');
    }
}

async function changeRole(id, role) {
    const newRole = role === 'admin' ? 'user' : 'admin';
    await graphqlFetch(`mutation { updateUserRole(userId: "${id}", role: "${newRole}") { id } }`);
    loadUsers();
}

async function deleteUser(id) {
    if(confirm('¿Seguro?')) {
        await graphqlFetch(`mutation { deleteUser(userId: "${id}") }`);
        loadUsers();
    }
}

// --- ADMIN PEDIDOS (CON FILTRO) ---
async function loadOrders() {
    const statusFilter = document.getElementById('orderFilter').value; // Lee el dropdown
    const query = `
        query GetOrders($status: String) {
            getOrders(status: $status) {
                id total status createdAt
                user { email }
                products { name quantity }
            }
        }
    `;
    
    // Si el filtro está vacío, pasamos null para traer todos
    const variables = statusFilter ? { status: statusFilter } : {};
    
    const res = await graphqlFetch(query, variables);
    if (res && res.data) {
        document.getElementById('ordersList').innerHTML = res.data.getOrders.map(o => `
            <div style="background:white; padding:15px; margin-bottom:10px; border:1px solid #ddd; border-left: 5px solid ${o.status === 'Completed' ? 'green' : 'orange'}">
                <h4>Pedido ${o.id.slice(-6)} - <small>${o.createdAt}</small></h4>
                <p>Usuario: ${o.user ? o.user.email : 'Eliminado'}</p>
                <p>Total: <b>${o.total}€</b> | Estado: <b>${o.status}</b></p>
                <ul>${o.products.map(p => `<li>${p.quantity} x ${p.name}</li>`).join('')}</ul>
            </div>
        `).join('');
    }
}

// --- CHAT DESPLEGABLE ---
function initChat(token) {
    if (socket) return;
    socket = io({ auth: { token } });
    
    socket.on('chat history', msgs => {
        const div = document.getElementById('chat-messages');
        div.innerHTML = '';
        msgs.forEach(appendMsg);
        div.scrollTop = div.scrollHeight;
    });
    
    socket.on('chat message', appendMsg);
    
    document.getElementById('chat-form').addEventListener('submit', e => {
        e.preventDefault();
        const inp = document.getElementById('chat-input');
        if (inp.value) { socket.emit('chat message', inp.value); inp.value = ''; }
    });
}

function appendMsg(msg) {
    const div = document.getElementById('chat-messages');
    const el = document.createElement('div');
    el.className = `message ${msg.user === currentUser.email ? 'mine' : 'others'}`;
    el.innerText = `${msg.user.split('@')[0]}: ${msg.message}`;
    div.appendChild(el);
    div.scrollTop = div.scrollHeight;
}

// Función para colapsar/expandir
function toggleChat() {
    const chat = document.getElementById('chat-container');
    chat.classList.toggle('chat-collapsed');
    const icon = document.getElementById('chatIcon');
    // Cambiar icono
    if (chat.classList.contains('chat-collapsed')) {
        icon.classList.remove('fa-minus');
        icon.classList.add('fa-chevron-up');
    } else {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-minus');
    }
}

if (localStorage.getItem('token')) initApp();