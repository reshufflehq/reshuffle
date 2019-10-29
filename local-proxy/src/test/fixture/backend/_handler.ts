export default function handler(req: any, res: any, defaultHandler: any) {
  if (req.url === '/userHandler') {
    const body = 'hello world';
    res.writeHead(200,  {
      'Content-Length': Buffer.byteLength(body),
      'Content-Type': 'text/plain',
    });
    res.end(body);
  } else {
    defaultHandler(req, res);
  }
}
