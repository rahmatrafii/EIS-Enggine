import app from './src/app.js';
import dotenv from 'dotenv';
import { startRetentionCron } from './src/scheduler/retention.scheduler.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Jalankan Daemon Cron Jobs
startRetentionCron();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// Hot reload trigger for environment update
