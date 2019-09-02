const nconf = require('nconf');
nconf.formats.yaml = require('nconf-yaml');

nconf.argv()
  .env({
    separator: '_',
  })
  .file('custom', { file: 'config/local.yaml', format: nconf.formats.yaml })
  .file({ file: 'config/config.yaml', format: nconf.formats.yaml });

module.exports = require('./lib/app.js');
