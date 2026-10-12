# Reservas comerciales: validación local

Estas rutas están habilitadas únicamente con `npm run dev`. El chatbot permite
reservar después de recibir el ID del lead creado correctamente.

## Flujo en el chatbot

La captura conserva los datos entre turnos. Si guardar el lead falla, muestra una
sola advertencia y permite un nuevo intento en el siguiente turno elegible. Solo
un intento puede estar activo y, después del éxito con un ID válido, no vuelve a
crear leads en esa conversación. La clave `requestId` es estable durante los
reintentos y se renueva con «Nueva conversación».

Antes de usar esta protección de reintentos, aplica el cambio aditivo a la base
configurada (no borra leads):

```powershell
npx prisma db execute --config prisma7.config.ts --file prisma/sql/add-lead-request-id.sql
npx prisma generate --config prisma7.config.ts
```

Comprueba que la CLI y Next.js utilizan la misma base. Reinicia `npm run dev`
después de regenerar Prisma para descartar el cliente anterior en memoria.
Un requisito y un teléfono como `965874879` son suficientes, con consentimiento;
nombre, empresa y el prefijo `+51` no son obligatorios. La API conserva el teléfono
como texto y solo recorta espacios exteriores.

1. Abre el widget y escribe «Necesito un sistema para mi clínica dental».
2. Conversa hasta registrar la solicitud con email o teléfono y consentimiento.
3. Pulsa «Agendar reunión». Si falta email, el widget lo pide antes de mostrar fechas.
4. Elige un día laborable de los próximos siete días. Los horarios se consultan en la API.
5. Selecciona un horario y pulsa «Confirmar reunión». Ese es el único paso que envía la reserva.
6. Comprueba la confirmación, la hora de Lima, el enlace Meet y la invitación por correo.
7. Verifica el registro `Meeting` y su relación con el lead en PostgreSQL.

Cerrar y reabrir el widget conserva la reunión durante esta conversación. Tras el
éxito desaparecen los controles para crear otra reserva. «Nueva conversación»
reinicia explícitamente el estado; está deshabilitado mientras se está reservando.
El estado del chat no se persiste al recargar toda la página, igual que antes.

Si el backend responde 409, el widget explica el conflicto y vuelve a consultar la
fecha. Si falla la consulta o la reserva, conserva el lead y permite seguir conversando.
Los mensajes generados por IA no ejecutan reservas. El selector usa únicamente
slots de la API, y la tarjeta de éxito requiere `success: true` del backend.

Pruebas aisladas del flujo (sin eventos ni correos reales):

```powershell
node --test tests/chat-booking.test.cjs
```

## Configuración

El servidor utiliza `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REDIRECT_URI` y `GOOGLE_REFRESH_TOKEN` desde `.env.local`.
Reinicia el servidor después de cambiar estas variables. Prisma CLI carga el mismo
archivo mediante `prisma7.config.ts`.

La base debe contener el modelo `Lead`. Para crear `Meeting` por primera vez,
con PostgreSQL accesible y tras verificar que la tabla aún no existe:

```powershell
npx prisma db execute --config prisma7.config.ts --file prisma/sql/add-meeting.sql
npx prisma generate --config prisma7.config.ts
npm run dev
```

El SQL está envuelto en una transacción y solo crea la tabla nueva, sus índices y
la relación opcional con `Lead`. No reinicia la base ni borra registros existentes.
No vuelvas a ejecutarlo cuando la tabla ya exista. No establece un historial de
migraciones para las tablas anteriores del proyecto.

## Disponibilidad

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/calendar/availability?date=2026-10-15" -Method GET
```

Usa una fecha futura. La API devuelve slots de lunes a viernes, de 09:00 a 17:30,
con fin máximo a las 18:00, en `America/Lima`. Se exige un mínimo de 30 minutos de
anticipación. Los slots ocupados en Google o por una reserva `SCHEDULED` guardada
en PostgreSQL quedan excluidos. Las respuestas no se almacenan en caché.

## Reserva real

Sustituye `TU_EMAIL_DE_PRUEBA` por una cuenta de prueba que controles y copia un
`start` devuelto por disponibilidad. Usa un `leadId` existente o elimina ese campo.

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/calendar/book" -Method POST -ContentType "application/json" -Body '{"leadId":2,"name":"Kevin Arias","email":"TU_EMAIL_DE_PRUEBA","start":"2026-10-15T15:00:00-05:00"}'
```

Esta llamada crea un evento real y envía una invitación mediante Google Calendar.
La API responde HTTP 201 con `meeting.id`, fechas UTC, `meetUrl` y
`calendarHtmlUrl`. El evento se muestra en hora de Lima. Comprueba el evento,
la invitación en tu correo y el registro en PostgreSQL, por ejemplo con:

```powershell
npx prisma studio --config prisma7.config.ts
```

Los campos opcionales son `name` y `leadId`. El servidor calcula el fin; enviar
`end` produce HTTP 400. Un lead inexistente produce HTTP 404. Repetir un slot ya
reservado produce HTTP 409 con `Ese horario ya no está disponible`.

## Concurrencia y errores parciales

Cada reserva adquiere un bloqueo transaccional de PostgreSQL por slot. Bajo ese
bloqueo consulta registros locales y vuelve a consultar FreeBusy para el rango
exacto inmediatamente antes de insertar el evento. Esto coordina instancias de
esta API. Google no ofrece una operación atómica de comprobar e insertar: una
edición simultánea desde otra aplicación o directamente en Calendar todavía puede
crear un solapamiento.

Si falla la persistencia después de intentar crear el evento, primero se comprueba
si el registro quedó guardado. Si no existe, se intenta cancelar únicamente el
evento generado por esa solicitud y enviar la cancelación al invitado. Si no se
puede confirmar el estado, HTTP 500 solicita conciliación manual. Revisa Calendar
y PostgreSQL antes de repetir la operación.

Google puede generar Meet de forma asíncrona. La API consulta el mismo evento
hasta tres veces. Si el enlace aún no está disponible o falla esa consulta, conserva
la reserva y devuelve `meetUrl: null` con una advertencia. Revisa el evento mediante
`calendarHtmlUrl`; esta primera versión no tiene un proceso posterior de sincronización.

Las cancelaciones hechas manualmente en Calendar tampoco actualizan `Meeting`;
un registro `SCHEDULED` seguirá bloqueando su slot hasta conciliar su estado.

## Verificación del código

```powershell
node --test tests/calendar.test.cjs
npx tsc --noEmit --incremental false
npm run build
```

Las pruebas aíslan Google y PostgreSQL. Cubren horarios, validación, solapamientos,
errores internos de FreeBusy, concurrencia, persistencia, compensación y Meet
pendiente. No leen credenciales ni envían invitaciones reales.
