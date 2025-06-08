const { override, addWebpackModuleRule } = require('customize-cra');

module.exports = override(
  (config) => {
    // Allow all hosts
    if (config.devServer) {
      config.devServer.allowedHosts = 'all';
      config.devServer.disableHostCheck = true;
    }
    return config;
  }
);