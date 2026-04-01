'use strict';
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const v8 = require('v8');

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

router.get('/health', async (req, res) => {
  const checks = { database: false, memory: false, cpu: false };

  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      checks.database = true;
    }
  } catch {
    checks.database = false;
  }

  const { used_heap_size, heap_size_limit } = v8.getHeapStatistics();
  checks.memory = (used_heap_size / heap_size_limit) * 100 < 90;

  const cpuUsage = process.cpuUsage();
  const uptimeMs = process.uptime() * 1000;
  checks.cpu = ((cpuUsage.user + cpuUsage.system) / 1000 / uptimeMs) * 100 < 95;

  const isHealthy = Object.values(checks).every(Boolean);

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: formatUptime(Math.floor(process.uptime())),
    checks
  });
});

module.exports = router;
