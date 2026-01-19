window.initClientes = function() {
    let clientes = [];
    const tableBody = document.getElementById('clientes-table-body');
    const db = getSupabaseClient();

    if (!tableBody) return;

    async function loadClientes() {
        const { data, error } = await db.from('clientes_makik').select('*').order('razon_social');
        if (error) {
            console.error(error);
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger);">Error cargando clientes</td></tr>';
            return;
        }
        clientes = data;
        renderTable(clientes);
    }

    function renderTable(data) {
        if (!tableBody) return;
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No se encontraron clientes</td></tr>';
            return;
        }

        tableBody.innerHTML = data.map(cl => `
            <tr>
                <td style="font-weight: 600;">${cl.razon_social}</td>
                <td style="color: var(--text-muted);">${cl.cedula}</td>
                <td>${cl.telefono || '-'}</td>
                <td style="font-size: 0.85rem;">${cl.correo || '-'}</td>
                <td style="text-align: right;">
                    <button class="btn btn-outline" style="padding: 5px 10px;" onclick="editCliente(${cl.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    window.filterClientes = () => {
        const input = document.getElementById('search-cliente');
        if (!input) return;
        const q = input.value.toLowerCase();
        const filtered = clientes.filter(cl => 
            cl.razon_social.toLowerCase().includes(q) || 
            cl.cedula.includes(q)
        );
        renderTable(filtered);
    };

    window.openClienteModal = () => {
        document.getElementById('cliente-form').reset();
        document.getElementById('cliente-id').value = '';
        document.getElementById('modal-title').textContent = 'Nuevo Cliente';
        document.getElementById('cliente-modal').style.display = 'flex';
    };

    window.closeClienteModal = () => {
        document.getElementById('cliente-modal').style.display = 'none';
    };

    window.editCliente = (id) => {
        const cl = clientes.find(c => c.id == id);
        if (!cl) return;
        document.getElementById('cliente-id').value = cl.id;
        document.getElementById('cl-cedula').value = cl.cedula;
        document.getElementById('cl-razon').value = cl.razon_social;
        document.getElementById('cl-telefono').value = cl.telefono;
        document.getElementById('cl-correo').value = cl.correo;
        document.getElementById('cl-direccion').value = cl.direccion;
        document.getElementById('modal-title').textContent = 'Editar Cliente';
        document.getElementById('cliente-modal').style.display = 'flex';
    };

    const form = document.getElementById('cliente-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('cliente-id').value;
            const payload = {
                cedula: document.getElementById('cl-cedula').value,
                razon_social: document.getElementById('cl-razon').value,
                telefono: document.getElementById('cl-telefono').value,
                correo: document.getElementById('cl-correo').value,
                direccion: document.getElementById('cl-direccion').value,
            };

            let res;
            if (id) {
                res = await db.from('clientes_makik').update(payload).eq('id', id);
            } else {
                res = await db.from('clientes_makik').insert([payload]);
            }

            if (res.error) {
                app.showNotify('Error: ' + res.error.message, 'error');
            } else {
                app.showNotify(id ? 'Cliente actualizado' : 'Cliente registrado', 'success');
                window.closeClienteModal();
                loadClientes();
            }
        };
    }

    loadClientes();
};
