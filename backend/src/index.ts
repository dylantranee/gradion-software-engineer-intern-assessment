import { app } from './app.js';
import { config } from './config.js';

const port = config.backendPort;

app.listen(port, () => {
  console.log(`✨ Book Illustration Studio Backend running at http://localhost:${port}`);
});

export default app;
