import { createApp } from './app.js';
import { env } from './config/env.js';
import { getAIService } from './services/openaiService.js';

getAIService();

createApp().listen(env.PORT, () => {
  console.log(`[seva] api listening on http://localhost:${env.PORT}`);
  console.log('[seva] prototype only - all government data here is synthetic');
});
