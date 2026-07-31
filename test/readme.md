# Tests

Se ejecutan con `npm test`. El runner es [Mocha](https://mochajs.org).

## Backend

Los tests viven en `test/backend` y se lanzan con `npm run test:backend`.
Se usan [Sinon](https://sinonjs.org/) y
[proxyquire](https://github.com/thlorenz/proxyquire) para los dobles.

El almacenamiento se prueba contra el Valkey en memoria (`ioredis-mock`), que
se activa solo con `NODE_ENV=development` y `VALKEY_HOST=mock`.

## Frontend e integración

La suite de frontend corría en Chrome headless con puppeteer, y la de
integración con Selenium y WebdriverIO. Ambas dependían del arnés de pruebas
que se servía desde webpack-dev-server, incompatible con webpack 5, y llevaban
años sin ejecutarse. Se eliminaron al modernizar el proyecto.
