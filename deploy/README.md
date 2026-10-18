# Despliegue aislado de Hotel Manager

Configuracion preparada para convivir con CONEX/APERP. No reemplaza el Docker Compose heredado ni configura el servidor remoto automaticamente.

## Arquitectura

Servidor indicado el 2026-10-14: `190.3.171.48`. La comprobacion HTTP devuelve Microsoft-IIS/10.0. HTTPS por IP no valida la cadena; el certificado presentado es Cloudflare Origin CA para `*.busapp.cl` y `busapp.cl`. No usar esa IP como destino HTTPS de Vercel ni desactivar la validacion TLS. Confirmar acceso administrativo al dominio y si el servidor dispone de una VM Linux/Docker antes de aplicar este Compose. IIS puede actuar como proxy, pero la imagen SQL incluida requiere Linux; la respuesta HTTP por si sola no confirma el sistema operativo ni las capacidades Docker del host.

La opcion principal es frontend en Vercel y backend + SQL Server en el servidor. `compose.server.yml` utiliza su propia red y volumen `hotelmanager_sql_data`. SQL Server no publica puertos. La API escucha solo en `127.0.0.1:3088` del servidor; un proxy HTTPS del host debe reenviarle las peticiones. El puerto es configurable si ya esta ocupado. Se supone Docker Compose y servidor Linux x86-64; SQL Server no tiene soporte de produccion en ARM.

El backend corre en produccion y emite cookies Secure, HttpOnly y SameSite=Lax. Vercel debe reenviar `/backendDocker/*` a la API por HTTPS; el navegador utiliza el mismo origen para frontend y API. No activar cache para rutas autenticadas. La direccion publica y el proxy del servidor siguen pendientes de confirmar.

## Preparar el servidor

Desde la carpeta backendHotelManager:

```sh
cp deploy/.env.server.example deploy/.env.server
chmod 600 deploy/.env.server
```

Editar APP_ORIGIN con la URL final de Vercel y MSSQL_SA_PASSWORD con una clave nueva y robusta. MSSQL_PID debe corresponder a la edicion elegida: Express tiene limites de capacidad; Developer es solo para desarrollo/pruebas; otras ediciones requieren su licencia. El ejemplo utiliza sa para instalacion y funcionamiento inicial, con SQL accesible solo en la red privada. Antes de operacion definitiva se recomienda un login dedicado para la aplicacion.

```sh
docker compose --env-file deploy/.env.server -f compose.server.yml build backend
docker compose --env-file deploy/.env.server -f compose.server.yml up -d db
```

No se crea HotelManagerDB automaticamente ni se ejecutan semillas con usuarios de demostracion. Primero restaurar una copia de la base existente o realizar una instalacion revisada por separado.

## Trasladar la base existente

Los siguientes comandos son instrucciones; no se han ejecutado contra los datos locales o remotos. En el Mac, con el .env actual y SQL local funcionando:

```sh
node deploy/database-transfer.js backup /var/opt/mssql/data/hotelmanager.bak
docker cp sqlserver2022:/var/opt/mssql/data/hotelmanager.bak ./deploy/hotelmanager.bak
```

Transferir el .bak al servidor por un canal privado. En el servidor, con el contenedor db saludable:

```sh
docker compose --env-file deploy/.env.server -f compose.server.yml cp ./deploy/hotelmanager.bak db:/var/opt/mssql/data/hotelmanager.bak
docker compose --env-file deploy/.env.server -f compose.server.yml exec -u root db chown mssql:root /var/opt/mssql/data/hotelmanager.bak
docker compose --env-file deploy/.env.server -f compose.server.yml run --rm --no-deps backend node deploy/database-transfer.js restore /var/opt/mssql/data/hotelmanager.bak
docker compose --env-file deploy/.env.server -f compose.server.yml up -d backend
```

El asistente valida que el backup sea de HotelManagerDB y rechaza sobrescribir una base existente. El archivo reside en el contenedor SQL, no en el backend. La copia incluye usuarios, claves cifradas y sesiones existentes. Revisar los accesos de prueba antes de abrir la aplicacion. Los backups se deben conservar tambien fuera del servidor; el volumen persistente no sustituye una copia de seguridad. No ejecutar `down -v` sobre datos que se necesiten conservar.

## Frontend en Vercel

Importar el repositorio frontHotelManager. Usar Vite, `npm run build` y directorio de salida `dist`. Definir estas variables de compilacion:

```text
VITE_API_URL=/
VITE_APP_BASE_NAME=/
```

El `vercel.json` de la raiz del frontend fuerza la compilacion en `/` y configura las rutas React. Esto corrige los archivos 404 causados por publicar con base `/free`. Todavia no conecta la API: sus rutas quedan fuera del fallback HTML y responderan 404 mientras no exista un proxy. Subir estos cambios al repositorio conectado a Vercel y volver a desplegar; modificar archivos locales no modifica el sitio ya publicado.

Cuando se confirme el backend, copiar `deploy/vercel.json.example` como `vercel.json`, sustituir REEMPLAZAR-HOST-API por el endpoint HTTPS real del servidor y publicar. La direccion actual del frontend es `https://front-hotel-manager-mu.vercel.app`; se utiliza como APP_ORIGIN, no como SQLSERVER_HOST ni como destino del proxy de API. Vercel proporciona la URL del frontend; el endpoint HTTPS del backend todavia debe configurarse. Si CONEX/APERP ya tienen un dominio HTTPS, se puede agregar una ruta separada en su proxy, conservando todas sus rutas actuales. En ese caso adaptar tambien el prefijo de destino en la plantilla. No poner credenciales SQL en variables VITE_*.

La plantilla reenvia primero la API y luego aplica el fallback de React Router. No activar la plantilla sin sustituir el endpoint. El proxy del host debe conservar el prefijo `/backendDocker`, reenviar cookies y Set-Cookie, y no almacenar respuestas de la API en cache. No basta con colocar `localhost:3088` en Vercel: localhost alli no es el servidor.

## Alternativa: frontend tambien en Docker

Mantener ambos repositorios como carpetas hermanas. El perfil opcional web compila el frontend con `/free` y API del mismo origen:

```sh
docker compose --env-file deploy/.env.server -f compose.server.yml --profile web up -d --build
```

El frontend queda solo en `127.0.0.1:8088`; el proxy HTTPS del host debe apuntar alli y APP_ORIGIN debe coincidir con la direccion publica. No se ocupan los puertos publicos 80/443 ni 1433 de CONEX/APERP. Si el proxy existente tambien esta en Docker, necesita una conexion explicita a este stack; su localhost no apunta al host.

## Verificacion

```sh
docker compose --env-file deploy/.env.server -f compose.server.yml ps
curl http://127.0.0.1:3088/ping
docker compose --env-file deploy/.env.server -f compose.server.yml logs --tail=100 backend
```

El healthcheck del backend verifica el proceso HTTP; no confirma la restauracion de HotelManagerDB. Verificar ademas login, recuperacion de sesion y carga de ordenes desde la URL final. La imagen incluye los modulos HM activos; no incorpora Chromium para los controladores de reportes heredados que no estan montados en el router actual.

Referencias: https://vercel.com/docs/routing/rewrites y https://learn.microsoft.com/sql/linux/sql-server-linux-docker-container-deployment
