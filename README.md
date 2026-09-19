# Bolsillo

Prototipo mobile-first para gestionar finanzas personales con una experiencia cercana, clara y tranquila.

## Stack

- Angular 21 con arquitectura basada en NgModules.
- Ionic 9 para infraestructura de interfaz móvil.
- Capacitor 8 para iOS, Android y respuesta háptica.
- Signals de Angular para el estado reactivo del prototipo.

## Ejecutar en web

```bash
npm install
npm start
```

Abre `http://localhost:4200`.

## Compilar

```bash
npm run build
```

La caché persistente de Angular está desactivada en `angular.json` para evitar el aborto nativo de LMDB observado con Node 24 en este entorno. Esto no cambia el resultado de la compilación.

## Sincronizar aplicaciones nativas

```bash
npm run mobile:sync
npm run ios
# o
npm run android
```

Para compilar iOS se necesita Xcode. Para Android se necesita Android Studio y el SDK de Android.

## Qué incluye

- Una cuenta manual con saldo inicial, sin conexión bancaria.
- Movimientos con fecha, categoría y centavos; edición, eliminación y deshacer.
- Filtros por mes, tipo, categoría y descripción; búsqueda sin distinguir tildes.
- Saldo disponible calculado desde las cuentas y las reservas para metas.
- Gastos de los últimos siete días y resúmenes mensuales calculados.
- Límites mensuales por categoría y avisos de presupuesto excedido.
- Metas de ahorro con historial de aportes y liberación de reservas.
- Pagos pendientes que se convierten en gastos al registrarlos como pagados.
- Perfil editable, montos ocultos e iconos Ionicons consistentes.
- Exportación CSV y descarga/restauración de respaldos JSON desde la web.
- Face ID y huella visibles como “Próximamente”, sin activar biometría.

No se conectan bancos. “Mi cuenta” es un registro manual único y los aportes a metas solo reservan dinero en la aplicación: no transfieren fondos reales. Los límites por categoría se aplican a todos los meses; cero significa sin límite definido. El saldo inicial representa el dinero anterior a los movimientos registrados.

Los datos se guardan localmente en `bolsillo-v2`. Al encontrar datos de la versión anterior, se conservan los movimientos y límites y se avisa que las fechas y el saldo inicial deben revisarse, ya que proceden de un prototipo con valores de demostración. Las claves anteriores no se eliminan. Una instalación nueva comienza sin movimientos ni saldos ficticios.

Un respaldo válido reemplaza los datos actuales tras confirmarlo en la interfaz. Los respaldos y CSV incluyen los montos reales, aunque la pantalla los oculte. La descarga mediante navegador requiere validación específica en las aplicaciones nativas; no se ha integrado un complemento de archivos/compartir de Capacitor.

## Pruebas

```bash
npm test -- --watch=false
```

Las pruebas cubren cálculos, filtros mensuales, cuentas, reservas, pagos, edición/eliminación/deshacer, persistencia, migración, validación de respaldos y estados de interfaz.
