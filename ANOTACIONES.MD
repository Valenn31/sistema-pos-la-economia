# ANOTACIONES — Bugs y mejoras pendientes

---

## 🛒 POS — Módulo de Ventas

- que el target de sin existencias aparezca en el medio de lka pantalla
- si hay menos plata en caja que la cobrada que aparezca alerta

- VENTA POR DEPARTAMENTO (artículos departamentales): crear "departamentos" (ej: Fiambrería, Panadería, Almacén, Limpieza a granel) que funcionan como categorías comodín en el POS. El cajero selecciona el departamento y carga el monto a mano, sin buscar un producto del catálogo. Para productos fraccionados, a granel o re-envasados que no tienen código de barras ni ficha individual (fiambres cortados, lavandina en botellita, pan, etc.)

---

## 👤 Clientes / Cuenta Corriente

- QUE SE PUEDA IMPRIMIR HISTORIAL DE DEUDA DE CLIENTE
---

## 🏧 Cajero / Caja


---

## 🖨️ Impresión / Tickets


---

## 🏷️ Descuentos

- QUE SE PUEDAN CREAR Y ELIMINAR TIPOS DE DESCUENTO

---

## ✅ Tareas completadas

- ✅ Byscador de productos en modulo ventas no aparece por codigo de barras (EAN)
- ✅ Si eñ producto no tiene stock que aparezca a la hora de escanearlo en el POS
- ✅ AL COLOCARLE EL IVA, SE LO RESTA Y SE LO SUMA PERO EL FINAL DE LA CUENTA DA BIEN (CREO) ASI Q ARREGLAR EL TEMA VISUAL
- ✅ AL CAMBIAR DE CAJERO CON PIN NO CAMBIA DEL TODO, SI SALGO DEL POS Y ENTRO VUEKLVE EL QUE ESTABA ANTES, SACAR AL PINGO ESO (se eliminó la función de cambio de cajero por PIN)
- ✅ TODOS LOS SLOTS PARA COLOCAR UN NUMERO QUE TIENE LA FLECHA DE INCREMENTAR Y DECREMENTAR, NO LO HACEN DE A 1 SINO 0.001
- ✅ NO DEJA COLOCAR LA FECHA DE VENCIMIENTO DEL PRODUCTO SI EL CHECKBOX ESTA ACTIVADO
- ✅ MOSTRAR EL STOCK EN LA TABLA EL SOTCK QUE TIENE EL PRODUCTO Y MOSTRAR LA FECHA DE VENCIMIENTO + FILTRADO POR COLUMNAS
- ✅ Alerta de vencimientos en dashboard (KPI + listado de productos por vencer)
- ✅ que detecte las cajas del dia de la fecha para los reportes (bug de timezone: el último día del rango no aparecía)
- ✅ devolucion no tendria que agregar a stock automaticamente, sino preguntarlo (checkbox) + que tenga en cuenta la devolucion de ese dinero en caja
- ✅ Que en modulo repositor cuando voy a cargar nota de pedido no aparezca la opción Proveedores (campo oculto para repositor, supplier_id ahora opcional)
- ✅ GUARDAR VENTA DENTRO DEL CLIENTE CUANDO ANOTE EN CTA CTE + FICHA DE RESUMEN DE CUENTA CON MOVIMIENTOS, DEUDA Y PAGOS
- ✅ PODER COBRAR CUENTA CORRIENTE DESDE EL SECTOR DE BUSQUEDA DE CLIENTES
- ✅ HACER QUE EL CLIENTE PUEDA SALDAR LA DEUDA (pagos ahora se registran en customer_payments)
- ✅ LA DEUDA EN LA TABLA APARECE SIEMPRE 0 (RPC fallaba silenciosamente, agregado fallback directo)
- ✅ PROVEEDORES, AL HACER UNA NOTA DE COMPRA, EL DESPLEGABLE NO MUESTRA LOS PROVEEDORES
- ✅ IMPRIMIR CON LA TICKETERA + CONFIG DE TAMAÑO (config en Settings, ancho 58/80mm, launcher .bat para impresión silenciosa)
- ✅ PONER MODO OSCURO Y CLARO PARA LA INTERFAZ (toggle sol/luna en topbar, CSS variables, persistencia en localStorage)
- ✅ AL CERRAR UNA CAJA QUE NO SEA OBLIGATORIO ABRIR UNA INSTANTANEAMENTE (pantalla "No hay caja abierta" con opción de abrir o ir al dashboard)
- ✅ HACER UN GENERADOR DE TICKETS DE GÓNDOLA (pestaña Etiquetas en Stock, filtros por categoría, preview, impresión A4)