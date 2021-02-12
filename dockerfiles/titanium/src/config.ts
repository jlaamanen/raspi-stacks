export default {
  username: process.env.USERNAME || null,
  password: process.env.PASSWORD || null,
  sessionId: process.env.SESSION_ID || null,
  icsFileName: process.env.ICS_FILE_NAME || "vuorot.ics",
  port: process.env.PORT || 3000,
  updateCron: process.env.UPDATE_CRON || "0 0 0 * * *",
};
