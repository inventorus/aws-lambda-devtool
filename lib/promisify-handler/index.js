/* eslint-disable no-console */
import { CloudWatchLogs } from 'aws-sdk-promise';
import { Map } from 'immutable';

const logError = async (functionName, error, timestamp, cw, logGroup, sequenceToken = null) => {
  try {
    await cw.putLogEvents({
      logEvents: [{
        message: error,
        timestamp
      }],
      logGroupName: logGroup,
      logStreamName: functionName,
      sequenceToken
    }).promise();
    console.log('Unhlandled error has been logged.\n', error.stack);
  } catch (err) {
    if (err.code === 'ResourceNotFoundException') {
      await cw.createLogStream({
        logGroupName: logGroup,
        logStreamName: functionName
      }).promise();
      await logError(functionName, error, timestamp, cw, logGroup);
      return;
    }
    if (err.message.indexOf('sequenceToken') > -1) {
      const token = /.*sequenceToken.* ([0-9]{5,})/.exec(err.message)[1];
      await logError(functionName, error, timestamp, cw, logGroup, token);
      return;
    }
  }
};

export default function promisify(handler, { dev = false || process.env.DEV } = {}) {
  return (event, context) => {
    const devMode = dev || event.devMode === 'on';
    handler(event, context)
      .then((data = {}) => {
        context.succeed(data);
      })
      .catch((error) => {
        if (error instanceof Error) {
          if (devMode) {
            context.fail(error);
            return;
          }

          let promise = Promise.resolve(error);

          if (event.logging) {
            const { credentials, logGroup } = event.logging;
            const cwLogs = new CloudWatchLogs(credentials);
            const props = Object.keys(error)
                                 .reduce((map, prop) => map.set(prop, error[prop]), Map())
                                 .toJS();
            const errorStr = JSON.stringify({
              name: error.name,
              message: error.message,
              toString: error.toString(),
              props,
              stack: error.stack,
              event
            });

            promise = logError(context.functionName, errorStr, Date.now(), cwLogs, logGroup);
          }

          promise.then(() => context.fail(Error('UNEXPECTED ERROR')));
          return;
        }

        context.fail(Error(JSON.stringify(error)));
      });
  };
}
