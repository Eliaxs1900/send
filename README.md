# Send

Compartir ficheros con cifrado de extremo a extremo y enlaces que caducan.
Fork modernizado del [Firefox Send](https://github.com/mozilla/send) de
Mozilla, que fue archivado en 2021, puesto al día para auto-alojarlo.

Los ficheros se cifran **en el navegador** antes de subirse: el servidor sólo
guarda un blob cifrado y unos metadatos que también van cifrados. La clave
viaja en el fragmento (`#...`) del enlace, que nunca se envía al servidor.

> **Marcas registradas:** la [MPL 2.0](LICENSE) no concede derechos sobre las
> marcas de Mozilla. Esta versión está desmarcada a propósito; si la
> despliegas, no uses las marcas «Mozilla» ni «Firefox».

---

## Qué cambió respecto al original

El repositorio original estaba clavado en Node 12 y dependía de servicios de
Mozilla que ya no existen. Esta versión:

- **Node 24**, Express 5, Helmet 8, webpack 5, Tailwind 3, ESLint 10.
- **Valkey en lugar de Redis.** Redis pasó a las licencias RSALv2/SSPLv1 en
  2024; Valkey es el fork BSD-3 de la Linux Foundation y es compatible a
  nivel de protocolo. El cliente es `iovalkey`.
- **AWS SDK v3** para el almacenamiento S3 opcional.
- **Fuera los servicios muertos:** Firefox Accounts, Amplitude (telemetría),
  Sentry y las métricas de cliente. Sin cuentas, todo el mundo tiene los
  límites completos.
- **Fuera los polyfills** de navegadores antiguos (IE, Edge legacy) y los
  envoltorios de Android/iOS, que ya no compilaban.
- WebSocket cableado directamente con `ws`, sin el `express-ws` sin mantener.

---

## Puesta en marcha

Con Docker, que es lo más cómodo:

```bash
docker compose up -d --build
```

Y ya está en <http://localhost:1443>.

Para que los enlaces que genera sean correctos, `BASE_URL` tiene que coincidir
con la dirección por la que accedes de verdad. Por ejemplo, desde otro equipo
de la red local:

```bash
BASE_URL=http://192.168.1.50:1443 docker compose up -d
```

Los ficheros subidos y los metadatos viven en volúmenes de Docker
(`send-uploads` y `valkey-data`), así que sobreviven a un reinicio.

### Sin Docker

Necesitas Node 24 y un Valkey escuchando:

```bash
npm install
npm run build
VALKEY_HOST=127.0.0.1 NODE_ENV=production BASE_URL=http://localhost:1443 npm run prod
```

---

## Configuración

Todo se configura con variables de entorno. Las que se usan a diario:

| Variable | Por defecto | Para qué sirve |
|---|---|---|
| `BASE_URL` | `http://localhost:1443` | URL pública; se incrusta en los enlaces |
| `PORT` | `1443` | Puerto de escucha |
| `FILE_DIR` | temporal | Dónde se guardan los blobs cifrados |
| `VALKEY_HOST` | `mock` | Host de Valkey (`mock` = en memoria, sólo desarrollo) |
| `VALKEY_PORT` | `6379` | Puerto de Valkey |
| `MAX_FILE_SIZE` | `2684354560` (2,5 GB) | Tamaño máximo por envío |
| `MAX_DOWNLOADS` | `100` | Tope de descargas por enlace |
| `MAX_EXPIRE_SECONDS` | `604800` (7 días) | Caducidad máxima |
| `DEFAULT_EXPIRE_SECONDS` | `86400` (1 día) | Caducidad por defecto |
| `MAX_FILES_PER_ARCHIVE` | `64` | Ficheros por envío |

Opcionalmente, en vez del disco local puedes usar S3 (`S3_BUCKET`,
`S3_ENDPOINT`, `S3_REGION`, `S3_USE_PATH_STYLE_ENDPOINT`) o Google Cloud
Storage (`GCS_BUCKET`). Las credenciales se toman del entorno estándar de cada
SDK; **no las pongas en el repositorio**.

La lista completa está en [server/config.js](server/config.js).

### Servir por HTTPS

Si `BASE_URL` empieza por `https://`, el servidor activa HSTS y
`upgrade-insecure-requests`. Con `http://` no lo hace, para que puedas usarlo
por IP en la red local sin que el navegador fuerce HTTPS. Detrás de un proxy
inverso, pásale `X-Forwarded-Proto` y `X-Forwarded-Host`.

---

## Desarrollo

```bash
npm install
npm start
```

Levanta webpack-dev-server con el servidor de la aplicación dentro, en
<http://localhost:1337>, usando un Valkey en memoria. No hace falta nada más.

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo con recarga |
| `npm run build` | Compila los assets de producción a `dist/` |
| `npm run prod` | Arranca el servidor de producción |
| `npm test` | Tests de backend (mocha) |
| `npm run lint` | ESLint + stylelint |
| `npm run format` | Prettier |

---

## Documentación

[Cifrado](docs/encryption.md) · [Build](docs/build.md) ·
[Docker](docs/docker.md) · [Despliegue](docs/deployment.md) ·
[FAQ](docs/faq.md)

---

## Licencia

[Mozilla Public License 2.0](LICENSE)
