const authLoginHandler = require('./auth/login');

module.exports = async function handler(req, res) {
  return authLoginHandler(req, res);
};
