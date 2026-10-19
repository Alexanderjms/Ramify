import { lookup } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import { validResourceUrl } from "./goal-activities";
import { validText } from "./input-validation";

const privateAddresses = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  privateAddresses.addSubnet(address, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
for (const [address, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
] as const)
  privateAddresses.addSubnet(address, prefix, "ipv6");

export function publicLinkAddress(address: string) {
  const family = isIP(address);
  return family === 4
    ? !privateAddresses.check(address, "ipv4")
    : family === 6 &&
        globalV6.check(address, "ipv6") &&
        !privateAddresses.check(address, "ipv6");
}

export function linkTitleText(value: string) {
  const entities: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
    aacute: "á",
    eacute: "é",
    iacute: "í",
    oacute: "ó",
    uacute: "ú",
    ntilde: "ñ",
    uuml: "ü",
    hellip: "…",
    ndash: "–",
    mdash: "—",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”",
    copy: "©",
    reg: "®",
  };
  const text = value
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, key: string) => {
      if (key[0] !== "#") return entities[key] ?? entity;
      const code =
        key[1].toLowerCase() === "x"
          ? parseInt(key.slice(2), 16)
          : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : " ";
    })
    .replace(/[\s\x00-\x1f\x7f]+/g, " ")
    .trim()
    .slice(0, 100)
    .replace(/[\uD800-\uDBFF]$/, "");
  return validText(text, 100) ? text : "";
}

export function htmlLinkTitle(html: string) {
  const head = html
    .split(/<\/head\s*>/i, 1)[0]
    .replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  const titles = new Map<string, string>();
  for (const tag of head.matchAll(/<meta\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    const attributes = new Map<string, string>();
    for (const match of tag[0].matchAll(
      /\b(property|name|content)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
    ))
      attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4]);
    const key = (
      attributes.get("property") ?? attributes.get("name")
    )?.toLowerCase();
    if (key && attributes.get("content"))
      titles.set(key, linkTitleText(attributes.get("content")!));
  }
  return (
    titles.get("og:title") ||
    titles.get("twitter:title") ||
    linkTitleText(
      head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? "",
    )
  );
}

async function readPublicPage(
  value: string,
  signal: AbortSignal,
  redirects = 0,
): Promise<{ body: string; type: string }> {
  if (!validResourceUrl(value)) throw new Error("Invalid URL");
  const url = new URL(value);
  if (url.username || url.password || url.port || redirects > 3)
    throw new Error("Unsupported URL");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  signal.throwIfAborted();
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await new Promise<{ address: string; family: number }[]>(
        (resolve, reject) => {
          const abort = () => reject(signal.reason);
          signal.addEventListener("abort", abort, { once: true });
          lookup(hostname, { all: true }, (error, result) => {
            signal.removeEventListener("abort", abort);
            if (error) reject(error);
            else resolve(result);
          });
        },
      );
  if (
    !addresses.length ||
    addresses.some(({ address }) => !publicLinkAddress(address))
  )
    throw new Error("Private address");
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        agent: false,
        family: addresses[0].family,
        signal,
        lookup: (_hostname, _options, callback) =>
          callback(null, addresses[0].address, addresses[0].family),
        headers: {
          Accept: "text/html, application/json",
          "Accept-Encoding": "identity",
          "User-Agent": "Ramify-LinkTitle/1.0",
        },
      },
      (response) => {
        response.on("error", reject);
        const status = response.statusCode ?? 0;
        if (
          [301, 302, 303, 307, 308].includes(status) &&
          response.headers.location
        ) {
          response.destroy();
          try {
            resolve(
              readPublicPage(
                new URL(response.headers.location, url).href,
                signal,
                redirects + 1,
              ),
            );
          } catch (error) {
            reject(error);
          }
          return;
        }
        const type = response.headers["content-type"] ?? "";
        if (
          status !== 200 ||
          !/^(text\/html|application\/xhtml\+xml|application\/json)\b/i.test(
            type,
          ) ||
          (response.headers["content-encoding"] &&
            response.headers["content-encoding"] !== "identity")
        ) {
          response.destroy();
          reject(new Error("Unsupported response"));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          const bytes = Buffer.concat(chunks);
          let body: string;
          try {
            body = new TextDecoder(
              type.match(/charset=["']?([^\s;"']+)/i)?.[1] ?? "utf-8",
            ).decode(bytes);
          } catch {
            body = bytes.toString("utf8");
          }
          resolve({ body, type });
        };
        response.on("data", (chunk: Buffer) => {
          const remaining = 512 * 1024 - size;
          chunks.push(chunk.subarray(0, remaining));
          size += chunk.length;
          if (
            size >= 512 * 1024 ||
            (/html/i.test(type) && /<\/head\s*>/i.test(chunk.toString("utf8")))
          ) {
            finish();
            response.destroy();
          }
        });
        response.on("end", finish);
      },
    );
    request.on("error", reject);
    request.end();
  });
}

export async function getLinkTitle(value: string) {
  if (!validResourceUrl(value)) throw new Error("Invalid URL");
  const signal = AbortSignal.timeout(8000);
  const url = new URL(value);
  const youtube =
    /(^|\.)youtube\.com$/i.test(url.hostname) || url.hostname === "youtu.be";
  if (youtube) {
    const video =
      url.hostname === "youtu.be"
        ? url.pathname.split("/")[1]
        : (url.searchParams.get("v") ??
          url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]);
    if (video && /^[\w-]{11}$/.test(video)) {
      try {
        const endpoint = new URL("https://www.youtube.com/oembed");
        endpoint.searchParams.set(
          "url",
          `https://www.youtube.com/watch?v=${video}`,
        );
        endpoint.searchParams.set("format", "json");
        const { body } = await readPublicPage(endpoint.href, signal);
        const title: unknown = JSON.parse(body).title;
        if (
          typeof title === "string" &&
          title.trim() &&
          validText(title.replace(/\s+/g, " "), Infinity)
        )
          return title
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100)
            .replace(/[\uD800-\uDBFF]$/, "");
      } catch {
        signal.throwIfAborted();
      }
    }
  }
  const { body, type } = await readPublicPage(value, signal);
  return /html/i.test(type) ? htmlLinkTitle(body) : "";
}
