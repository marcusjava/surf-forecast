import { SetupServer } from './server';
import config from 'config';
import logger from './logger';

enum exitStatus {
  Failure = 1,
  Success = 0,
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error(
    `App exiting due to an unhandled promise: ${promise} and reason: ${reason}`
  );
  // lets throw the error and let the uncaughtException handle below handle it
  throw reason;
});

process.on('uncaughtException', (error) => {
  logger.error(`App exiting due to an uncaught exception: ${error}`);
  process.exit(exitStatus.Failure);
});

(async (): Promise<void> => {
  try {
    const server = new SetupServer(config.get('App.port'));
    await server.init();
    server.start();

    const exitSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    for (const sig of exitSignals) {
      process.on(sig, async () => {
        try {
          await server.close();
          logger.info('exited with success');
          process.exit(exitStatus.Success);
        } catch (error: any) {
          logger.error(`App exited with error: ${error}`);
          process.exit(exitStatus.Failure);
        }
      });
    }
  } catch (error: any) {
    logger.error(`App exited with error: ${error}`);
    process.exit(exitStatus.Failure);
  }
})();
