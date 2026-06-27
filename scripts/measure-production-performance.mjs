import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const chromePath =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const defaultBaseUrl = "https://zepedro-portfolio.hmpedro.com";
const baseUrl = (process.env.PERF_BASE_URL || defaultBaseUrl).replace(/\/+$/, "");
const defaultPaths = [
  "/",
  "/projects/renovation-and-expansion-of-a-2-story-residence",
  "/projects/trainee-program-startme-2021-8th-edition",
];
const urls = process.env.PERF_URLS
  ? process.env.PERF_URLS.split(",").map((url) => url.trim()).filter(Boolean)
  : defaultPaths.map((routePath) => `${baseUrl}${routePath}`);
const reportLabel =
  process.env.PERF_REPORT_LABEL ||
  (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1") ? "local" : "production");

const outDir = path.resolve("docs", "performance-reports");
const port = Number(process.env.CDP_PORT || 9223);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`);
  return response.json();
}

async function waitForChrome() {
  const versionUrl = `http://127.0.0.1:${port}/json/version`;
  const started = Date.now();
  while (Date.now() - started < 15000) {
    try {
      return await fetchJson(versionUrl);
    } catch (error) {
      await sleep(250);
    }
  }
  throw new Error("Chrome DevTools endpoint did not become available.");
}

function makeCdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const listeners = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }

    const callbacks = listeners.get(message.method);
    if (callbacks) callbacks.forEach((callback) => callback(message.params || {}));
  });

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  const send = async (method, params = {}) => {
    await ready;
    const requestId = ++id;
    socket.send(JSON.stringify({ id: requestId, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (pending.has(requestId)) {
          pending.delete(requestId);
          reject(new Error(`${method} timed out`));
        }
      }, 30000);
    });
  };

  const on = (method, callback) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(callback);
  };

  const close = () => socket.close();

  return { send, on, close, ready };
}

function summarizeRequests(requests) {
  const entries = Array.from(requests.values())
    .filter((request) => request.url && !request.url.startsWith("data:"))
    .map((request) => ({
      url: request.url,
      method: request.method,
      status: request.status,
      type: request.type,
      mimeType: request.mimeType,
      host: safeHost(request.url),
      startMs: request.startTimeMs == null ? null : Math.round(request.startTimeMs),
      endMs: request.endTimeMs == null ? null : Math.round(request.endTimeMs),
      durationMs:
        request.startTimeMs == null || request.endTimeMs == null
          ? null
          : Math.round(request.endTimeMs - request.startTimeMs),
      transferSize: request.transferSize || 0,
      encodedDataLength: request.encodedDataLength || 0,
      fromDiskCache: Boolean(request.fromDiskCache),
      fromServiceWorker: Boolean(request.fromServiceWorker),
    }))
    .sort((a, b) => (a.startMs || 0) - (b.startMs || 0));

  const totals = entries.reduce(
    (acc, entry) => {
      acc.requests += 1;
      acc.transferSize += entry.transferSize || 0;
      acc.encodedDataLength += entry.encodedDataLength || 0;
      acc.byType[entry.type || "Other"] = (acc.byType[entry.type || "Other"] || 0) + 1;
      acc.byHost[entry.host || "unknown"] = (acc.byHost[entry.host || "unknown"] || 0) + 1;
      return acc;
    },
    { requests: 0, transferSize: 0, encodedDataLength: 0, byType: {}, byHost: {} }
  );

  return { totals, entries };
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch (error) {
    return "";
  }
}

async function measureUrl(browserClient, url) {
  const target = await fetchJson(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" }
  );
  const client = makeCdpClient(target.webSocketDebuggerUrl);
  await client.ready;

  const requests = new Map();

  client.on("Network.requestWillBeSent", (params) => {
    requests.set(params.requestId, {
      url: params.request.url,
      method: params.request.method,
      type: params.type,
      startTimestamp: params.timestamp,
      startWallTime: params.wallTime,
      startTimeMs: null,
      transferSize: 0,
      encodedDataLength: 0,
    });
  });

  client.on("Network.responseReceived", (params) => {
    const request = requests.get(params.requestId) || {};
    request.status = params.response.status;
    request.mimeType = params.response.mimeType;
    request.fromDiskCache = params.response.fromDiskCache;
    request.fromServiceWorker = params.response.fromServiceWorker;
    request.responseTimestamp = params.timestamp;
    requests.set(params.requestId, request);
  });

  client.on("Network.loadingFinished", (params) => {
    const request = requests.get(params.requestId) || {};
    request.endTimestamp = params.timestamp;
    request.encodedDataLength = params.encodedDataLength || 0;
    request.transferSize = params.encodedDataLength || 0;
    requests.set(params.requestId, request);
  });

  await client.send("Page.enable");
  await client.send("Network.enable");
  await client.send("Performance.enable");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__zepedroPerf = { lcp: null, cls: 0, longTasks: [] };
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) window.__zepedroPerf.lcp = last.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (error) {}
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__zepedroPerf.cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch (error) {}
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__zepedroPerf.longTasks.push({
              startTime: entry.startTime,
              duration: entry.duration
            });
          }
        }).observe({ type: 'longtask', buffered: true });
      } catch (error) {}
    `,
  });

  const loadFired = new Promise((resolve) => client.on("Page.loadEventFired", resolve));
  await client.send("Page.navigate", { url });
  await loadFired;
  await sleep(5000);

  const metrics = await client.send("Performance.getMetrics");
  const pageMetrics = Object.fromEntries(metrics.metrics.map((metric) => [metric.name, metric.value]));

  const pageData = await client.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, p.startTime]));
      const resources = performance.getEntriesByType('resource');
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const longTasks = performance.getEntriesByType('longtask');
      let cls = 0;
      for (const entry of performance.getEntriesByType('layout-shift')) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
      const images = Array.from(document.images).map((img) => ({
        src: img.currentSrc || img.src,
        loading: img.getAttribute('loading') || '',
        decoding: img.getAttribute('decoding') || '',
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }));
      return {
        title: document.title,
        url: location.href,
        nav: nav ? {
          startTime: nav.startTime,
          domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
          loadEvent: nav.loadEventEnd - nav.startTime,
          duration: nav.duration,
          transferSize: nav.transferSize,
          encodedBodySize: nav.encodedBodySize
        } : null,
        paints,
        lcp: window.__zepedroPerf?.lcp ?? (lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : null),
        cls: window.__zepedroPerf?.cls ?? cls,
        longTasks: window.__zepedroPerf?.longTasks?.length
          ? window.__zepedroPerf.longTasks
          : longTasks.map((task) => ({ startTime: task.startTime, duration: task.duration })),
        domImageCount: images.length,
        lazyDomImages: images.filter((img) => img.loading === 'lazy').length,
        asyncDomImages: images.filter((img) => img.decoding === 'async').length,
        completeDomImages: images.filter((img) => img.complete).length,
        firstImages: images.slice(0, 20),
        resourceCount: resources.length
      };
    })()`,
  });

  const navStart = Math.min(
    ...Array.from(requests.values())
      .map((request) => request.startTimestamp)
      .filter((value) => typeof value === "number")
  );
  requests.forEach((request) => {
    if (typeof request.startTimestamp === "number") {
      request.startTimeMs = (request.startTimestamp - navStart) * 1000;
    }
    if (typeof request.endTimestamp === "number") {
      request.endTimeMs = (request.endTimestamp - navStart) * 1000;
    }
  });

  const requestSummary = summarizeRequests(requests);
  const pageLongTasks = pageData.result.value?.longTasks || [];
  const tbt = pageLongTasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);

  await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
  client.close();

  return {
    measuredAt: new Date().toISOString(),
    url,
    page: pageData.result.value,
    performanceMetrics: pageMetrics,
    webVitalsApprox: {
      fcpMs: Math.round(pageData.result.value?.paints?.["first-contentful-paint"] || 0),
      lcpMs: pageData.result.value?.lcp == null ? null : Math.round(pageData.result.value.lcp),
      cls: Number((pageData.result.value?.cls || 0).toFixed(4)),
      tbtApproxMs: Math.round(tbt),
      longTaskCount: pageLongTasks.length,
    },
    network: requestSummary.totals,
    waterfall: requestSummary.entries,
  };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "zepedro-perf-chrome-"));
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "about:blank",
  ]);

  chrome.stderr.on("data", () => {});
  chrome.stdout.on("data", () => {});

  try {
    await waitForChrome();
    const browserClient = makeCdpClient((await fetchJson(`http://127.0.0.1:${port}/json/version`)).webSocketDebuggerUrl);
    const reports = [];
    for (const url of urls) {
      reports.push(await measureUrl(browserClient, url));
    }
    browserClient.close();

    const summary = reports.map((report) => ({
      url: report.url,
      title: report.page.title,
      fcpMs: report.webVitalsApprox.fcpMs,
      lcpMs: report.webVitalsApprox.lcpMs,
      tbtApproxMs: report.webVitalsApprox.tbtApproxMs,
      cls: report.webVitalsApprox.cls,
      requestCount: report.network.requests,
      transferSizeBytes: report.network.transferSize,
      imageRequests: report.network.byType.Image || 0,
      domImageCount: report.page.domImageCount,
      lazyDomImages: report.page.lazyDomImages,
      asyncDomImages: report.page.asyncDomImages,
      topHosts: report.network.byHost,
    }));

    const reportPath = path.join(outDir, `${reportLabel}-performance-cdp.json`);
    const summaryPath = path.join(outDir, `${reportLabel}-performance-summary.json`);
    await fs.writeFile(reportPath, JSON.stringify(reports, null, 2));
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ reportPath, summaryPath, summary }, null, 2));
  } finally {
    chrome.kill();
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
