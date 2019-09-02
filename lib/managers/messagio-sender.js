const request = require('request');
const md5 = require('md5');
const parser = require('fast-xml-parser');
const nconf = require('nconf');
const AmqpClient = require('amqp-client');

const messageKeys = ['phone', 'message'];
const {
  from, sendingMethod, user, secret,
} = nconf.get('message');

function messagioSender(sms) {
  const { phone, message } = sms;
  const sign = md5(`${user}${from}${phone}${message}${secret}`);
  const boolKeysExists = messageKeys.every(key => Object.keys(sms).includes(key));
  const separateReqPool = { maxSockets: 20 };

  if (!boolKeysExists) {
    console.error(new Error('Invalid params'));
  }

  request({
    method: 'GET',
    pool: separateReqPool,
    uri: 'https://bulk.sms-online.com',
    qs: {
      txt: message,
      phone,
      from,
      sendingMethod,
      user,
      sign,
    },
  }, async (err, res) => {
    if (err instanceof Error) {
      console.error(err);
    } else {
      const jsoneResponse = parser.parse(res.body);

      if (!jsoneResponse.response) {
        return;
      }

      const statusCode = jsoneResponse.response.code;
      switch (statusCode) {
        case 0: {
          console.log(`sms-${message} sended to ${phone}`);
          return; // Запрос успешно обработан
        }
        case -1: // Неверные входные данные
        case -2: // Ошибка аутентификации
        case -3: // Отказ в обработке запроса
        case -5: // Исчерпан баланс SMS-сообщений

          console.log(`sms-${message} failed to send to ${phone} status is ${statusCode}`);
          sms.status = 'urgent';
          break;
        case -4: // Временная техническая ошибка
        case -6: // Превышение лимита пропускной способности

          console.log(`sms-${message} failed to send to ${phone} status is -4`);
          sms.status = 'no-urgent';
          break;
      }

      const amqpClient = await AmqpClient.getInstance();
      amqpClient.publish(nconf.get('rabbit:queueNames:failedSms'), sms);
    }
  });
}

module.exports = messagioSender;
