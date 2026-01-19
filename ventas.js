window.initVentas = function() {
    const tableBody = document.getElementById('ventas-table-body');
    const db = getSupabaseClient();

    if (!tableBody) return;

    async function loadVentas() {
        // Primero intentamos la consulta con Join (requiere FK en DB)
        let { data, error } = await db
            .from('ventas_makik')
            .select(`
                *,
                cliente:clientes_makik(razon_social)
            `)
            .order('created_at', { ascending: false });

        // Si falla por falta de relación (FK), hacemos fallback manual
        if (error && error.code === 'PGRST200') {
            console.warn("⚠️ Relación no encontrada en DB, realizando carga manual...");
            const { data: ventasSimple, error: vError } = await db
                .from('ventas_makik')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (vError) {
                error = vError;
            } else {
                // Cargar nombres de clientes por separado para no romper la UI
                const cedulas = [...new Set(ventasSimple.map(v => v.cliente_id))];
                const { data: clientes } = await db.from('clientes_makik').select('cedula, razon_social').in('cedula', cedulas);
                
                data = ventasSimple.map(v => ({
                    ...v,
                    cliente: clientes?.find(c => c.cedula === v.cliente_id) || { razon_social: 'CONSUMIDOR FINAL' }
                }));
                error = null;
            }
        }

        if (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">
                Error: ${error.message}<br>
                <small>Asegúrate de ejecutar el SQL en Supabase para crear la relación.</small>
            </td></tr>`;
            return;
        }

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Sin facturas emitidas</td></tr>';
            return;
        }

        tableBody.innerHTML = data.map(v => {
            const fecha = new Date(v.created_at).toLocaleDateString('es-EC', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            let statusColor = '#888';
            if (v.estado === 'AUTORIZADO') statusColor = 'var(--success)';
            if (v.estado === 'RECHAZADO') statusColor = 'var(--danger)';
            if (v.estado === 'PENDIENTE') statusColor = 'var(--primary-gold)';

            return `
                <tr>
                    <td style="font-size: 0.85rem;">${fecha}</td>
                    <td style="font-family: monospace; font-weight: 600;">${v.doc || '---'}</td>
                    <td>${v.cliente.razon_social}</td>
                    <td style="text-align: right; font-weight: 700; color: var(--primary-gold);">${app.formatCurrency(v.total)}</td>
                    <td style="text-align: center;">
                        <span style="font-size: 0.7rem; padding: 4px 8px; border-radius: 4px; border: 1px solid ${statusColor}; color: ${statusColor}; font-weight: 700;">
                            ${v.estado}
                        </span>
                    </td>
                    <td style="text-align: right;">
                        <button class="btn btn-outline" style="padding: 5px 10px;" onclick="viewVentaDetails('${v.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.viewVentaDetails = (id) => {
        app.showNotify('Visualización detallada en desarrollo...', 'info');
    };

    window.loadVentas = loadVentas;
    loadVentas();
};
