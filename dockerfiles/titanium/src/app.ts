import { clearCalendar, icsFilePath, updateCalendar } from "./scraper";
import fastify from "fastify";
import { createReadStream } from "fs";
import { CronJob } from "cron";
import config from "./config";

async function start() {
  // Serve calendar as a static file (kinda)
  const app = fastify();

  /**
   * Get calendar data
   */
  app.get("/calendar", async (req, reply) => {
    const stream = createReadStream(icsFilePath);
    reply.type("text/calendar").send(stream);
  });

  /**
   * Manually update shifts to calendar
   */
  app.get("/update", async (req, reply) => {
    console.log("Updating calendar manually...");
    const start = Number(new Date());
    try {
      await updateCalendar();
      console.log(
        `Calendar updated manually in ${Number(new Date()) - start} ms`
      );
      reply.status(200).send("Calendar updated");
    } catch (error) {
      console.error("Error updating calendar:", error);
      reply.status(500).send("Error updating calendar");
    }
  });

  /**
   * Clears all calendar data
   */
  app.get("/clear", async (req, reply) => {
    clearCalendar();
  });

  new CronJob(config.updateCron, async () => {
    console.log("Updating calendar automatically...");
    const start = Number(new Date());
    try {
      await updateCalendar();
      console.log(
        `Calendar updated manually in ${Number(new Date()) - start} ms`
      );
    } catch (error) {
      console.error("Error updating calendar:", error);
    }
  });

  await app.listen(config.port, "0.0.0.0");
  console.log(`App listening to port ${config.port}`);
}

start();
