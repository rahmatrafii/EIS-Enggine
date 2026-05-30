import cron from 'node-cron';
import { triggerRetention } from '../services/retention.service.js';

export const startRetentionCron = () => {
  cron.schedule('0 7 * * *', async () => {
    console.log(`[CRON] Memulai eksekusi antrean email retensi pada: ${new Date().toISOString()}`);
    try {
      const result = await triggerRetention();
      console.log(`[CRON] Selesai. Total antrean: ${result.processedCount}. Sukses: ${result.successCount}. Gagal: ${result.failCount}.`);
    } catch (error) {
      console.error('[CRON FATAL] Error di Cron Retention:', error.message);
    }
  });
};
