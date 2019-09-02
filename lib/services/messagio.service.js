const { Service } = require('moleculer');
const nconf = require('nconf');
const AmqpClient = require('amqp-client');
const messagioSender = require('../managers/messagio-sender');

const configRabbit = nconf.get('rabbit');

class MessagioService extends Service {
  constructor(broker) {
    super(broker);
    this.parseServiceSchema({
      name: 'messagio',
      started: this.serviceStarted,
    });
  }

  async serviceStarted() {
    this.logger.info('Moleculer service started.');
    const amqpClient = await AmqpClient.getInstance({ host: configRabbit.host, logger: this.logger });
    const smsMessaggio = nconf.get('rabbit:queueNames:smsMessaggio');
    amqpClient.subscribe(smsMessaggio, messagioSender);
  }
}

module.exports = MessagioService;
