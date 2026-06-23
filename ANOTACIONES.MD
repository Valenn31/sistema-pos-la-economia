# ANOTACIONES — Bugs y mejoras pendientes

---

## 🛒 POS — Módulo de Ventas

- que el target de sin existencias aparezca en el medio de lka pantalla
- si hay menos plata en caja que la cobrada que aparezca alerta

- VENTA POR DEPARTAMENTO (artículos departamentales): crear "departamentos" (ej: Fiambrería, Panadería, Almacén, Limpieza a granel) que funcionan como categorías comodín en el POS. El cajero selecciona el departamento y carga el monto a mano, sin buscar un producto del catálogo. Para productos fraccionados, a granel o re-envasados que no tienen código de barras ni ficha individual (fiambres cortados, lavandina en botellita, pan, etc.)

---

## 👤 Clientes / Cuenta Corriente

- LA DEUDA EN LA TABLA APARECE SIEMPRE 0
- PODER COBRAR CUENTA CORRIENTE DESDE EL SECTOR DE BUSQQUEDA DE CLIENTES
- GUARDAR VENTA DENTRO DEL CLIENTE CUANDO ANOTE EN ECUENTA CORRIENTE, AGREGAR FICHA DE RESUMEN DE CUENTA EN CADA CLIENTE CON SUS MOVIMIENTOS, CON ID DE COMPRA. DE DEUEDA Y PAGOS
- QUE SE PUEDA IMPRIMIR HISTORIAL DE DEUDA DE CLIENTE
- HACER QUE EL CLIENTE PUEDA SALDAR LA DEUDA
---

## 🏧 Cajero / Caja

- AL CERRAR UNA CAJA QUE NO SEA OBLIGATORIO ABRIR UNA INSTANTANEAMENTE

---

## 🔄 Devoluciones

---

## 🏪 Proveedores / Notas de Pedido

- PROVEEDORES, AL HACER UNA NOTA DE COMPRA, EL DESPLEGABLE NO MUESTRA LOS PROVEEDORES

---

## 📦 Productos / Inventario

- PODER BORRAR PRODUCTOS

---

## 🖨️ Impresión / Tickets

- IMPRIMIR CON LA TICKETERA + CONFIG DE TAMAÑO
- HACER UN GENERADOR DE TICKETS (OSEA LOS QUE VAN EN GONDOLA) CON LA INFO DEL PRODUCTO Y EL PRECIO (CORTE UN WORD)

---

## 🏷️ Descuentos

- QUE SE PUEDAN CREAR Y ELIMINAR TIPOS DE DESCUENTO

---

## ⚙️ General / UI

- PONER MODO OSCURO Y CLARO PARA LA INTERFAZ

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
