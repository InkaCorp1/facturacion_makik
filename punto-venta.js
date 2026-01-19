// Lógica del Módulo POS
window.initPuntoVenta = function() {
    let cart = [];
    let selectedCliente = { id: null, cedula: '9999999999999', razon_social: 'CONSUMIDOR FINAL' };
    const db = getSupabaseClient();

    const form = document.getElementById('pos-item-form');
    const cartBody = document.getElementById('cart-body');
    const subtotalEl = document.getElementById('resumen-subtotal');
    const totalEl = document.getElementById('resumen-total');
    const countEl = document.getElementById('cart-count');

    if (!form) return;

    // Manejo de Carrito
    form.onsubmit = (e) => {
        e.preventDefault();
        const desc = document.getElementById('input-descripcion').value;
        const precio = parseFloat(document.getElementById('input-precio').value);
        const cant = parseInt(document.getElementById('input-cantidad').value);

        if (desc && precio > 0) {
            cart.push({
                descripcion: desc,
                precio: precio,
                cantidad: cant,
                total: precio * cant
            });
            updateCartUI();
            form.reset();
            document.getElementById('input-descripcion').focus();
        }
    };

    function updateCartUI() {
        if (!cartBody) return;
        if (cart.length === 0) {
            cartBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 3rem;"><i class="fas fa-box-open fa-2x" style="display: block; margin-bottom: 10px;"></i>Carrito vacío</td></tr>';
            subtotalEl.textContent = '$0.00';
            totalEl.textContent = '$0.00';
            countEl.textContent = '0';
            return;
        }

        let subtotal = 0;
        cartBody.innerHTML = cart.map((item, index) => {
            subtotal += item.total;
            return `
                <tr>
                    <td>
                        <div style="font-weight: 600;">${item.descripcion}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${item.cantidad} x ${app.formatCurrency(item.precio)}</div>
                    </td>
                    <td style="text-align: right; font-weight: 500;">${app.formatCurrency(item.total)}</td>
                    <td style="text-align: right;">
                        <button class="btn" style="color: var(--danger); padding: 4px;" onclick="removeFromCart(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        subtotalEl.textContent = app.formatCurrency(subtotal);
        totalEl.textContent = app.formatCurrency(subtotal);
        countEl.textContent = cart.length;
    }

    window.removeFromCart = (index) => {
        cart.splice(index, 1);
        updateCartUI();
    };

    // Búsqueda de Clientes POS
    const searchInput = document.getElementById('search-cliente-pos');
    const resultsDiv = document.getElementById('clientes-results');

    if (searchInput) {
        searchInput.oninput = async () => {
            const q = searchInput.value;
            if (q.length < 2) {
                resultsDiv.style.display = 'none';
                return;
            }

            const { data, error } = await db.from('clientes_makik')
                .select('*')
                .or(`razon_social.ilike.%${q}%,cedula.ilike.%${q}%`)
                .limit(5);

            if (data && data.length > 0) {
                resultsDiv.style.display = 'block';
                resultsDiv.innerHTML = data.map(cl => `
                    <div class="search-result-item" onclick='selectCliente(${JSON.stringify(cl)})'>
                        <div class="name">${cl.razon_social}</div>
                        <div class="meta">${cl.cedula} • ${cl.correo || 'Sin correo'}</div>
                    </div>
                `).join('');
            } else {
                resultsDiv.style.display = 'none';
            }
        };
    }

    window.selectCliente = (clientObj) => {
        selectedCliente = clientObj;
        document.getElementById('pos-cliente-nombre').textContent = clientObj.razon_social;
        document.getElementById('pos-cliente-cedula').textContent = clientObj.cedula;
        searchInput.value = '';
        resultsDiv.style.display = 'none';
    };

    // Procesar Venta
    window.openPaymentModal = async () => {
        if (cart.length === 0) {
            app.showNotify('Agregue al menos un ítem al carrito', 'warning');
            return;
        }

        app.showConfirm(`¿Confirmar factura para ${selectedCliente.razon_social}?`, async (confirmed) => {
            if (!confirmed) return;

            try {
                // 0. Obtener Configuraciones
                const { data: configSRI } = await db.from('facelectronicaconfig').select('*').maybeSingle();
                const { data: configServicios } = await db.from('config_servicios').select('*').maybeSingle();

                if (!configSRI || !configServicios) {
                    throw new Error('No se encontró configuración de empresa o SRI');
                }

                const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
                const total = subtotal; // IVA 0%
                
                // Incrementar número de comprobante
                const nuevoComprobante = configSRI.comprobante_actual + 1;
                
                // Generar número de documento (formato: 001-001-000000015)
                const pad = app.sri.padWithZeroes;
                const docNumber = `${pad(configSRI.establecimiento, 3)}-${pad(configSRI.punto_emision, 3)}-${pad(nuevoComprobante, 9)}`;

                // Generar fecha en formato ddMMyyyy
                const d = new Date();
                const fechaStr = d.getDate().toString().padStart(2, '0') + 
                                (d.getMonth() + 1).toString().padStart(2, '0') + 
                                d.getFullYear();
                
                // Generar Clave de Acceso con el nuevo comprobante
                const claveAcceso = app.sri.generarClaveAcceso(fechaStr, {
                    ...configSRI,
                    ruc: configServicios.empresa_ruc,
                    comprobante_actual: nuevoComprobante
                });

                if (!claveAcceso) {
                    throw new Error('Error generando clave de acceso');
                }

                const ventaId = "V" + Date.now();

                // 1. Guardar Venta Cabecera
                const { data: venta, error: vError } = await db.from('ventas_makik').insert([{
                    id_venta: ventaId,
                    cliente_id: selectedCliente.cedula,
                    subtotal: subtotal,
                    total: total,
                    estado: 'PENDIENTE',
                    tipo: 'FACTURA',
                    usuario_email: auth.getUserEmail(),
                    clave_acceso: claveAcceso,
                    doc: docNumber
                }]).select().single();

                if (vError) throw vError;

                // 2. Guardar Detalles en BD (sin campo codigo que no existe en la tabla)
                const detallesBD = cart.map((item, idx) => ({
                    venta_id: venta.id,
                    id_venta: ventaId,
                    id_detalle: `${ventaId}-${idx+1}`,
                    descripcion: item.descripcion,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    subtotal: item.total
                }));

                const { error: dError } = await db.from('ventas_detalle_makik').insert(detallesBD);
                if (dError) throw dError;

                // 3. Preparar detalles con código para el JSON (para el servicio de firma)
                const detallesParaJSON = cart.map((item, idx) => ({
                    codigo: item.codigo || "SER-01",
                    descripcion: item.descripcion,
                    nombre: item.descripcion,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    subtotal: item.total
                }));

                // 4. Armar JSON para SRI (formato APPGUIA)
                const jsonSRI = app.sri.armarJson({
                    cliente: selectedCliente,
                    subtotal,
                    total,
                    detalles: detallesParaJSON
                }, configSRI, configServicios, claveAcceso, docNumber);

                console.log('🚀 Enviando JSON a Firma:', JSON.stringify(jsonSRI, null, 2));

                // 5. Enviar a Servicio de Firma
                let firmaExitosa = false;
                const urlFirma = configServicios.firma_url;
                
                if (urlFirma) {
                    try {
                        app.showNotify('⌛ Enviando factura al servicio de firma...', 'info');
                        
                        const resFirma = await fetch(urlFirma, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(jsonSRI)
                        });
                        const dataFirma = await resFirma.json();
                        console.log('📄 Respuesta Firma:', dataFirma);
                        
                        // Evaluar respuesta según formato APPGUIA
                        const statusValue = dataFirma?.status ?? dataFirma?.data?.status ?? null;
                        const detalleValue = dataFirma?.detalle ?? dataFirma?.data?.detalle ?? null;
                        const statusString = statusValue !== null ? String(statusValue).trim().toLowerCase() : null;
                        const detalleString = detalleValue !== null ? String(detalleValue).trim().toLowerCase() : null;

                        const autorizado = resFirma.ok && (
                            statusString === '0' ||
                            statusString === 'ok' ||
                            statusString === 'autorizado' ||
                            statusString === 'success' ||
                            detalleString === 'autorizado'
                        );

                        if (autorizado) {
                            app.showNotify(`✅ Factura ${docNumber} autorizada por el SRI`, 'success');
                            firmaExitosa = true;
                        } else {
                            const mensaje = dataFirma?.message || dataFirma?.detalle || dataFirma?.data?.message || 'Sin detalle';
                            app.showNotify('⚠️ Factura pendiente: ' + mensaje, 'warning');
                        }
                    } catch (fErr) {
                        console.error('Error Firma:', fErr);
                        app.showNotify('Error de conexión con servicio de firma', 'warning');
                    }
                } else {
                    console.warn('⚠️ No se configuró firma_url en config_servicios');
                    app.showNotify('Factura generada, pero servicio de firma no configurado', 'warning');
                }

                // 6. Actualizar Estado de la Venta
                const newEstado = firmaExitosa ? 'AUTORIZADO' : 'PENDIENTE';
                await db.from('ventas_makik').update({ estado: newEstado }).eq('id', venta.id);
                
                // 7. SI FUE EXITOSO, Incrementar Secuencial en la base de datos
                if (firmaExitosa) {
                    await db.from('facelectronicaconfig')
                        .update({ comprobante_actual: nuevoComprobante })
                        .eq('id', configSRI.id);
                    console.log('✅ Secuencial incrementado a:', nuevoComprobante);
                } else {
                    console.log('⚠️ Venta registrada como PENDIENTE. El secuencial no se incrementó para permitir reintentos con el mismo número.');
                }

                app.showNotify('Venta procesada', 'success');
                cart = [];
                selectedCliente = { id: null, cedula: '9999999999999', razon_social: 'CONSUMIDOR FINAL' };
                document.getElementById('pos-cliente-nombre').textContent = 'CONSUMIDOR FINAL';
                document.getElementById('pos-cliente-cedula').textContent = '9999999999999';
                updateCartUI();

            } catch (error) {
                console.error(error);
                app.showNotify('Error al guardar la venta: ' + error.message, 'error');
            }
        });
    };
};
