import type { IncomingMessage, ServerResponse } from "node:http";

export class RequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function secureRequest(request: IncomingMessage, response: ServerResponse) {
  response.setHeader("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  const host = request.headers.host ?? "";
  const port = request.socket.localPort;
  if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
    throw new RequestError(421, "仅允许通过本机实际监听地址访问。");
  }
  if (request.url?.startsWith("/api/")) {
    const origin = request.headers.origin;
    if ((origin && origin !== `http://${host}`) || request.headers["sec-fetch-site"] === "cross-site") {
      throw new RequestError(403, "不允许跨来源访问本地学习数据。");
    }
    const pathname = new URL(request.url, `http://${host}`).pathname;
    const bodyless = ["/api/workspace/open", "/api/exploration/open"].includes(pathname);
    if (["POST", "PUT", "PATCH"].includes(request.method ?? "") && !bodyless &&
      request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new RequestError(415, "请使用 application/json 发送请求。");
    }
  }
}

export function normalizedBaseUrl(value: string) {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new RequestError(400, "接口地址必须是有效的 HTTP(S) 地址，且不能包含凭据、查询或片段。");
  }
  return url.href.replace(/\/+$/, "");
}
