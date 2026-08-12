# Guía de Instalación — Sistema POS La Economía

Esta guía permite poner en funcionamiento el sistema **desde cero, en una máquina y un proyecto de Supabase completamente nuevos**, sin depender de nada del entorno original de desarrollo.

Para entender cómo está armado el sistema por dentro (arquitectura, modelo de datos, lógica de negocio), ver [`docs/Manual Técnico - Sistema POS La Economía.docx`](docs/Manual%20T%C3%A9cnico%20-%20Sistema%20POS%20La%20Econom%C3%ADa.docx). Para aprender a operarlo día a día, ver [`docs/Manual de Usuario - Sistema POS La Economía.docx`](docs/Manual%20de%20Usuario%20-%20Sistema%20POS%20La%20Econom%C3%ADa.docx).

---

## 1. Requisitos mínimos

| Requisito | Versión / detalle |
|---|---|
| Node.js | 18 o superior (recomendado: 20 LTS) |
| npm | Incluido con Node |
| Navegador | Chrome / Edge recientes (recomendado para impresión de tickets) |
| Cuenta de Supabase | Gratuita, en [supabase.com](https://supabase.com) |
| Cuenta de Vercel | Opcional, solo para desplegar en producción |
| Git | Para clonar el repositorio |

No hace falta instalar PostgreSQL ni ningún servidor propio — la base de datos y la autenticación las provee Supabase como servicio administrado.

---

## 2. Clonar el repositorio

```bash
git clone <URL-del-repositorio>
cd sistema-pos-la-economia
```

## 3. Instalar dependencias

```bash
npm install
```

---

## 4. Crear el proyecto en Supabase

1. Entrar a [supabase.com](https://supabase.com) y crear una cuenta (o iniciar sesión).
2. **New Project** → elegir nombre, contraseña de base de datos y región.
3. Esperar a que el proyecto termine de aprovisionarse (1-2 minutos).
4. En **Project Settings → API**, copiar:
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **anon public key**
   - **service_role key** (opcional, solo si vas a poder crear usuarios desde el panel Admin — ver punto 5)

---

## 5. Configurar variables de entorno

Copiar el archivo de ejemplo:

```bash
cp .env.example .env
```

Completar `.env` con los valores del paso anterior:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Opcional — solo necesaria para crear usuarios desde el panel Admin
# (Project Settings → API → service_role key). NUNCA exponer este valor
# públicamente ni commitearlo: bypasea todas las políticas de seguridad.
VITE_SUPABASE_SERVICE_KEY=
```

> ⚠️ `.env` ya está en `.gitignore` — nunca debe commitearse con valores reales.

---

## 6. Ejecutar el esquema SQL

En el dashboard de Supabase, ir a **SQL Editor** y ejecutar los siguientes archivos **en este orden exacto** (cada uno depende del anterior):

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `supabase/schema.sql` | Crea todas las tablas, relaciones, triggers y habilita RLS con políticas base |
| 2 | `supabase/sprint2_functions.sql` | Políticas RLS del módulo POS + funciones `decrement_stock` e `increment_customer_balance` |
| 3 | `supabase/sprint3_functions.sql` | Funciones `increment_stock` y `transfer_stock` |
| 4 | `supabase/fix_rls_setup.sql` | Permite el Setup Wizard inicial (lectura anónima de `app_settings` + función `complete_initial_setup`) |

Se puede pegar el contenido completo de cada archivo en una nueva query del SQL Editor y ejecutarlo con **Run**. Si alguno falla porque un objeto ya existe, es seguro — todas las sentencias usan `create table if not exists` / `create or replace function`.

> ℹ️ Ninguna de estas políticas distingue roles a nivel de base de datos (cualquier usuario autenticado puede leer/escribir casi todo) — el control por rol de Cajero/Repositor/Admin es exclusivamente del frontend. Ver el Manual Técnico, sección 5.4, si se necesita reforzar esto con RLS granular.

---

## 7. Levantar el entorno de desarrollo

```bash
npm run dev
```

Abrir la URL que muestra la terminal (por defecto `http://localhost:5173`).

---

## 8. Setup inicial

Como la base de datos está vacía, el sistema muestra automáticamente el **Setup Wizard**:

1. Datos del negocio (nombre, CUIT, condición fiscal, dirección).
2. Datos del primer usuario — queda creado como **Superadmin**.
3. PIN numérico de 4 dígitos (para el cambio rápido de cajero en el POS).
4. Confirmación.

Al finalizar, el sistema redirige a `/login` para iniciar sesión con esas credenciales.

---

## 9. Cargar datos de prueba (opcional)

Con al menos un usuario ya creado (paso 8) y `VITE_SUPABASE_SERVICE_KEY` configurada en `.env`:

```bash
node scripts/seed.mjs
```

O hacer doble click en `scripts/cargar-datos.bat` (Windows). Carga categorías, productos, clientes y proveedores de ejemplo.

Para vaciar esos datos de prueba: `node scripts/vaciar-db.mjs` (o `scripts/vaciar-datos.bat`).
Para reiniciar el sistema por completo y volver a ver el Setup Wizard: `node scripts/reset-setup.mjs` (o `scripts/reset-setup.bat`) — **esto borra todo, incluidos los usuarios**.

---

## 10. Build de producción y despliegue

### Build local

```bash
npm run build    # genera dist/
npm run preview  # sirve dist/ localmente para probar el build
```

### Despliegue en Vercel

1. Importar el repositorio en [vercel.com](https://vercel.com) (New Project → conectar el repo de GitHub).
2. Vercel detecta Vite automáticamente (`npm run build`, carpeta de salida `dist/`).
3. En **Settings → Environment Variables**, cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (y `VITE_SUPABASE_SERVICE_KEY` si corresponde) — **estas variables son independientes de tu `.env` local**, hay que configurarlas también acá.
4. Deploy. El archivo `vercel.json` ya incluido resuelve el ruteo de la SPA (todas las rutas devuelven `index.html` para que React Router las maneje del lado del cliente).

---

## 11. Impresora térmica (opcional)

Para imprimir tickets sin que aparezca el diálogo de impresión de Chrome en cada venta:

1. Configurar la ticketera como impresora predeterminada de Windows.
2. En **Configuración** dentro del sistema, elegir el ancho de papel (58mm o 80mm).
3. Abrir el sistema con el acceso directo `POS La Economia.bat` (en la raíz del repo) en vez de un acceso directo común a Chrome — ese `.bat` abre Chrome con `--kiosk-printing`, que imprime directo sin diálogo.

---

## 12. Backup y restauración de datos

Supabase (plan gratuito) no incluye backups automáticos administrados. Opciones:

- **Manual, vía Dashboard**: Table Editor → seleccionar tabla → **Export data as CSV**, tabla por tabla.
- **Completo, vía `pg_dump`** (requiere la connection string de **Project Settings → Database**):
  ```bash
  pg_dump "postgresql://postgres:<password>@<host>:5432/postgres" > backup.sql
  ```
- **Restaurar**: `psql "postgresql://postgres:<password>@<host>:5432/postgres" < backup.sql`, o pegar el `.sql` en el SQL Editor del dashboard.

Se recomienda automatizar un `pg_dump` periódico (cron / tarea programada) si el sistema se usa en producción real, ya que un plan gratuito de Supabase puede pausar el proyecto por inactividad.

---

## 13. Mantenimiento sugerido

- **Dependencias**: revisar `npm outdated` cada tanto; correr `npm audit` antes de actualizar nada en producción.
- **Supabase**: los proyectos gratuitos se pausan tras ~1 semana sin actividad — entrar al dashboard periódicamente si el sistema tiene uso intermitente, o pasar a un plan pago si es uso real de negocio.
- **Tests**: correr `npm test` antes de mergear cambios (ver sección 14).
- **RLS**: si el sistema pasa a manejar datos sensibles de verdad, reforzar las políticas de la base (ver nota de la sección 6) en vez de confiar solo en el control de acceso del frontend.
- **`.env` / claves**: rotar la `service_role key` si alguna vez se expuso por error (por ejemplo, commiteada a Git).

---

## 14. Verificar que todo funciona (tests automatizados)

```bash
npm test            # corre toda la suite una vez
npm run test:watch  # modo watch, para desarrollo
```

La suite usa [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com). Estructura de `tests/`:

| Carpeta | Tipo de prueba | Qué cubre |
|---|---|---|
| `tests/unit/` | Unitaria | Funciones y módulos individuales sin dependencias externas: `formatters.js`, `useCartStore` (carrito, IVA, descuentos), `buildTicketHtml` (ticket), `authService` (login, setup) |
| `tests/integration/` | Integración | Relación entre módulos, con Supabase mockeado: venta + stock + cliente (`createSale`), cuenta corriente (`registerPayment` / `getAccountStatement`), turno + caja + pagos (`getSessionTotals`) |
| `tests/components/` | Funcional / UI | Comportamiento observable de componentes React: login (validación, roles, errores), alta de cliente (validación, guardado), búsqueda de productos (debounce, resultados, agregar al carrito) |
| `tests/performance/` | Rendimiento básico | Cota de sanidad sobre el cálculo del carrito con carga alta (~500 ítems), para detectar una regresión que lo vuelva notablemente lento |

**Cómo se mockea Supabase**: el proyecto no tiene backend propio — todos los servicios llaman directo a `supabase-js`. Para no depender de una base de datos real en los tests, `tests/helpers/supabaseMock.js` expone `chainable(resultado)`, que simula el query builder encadenable de Supabase (`.from().select().eq().single()`, etc.) resolviendo siempre al resultado indicado, sin importar qué métodos se encadenen antes. Cada test mockea `@/supabase/client` con `vi.mock(...)` y configura `supabase.from` / `supabase.rpc` con la secuencia de respuestas esperada, en el mismo orden en que el código bajo prueba las llama. Así se valida la lógica real de los services (qué se llama, con qué argumentos, en qué orden) sin necesitar red ni un proyecto Supabase real.

El `.env.test` en la raíz (valores dummy de `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, sin secretos reales) existe solo para que `src/supabase/client.js` pueda construirse sin explotar al importarse — ningún test hace una llamada de red real con esas credenciales.

---

## 15. Solución de problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY` al abrir la app | `.env` no existe o está incompleto | Repetir el paso 5. Reiniciar `npm run dev` después de crear/editar `.env` — Vite no recarga variables de entorno en caliente |
| "No se pudo conectar con el servidor" en el login | El proyecto de Supabase no resuelve (pausado, URL mal copiada, o eliminado) | Verificar la URL en el dashboard de Supabase; si el proyecto está pausado (plan free), reactivarlo desde ahí |
| El Setup Wizard vuelve a aparecer después de configurado | `setup_completed` no quedó en `'true'` en `app_settings`, o se corrió `reset-setup.mjs` sin querer | Revisar la tabla `app_settings` en el Table Editor |
| "No se pudo obtener el ID del usuario" al crear el superadmin | El email ya está registrado en Supabase Auth de un intento anterior | Eliminar el usuario desde **Authentication → Users** en el dashboard y reintentar |
| Crear usuarios desde el panel Admin no funciona | Falta `VITE_SUPABASE_SERVICE_KEY` en `.env` | Completarla (paso 4) y reiniciar el servidor |
| No imprime o abre el diálogo de impresión igual | La ticketera no es la impresora predeterminada, o se abrió con un acceso directo común a Chrome | Configurar la impresora predeterminada y usar `POS La Economia.bat` (paso 11) |
| Los pagos de cuenta corriente no se reflejan en el estado de cuenta | Falta la tabla `customer_payments` (solo si se ejecutó una versión vieja de `schema.sql` anterior a esta guía) | Volver a correr `supabase/schema.sql` completo — ya incluye esa tabla |
