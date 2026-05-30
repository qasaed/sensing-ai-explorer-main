import server from "../dist/server/server.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const host = req.headers.host || "localhost";
  const url = new URL(req.url ?? "", `${proto}://${host}`);

  const request = new Request(url.toString(), {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.method === "GET" || req.method === "HEAD" ? null : req,
  });

  const response = await server.fetch(request);

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });

  res.status(response.status);

  const body = await response.arrayBuffer();
  if (body.byteLength) {
    res.send(Buffer.from(body));
  } else {
    res.end();
  }
}
