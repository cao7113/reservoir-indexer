import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

import "@/common/tracer";
import "@/config/polyfills";
import "@/jobs/index";
import "@/pubsub/index";
import "@/websockets/index";

import { start } from "@/api/index";
import { config } from "@/config/index";
import { logger } from "@/common/logger";
import { getNetworkSettings } from "@/config/network";
import { initIndexes } from "@/elasticsearch/indexes";
import { Sources } from "@/models/sources";

process.on("unhandledRejection", (error) => {
  logger.error("process", `Unhandled rejection: ${error}`);

  // For now, just skip any unhandled errors
  // process.exit(1);
});

const setup = async () => {
  if (process.env.LOCAL_TESTING) {
    return;
  }

  // eslint-disable-next-line no-console
  if (config.doBackgroundWork) {
    await Sources.syncSources();

    const networkSettings = getNetworkSettings();
    if (networkSettings.onStartup) {
      await networkSettings.onStartup();
    }
  }

  if (config.doKafkaWork) {
    startKafkaConsumer();
    startKafkaProducer();
  }

  await Sources.getInstance();
  await Sources.forceDataReload();

  if (config.doElasticsearchWork) {
    await initIndexes();
  }
};

setup().then(() => start());
