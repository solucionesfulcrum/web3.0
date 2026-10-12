# Formulario de proyectos

`POST /api/leads/project` valida JSON y guarda `Lead` con `source=project-form` y `status=NUEVO`. Usa el modelo existente; no crea un resumen IA ni requiere cambios de esquema. Los registros aparecen en `/admin/leads`.

## Configuración

No se encontró un proveedor de correo existente ni variables SMTP en los archivos de entorno revisados. Configurar únicamente en el entorno del servidor o `.env.local` (no versionado):

| Variable | Configuración |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL existente |
| `SMTP_HOST` | Servidor SMTP indicado por la cuenta Zoho y su región; no se presupone un host |
| `SMTP_PORT` | `465` para TLS implícito o `587` para STARTTLS |
| `SMTP_SECURE` | `true` con 465; `false` con 587 (STARTTLS obligatorio) |
| `SMTP_USER` | Usuario autorizado de Zoho para contacto@fulcrum.com.pe |
| `SMTP_PASSWORD` | Contraseña SMTP o de aplicación suministrada por el administrador de Zoho |
| `MAIL_FROM` | `FULCRUM <contacto@fulcrum.com.pe>` |
| `MAIL_TO_CONTACT` | `contacto@fulcrum.com.pe` |

El remitente y destinatario interno se validan en el servidor para este despliegue. No se usan variables `NEXT_PUBLIC_*`. `.env.example` contiene solamente los nuevos nombres vacíos. No se modificaron `.env` ni `.env.local`.

Referencias: [Zoho SMTP](https://www.zoho.com/mail/help/zoho-smtp.html), [Nodemailer SMTP](https://nodemailer.com/smtp).

## Prueba local

1. Instalar dependencias con `npm.cmd install` y confirmar que la base existente está disponible. El modelo ya incluye `Lead.requestId @unique`. Si una base antigua carece de esa columna/índice, revisar el script existente `prisma/sql/add-lead-request-id.sql` antes de aplicarlo con el procedimiento habitual de migraciones.
2. Configurar las variables reales anteriores. Ejecutar `npm.cmd run smtp:verify` para verificar conexión, TLS y autenticación sin enviar correos ni imprimir credenciales. Esto no garantiza que Zoho acepte el remitente o que un mensaje llegue a la bandeja de entrada.
3. Ejecutar `npm.cmd run dev`, abrir `http://localhost:3000/#contact` y enviar el formulario con una dirección de prueba propia. Esta acción sí envía la notificación interna y la confirmación cuando SMTP está configurado.
4. Confirmar el nuevo registro en `/admin/leads`, ambos correos y el estado del modal. El modal permanece abierto y permite cerrar con `CERRAR`.
5. Para comprobar un fallo de configuración, retirar temporalmente `SMTP_HOST` del entorno local y reiniciar el servidor. Enviar una nueva solicitud: debe guardarse y mostrar que no se pudo confirmar el envío del correo. Restaurar la variable al terminar.

Comprobaciones: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`.

## Resultados y reintentos

La respuesta 201 contiene `leadSaved: true` y `emails.internal` / `emails.confirmation` con `sent` o `failed`. `sent` significa aceptado por SMTP, no entrega garantizada. Un fallo SMTP nunca revierte el Lead. Ambos correos se intentan de forma independiente. Los logs identifican el ID y tipo de envío fallido sin contenido SMTP ni datos personales.

El navegador bloquea doble submit y reutiliza el UUID en un reintento de red. La restricción única PostgreSQL evita crear otro Lead o reenviar correos ante solicitudes concurrentes. Una repetición idéntica devuelve 200 con `duplicate: true` y estados `unknown`: no hay registro persistente de entrega que permita afirmar que el correo salió. La misma clave con contenido distinto devuelve 409. Una nueva solicitud después del éxito recibe otro UUID.

No hay cola ni reintento automático de correo. Si el proceso termina después de guardar el Lead, el registro permanece en CRM, pero los correos podrían no salir. Los fallos se revisan con el ID del Lead en los logs. Un reintento HTTP no reenvía esos correos. Las pruebas automatizadas simulan PostgreSQL y SMTP; no envían mensajes reales.
