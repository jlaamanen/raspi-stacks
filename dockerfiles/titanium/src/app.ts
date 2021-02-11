import { icsFilePath, updateCalendar } from "./scraper";
import fastify from "fastify";
import { createReadStream } from "fs";
import config from "./config";

async function start() {
  // Serve calendar as a static file (kinda)
  const app = fastify();
  app.get("/calendar", async (req, reply) => {
    const stream = createReadStream(icsFilePath);
    reply.type("text/calendar").send(stream);
  });

  // TODO add automatic updating via node-scheduler or sumtin

  app.get("/update", async (req, reply) => {
    try {
      await updateCalendar();
      console.log("Calendar updated manually");
      reply.status(200).send("Calendar updated");
    } catch (error) {
      console.log("Error updating calendar:", error);
      reply.status(500).send("Error updating calendar");
    }
  });

  await app.listen(config.port);
  console.log(`App listening to port ${config.port}`);

  updateCalendar();
}

start();
