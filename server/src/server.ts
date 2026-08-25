import { createApp } from './app.js';
import { env } from './config/env.js';
import { getAIService } from './services/openaiService.js';

getAIService();

createApp().listen(env.PORT, () => {
  console.log(`[taiyaar] api listening on http://localhost:${env.PORT}`);
  console.log('[taiyaar] prototype only - all government data here is synthetic');
});
