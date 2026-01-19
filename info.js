window.initInfo = function() {
    const db = getSupabaseClient();

    async function loadInfo() {
        try {
            // 1. Cargar config empresa
            const { data: serv } = await db.from('config_servicios').select('*').maybeSingle();
            if (serv) {
                document.getElementById('info-razon').textContent = serv.empresa_razon_social || 'MAKIK STUDIO';
                document.getElementById('info-ruc').textContent = serv.empresa_ruc || '179XXXXXXX001';
                document.getElementById('info-direccion').textContent = serv.empresa_dir_matriz || 'Quito, Ecuador';
            }

            // 2. Cargar config SRI
            const { data: sri } = await db.from('facelectronicaconfig').select('*').maybeSingle();
            if (sri) {
                const ambEl = document.getElementById('info-ambiente');
                ambEl.textContent = sri.ambiente === 2 ? 'PRODUCCIÓN' : 'PRUEBAS';
                ambEl.style.color = sri.ambiente === 2 ? '#2ecc71' : 'var(--primary-gold)';
                ambEl.style.background = sri.ambiente === 2 ? 'rgba(46, 204, 113, 0.1)' : 'rgba(212, 175, 55, 0.1)';
                
                document.getElementById('info-secuencial').textContent = String(sri.comprobante_actual).padStart(9, '0');
            }
        } catch (error) {
            console.error('Error cargando info:', error);
        }
    }

    loadInfo();
};
