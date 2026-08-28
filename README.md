# CMMS Biomédico — HSAIP

Sistema de gestión de mantenimiento de equipo médico.
Ingeniería Biomédica y Tecnovigilancia · Hospital San Ángel Inn Patriotismo

## Archivos

| Archivo | Destino |
|---|---|
| `index.html` | GitHub Pages (raíz del repositorio) |
| `Codigo.gs` | Editor de Google Apps Script |

---

## Instalación

### 1. Backend (Google Apps Script)

1. Abre tu hoja de cálculo → **Extensiones → Apps Script**
2. Borra todo el contenido y pega `Codigo.gs`
3. En la **línea 27**, sustituye `PEGA_AQUI_EL_ID_DE_TU_HOJA` por el ID de tu hoja.
   El ID está en la URL: `docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit`
4. Ejecuta la función `pruebaConexion` una vez y autoriza los permisos.
   Revisa el registro: debe listar tus hojas y encabezados.
5. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**  ← crítico
6. Copia la URL `/exec` generada.

> Cada vez que edites el script debes crear una **nueva versión** de la
> implementación, o los cambios no se reflejarán.

### 2. Frontend

En `index.html`, línea ~114, pega la URL en `GOOGLE_SHEETS_WEBAPP_URL`.
Sube el archivo al repositorio y activa GitHub Pages.

---

## Correcciones aplicadas (Rev. 02)

| # | Problema | Solución |
|---|---|---|
| 01 | Apps Script no envía encabezados CORS; el navegador bloqueaba la respuesta y el inventario quedaba vacío sin aviso | Transporte JSONP |
| 02 | `getActiveSpreadsheet()` devuelve null en Web App | `openById()` |
| 03 | `normalizeHeader` convertía `ÚLTIMO MANTENIMIENTO` en `uLTIMOMANTENIMIENTO`; el calendario no encontraba los campos y filtraba todo | Mapa explícito de encabezados |
| 04 | Fechas llegaban como ISO (`2026-03-15T06:00:00Z`) y `split('-')` daba mes 15 | Formato forzado `yyyy-MM` |
| 05 | Escrituras simultáneas se sobrescribían | `LockService` |
| 06 | `id: "Propio-undefined"` provocaba edición de la fila equivocada | ID garantizado + `_fila` |
| 07 | Errores silenciados en `catch` | Banner visible + reintentos + rollback |

## Integración Rev. 04 — Inventario con área, paginación y alta con folio automático

| # | Cambio | Detalle |
|---|---|---|
| 08 | La hoja de Inventario no mostraba dónde está cada equipo ni permitía filtrar por eso | Columna **ÁREA** (Ubicación Física) visible en la tabla + filtro desplegable, con "Todas" siempre primero en la lista |
| 09 | Con 1,000+ equipos por hoja, la tabla se renderizaba completa y saturaba la pantalla | Paginación de **30 en 30** con botones Atrás / Siguiente (se deshabilitan solos en los extremos); cualquier cambio de filtro, búsqueda u hoja regresa a la página 1 |
| 10 | El Núm. de Inventario se escribía a mano en "Agregar Equipo", sin relación con el consecutivo real de cada hoja | Folio **autogenerado** (PAT/CPAT/RPAT + consecutivo). El formulario muestra una vista previa que se recalcula al cambiar de hoja; el valor definitivo lo asigna el **servidor** dentro del mismo `LockService` que ya protege las escrituras, para que dos altas simultáneas nunca produzcan folios duplicados |
| 11 | Nivel de Riesgo era texto libre (podía capturarse cualquier cosa) | Ahora es una lista desplegable **I / II / III** en el alta y en la edición; si un registro antiguo tenía otro valor, la edición lo conserva como opción adicional en vez de perderlo silenciosamente |
| 12 | El banner de errores (`BannerEstado`) solo aparecía en la pestaña Calendarios | Se agregó también a Inventario, que es donde realmente ocurren los errores de alta/validación |

**Importante para desplegar:** después de subir el nuevo `Codigo.gs`, hay que crear una **nueva versión** de la implementación de Apps Script (Implementar → Gestionar implementaciones → Editar → Nueva versión), o el backend seguirá corriendo la lógica anterior y el folio se seguirá calculando solo en el navegador.

## Integración Rev. 05 — Indicadores en el mismo libro + control de accesos

| # | Cambio | Detalle |
|---|---|---|
| 13 | El dashboard de Indicadores leía un **CSV publicado en la web** (visible para cualquiera con la URL) de otro libro distinto al inventario | Nueva hoja **`Indicadores`** en el **mismo libro** del inventario. Los datos viajan en el mismo `getAll` (una sola llamada, una sola fuente). La hoja **se crea sola** con todos los encabezados la primera vez que se sincroniza; solo hay que capturar una fila por mes. Ya se puede **des-publicar** el CSV (Archivo → Compartir → Publicar en la web → Dejar de publicar) |
| 14 | Cualquiera con la URL de la web app podía leer y escribir todo el inventario | **Control de acceso por PIN**: pantalla de inicio de sesión en el frontend, validación en el **servidor** (`CLAVES_ACCESO` en `Codigo.gs`). Un PIN por persona → el servidor resuelve el nombre a partir del PIN, así el cliente no puede suplantar a nadie |
| 15 | No había manera de saber quién entraba (o intentaba entrar) al sistema | Nueva hoja **`Accesos`** (se crea sola): registra **cada intento** —permitido o denegado— con fecha/hora, resultado, evento (LOGIN / LECTURA / ESCRITURA), usuario, acción y navegador. Los PIN fallidos se guardan **enmascarados** (primer carácter + longitud), nunca completos |
| 16 | La hoja `Auditoria` registraba el usuario que el navegador declaraba (falsificable) | Las altas y ediciones ahora registran al **usuario autenticado** resuelto por el servidor a partir del PIN |
| 17 | `getAll` abría el libro de Sheets 5–6 veces por petición | `getLibro()` con caché por ejecución: se abre **una vez** (respuesta más rápida) |
| 18 | Borrar el campo "Año" del dashboard o del calendario dejaba `NaN` y vaciaba todo | Los inputs de año ignoran valores no numéricos |
| 19 | Cambiar Estatus/Motivo desde la ficha del equipo no revertía la pantalla si el guardado fallaba | Esos dos guardados rápidos ahora también hacen **rollback** |
| 20 | La hoja `Indicadores` vacía dejaba el spinner de "Cargando indicadores..." girando para siempre | Estado propio de "Sin indicadores capturados" con instrucciones |
| 21 | El histórico del dashboard dependía del orden de captura de las filas | Los meses se ordenan por **calendario** (enero → diciembre) sin importar el orden en la hoja |

### Configuración de la Rev. 05

1. **PINs** — En `Codigo.gs`, sección `CLAVES_ACCESO`, cambia los PIN de ejemplo
   (`CAMBIAME-1234`...) por los reales, uno por persona:
   ```javascript
   var CLAVES_ACCESO = {
     'mi-pin-secreto': 'Ing. Omar (Jefe Biomédica)',
     'otro-pin':       'Técnico Biomédico 1'
   };
   ```
   Los PIN viven **solo en el script** (tu cuenta de Google). El `index.html`
   publicado en GitHub Pages nunca los contiene.
2. **Hoja Indicadores** — No hay que crear nada a mano: la primera sincronización
   la crea con sus 28 columnas (`mes`, `mp_cumplimiento`, `mttr`,
   `downtime_*`, `presupuesto_*`, `ratio_mp`, `ratio_mc`, `reto1..5_titulo/desc/tipo`).
   Captura una fila por mes con el mes en **minúsculas** (`enero`, `febrero`...).
   También puedes ejecutar `inicializarIndicadores` desde el editor.
   Si ya tienes datos en el CSV viejo, cópialos tal cual: las columnas son idénticas.
3. **Desactivar seguridad para pruebas** — `SEGURIDAD_ACTIVA = false` restaura el
   comportamiento abierto de la Rev. 04 (no recomendado en producción).
4. **Nueva versión de la implementación** — igual que siempre: Implementar →
   Gestionar implementaciones → Editar → **Nueva versión**. Sin este paso el
   backend seguirá en Rev. 04 y el login fallará.

### Alcance honesto de la seguridad

- Lo que **sí** hace: nadie sin PIN puede leer ni escribir datos; todo intento
  queda registrado con fecha, resultado y navegador; los nombres en Auditoría,
  Bitácora y Accesos salen del PIN validado en servidor.
- Lo que **no** puede hacer (limitación de Apps Script con acceso "Cualquier
  usuario"): registrar la **dirección IP** ni la cuenta de Google del visitante —
  Google no expone esos datos al script en este modo de despliegue. Si algún día
  necesitas identidad Google real, habría que desplegar con acceso restringido a
  cuentas del dominio, lo que rompería el acceso anónimo desde GitHub Pages.
- El PIN viaja como parámetro de la petición (HTTPS). Es un control razonable
  para un equipo interno; no sustituye una autenticación corporativa formal.

## Integración Rev. 06 — Expediente digital del equipo (Google Drive)

| # | Cambio | Detalle |
|---|---|---|
| 22 | El historial documental (manuales y órdenes de servicio) vivía solo en Drive, desconectado del CMMS | Nueva sección **"Expediente Digital · Historial de Mantenimientos"** en la ficha de cada equipo. El backend localiza en Drive la carpeta del equipo (nombrada "Nombre del equipo + No. de inventario"), clasifica su contenido y lo muestra: manuales, órdenes de servicio por tipo y fecha, y otros documentos |
| 23 | Identificación de órdenes | Los archivos con prefijo **OSMP** (preventivo), **OSMC** (correctivo), **OSI** (instalación) y **OSB** (baja) se reconocen automáticamente; la **fecha** se extrae del nombre en orden año-mes-día con o sin separadores (`OSMP 2026-05-12`, `OSMC_20260311`, `OSI 2026 3 4`). El historial se ordena del más reciente al más antiguo y se puede **filtrar por tipo** |
| 24 | Ver el documento requería permisos de Drive de cada persona | **Visor integrado**: al pulsar "Ver", el backend (que corre con tu cuenta) entrega el documento y se muestra dentro del CMMS (PDF e imágenes; los Google Docs se exportan a PDF). Archivos > 8 MB se abren en Drive. Cada consulta de expediente y de documento queda registrada en la hoja **`Accesos`** |
| 25 | Búsqueda de la carpeta | Coincidencia con frontera numérica: buscar `PAT12` **no** abre la carpeta de `PAT123`. El resultado se cachea 10 min. Opcionalmente define `CARPETA_EQUIPOS_ID` en `Codigo.gs` (ID de la carpeta raíz que contiene todas las carpetas de equipos) para búsquedas más rápidas y sin falsos positivos |

### Configuración de la Rev. 06

1. **Autorizar Google Drive** — La Rev. 06 usa un permiso nuevo (lectura de
   Drive). Tras pegar el `Codigo.gs`, ejecuta `pruebaDrive` desde el editor
   (cambiando el inventario de ejemplo por uno real) y acepta la autorización.
   **Sin este paso, el expediente fallará en la web app.**
2. **Carpeta raíz (recomendado)** — Pega en `CARPETA_EQUIPOS_ID` el ID de la
   carpeta que contiene todas las carpetas de equipos
   (`drive.google.com/drive/folders/[ID]`). Si se deja vacío, se busca en todo tu Drive.
3. **Nueva versión de la implementación** — como siempre. `?action=ping` debe
   responder `"version":"Rev.06"`.

## Integración Rev. 07 — Nomenclatura extendida de órdenes

| # | Cambio | Detalle |
|---|---|---|
| 26 | Las órdenes nombradas "OS-Tipo-fecha" no aparecían en el expediente | Se reconocen ambas nomenclaturas: los **prefijos cortos** (`OSMP`, `OSMC`, `OSI`, `OSB`, `OSA`) y el **formato largo** `OS-Preventivo-04-05-2026-15-15`, `OS-Baja-12-11-2025`, `OS-Instalacion-2025-06-17`, `OS-Correctivo-23-01-2026-12-11`, `OS-Asistencia-12-05-2026-12-50` (con o sin acento en "Instalación") |
| 27 | Formatos de fecha mixtos | La fecha se acepta en **día-mes-año** (convención MX) o **año-mes-día**; la posición del año de 4 dígitos decide el orden. La **hora** final (`-15-15` → 15:15) es opcional y solo se toma si es una hora válida (evita confundirla con otros números del nombre). Dentro del mismo día, las órdenes se ordenan por hora |
| 28 | Nuevo tipo de orden | **Asistencia** (código `OSA`, badge ámbar), con su propio filtro en el expediente |
| 29 | Columna de peso | Eliminada de la tabla del expediente a petición del usuario |

### Convención de nombres esperada en Drive

```
📁 VENTILADOR MECANICO PAT123
   ├── Manual de usuario Dräger.pdf           ← contiene "manual" → sección Manuales
   ├── OSMP 2026-05-12.pdf                    ← preventivo (prefijo corto)
   ├── OS-Preventivo-04-05-2026-15-15.pdf     ← preventivo, 4 may 2026, 15:15
   ├── OS-Correctivo-23-01-2026-12-11.pdf     ← correctivo, 23 ene 2026, 12:11
   ├── OS-Instalacion-2025-06-17.pdf          ← instalación, 17 jun 2025
   ├── OS-Asistencia-12-05-2026-12-50.pdf     ← asistencia, 12 may 2026, 12:50
   ├── OS-Baja-12-11-2025.pdf                 ← baja, 12 nov 2025
   └── Foto de placa.jpg                      ← "Otros documentos"
```



## Integración Rev. 08 — Optimización de velocidad de carga

| # | Cambio | Detalle |
|---|---|---|
| 30 | Al abrir la app había que esperar el `getAll` completo mirando pantalla vacía | **Arranque instantáneo**: los datos de la última sincronización quedan guardados en el navegador y se pintan de inmediato al entrar; el `getAll` corre en segundo plano y los reemplaza al terminar. La etiqueta "(guardado en este equipo)" indica cuándo se está viendo la copia local. La caché se **borra al cerrar sesión** (no deja datos en computadoras compartidas) |
| 31 | Buscar la carpeta del equipo recorría las carpetas de Drive una por una | Con `CARPETA_EQUIPOS_ID` configurada, la búsqueda usa una **consulta filtrada por Google** (`"ID" in parents and title contains ...`): Drive devuelve solo las coincidencias en vez de iterar cientos de carpetas. De varios segundos a <1 s |
| 32 | Volver a abrir la misma ficha repetía toda la consulta a Drive | Doble caché de expedientes: **en el navegador** (durante la sesión, respuesta inmediata) y **en el servidor** (CacheService, 5 min, compartida entre todos los usuarios). El botón **"Actualizar"** salta ambas para traer los documentos recién subidos |
| 33 | Cada lectura escribía una fila en `Accesos` (~0.2–0.4 s por petición) | Nuevo flag `REGISTRAR_LECTURAS` en `Codigo.gs`. Con `true` (por defecto) se registra todo; con `false` solo logins, escrituras e intentos **denegados** — la vigilancia de quién entra se conserva, pero la sincronización es más ágil |

**Nota:** hay una parte del tiempo de carga que no es optimizable desde el código: el "arranque en frío" de Google Apps Script (1–3 s cuando la web app lleva rato sin usarse) y el viaje JSONP. El arranque instantáneo del punto 30 existe precisamente para que ese tiempo ocurra en segundo plano y no se perciba.

## Integración Rev. 09 — Membrete oficial + módulo de Mantenimientos Predictivos

| # | Cambio | Detalle |
|---|---|---|
| 34 | La impresión del calendario llevaba un encabezado genérico | **Membrete institucional** replicado del formato oficial (logo, datos del hospital, título "PROGRAMA ANUAL DE MANTENIMIENTO PREVENTIVO", código `HSAIP-FOR-INB-007 Rev. 01`). Los campos **EQUIPO** (Propio/Comodato/Renta) y **ÁREA** se actualizan solos según lo que se mande a imprimir. Solo aparece al imprimir; en pantalla no estorba |
| 35 | Logotipo | El **logotipo oficial va incrustado** (base64, ~19 KB) dentro del propio `index.html`: no depende de archivos externos y se imprime idéntico en cualquier equipo. Para sustituirlo algún día, basta reemplazar la cadena en `LOGO_HSAIP_URL`; si se deja vacía, se dibuja una versión aproximada con CSS |
| 36 | Nuevo módulo lateral **"Predictivos"** (revisiones rutinarias FOR-INB-008) | Se elige **mes + área** (y opcionalmente Propio/Comodato/Renta) y aparece el listado de equipos del área tomado del **inventario**, considerando **solo los equipos EN SERVICIO** (los "Fuera de Servicio" y bajas se excluyen, con un contador visible de excluidos) con una columna por **día programado**. Clic en la celda: vacío → **✓** (revisado, bien) → **✗** (con falla) → vacío. Observaciones por equipo. Todo se guarda al instante en la nueva hoja **`Predictivos`** (una fila por mes+área+equipo, columnas D1–D31), con usuario autenticado y multi-usuario protegido por LockService |
| 37 | Días según el calendario de revisiones | El módulo trae precargado el **Calendario de Revisiones Semanales**: Quirófano, CEyE y Hemodinamia **diarias**; el resto un día fijo por semana (Dom: UTIA/Imagen · Lun: Laboratorio/5° · Mar: Toco · Mié: Urgencias/T. Respiratoria · Jue: Endoscopia/4° · Vie: Cuneros/2° · Sáb: UCIN). La frecuencia se detecta por el nombre del área y **se puede ajustar a mano** si el nombre en el inventario no coincide. El programa es editable en la constante `PROGRAMA_REVISION` de `index.html` |
| 38 | Impresión en el formato oficial | El botón "Imprimir formato" genera el FOR-INB-008 fiel al archivo de Excel: membrete + tabla Equipo/Marca/Modelo/Serie con los días del periodo (las áreas diarias se dividen en bloques de **16 días por página**, como las hojas "QX" y "QX (2)" del original), tabla **"Registro de Revisión"** (DÍA/ÁREA/BIOMÉDICA para firmas), bloque de **Observaciones** y leyenda "DOCUMENTO CONTROLADO..." |

**Para desplegar:** `Codigo.gs` nuevo → **nueva versión** de la implementación (ping = `Rev.09`) → subir `index.html`. La hoja `Predictivos` se crea sola con la primera marca. Sin permisos nuevos.

## Funciones nuevas

- **Bitácora** (`Bitacora`): folio automático `MP-2026-0001`, técnico responsable, hallazgos, refacciones, tiempo de paro.
- **Tecnovigilancia** (`Tecnovigilancia`): clasificación de evento, paciente involucrado, causa raíz, reporte COFEPRIS — alineado a NOM-240-SSA1-2012.
- **Auditoría** (`Auditoria`): traza de altas y ediciones con usuario y fecha.
- **Indicadores** (`Indicadores`): KPIs mensuales del dashboard (Rev. 05).
- **Accesos** (`Accesos`): bitácora de accesos permitidos y denegados (Rev. 05).
- **Predictivos** (`Predictivos`): marcas de revisión rutinaria por mes/área/equipo, columnas D1–D31 (Rev. 09).

Todas estas hojas se crean solas la primera vez que se usan.

---

## Diagnóstico

Prueba el backend directamente en el navegador:

```
https://TU_URL/exec?action=ping
```

| Resultado | Causa |
|---|---|
| `{"ok":true,...,"version":"Rev.15"}` | Backend correcto y actualizado |
| Una versión anterior a `Rev.15` | Falta crear **nueva versión** de la implementación |
| Pantalla de login de Google | Acceso ≠ "Cualquier usuario" (paso 5) |
| `Configura SPREADSHEET_ID` | Falta el paso 3 |
| `ACCESO_DENEGADO` en la app | PIN incorrecto o no dado de alta en `CLAVES_ACCESO` (el intento queda en la hoja `Accesos`) |

Si `?action=getAll` devuelve arreglos vacíos, verifica que las hojas se llamen exactamente **Propio**, **Comodato** y **Renta**.

## Frecuencias

`M` mensual · `B` bimestral · `T` trimestral · `C` cuatrimestral · `S` semestral · `A` anual

Formato de `ULTIMO MANTENIMIENTO`: `AAAA-MM` (texto plano recomendado).

## Integración Rev. 10 — Correcciones de alta e impresión

| # | Problema | Solución |
|---|---|---|
| 38 | Al fallar el alta, el mensaje se pintaba en `BannerEstado`, que vive en el cuerpo de la página y quedaba **tapado por el propio modal** (`fixed inset-0 z-50`). El usuario veía el spinner girar 90 s y nada más | Estado propio `errorAlta` con banner **dentro** del modal, con el detalle técnico traducido a una causa accionable |
| 39 | `handleAddEquipo` usaba `jsonpConReintentos` (3 intentos). Si el `appendRow` sí se ejecutó y solo se perdió la respuesta, cada reintento **agregaba otra fila**: el mismo equipo con folios consecutivos | Las escrituras que agregan filas (alta y bitácora) usan `jsonpEscrituraUnica`: un solo intento. Edición y predictivos conservan reintentos porque son idempotentes |
| 40 | Aun sin reintentos, un timeout deja al usuario sin saber si guardó; volver a presionar duplicaba | **Referencia de idempotencia**: el frontend manda `clientRef` por alta; el backend guarda el resultado en `CacheService` 6 h y ante la misma referencia devuelve el folio original en vez de escribir otra vez |
| 41 | El alta no manejaba `ACCESO_DENEGADO`: con la sesión expirada dejaba al usuario atorado en el modal | Mismo `cerrarSesion()` que el resto de la app |
| 42 | `generarSiguienteNumeroInventario` hacía `getDataRange().getValues()` (todas las columnas de 1,000+ filas) dentro del `LockService` solo para leer una columna | Lee únicamente la columna de número de inventario |
| 43 | Los errores de Apps Script llegaban en crudo | `traducirErrorEscritura()` en el backend y `mensajeAmigable()` en el frontend distinguen permisos, protección de hoja, límite de celdas, timeout y configuración |
| 44 | `registrarAuditoria` y `registrarAcceso` tenían `catch {}` vacío: un problema de permisos de escritura fallaba **en silencio** en cada lectura y solo se hacía visible al dar de alta | Ahora escriben en `console.error` (visible en Apps Script → Ejecuciones) sin bloquear la operación |
| 45 | No había forma de diagnosticar una falla de escritura sin leer el código | Nueva función `pruebaEscritura()`: valida libro, hoja, protecciones, cálculo de folio, escritura real (escribe y borra una fila) y hojas de log |
| 46 | Al imprimir el calendario salía la **barra de desplazamiento** y se recortaban filas: `main` tiene `overflow-y-auto` y el contenedor de la tabla `overflow-x-auto`, así que el navegador los imprimía como cajas con scroll | El bloque `@media print` devuelve todos los contenedores a flujo normal (`overflow: visible`, sin `max-height`), oculta la barra, quita el layout flex y repite el `<thead>` en cada página |

## Integración Rev. 11 — Módulo de Proveedores (ingreso/salida + cruce quirúrgico)

Nuevo módulo lateral **Proveedores** con tres vistas: **Bitácora** (visitas con
permanencia), **Cruce con quirófano** e **Indicadores**.

### Origen de los datos

**Hoja `Proveedores`** — la llena la integración nativa Jotform → Google Sheets,
apuntando al mismo libro del CMMS. Columnas del formulario real:

| Columna del formulario | Clave interna | Uso |
|---|---|---|
| Submission Date | `sello` | **Reloj real** del ingreso o la salida |
| ID único | `folio` | Solo trazabilidad (se regenera en cada envío) |
| Tipo de movimiento | `movimiento` | Ingreso / Salida |
| Empresa: *(primera)* | `empresa` | Casa comercial, sección de entrada |
| Empresa: *(segunda)* | `empresa_2` | Casa comercial, sección de salida |
| Médico/solicitante | `medico` | **Llave del cruce** con CIRUJANO |
| Fecha y hora del procedimiento | `procedimientoTS` | **Llave del cruce** con FECHA + HORA |
| Area Destino: | `area` | Informativo |
| Fotografías | `foto*` | Solo se registra si existen |

Dos detalles resueltos en `leerProveedores()`:
- **`Empresa:` aparece dos veces.** En Sheets llegan dos columnas con el mismo
  título; la segunda se guarda como `empresa_2` y se toma la primera con dato.
  Sin esto, la columna de salida (vacía en los ingresos) borraba la de entrada.
- **El `ID único` se regenera en cada envío**, así que no sirve para unir la
  entrada con la salida.

**Hoja `Quirurgica`** — la escribe el CMMS al importar el Excel.

### Emparejado de entrada y salida

**En el registro de salida solo se captura la empresa.** No se vuelven a pedir
el médico, el área ni la fecha del procedimiento, y el `ID único` se regenera.
La única llave disponible es entonces la **empresa**, y el orden lo da el
`Submission Date`.

Además **la salida no siempre ocurre el mismo día**: una cirugía nocturna puede
cerrarse a la mañana siguiente, o el representante deja el equipo y regresa
después. `emparejarVisitas()` trabaja así:

- **FIFO por empresa**: al ingreso más antiguo sin cerrar le corresponde la
  salida más próxima posterior de esa misma empresa.
- **Ventana de `MAX_DIAS_VISITA` (3 días)**: más allá, la salida no se empareja
  y el ingreso queda como *sin salida registrada*. Sin este tope, un ingreso
  olvidado de la semana pasada se quedaría con la salida de hoy.
- La consulta al backend abre **±14 días** (`MARGEN_MOVIMIENTOS_DIAS`) sobre el
  rango visible, para que las salidas de otro día existan al momento de
  emparejar. El recorte al rango que el usuario pidió se hace **después**, por
  fecha del ingreso.
- Las visitas que cierran en otro día se marcan con la etiqueta **Salió otro
  día** y la bitácora muestra la fecha de salida bajo la hora. Es informativo,
  no una incidencia.

Limitación asumida: si dos personas de la misma casa comercial entran el mismo
día y solo una registra salida, se cierra la visita más antigua. El formulario
no distingue personas, así que no hay forma de saber cuál de las dos salió.

La permanencia se calcula con los `Submission Date` completos, de modo que una
visita que cruza la medianoche se mide bien.

### La programación queda cargada

La programación vive en la hoja `Quirurgica` del libro, así que **permanece
entre sesiones**: no hay que volver a subir el archivo para consultarla. La
pestaña de cruce muestra un panel con lo que hay cargado (procedimientos,
servicios y archivo de origen) y el selector de archivo va colapsado detrás del
botón **Actualizar programación**, que solo se usa cuando la programación
cambia.

### Cruce con la programación

Para el cruce sí se usa el médico, porque **el ingreso sí lo captura** y es el
registro que se compara contra la programación. La llave fuerte es
**médico + hora del procedimiento**, no el nombre de la empresa: en el Excel la casa comercial es texto libre, mientras que el médico y
la hora están limpios en ambos lados. Se puntúa cada cirugía candidata del día:

| Señal | Puntos |
|---|---|
| Dos o más apellidos del médico coinciden | 3 |
| Un solo apellido coincide | 1 |
| Hora del procedimiento dentro de ±90 min | 2 |
| Casa comercial coincide | 4 |

Se cruza con **4 puntos o más**. El apellido único vale poco a propósito:
"ING. LOPEZ" contra "DRA. LOPEZ CORRAL MONICA" es coincidencia, no identidad.

### Lectura del Excel de programación

Estructura real del archivo `PROGRAMACIÓN_DIARIA.xlsx`:

- **La fecha no está en ninguna columna**: vive en el título, en español
  (`PROGRAMACION DIARIA / SABADO 04 DE JULIO DEL 2026`). `fechaDesdeTitulo()`
  la extrae y la aplica a todas las filas.
- **No hay columna de sala**: hay marcadores sueltos en la columna A
  (`ENDOSCOPIA`, `HEMODINAMIA`) que dividen la lista. Lo anterior al primer
  marcador es quirófano. Ese valor se hereda como **servicio**.
- **Solo se lee la hoja `PROGRAMACIÓN`**: las hojas por servicio repiten los
  mismos procedimientos y los duplicarían.
- `HORA` admite `A/S` (a solicitud): se importa sin hora y se avisa.

**La columna PROVEEDOR es texto libre** y de ahí sale el cruce.
`extraerCasaComercial()` descarta lo que va entre paréntesis, corta en "CON",
y cuando hay teléfono elimina el token anterior (el nombre de pila del contacto).
Verificado contra los valores reales del archivo:

| Valor original | Casa comercial |
|---|---|
| `EQUIPO DE JOHNSON` | JOHNSON |
| `ARTROSA (ERNESTO FLORES +52 81 1762 4788)` | ARTROSA |
| `RINOBON CON ABRAHAM GONZALEZ 5569072187 (TORRE...)` | RINOBON |
| `PROSETEC( MICROBOTON,FIBERWIRE 2-0) JOVAN 55-18-28-8922` | PROSETEC |
| `BACK INTEGRA ( SET DE LAMINECTOMIA, SONOPET...)` | BACK INTEGRA |
| `NO APLICA` | *(sin proveedor)* |

La vista previa lista las casas comerciales extraídas para revisarlas antes de
importar. Los casos que no se parezcan van a `EQUIVALENCIAS_EMPRESAS` en
`index.html`.

### Datos personales

Las columnas `PACIENTE`, `EDAD`, expediente, NSS, CURP, sexo, diagnóstico,
teléfono, domicilio, cama y cuarto **se descartan en el navegador**, antes de
enviar nada. La vista previa las lista y marca cuáles eran datos personales.

### Vista de cruce: la programación completa

La tabla de cruce muestra **todos** los procedimientos del periodo, no solo los
que quedaron sin proveedor, para que funcione como lista de verificación del
día. Cada uno recibe un estado:

| Estado | Significado |
|---|---|
| **Registrado** | Un proveedor de esa casa cruzó con esta cirugía en concreto |
| **Casa en sitio** | El representante de esa casa está en el hospital, pero su ingreso cruzó con otra cirugía del día |
| **Sin registro de ingreso** | La casa comercial no registró ningún ingreso ese día |
| **No requiere** | La cirugía no tiene casa comercial (NO APLICA o celda vacía) |

La distinción entre *Registrado* y *Casa en sitio* importa: un mismo
representante suele cubrir varias cirugías de su casa el mismo día, así que
"Casa en sitio" no es una incidencia. La casilla **Ver solo las que faltan**
filtra a las que están en rojo.

### Alertas

**Sin cirugía programada**, **Cirugía sin proveedor registrado** (comparada por
empresa, no por cirugía: un representante suele cubrir varias del día),
**Llegada tardía** con minutos de retraso, **Sin salida registrada** y
**Permanencia larga** (más de 5 h, ajustable en `UMBRAL_PERMANENCIA_MIN`).

### Configuración

1. Jotform → Settings → Integrations → Google Sheets, al **mismo libro** del
   CMMS. Renombra la hoja destino a `Proveedores`.
2. Nueva versión de la implementación. `?action=ping` debe responder `"version":"Rev.11"`.
3. La hoja `Quirurgica` se crea sola en la primera importación.
4. La importación viaja en bloques de 8 filas: medido con la programación real,
   cada procedimiento aporta ~410 caracteres a la URL de JSONP.
5. No requiere permisos nuevos: el módulo no toca Drive.

## Integración Rev. 12 — Firmas en formatos impresos + estadía de proveedores con fecha y hora

| # | Problema | Solución |
|---|---|---|
| 47 | El calendario anual (FOR-INB-007) se imprimía sin espacios de firma: había que autorizarlo a mano o sobre el margen | Nuevo **bloque de firmas** al pie de la hoja impresa con los tres responsables: **Jefe de Ingeniería Biomédica y Tecnovigilancia** (Elaboró), **Jefe de Área** (Vo. Bo.) y **Director de Infraestructura y Servicios** (Autorizó). Se agregó también a la **última hoja** del FOR-INB-008 (revisión semanal). El bloque nunca se parte entre páginas: si no cabe al pie, viaja completo a la siguiente |
| 48 | La hoja impresa del calendario no llevaba leyenda de color ni cierre de documento controlado | Pie impreso con **leyenda de color** (Programado / Ejecutado / Fuera de servicio), total de equipos, fecha de impresión y la leyenda **DOCUMENTO CONTROLADO** |
| 49 | **La puntualidad del proveedor se calculaba con minutos desde la medianoche de cada lado.** Un ingreso a las 21:00 para una cirugía de las 07:00 del día *siguiente* se reportaba como “+14 h de retraso” | El retraso se calcula sobre la **línea de tiempo completa** (sello `yyyy-MM-dd HH:mm` del ingreso contra fecha + hora del procedimiento). Ese mismo caso ahora da **−10 h**: llegó con diez horas de anticipación. La diferencia es **con signo**: naranja si llegó tarde, verde si llegó antes |
| 50 | Sin cruce con la programación no había forma de evaluar puntualidad | Si no hay cirugía cruzada se usa como referencia la **fecha y hora del procedimiento capturada en el propio formulario** de ingreso. La columna Diferencia indica en su tooltip qué referencia se usó (programación o formulario) |
| 51 | La alerta de **Permanencia larga** contaba la espera previa: quien llegaba la víspera superaba siempre las 5 h | Se distingue **permanencia total** (entrada → salida, sigue mostrándose) de **permanencia operativa** (inicio del procedimiento → salida). El umbral `UMBRAL_PERMANENCIA_MIN` se evalúa sobre la operativa |
| 52 | `salidaOtroDia` comparaba la fecha del *procedimiento* del ingreso contra la fecha de *envío* de la salida: dos cosas distintas, y la etiqueta “Salió otro día” salía cuando no tocaba | Ahora compara **días naturales reales** (sello contra sello) |
| 53 | Un ingreso la noche anterior no se distinguía visualmente de uno del mismo día | Nueva etiqueta informativa **“Ingresó la víspera”** y, en la bitácora, la fecha real de entrada debajo de la hora cuando no coincide con la del procedimiento |
| 54 | Cualquier minuto de retraso disparaba la alerta | Nueva constante **`TOLERANCIA_LLEGADA_MIN` (10 min)** de margen de cortesía |
| 55 | El indicador de puntualidad dividía entre los ingresos cruzados, contara o no con hora de referencia | Se divide entre los ingresos **evaluables** (los que tienen referencia de inicio) y se reporta aparte cuántos llegaron **anticipados**. Se agregó **permanencia operativa mediana** al resumen del periodo |

### Cómo cambiar los nombres de las firmas

En `index.html`, constante `FIRMAS_FORMATO` (junto al componente `BloqueFirmas`):

```javascript
const FIRMAS_FORMATO = [
    { rol: 'Elaboró',  nombre: 'ING. NOMBRE APELLIDO', cargo: 'Jefe de Ingeniería Biomédica y Tecnovigilancia' },
    { rol: 'Vo. Bo.',  nombre: '',                     cargo: 'Jefe de Área' },
    { rol: 'Autorizó', nombre: '',                     cargo: 'Director de Infraestructura y Servicios' }
];
```

Si `nombre` se deja vacío, la línea se imprime en blanco para anotar el nombre a mano.

### Cálculo de la estadía (resumen)

| Medida | Cómo se obtiene | Para qué sirve |
|---|---|---|
| **Permanencia total** | Sello de salida − sello de ingreso (fecha + hora) | Tiempo real dentro del hospital |
| **Espera previa** | Hora del procedimiento − hora de ingreso (si es positiva) | Antelación con que se presentó |
| **Permanencia operativa** | Permanencia total − espera previa | Es la que se vigila contra `UMBRAL_PERMANENCIA_MIN` |
| **Diferencia (retraso)** | Sello de ingreso − inicio del procedimiento | Negativa = llegó antes; positiva = llegó tarde |

## Integración Rev. 12b — Rendimiento y fluidez de trabajo

| # | Problema | Solución |
|---|---|---|
| 56 | `leerProveedores()` hacía `getDataRange().getValues()` —la hoja **completa** de Jotform— en cada consulta, aunque solo se pidiera el día de hoy. La hoja solo crece | **Lectura incremental**: la hoja se recorre de abajo hacia arriba en bloques de 400 filas y se corta al pasar por debajo del rango pedido (con `HOLGURA_LECTURA_PROVEEDORES` = 30 días de colchón). Medido contra una hoja de 3,003 filas: **400 filas leídas en vez de 3,003**, en 2 lecturas de rango. `LECTURA_INCREMENTAL_PROVEEDORES = false` restaura el recorrido completo |
| 57 | `getAll` abría seis hojas completas en **cada** sincronización, aunque los datos fueran idénticos a los de hace medio minuto | **Caché de servidor** (`CacheService`, `CACHE_GETALL_SEG` = 90 s). Como el inventario pesa más de los 100 KB que admite una clave, el JSON se **parte en bloques de 90 KB**; si al leer falta uno (expiró), se descarta todo y se relee la hoja: nunca se devuelve un JSON a medias. **Toda escritura invalida la caché en el acto**, y el botón "Sincronizar Sheets" manda `fresco=1` para saltarla |
| 58 | Cada tecla en los buscadores recalculaba el filtro sobre 1,000+ equipos y repintaba la tabla | **Búsqueda diferida** (`useValorDiferido`, 250 ms): el input responde al instante, el filtrado espera a que la persona deje de escribir. Aplicado a Inventario, Calendario y Proveedores |
| 59 | Los filtros de hoja, área, mes y año se perdían al recargar la página o al volver a abrir el CMMS | **`usePreferencia`**: hoja de inventario, estatus, área, mes, año, origen y área de Predictivos y vista de Proveedores se guardan en `localStorage` y se restauran solas. Si el área guardada ya no existe en la hoja cargada, se regresa a "Todas" en vez de dejar la tabla vacía sin explicación. Se borran al **cerrar sesión**, igual que la caché de datos |
| 60 | Para llevar el calendario o la bitácora de proveedores a un reporte había que capturarlo a mano | Botón **Exportar** en Calendario y en Proveedores. El calendario sale con una columna por mes (PROGRAMADO / EJECUTADO) más una hoja de *Referencia* con los filtros usados; Proveedores exporta según la vista activa (Bitácora, Cruce o Indicadores) con **permanencia total, espera previa, permanencia operativa y diferencia contra el inicio** ya calculadas. Usa el SheetJS que ya venía cargado |
| 61 | Marcar un mantenimiento ejecutado levantaba el folio de bitácora en silencio, sin hallazgos, refacciones ni tiempo de paro | **Detalle opcional**: al marcar la celda se abre una ventana con técnico, estatus final, tiempo de paro, proveedor, hallazgos, acciones y refacciones. **"Solo marcar"** (o cerrar, o clic fuera) reproduce exactamente el comportamiento anterior. El folio se levanta **una sola vez** en cualquiera de los dos caminos, con `jsonpEscrituraUnica` para no duplicar |

### Constantes nuevas de la Rev. 12b

| Constante | Archivo | Valor | Qué controla |
|---|---|---|---|
| `CACHE_ACTIVA` | `Codigo.gs` | `true` | `false` = comportamiento Rev.11, sin caché |
| `CACHE_GETALL_SEG` | `Codigo.gs` | `90` | Vida de la caché de `getAll` |
| `LECTURA_INCREMENTAL_PROVEEDORES` | `Codigo.gs` | `true` | `false` = recorrer la hoja completa |
| `HOLGURA_LECTURA_PROVEEDORES` | `Codigo.gs` | `30` | Días extra que se leen por debajo del rango |
| `BLOQUE_LECTURA_PROVEEDORES` | `Codigo.gs` | `400` | Filas por bloque al recorrer hacia atrás |
| `PREF_PREFIJO` | `index.html` | `cmms_pref_` | Prefijo de los filtros guardados |

## Rev. 13 — Módulo de Órdenes de Servicio

Nuevo módulo que lee la hoja **`Form Responses`** (la que llena Jotform con cada orden de servicio ejecutada) y la convierte en una consulta con búsqueda especializada, indicadores y exportación.

### Qué hace el backend

`leerOrdenes(desde, hasta)` + acción `getOrdenes`. Aplana las más de setenta columnas del formulario a una estructura utilizable:

| Situación de la hoja | Cómo se resuelve |
|---|---|
| **Refacciones**: 3 juegos de 4 columnas (`>> 1 >> Cantidad`, `>> 1 >> Descripción`, ...) | Se colapsan en un arreglo `refacciones[]` y solo se conservan los juegos con algo capturado |
| **Valores de Referencia**: rejilla de 5×4 = 20 columnas | Se colapsa en `valoresReferencia[][]`, descartando los renglones vacíos |
| **`Observaciones:` aparece DOS veces** (una en el cuerpo del servicio y otra en el bloque IQ/OQ/PQ) | Los encabezados repetidos se numeran: `observaciones` y `observaciones_2`, expuestos como `observaciones` y `observacionesIQ` |
| **Nombre del responsable en tres columnas** (`- First Name`, `- Last Name` y el campo completo) | Se prefiere el campo completo; si viene vacío se arma con First + Last |
| **Firmas en base64** — pesan mucho y no se muestran en la tabla | No se envían al navegador: solo viajan las banderas `firmaBio` y `firmaArea`, para poder filtrar por formatos sin firmar |
| **Sí / SI / Si / No mezclados** | `respuestaSiNo()` normaliza a `'SI'`, `'NO'` o `''`. La distinción entre "No" capturado y celda vacía se conserva, porque el indicador de validación solo debe dividir entre las órdenes que sí declararon algo |
| **`Fecha de Intalación`** (así, con el typo del formulario) | Mapeado tal cual; se normaliza dd/mm/yyyy → ISO |
| **Fechas de Inicio y Fin que cruzan la medianoche** | `duracionMin` se calcula sobre sellos completos, no sobre minutos desde la medianoche |
| La hoja **solo crece** | Lectura incremental igual que Proveedores, con `HOLGURA_LECTURA_ORDENES` = 60 días (más holgada, porque la Fecha de Inicio puede ser bastante anterior al día en que se capturó el formulario). Medido: **300 filas leídas de 703** |

El rango de fechas se aplica sobre la **Fecha de Inicio** del servicio; si esa celda viene vacía se usa la fecha de envío del formulario.

### Búsqueda especializada

- **Rango de fechas** (por omisión, el mes en curso)
- **Búsqueda libre** sobre folio, equipo, marca, modelo, serie, inventario, área, personas, falla reportada, descripción, observaciones y **el texto de las refacciones** (sirve buscar un número de parte). Ignora acentos y mayúsculas, y es diferida a 250 ms
- **Filtros directos**: Área y Tipo de servicio
- **Más filtros**: Falló con paciente · Daño a paciente · Cumple validación · Apto para paciente · Refacciones (con/sin) · Firmas (completas/incompletas) · Frecuencia · Reporta · Empresa externa · Ordenar por
- Los selectores Sí/No incluyen **"Sin dato"**, que aísla las órdenes donde el campo quedó vacío — es la forma rápida de encontrar capturas incompletas
- Los catálogos de los selectores se arman **de los datos que realmente llegaron**, no de una lista fija: si cambian las opciones del formulario, los filtros se adaptan solos
- Los filtros y el orden se guardan entre sesiones (`usePreferencia`)

### Indicadores

Órdenes · equipos y áreas distintas · eventos con falla estando conectado a paciente (y su %) · eventos con daño a paciente · % de cumplimiento de validación · equipos no aptos · órdenes sin fecha de fin · con refacciones · con firma incompleta · duración mediana · distribución por tipo de servicio. **Todos se recalculan sobre el universo filtrado**, no sobre el total.

### Detalle y exportación

- **Ficha completa** de cada orden: equipo, tiempos, textos del servicio, tabla de refacciones, rejilla de valores de referencia, bloque de servicio externo con IQ/OQ/PQ, cierre con estado de firmas. Botón **Ver equipo** que salta a la ficha del inventario cuando el número de inventario coincide
- **Exportar** genera cuatro hojas: *Órdenes* (41 columnas), *Refacciones* (una fila por refacción, que es lo que sirve para costeo), *Valores de referencia* e *Indicadores* — esta última incluye el texto de los filtros aplicados, para que el archivo siempre diga de qué universo salió
- **Imprimir** usa el membrete institucional (HSAIP-FOR-INB-023 Rev. 00) con el criterio de filtrado en el encabezado, el bloque de tres firmas de la Rev. 12 y la leyenda de documento controlado

### Si la hoja tiene otro nombre

`HOJA_ORDENES` en `Codigo.gs`. El módulo avisa en pantalla cuando no encuentra la hoja, en vez de quedarse vacío sin explicación.

**Para desplegar la Rev. 12 completa:** sube `index.html` **y** pega el nuevo `Codigo.gs`, luego crea una **nueva versión** de la implementación (Implementar → Gestionar implementaciones → Editar → Nueva versión). `?action=ping` debe responder `"version":"Rev.13"`. No requiere permisos nuevos.

## Rev. 14 — Filtros de búsqueda y alta de equipos

Corrige los dos problemas reportados (filtros del Inventario y alta bloqueada en
Comodato) y aprovecha para cerrar varios puntos de fricción del uso diario.

### Filtros del Inventario

Eran **cuatro defectos distintos** que se sumaban, y por eso se percibían como
"el buscador no sirve":

| # | Problema | Solución |
|---|---|---|
| 62 | La búsqueda comparaba con `toLowerCase()` + `includes()`: **no ignoraba acentos**. `oximetro` no encontraba `OXÍMETRO`, ni `mecanico` a `MECÁNICO`. En un inventario capturado a lo largo de años, con y sin acentos, quedaba fuera una parte importante de los equipos | Búsqueda normalizada con `normTexto()` (sin acentos, sin dobles espacios, sin distinguir mayúsculas), la misma que ya usaban Proveedores y Órdenes |
| 63 | Solo se miraban **cuatro campos**: nombre, folio, marca y serie. Buscar por modelo, área, fabricante o proveedor no devolvía nada, aunque el campo no advertía que fuera limitado | Ahora recorre doce campos: folio, nombre, marca, modelo, serie, fabricante, área, proveedor, descripción, estatus, motivo y nivel de riesgo. El *placeholder* dice cuáles |
| 64 | Búsqueda de una sola cadena: `ventilador puritan` no encontraba nada porque ese texto exacto no existe en ningún campo | **Búsqueda por términos**: cada palabra debe aparecer en algún campo, en cualquier orden. `840 puritan` encuentra el mismo equipo que `puritan 840` |
| 65 | `estaEnServicio()` exigía que el estatus contuviera la palabra `SERVICIO`. Los equipos con la celda **vacía**, o capturados como `ACTIVO` / `OPERATIVO`, no eran ni una cosa ni la otra: al elegir *Sólo En Servicio* **desaparecían de la tabla sin explicación** | "En servicio" es ahora simplemente lo que **no** está fuera de servicio — el mismo criterio que ya usaba Predictivos. `estaFueraServicio()` reconoce además `BAJA`, `INACTIVO` y `NO OPERATIVO` |
| 66 | El filtro de Área comparaba **texto exacto**: `UCIA`, `ucia` y `UCIA ` (con espacio final) aparecían como tres opciones distintas en el desplegable, y elegir una escondía a las otras dos | El catálogo se deduplica de forma normalizada (una entrada por área real) y la comparación también. Se conserva la escritura más común como etiqueta visible |
| 67 | Los filtros persistidos de la Rev. 12b dejaban la tabla casi vacía al abrir el CMMS —por ejemplo un *Sólo Fuera de Servicio* de la sesión anterior— **sin nada en pantalla que lo explicara** | Barra de **filtros activos** en etiquetas, cada una con su ✕, más *Limpiar todos*. El mensaje de tabla vacía distingue "esta hoja no trajo equipos" de "los filtros no dejan pasar ninguno de los N que sí hay" |
| 68 | `paginaActual` y la página mostrada se desincronizaban: estando en la página 12, al filtrar a 2 páginas la pantalla mostraba la 2 pero el estado seguía en 12, así que había que presionar **Atrás diez veces** antes de ver algún cambio | Los botones operan sobre `paginaSegura` y un `useEffect` recorta `paginaActual` al total real |
| 69 | El buscador del **Calendario** solo miraba el número de control, aunque nada lo advertía | Misma búsqueda por términos sobre folio, equipo, marca, modelo, serie y área. La etiqueta cambió de "Control" a "Buscar" |

### Alta de equipos en Comodato

La causa raíz: **`accionAgregar()` daba por hecho que la hoja destino tenía
encabezados reconocibles**. Si en la pestaña Comodato el título de la columna de
folio está escrito distinto que en Propio (`NO. INVENTARIO`, `No. de Control`…),
`mapearEncabezado` no lo encontraba en `MAPA_ENCABEZADOS` y caía al *fallback*.
Consecuencia: el folio se calculaba pero **nunca se escribía**, y la fila entraba
sin número de inventario ni nombre — es decir, el equipo no volvía a aparecer.
Ninguna de las dos capas avisaba de nada.

| # | Problema | Solución |
|---|---|---|
| 70 | Encabezados escritos distinto entre pestañas rompían el alta en silencio | **~25 alias nuevos** en `MAPA_ENCABEZADOS` para folio (`NO. INVENTARIO`, `No. Inv`, `No. de Control`, `CLAVE INVENTARIO`…), nombre, serie y área. Verificado contra 24 variantes de escritura reales |
| 71 | El alta escribía primero y preguntaba después | **Validación previa**: si falta una columna reconocible de folio o de nombre, el alta se detiene y el mensaje **dice cuál falta y lista los encabezados detectados** en esa hoja |
| 72 | `appendRow()` recorta la fila al último bloque con datos; con celdas de formato arrastradas el registro podía quedar descuadrado respecto de los encabezados | Escritura por rango explícito (`setValues`), que fija fila y columnas |
| 73 | Un rango protegido o una validación de datos hacía que la escritura no quedara, sin error | **Verificación posterior**: se relee la celda del folio y, si no coincide, se devuelve un error que nombra la hoja, la fila y las dos causas habituales |
| 74 | Diagnosticar cualquiera de lo anterior obligaba a abrir el editor de Apps Script | Botón **"Verificar hoja"** en el modal de alta (acción `diagHoja`, solo lectura): reporta si la pestaña existe —detectando la que se llama `Comodato ` con espacio final—, encabezados crudos y traducidos, columnas obligatorias faltantes, títulos sin equivalencia, duplicados, protecciones, filas libres y el folio que asignaría |
| 75 | Tras el alta, la pantalla mostraba lo capturado, no lo realmente guardado: si una columna no existía en esa pestaña, el dato se perdía sin que se notara | **Resincronización en segundo plano** (`fresco=1`) 400 ms después del alta: trae la fila real y corrige la pantalla sola |

### Rendimiento

| # | Cambio | Detalle |
|---|---|---|
| 76 | `accionEditar` hacía `getDataRange().getValues()` —la hoja completa, 1,000+ filas × 20 columnas— **dentro del `LockService`**, en cada edición | **Ruta rápida**: el frontend ya sabe en qué fila vive el registro (`_fila`), así que se lee **una sola fila** y se verifica que el folio coincida. Si no coincide (alguien insertó o borró filas en la hoja) se cae al recorrido completo de siempre, así que no se pierde robustez |
| 77 | La hoja activa se recalculaba en cada filtro, catálogo de áreas y vista previa de folio, recorriendo los equipos de las tres hojas cada vez | `equiposHoja` se resuelve una vez con `useMemo` y todo lo demás parte de ahí |

### Fluidez de trabajo

| # | Cambio | Detalle |
|---|---|---|
| 78 | Para llevar el inventario a un reporte había que copiarlo a mano; Calendario, Proveedores y Órdenes ya tenían botón de exportar | **Exportar** en Inventario: 18 columnas de lo que se está viendo, con los filtros ya aplicados, más una hoja de *Referencia* que deja constancia de qué universo salió |
| 79 | La tabla salía siempre en el orden de la hoja | **Ordenamiento por columna** (clic en el encabezado, alterna ascendente/descendente). El folio se ordena numéricamente, no como texto: `PAT9` va antes que `PAT10` |
| 80 | 30 resultados por página fijos | Selector de **30 / 60 / 100 / 250**, persistido junto con el resto de los filtros |
| 81 | Había que ir al ratón para buscar | Atajo **`/`** enfoca el buscador desde cualquier punto; **`Esc`** lo limpia. Se ignora si ya estabas escribiendo en otro campo |
| 82 | No había forma de encontrar capturas incompletas | Opción **"Sin estatus capturado"** en el filtro de estatus |

### Nuevas constantes y estados persistidos

| Clave | Archivo | Qué guarda |
|---|---|---|
| `cmms_pref_ordenInv` | `index.html` | Columna y sentido de ordenamiento del inventario |
| `cmms_pref_tamPagina` | `index.html` | Resultados por página |

**Para desplegar:** pega el nuevo `Codigo.gs` → **nueva versión** de la
implementación (Implementar → Gestionar implementaciones → Editar → Nueva
versión) → sube `index.html`. `?action=ping` debe responder `"version":"Rev.14"`.
No requiere permisos nuevos.

> Si el alta en Comodato sigue fallando después de desplegar, abre el modal
> "Agregar Equipo", selecciona la hoja Comodato y pulsa **Verificar hoja**: el
> panel dirá exactamente qué corregir en la hoja de cálculo.

## Rev. 15 — Fecha de término, ID único y archivo de la orden en Drive

Tres cambios en el módulo de Órdenes de Servicio y uno en el calendario de
preventivos. El de fondo: **el expediente digital deja de ser de solo lectura**.

### Órdenes de Servicio

| # | Problema | Solución |
|---|---|---|
| 83 | La columna Fecha —y el rango de la consulta— usaban la **Fecha de Inicio**. Una orden abierta el 28 y cerrada el 3 del mes siguiente contaba en el mes equivocado, que no es el criterio con el que se arman los indicadores de COCASEP | La fecha de la orden es ahora la de **término del servicio**. El backend calcula `fechaServicio` (fecha de fin) y sobre ella se aplican el rango, el ordenamiento y la exportación. Las etiquetas del panel dicen **"Finalizadas desde / Hasta"** para que el criterio quede a la vista |
| 84 | Los formatos **sin fecha de fin** habrían desaparecido de la consulta al cambiar el criterio | Se cae a la fecha de inicio y, en último caso, a la de envío del formulario. La celda se marca en ámbar con **"sin fecha de fin"**: la orden se sigue viendo y además queda señalada como captura incompleta (el KPI *sin cerrar* ya las contaba) |
| 85 | La columna Orden mostraba `N° de orden`, pero el folio que el personal busca en el archivo físico es el **ID único** que Jotform imprime en el formato | La columna encabeza con el **ID único**; el N° de orden queda como línea secundaria. El ID único entra también en la búsqueda libre, en el encabezado del detalle y en las cuatro hojas de la exportación |

### Subir la orden firmada al expediente (Órdenes y Preventivos)

Hasta la Rev. 14 el PDF firmado se subía a mano a Drive: había que localizar la
carpeta del equipo y escribir el nombre con la convención exacta. Bastaba
invertir la fecha o escribir mal el tipo para que el archivo **dejara de
aparecer clasificado** en la ficha del equipo aunque estuviera ahí.

| # | Cambio | Detalle |
|---|---|---|
| 86 | **Botón de subida en el detalle de la orden** | Al abrir una orden aparece el panel *Expediente digital*: tipo, fecha, hora y archivo. El tipo y la fecha vienen prellenados con los de la propia orden y se pueden corregir |
| 87 | **El nombre lo escribe el servidor** | `OS-Preventivo-04-05-2026-15-15.pdf` — la nomenclatura larga que ya reconocen `clasificarOrden()` y `extraerFechaHora()` desde la Rev. 07. El nombre definitivo se muestra en pantalla **antes** de subir. Si ya existe, se agrega un consecutivo antes de la extensión (`...-15-15-2.pdf`), que no confunde a la lectura de la hora |
| 88 | Subir a la carpeta equivocada | El panel **consulta y muestra la carpeta destino antes de enviar nada**. Si no existe, no la crea sola: avisa y ofrece el botón *Crear carpeta y subir*, con el nombre de la convención (`NOMBRE DEL EQUIPO INVENTARIO`) dentro de `CARPETA_EQUIPOS_ID` |
| 89 | Subir dos veces la misma orden sin darse cuenta | Si el expediente ya tiene una orden del **mismo tipo y la misma fecha**, se avisa con el nombre del archivo existente antes de confirmar |
| 90 | **Botón de subida al marcar un preventivo** | La ventana de detalle del mantenimiento (calendario FOR-INB-007) trae el mismo panel, con tipo *Preventivo* prefijado. La subida es **independiente de "Guardar detalle"**: ocurre al presionar *Subir al expediente*, así que elegir *Solo marcar* no la pierde |
| 91 | Del folio de bitácora no había forma de llegar a la orden firmada | Nueva columna **`ORDEN ARCHIVADA`** en la hoja `Bitacora` con el nombre del archivo. El encabezado se agrega solo la primera vez en las hojas que ya existían |
| 92 | La ficha del equipo seguía mostrando el expediente anterior | Al subir se invalidan las dos cachés de expediente (navegador y `CacheService`) y el panel relee la carpeta: la orden nueva aparece en el acto |

### Por qué esta operación viaja por POST

Un PDF escaneado no cabe en una URL, así que la subida es **la única operación
de la aplicación que no usa JSONP**. Y como la respuesta de un POST a Apps
Script puede quedar bloqueada por CORS —exactamente el motivo por el que todo
lo demás usa JSONP (corrección 01 de la Rev. 02)—, el diseño **no depende de
poder leerla**:

1. El frontend manda el POST con una **referencia de intento**. El cuerpo viaja
   sin encabezados propios, así que se envía como `text/plain`: es una
   "petición simple" y no dispara el *preflight*.
2. El backend sube el archivo y guarda el resultado en `CacheService` bajo esa
   referencia, 6 horas.
3. Si el navegador dejó leer la respuesta, se usa y listo. Si no, el frontend
   pregunta por el resultado con la acción **`estadoSubida`** por JSONP, que es
   el transporte que en este proyecto siempre funciona.

La misma referencia da **idempotencia**: reenviar el intento devuelve el archivo
ya creado en lugar de subir un duplicado. La subida tampoco pasa por
`procesarEscritura`, para no ocupar el `LockService` —y con él el alta de
equipos— mientras Drive recibe varios megabytes.

### Configuración de la Rev. 15

1. **Autorizar la escritura en Drive.** La Rev. 14 solo *leía* Drive; subir
   archivos es un permiso distinto y Apps Script **no lo pide** durante una
   llamada de la web app. Ejecuta **una vez** `pruebaSubida()` desde el editor
   (cambiando `PAT1` por un inventario real) y acepta el aviso. La función sube
   un archivo de prueba, verifica que el expediente lo clasifique bien y lo
   borra. **Sin este paso el botón fallará con un error de permisos.**
2. **Nueva versión de la implementación** — como siempre. `?action=ping` debe
   responder `"version":"Rev.15"`.
3. Sube el nuevo `index.html`.

| Constante | Archivo | Valor | Qué controla |
|---|---|---|---|
| `MAX_SUBIDA_MB` | `Codigo.gs` e `index.html` | `12` | Tamaño máximo de la orden. **Debe coincidir en ambos archivos** |
| `EXTENSIONES_ORDEN` | `Codigo.gs` | pdf, imágenes, Office | Formatos admitidos |
| `NOMBRE_TIPO_ORDEN` | `Codigo.gs` e `index.html` | Preventivo / Correctivo / Instalacion / Baja / Asistencia | Texto del tipo en el nombre del archivo (sin acentos, a propósito) |

### Lo que esta revisión no hace

- **No sube el archivo a Jotform ni lo adjunta a la fila de la hoja.** La orden
  queda en la carpeta del equipo en Drive, que es donde vive el expediente; en
  la hoja `Bitacora` solo se guarda su nombre.
- **No archiva por lote.** Se sube una orden a la vez, desde su propio detalle.
- **No funciona sin número de inventario**: la carpeta se localiza por ese
  número. Cuando la orden no lo trae, el panel lo dice en vez de fallar al
  enviar.
- El módulo **Predictivos** (revisión rutinaria semanal FOR-INB-008) no lleva
  panel de subida: esas revisiones no generan una orden de servicio por evento.

## Rev. 16 — Identidad: CMMS E.S.T.H.E.R, aplicación instalable y paleta institucional

El sistema pasa a llamarse oficialmente **CMMS E.S.T.H.E.R**, se puede
**instalar en el teléfono** como cualquier otra app, y toda la interfaz se
unifica bajo una paleta de tres colores.

### Archivos que ahora componen el sistema

Antes bastaba con `index.html`. Ahora el repositorio necesita, **todos en la
misma carpeta** (la raíz de la GitHub Page):

| Archivo | Para qué |
|---|---|
| `index.html` | La aplicación |
| `manifest.webmanifest` | Nombre, iconos y modo de presentación de la app instalada |
| `sw.js` | Service worker: es lo que hace la app instalable y que abra sin señal |
| `icon-192.png`, `icon-512.png` | Iconos estándar |
| `icon-maskable-192.png`, `icon-maskable-512.png` | Iconos para Android, que recorta hasta un 20% por lado |
| `icon-180.png` | Icono de iOS (pantalla de inicio) |
| `icon-32.png`, `icon-16.png`, `favicon.ico` | Pestaña del navegador |

`Codigo.gs` **no cambia** en esta revisión: no hace falta crear una nueva
versión de la implementación de Apps Script.

### Instalación en el teléfono

| # | Cambio | Detalle |
|---|---|---|
| 93 | El sistema solo existía como una pestaña del navegador, con el icono genérico de GitHub Pages y el título "MediCMMS" | **Aplicación instalable (PWA)**. En Android: Chrome → menú → *Instalar aplicación*. En iPhone: Safari → *Compartir* → *Añadir a pantalla de inicio*. Queda como un icono más, abre a pantalla completa sin barra de direcciones y con el nombre **CMMS E.S.T.H.E.R** debajo |
| 94 | Icono | El logotipo se genera en dos variantes: la normal (a sangre, sin marco blanco) y una **maskable** para Android, con el emblema reducido al 76% para que ningún lanzador —circular, cuadrado o de esquinas redondeadas— corte el caduceo o el nombre |
| 95 | Sin señal dentro del hospital la app no abría siquiera | El service worker guarda la portada y los iconos, así que **abre aunque no haya red** (los datos, obviamente, siguen necesitando conexión con Apps Script) |
| 96 | Riesgo real de una PWA: dejar a la gente usando una revisión vieja sin saberlo | La estrategia del `sw.js` es **red primero**: estando en línea siempre se sirve la última versión publicada. La copia guardada solo entra cuando la red falla. Subir un `index.html` nuevo sigue surtiendo efecto de inmediato. Para forzar además la limpieza en todos los equipos, sube el número de `VERSION` en `sw.js` |
| 97 | El logotipo dependería de un archivo externo | Además de los PNG, el logotipo va **incrustado en base64** (`LOGO_ESTHER_URL`, ~14 KB) y es el que se ve en la pantalla de acceso y en la barra lateral: aunque falte un archivo, la marca nunca aparece rota |

### Paleta

Tres colores base:

| Color | Papel |
|---|---|
| **#2296D0** azul | Principal: navegación, acciones primarias, enlaces |
| **#C28BF9** lavanda | Acento: acciones secundarias (Exportar), refacciones, énfasis |
| **#C2C2C2** gris | Neutro: bordes, texto secundario, fondos |

**Cómo se aplicó, y por qué así.** La aplicación tiene cerca de mil clases de
color repartidas por todo el marcado. Reescribirlas una por una habría sido
lento y, sobre todo, frágil. En su lugar se **redefinen las escalas de
Tailwind** en un solo bloque al inicio de `index.html`:

```
blue · sky · cyan                        -> azul     (#2296D0 en el 500)
teal · indigo · violet · purple ·
fuchsia                                  -> lavanda  (#C28BF9 en el 300)
gray · slate · zinc · neutral · stone    -> neutro   (#C2C2C2 en el 300)
```

Cada `bg-blue-600` o `text-gray-500` que ya existía toma el color nuevo sin
tocar el marcado, y en adelante la paleta se cambia desde un solo lugar
(`ESCALA_AZUL`, `ESCALA_LAVANDA`, `ESCALA_NEUTRA`).

Los once tonos de cada escala se derivaron del color exacto **conservando su
matiz** (200°, 270° y neutro puro) y bajando la luminosidad en los escalones
oscuros, por una razón concreta: **texto blanco sobre #2296D0 da 3.4:1**, por
debajo del mínimo legible. Así que el color exacto vive en el escalón 500
—donde se ve en bordes, anillos de foco, iconos y acentos— y los botones usan
el 600, ya oscurecido. Medido:

| Combinación | Contraste |
|---|---|
| Blanco sobre botón primario (azul 600) | 4.77:1 ✓ |
| Blanco sobre botón Exportar (lavanda 600) | 6.42:1 ✓ |
| Blanco sobre barra lateral (neutro 900) | 13.6:1 ✓ |
| Texto secundario (neutro 600) sobre blanco | 5.42:1 ✓ |

El lavanda de los escalones medios se **desaturó a propósito**: el violeta
puro derivado de #C28BF9 competía con el azul y hacía ver la interfaz
disfrazada. Bajado de saturación, el acento se lee como parte de la misma
familia en vez de como un color pegado encima.

### Lo que deliberadamente NO se pintó

- **Rojo, ámbar y esmeralda se conservan.** No son decoración: son colores
  *semánticos* —fuera de servicio, advertencia, ejecutado— y aparecen en la
  **leyenda de los formatos impresos controlados**. Teñirlos de azul o
  lavanda haría ilegible el calendario y desalinearía el formato respecto del
  documento oficial.
- **El membrete HSAIP no se toca.** Sus azules (`#2E74B5`, `#1F4687`,
  `#8FAADC`, `#D9E2F3`) replican el encabezado institucional del formato
  controlado. La paleta del sistema es la de la *aplicación*; la del papel
  membretado es la del *hospital*.

### Cómo desplegar la Rev. 16

1. Sube a la raíz del repositorio: `index.html`, `manifest.webmanifest`,
   `sw.js` y los ocho archivos de icono.
2. Entra desde el teléfono y comprueba que aparece la opción de instalar.
   Si no sale, abre las herramientas de desarrollo → *Application* →
   *Manifest*: casi siempre es que falta subir algún icono.
3. **La primera vez después de instalar**, si ves la versión anterior, cierra
   y vuelve a abrir la app: el service worker nuevo toma el control en la
   siguiente carga.

> Cambiar el nombre visible más adelante se hace en tres lugares:
> `manifest.webmanifest` (`name` y `short_name`), la etiqueta `<title>` y la
> meta `apple-mobile-web-app-title`.
