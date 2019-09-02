const { ServiceBroker } = require('moleculer');

const broker = new ServiceBroker({
  logFormatter(level, args, bindings) {
    return `${level.toUpperCase()} ${bindings.nodeID}: ${args.join(' ')}`;
  },
});
broker.loadServices('./');

broker.start()
  .then(() => console.log('Broker Started'))
  .catch(err => console.log(err));
