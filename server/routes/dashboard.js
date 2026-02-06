const fs = require('fs');
const path = require('path');

module.exports = function dashboardRoutes(app, config) {
  const templatePath = path.join(__dirname, '../views/dashboard.html');
  const template = fs.readFileSync(templatePath, 'utf8');

  app.get('/', (req, res) => {
    const html = template
      .replace(/\{\{SHARED_SECRET\}\}/g, config.sharedSecret)
      .replace(/\{\{SERVER_URL\}\}/g, config.serverUrl);
    res.type('text/html').send(html);
  });
};
