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

Así, tal cual, sólo sirve **desde esta misma máquina**: el cifrado necesita un
contexto seguro y `localhost` es el único origen que los navegadores aceptan
sin HTTPS. Para entrar desde el móvil o desde otro equipo, mira
[Acceder desde otros equipos](#acceder-desde-otros-equipos-de-la-red-local).

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

---

## Acceder desde otros equipos de la red local

**HTTPS es obligatorio, también en la red local.** Los navegadores sólo
exponen `crypto.subtle` (y los service workers) en *contextos seguros*:
`localhost` o HTTPS. Si entras por `http://192.168.1.x:1443`, la aplicación
detecta que no hay API de cifrado y te manda a `/unsupported/crypto`. No es
configurable: es una regla del navegador, y todo el producto depende de ella.

Para eso está `docker-compose.https.yml`, que pone un Caddy delante emitiendo
un certificado con su propia CA local:

```bash
SEND_HOST=192.168.1.50 docker compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

Con eso basta escribir **`192.168.1.50`** en el navegador: el puerto 80 atiende
y redirige a `https://192.168.1.50`, sin tener que teclear el esquema ni
ningún puerto.

Usa la IP de la máquina en la LAN, y reserva esa IP en el router: si el DHCP
se la cambia, el certificado deja de valer y los enlaces ya compartidos
apuntan a la dirección antigua.

Con esta configuración el `1443` del servidor deja de publicarse en la red y
queda atado a `127.0.0.1`, para que desde fuera sólo exista la vía con TLS.
Entrar por `http://<ip>:1443` daría una página rota: al estar `BASE_URL` en
`https`, la CSP reescribe los assets a `https://<ip>:1443`, donde no escucha
nadie. Desde la propia máquina, `http://localhost:1443` sigue funcionando.

### El aviso del certificado

La CA es local, así que los dispositivos no la conocen y saldrá un aviso. Dos
maneras de resolverlo:

- **Aceptar la excepción** en el navegador («Configuración avanzada» →
  «Continuar»). Es lo más rápido; una vez aceptada, el origen ya cuenta como
  contexto seguro y el cifrado funciona. Hay que hacerlo en cada dispositivo.
- **Instalar la CA**, y entonces no vuelve a avisar. El certificado raíz se
  saca así:

  ```bash
  docker compose -f docker-compose.yml -f docker-compose.https.yml exec caddy \
    cat /data/caddy/pki/authorities/local/root.crt > send-CA-local.crt
  ```

  En Windows, importar en «Entidades de certificación raíz de confianza». En
  Android, Ajustes → Seguridad → Cifrado y credenciales → Instalar certificado
  → Certificado de CA. En iOS, instalar el perfil y luego activarlo en Ajustes
  → General → Información → Ajustes de confianza de certificados.

Si prefieres no tocar certificados en cada dispositivo, **Tailscale** da un
nombre `*.ts.net` con certificado de verdad ya confiado, a cambio de que los
equipos estén en tu tailnet.

### Detrás de otro proxy inverso

Si `BASE_URL` empieza por `https://`, el servidor activa HSTS y
`upgrade-insecure-requests`; con `http://` no lo hace, para no romper el
acceso por IP. Pásale `X-Forwarded-Proto` y `X-Forwarded-Host`, y asegúrate de
que reenvía la conexión WebSocket de `/api/ws`, que es por donde suben los
ficheros.

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
