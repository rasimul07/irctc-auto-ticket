const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { ping } = require('./db/pool');
const healthRouter = require('./routes/health');
const accessRouter = require('./routes/v1/access');
const bmcRouter = require('./routes/webhooks/bmc');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((v) => v.trim())
  })
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  })
);

app.use('/health', healthRouter);
app.use(`${config.apiBasePath}/access`, accessRouter);
app.use('/webhooks/bmc', bmcRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await ping();
    console.log('[api] database connected');
  } catch (err) {
    console.error('[api] database unavailable on startup', err.message);
  }

  app.listen(config.port, () => {
    console.log(`[api] listening on http://localhost:${config.port}`);
    console.log(`[api] base path ${config.apiBasePath}`);
  });
}

start();
