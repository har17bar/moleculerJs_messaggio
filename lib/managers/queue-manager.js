const amqplib = require('amqplib');

class AmqpClient {
  constructor() {
    /**
         *
         * @type {Array}
         * @private
         */
    this._subscribers = [];
    this.config = {
      host: 'amqp://localhost',
      logger: console,
      reconectionDelayTime: 5000, // Milliseconds
      reconectionAttempts: 3,
      noAck: true, // False if message after it is consumed dont want to be deleted
    };
  }

  /**
     * If AmqpClient instance exists returns it,
     * otherwise Initializing amqplib channel before returning AmqpClient instance (Singltone)
     * @param config  host, logger, reconectionDelayTime, reconectionAttempts
     * @returns {Promise<AmqpClient>}
     */
  static async getInstance(config = {}) {
    if (!this.instance) {
      this.instance = new AmqpClient();
      Object.assign(this.instance.config, config);
      this.instance.channel = await this.instance._start();
      this.instance._queueEventsHandlers();

      return this.instance;
    }

    return this.instance;
  }

  /**
     *
     * @returns {Promise<void>}
     * @private
     */
  async _start() {
    const amqpConn = await amqplib.connect(this.config.host);
    if (!amqpConn) {
      throw new Error('amqplib cant\'t connected!');
    }

    const channel = await amqpConn.createChannel();
    return channel;
  }

  /**
     *
     * @private
     */
  _queueEventsHandlers() {
    const { channel } = this;
    channel.on('error', (err) => {
      if (err.message !== 'Connection closing') {
        this.config.error('[AMQP] connection error', err.message);
      }
    });
    channel.on('close', () => {
      let counter = 0;
      this.channel = null;
      const timerId = setInterval(async () => {
        this.config.logger.info(`[AMQP] reconnecting attempts ${counter}`);

        try {
          this.channel = await new AmqpClient()._start();
        } catch (e) {
          if (counter > this.config.reconectionAttempts) {
            clearInterval(timerId);
            this.config.logger.error('[AMQP] Timeout');
          }

          counter += 1;
        }

        if (this.channel) {
          clearInterval(timerId);
          this._getSubscribers().map(subscriber => this.subscribe(subscriber.queueName, subscriber.callback));
          this.logger.config.info('[AMQP] Conected');
        }
      }, this.config.reconectionDelayTime);
    });
  }

  /**
     *
     * @param subscriber
     * @private
     */
  _setSubscriber(subscriber) {
    this._subscribers.push(subscriber);
  }

  /**
     *
     * @returns {*}
     * @private
     */

  _getSubscribers() {
    return this._subscribers;
  }

  subscribe(queueName, callback) {
    this._setSubscriber({ queueName, callback });
    this.channel.assertQueue(queueName, { durable: true })
      .then(() => this.channel.consume(queueName, (msg) => {
        if (msg !== null) {
          setTimeout(() => {
            callback(JSON.parse(msg.content));
          }, 2000);
        }
      }, { noAck: this.config.noAck }));
  }

  publish(queueName, msg) {
    this.channel.assertQueue(queueName, { durable: true, noAck: this.config.noAck })
      .then(() => this.channel.sendToQueue(queueName, Buffer.from(JSON.stringify(msg))))
      .catch((err) => { this.config.logger.error(err); });
  }
}

module.exports = AmqpClient;
