// =====================================================
// MAKIK STUDIO FACT - Core App Logic (SPA)
// =====================================================

const appState = {
    currentModule: null,
    user: null
};

// Función para cargar módulos (HTML dinámico)
async function loadModule(moduleName) {
    if (appState.currentModule === moduleName && moduleName !== 'login') return;
    
    const mainContent = document.getElementById('app-content');
    console.log(`📦 Cargando módulo: ${moduleName}`);
    
    try {
        mainContent.innerHTML = `<div style="display: flex; justify-content: center; align-items: center; height: 300px;">
            <i class="fas fa-circle-notch fa-spin fa-3x" style="color: var(--primary-gold);"></i>
        </div>`;

        // 1. Cargar el HTML
        const response = await fetch(`${moduleName}.html?v=${Date.now()}`);
        if (!response.ok) throw new Error(`Módulo ${moduleName} no encontrado`);
        const html = await response.text();
        
        // 2. Limpiar scripts previos del módulo anterior si existen
        const oldScript = document.getElementById('module-script');
        if (oldScript) oldScript.remove();

        // 3. Inyectar HTML
        mainContent.innerHTML = html;
        appState.currentModule = moduleName;

        // 4. Cargar y ejecutar el JS asociado al módulo
        const script = document.createElement('script');
        script.id = 'module-script';
        script.src = `${moduleName}.js?v=${Date.now()}`;
        script.onload = () => {
            console.log(`📜 Script cargado para: ${moduleName}`);
            // Ejecutar inicializador dinámico
            const initFuncName = 'init' + moduleName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
            if (typeof window[initFuncName] === 'function') {
                window[initFuncName]();
            }
        };
        document.body.appendChild(script);

        // Actualizar UI navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            const onclick = item.getAttribute('onclick') || '';
            onclick.includes(`'${moduleName}'`) ? item.classList.add('active') : item.classList.remove('active');
        });

    } catch (error) {
        console.error('❌ Error en loadModule:', error);
        mainContent.innerHTML = `<div style="text-align: center; margin-top: 50px; color: white;">
            <i class="fas fa-exclamation-triangle fa-3x" style="color: var(--danger);"></i>
            <h2 style="margin-top: 20px;">Error al cargar: ${moduleName}</h2>
            <p>${error.message}</p>
        </div>`;
    }
}

// Inicialización de la App
document.addEventListener('DOMContentLoaded', async () => {
    // Registro de Service Worker para PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('✅ Service Worker registrado', reg))
                .catch(err => console.error('❌ Error registrando SW', err));
        });
    }

    const sb = getSupabaseClient();
    let initialCheckDone = false;

    // Escuchar cambios de estado de autenticación
    sb.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 Auth Event:', event, session ? 'CON SESIÓN' : 'SIN SESIÓN');
        
        if (session) {
            appState.user = session.user;
            document.getElementById('userEmail').textContent = session.user.email;
            document.getElementById('userEmail').style.display = 'block';
            document.getElementById('main-header').style.display = 'flex';
            document.body.style.visibility = 'visible';
            
            // Solo cargar POS si no estamos ya ahí
            if (appState.currentModule !== 'punto-venta') {
                console.log('🚀 Cargando Punto de Venta...');
                loadModule('punto-venta');
            }
        } else {
            console.log('🔒 No hay sesión activa.');
            appState.user = null;
            document.getElementById('main-header').style.display = 'none';
            document.body.style.visibility = 'visible';
            
            if (appState.currentModule !== 'login') {
                loadModule('login');
            }
        }
        initialCheckDone = true;
    });

    // Verificación de respaldo si el evento no dispara a tiempo
    setTimeout(async () => {
        if (!initialCheckDone) {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) {
                console.log('⏲️ Timeout: Forzando Login');
                document.body.style.visibility = 'visible';
                loadModule('login');
            }
        }
    }, 1000); // Un segundo de gracia para que Supabase se despierte
});

// Manejo de Logout
async function handleLogout() {
    window.app.showConfirm('¿Desea cerrar la sesión?', async (confirmed) => {
        if (confirmed) {
            await auth.logout();
            window.location.reload(); 
        }
    });
}

// Exponer globalmente para uso en HTML
window.loadModule = loadModule;
window.app = {
    // Helpers comunes
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount || 0);
    },
    
    // Sistema de Notificaciones Profesional
    showNotify: (message, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'}" style="color: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary-gold)'}"></i>
            <div style="flex: 1; font-size: 0.9rem; font-weight: 500;">${message}</div>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    },

    // Confirmación Personalizada (Reemplaza confirm)
    showConfirm: (message, callback) => {
        const modal = document.createElement('div');
        modal.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); display: flex; align-items: center;
            justify-content: center; z-index: 10000; backdrop-filter: blur(8px);
        `;
        
        modal.innerHTML = `
            <div style="background: #141414; border: 1px solid rgba(212,175,55,0.3); padding: 2.5rem 2rem; border-radius: 25px; max-width: 380px; width: 90%; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.6); position: relative; overflow: hidden;">
                <!-- Decoración -->
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: var(--gold-gradient);"></div>
                
                <div style="width: 65px; height: 65px; background: var(--gold-gradient); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; box-shadow: 0 0 20px rgba(212,175,55,0.3);">
                    <i class="fas fa-question" style="font-size: 1.8rem; color: black;"></i>
                </div>
                
                <h3 style="color: white; margin-bottom: 0.8rem; font-size: 1.3rem; font-weight: 700; letter-spacing: -0.5px;">¿Confirmar Acción?</h3>
                <p style="color: #999; margin-bottom: 2rem; font-size: 0.95rem; line-height: 1.4; padding: 0 10px;">${message}</p>
                
                <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                    <button id="confirm-yes" style="background: var(--gold-gradient); border: none; color: black; padding: 1.1rem; border-radius: 14px; cursor: pointer; font-weight: 700; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; transition: transform 0.2s;">
                        ACEPTAR
                    </button>
                    <button id="confirm-no" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ccc; padding: 0.9rem; border-radius: 14px; cursor: pointer; font-weight: 500; font-size: 0.85rem; transition: all 0.2s;">
                        CANCELAR
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Bloquear scroll del body
        document.body.style.overflow = 'hidden';

        const closeModal = (result) => {
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
                document.body.style.overflow = '';
                modal.remove();
                if (callback) callback(result);
            }, 200);
        };

        modal.querySelector('#confirm-no').onclick = () => closeModal(false);
        modal.querySelector('#confirm-yes').onclick = () => closeModal(true);
    },

    // Facturación Electrónica SRI Ecuador
    sri: {
        // Función auxiliar para padding de ceros
        padWithZeroes: (num, length) => {
            const str = String(num);
            if (str.length >= length) return str;
            return '0'.repeat(length - str.length) + str;
        },

        // Calcular dígito verificador módulo 11
        calcularDigitoVerificador: (cadena) => {
            if (!cadena || cadena.length !== 48) {
                return { success: false, message: "La cadena debe tener exactamente 48 dígitos" };
            }
            const factores = [2, 3, 4, 5, 6, 7];
            let suma = 0;
            for (let i = 0; i < cadena.length; i++) {
                const digito = parseInt(cadena[cadena.length - 1 - i], 10);
                const factor = factores[i % factores.length];
                suma += digito * factor;
            }
            let digitoVerificador = 11 - (suma % 11);
            if (digitoVerificador === 10) digitoVerificador = 1;
            if (digitoVerificador === 11) digitoVerificador = 0;
            return { success: true, resultado: cadena + digitoVerificador, digito: digitoVerificador };
        },

        // Generar clave de acceso SRI
        generarClaveAcceso: (fecha, config) => {
            const pad = window.app.sri.padWithZeroes;
            const tipoComprobante = "01";
            const ruc = pad(config.ruc, 13);
            const ambiente = pad(config.ambiente, 1);
            const establecimiento = pad(config.establecimiento, 3);
            const puntoEmision = pad(config.punto_emision, 3);
            const serie = establecimiento + puntoEmision;
            const comprobante = pad(config.comprobante_actual, 9);
            const codigoNumerico = pad(config.codigo_numerico || "12345678", 8);
            const tipoEmision = pad(config.tipo_emision || "1", 1);

            const claveAcceso48 = fecha + tipoComprobante + ruc + ambiente + serie + comprobante + codigoNumerico + tipoEmision;
            const resultado = window.app.sri.calcularDigitoVerificador(claveAcceso48);
            
            if (!resultado.success) {
                console.error('Error calculando clave de acceso:', resultado.message);
                return null;
            }
            return resultado.resultado;
        },

        // Obtener tipo de identificación según cédula/RUC
        getTipoIdentificacion: (identificacion) => {
            if (!identificacion) return "07";
            const id = String(identificacion).trim();
            if (id === "9999999999999") return "07";
            if (id.length === 10) return "05";
            if (id.length === 13) return "04";
            return "06";
        },

        // Formatear identificación
        formatIdentificacion: (identificacion) => {
            if (!identificacion) return "9999999999999";
            let id = String(identificacion).trim();
            if (id === "9999999999999") return id;
            if (id.length <= 10) return window.app.sri.padWithZeroes(id, 10);
            return id;
        },

        // Formatear teléfono Ecuador
        formatearTelefono: (telefono) => {
            if (!telefono) return "S/N";
            let tel = String(telefono).replace(/\D/g, '');
            if (tel.length === 0) return "S/N";
            if (tel.length === 9) tel = '0' + tel;
            return tel;
        },

        // Generar JSON de facturación (formato APPGUIA)
        armarJson: (venta, configSRI, configServicios, claveAcceso, docNumber) => {
            const pad = window.app.sri.padWithZeroes;
            
            // Calcular totales y preparar productos
            let subtotal = 0;
            const productos = venta.detalles.map(item => {
                const subtotalProducto = item.cantidad * item.precio;
                subtotal += subtotalProducto;
                return {
                    codigoPrincipal: item.codigo || "SER-01",
                    codigoAuxiliar: item.codigo || "SER-01",
                    descripcion: (item.descripcion || item.nombre || "Producto").replace(/,/g, '.'),
                    cantidad: Number(item.cantidad).toFixed(2),
                    precioUnitario: Number(item.precio).toFixed(2),
                    subtotalSinIVA: subtotalProducto.toFixed(2),
                    codigoPorcentaje: "0",
                    tarifa: "0",
                    iva: "0.00",
                    descuento: "0.00"
                };
            });

            // Extraer partes del documento
            const docParts = docNumber.split('-');
            const estab = docParts[0] || pad(configSRI.establecimiento, 3);
            const ptoEmi = docParts[1] || pad(configSRI.punto_emision, 3);
            const secuencial = docParts[2] || pad(configSRI.comprobante_actual, 9);

            // Fecha de emisión
            const now = new Date();
            const fechaEmision = now.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });

            // Datos del cliente
            const cliente = venta.cliente;
            const identificacionComprador = window.app.sri.formatIdentificacion(cliente.cedula);
            const tipoIdentificacionComprador = window.app.sri.getTipoIdentificacion(identificacionComprador);
            const telefonoCliente = window.app.sri.formatearTelefono(cliente.telefono);

            // Construir JSON (formato idéntico a APPGUIA)
            const jsonFactura = {
                // WhatsApp config
                instance_id: configServicios.instance_id || configServicios.whatsapp_instance_id || "",
                access_token: configServicios.acces_token || configServicios.whatsapp_access_token || "",

                // Archivos
                archivo: `FACTURA-${estab}-${ptoEmi}-${secuencial}.xml`,
                facturaPDF: `FACTURA-${estab}-${ptoEmi}-${secuencial}.pdf`,

                // Correo del cliente
                correo: cliente.correo || "consumidor@final.com",

                // Configuración SRI
                ambiente: String(configSRI.ambiente),
                razonSocial: configServicios.empresa_razon_social,
                nombreComercial: configServicios.empresa_nombre_comercial || configServicios.empresa_razon_social,
                ruc: configServicios.empresa_ruc,
                claveAcceso: claveAcceso,
                estab: estab,
                ptoEmi: ptoEmi,
                secuencial: secuencial,

                // Direcciones
                dirMatriz: configServicios.empresa_dir_matriz,
                dirEstablecimiento: configServicios.empresa_dir_establecimiento || configServicios.empresa_dir_matriz,

                // Contribuyente
                contribuyenteRimpe: configServicios.empresa_contribuyente_rimpe || "",
                contribuyenteRIDE: configServicios.empresa_contribuyente_ride || "",
                obligadoContabilidad: configServicios.empresa_obligado_contabilidad || "NO",

                // Fecha
                fechaEmision: fechaEmision,

                // Cliente
                tipoIdentificacionComprador: tipoIdentificacionComprador,
                razonSocialComprador: cliente.razon_social,
                identificacionComprador: identificacionComprador,
                direccionComprador: cliente.direccion || "S/N",
                telefonoCliente: telefonoCliente,
                telefonoContribuyente: configServicios.empresa_telefono || "",

                // Documento
                factura: docNumber,
                formaPago: configServicios.factura_forma_pago_defecto || "01",
                formaPagoRIDE: configServicios.factura_forma_pago_ride || "01 SIN UTILIZACIÓN DEL SISTEMA FINANCIERO",

                // Totales
                codigoPorcentajeTotales: "0",
                baseImponibleTotales: subtotal.toFixed(2),
                valorTotales: "0.00",
                totalSinImpuestos: subtotal.toFixed(2),
                importeTotal: subtotal.toFixed(2),
                totalDescuento: "0.00",
                valor: "0.00",

                // Productos (arrays concatenados - formato APPGUIA)
                codigoPrincipal: productos.map(p => p.codigoPrincipal).join(' , '),
                codigoAuxiliar: productos.map(p => p.codigoAuxiliar).join(' , '),
                descripcion: productos.map(p => p.descripcion).join(' , '),
                cantidad: productos.map(p => p.cantidad).join(' , '),
                precioUnitario: productos.map(p => p.precioUnitario).join('|'),
                subtotalSinIVA: productos.map(p => p.subtotalSinIVA).join('|'),
                codigoPorcentaje: productos.map(p => p.codigoPorcentaje).join(','),
                tarifa: productos.map(p => p.tarifa).join(','),
                iva: productos.map(p => p.iva).join('|'),
                descuento: productos.map(p => p.descuento).join('|'),

                // Subtotales IVA
                subtotal12: "0.00",
                subtotal0: subtotal.toFixed(2),
                subtotalNoObjeto: "0.00",
                subtotalExento: "0.00",

                // Campos adicionales
                campoAdicional: 'campoAdicional nombre="Correo de cliente"',
                codigoArtesano: cliente.correo || "consumidor@final.com",
                artesanoRide: cliente.correo || "consumidor@final.com",

                // Firma electrónica (.p12)
                clave_12: configServicios.firma_clave_p12 || "",

                // URLs y logos
                urlLogo: configServicios.url_logo_factura || "",
                urlLogoPieCorreo: configServicios.url_logo_pie_correo || "",

                // SMTP
                correoRemitente: configServicios.smtp_correo_remitente || "",
                clavecorreoRemitente: configServicios.smtp_clave_remitente || "",
                hostcorreoRemitente: configServicios.smtp_host || "smtp.gmail.com",
                puertocorreoRemitente: String(configServicios.smtp_puerto || "587"),

                // Nombre del archivo .p12
                nombrep12: configServicios.firma_nombre_p12 || "",

                // Ambiente SRI
                ambientesri: configSRI.ambiente === 1 ? "https://celcer.sri.gob.ec" : "https://cel.sri.gob.ec"
            };

            return jsonFactura;
        }
    }
};
