const http = require('http');
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'running' }));
});

server.listen(port, () => {
  console.log(`Basic server listening on port ${port}`);
});
