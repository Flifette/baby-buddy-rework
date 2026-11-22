const API_BASE = "./api/baby-buddy";
const CONFIG_PATH = "./api/config";
const MILK_WASTE_PATH = "./api/milk-waste";
const READ_TIMEOUT_MS = 20000;
const WRITE_TIMEOUT_MS = 25000;

export class ApiError extends Error {
  constructor(message, { status, code, detail, uncertain = false, timedOut = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.uncertain = uncertain;
    this.timedOut = timedOut;
  }
}

async function jsonRequest(url, { signal, ...options } = {}) {
  const read = !options.method || options.method === "GET";
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  let invalidResponse = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, read ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS);

  try {
    if (controller.signal.aborted) throw new DOMException("Request cancelled", "AbortError");
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
      signal: controller.signal,
    });
    if (response.status === 204) return null;

    const body = await response.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      invalidResponse = true;
    }

    if (!response.ok) {
      const detail = data && JSON.stringify(data);
      const code = data?.detail?.code;
      const uncertain = !read && (code === "baby_buddy_unconfirmed_write"
        || (!code && (response.status === 408 || response.status >= 500)));
      throw new ApiError(`API error ${response.status}`, {
        status: response.status,
        code: code || (uncertain ? "request_unconfirmed_write" : undefined),
        detail,
        uncertain,
      });
    }
    if (invalidResponse) throw new Error("Expected JSON response");
    return data;
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
    if (error instanceof ApiError) throw error;
    const code = !read ? "request_unconfirmed_write"
      : timedOut ? "request_timeout"
      : invalidResponse ? "request_invalid_response" : "request_network";
    throw new ApiError(code, { code, uncertain: !read, timedOut });
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener("abort", cancel);
  }
}

const request = (endpoint, options) => jsonRequest(`${API_BASE}/${endpoint}`, options);

function qs(params) {
  if (!params) return "";
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  );
  const s = new URLSearchParams(filtered).toString();
  return s ? `?${s}` : "";
}

const list = (endpoint) => (params, options) => request(`${endpoint}/${qs(params)}`, options);

export const api = {
  // Children
  getChildren: list("children"),

  // Feedings
  getFeedings: list("feedings"),
  createFeeding: (data) =>
    request("feedings/", { method: "POST", body: JSON.stringify(data) }),
  updateFeeding: (id, data) =>
    request(`feedings/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteFeeding: (id) => request(`feedings/${id}/`, { method: "DELETE" }),

  // Sleep
  getSleep: list("sleep"),
  createSleep: (data) =>
    request("sleep/", { method: "POST", body: JSON.stringify(data) }),
  updateSleep: (id, data) =>
    request(`sleep/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSleep: (id) => request(`sleep/${id}/`, { method: "DELETE" }),

  // Diapers (changes)
  getChanges: list("changes"),
  createChange: (data) =>
    request("changes/", { method: "POST", body: JSON.stringify(data) }),
  updateChange: (id, data) =>
    request(`changes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteChange: (id) => request(`changes/${id}/`, { method: "DELETE" }),

  // Tummy time
  getTummyTimes: list("tummy-times"),
  createTummyTime: (data) =>
    request("tummy-times/", { method: "POST", body: JSON.stringify(data) }),
  updateTummyTime: (id, data) =>
    request(`tummy-times/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTummyTime: (id) => request(`tummy-times/${id}/`, { method: "DELETE" }),

  // Temperature
  getTemperature: list("temperature"),
  createTemperature: (data) =>
    request("temperature/", { method: "POST", body: JSON.stringify(data) }),
  updateTemperature: (id, data) =>
    request(`temperature/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTemperature: (id) => request(`temperature/${id}/`, { method: "DELETE" }),

  // Weight
  getWeight: list("weight"),
  createWeight: (data) =>
    request("weight/", { method: "POST", body: JSON.stringify(data) }),
  updateWeight: (id, data) =>
    request(`weight/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWeight: (id) => request(`weight/${id}/`, { method: "DELETE" }),

  // Height
  getHeight: list("height"),
  createHeight: (data) =>
    request("height/", { method: "POST", body: JSON.stringify(data) }),
  updateHeight: (id, data) =>
    request(`height/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteHeight: (id) => request(`height/${id}/`, { method: "DELETE" }),

  // Pumping
  getPumping: list("pumping"),
  createPumping: (data) =>
    request("pumping/", { method: "POST", body: JSON.stringify(data) }),
  updatePumping: (id, data) => request(`pumping/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePumping: (id) => request(`pumping/${id}/`, { method: "DELETE" }),

  // Milk discarded after a bottle was started. Stored by this dashboard,
  // separately from Baby Buddy feedings so it never counts as a meal.
  getMilkWaste: (params, options) => jsonRequest(`${MILK_WASTE_PATH}${qs(params)}`, options),
  createMilkWaste: (data) => jsonRequest(MILK_WASTE_PATH, { method: "POST", body: JSON.stringify(data) }),
  updateMilkWaste: (id, data) => jsonRequest(`${MILK_WASTE_PATH}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMilkWaste: (id) => jsonRequest(`${MILK_WASTE_PATH}/${id}`, { method: "DELETE" }),

  // Notes
  getNotes: list("notes"),
  createNote: (data) =>
    request("notes/", { method: "POST", body: JSON.stringify(data) }),
  updateNote: (id, data) =>
    request(`notes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteNote: (id) => request(`notes/${id}/`, { method: "DELETE" }),

  // Timers
  getTimers: list("timers"),
  createTimer: (data) =>
    request("timers/", { method: "POST", body: JSON.stringify(data) }),
  updateTimer: (id, data) =>
    request(`timers/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTimer: (id) => request(`timers/${id}/`, { method: "DELETE" }),

  // Config (our backend, not Baby Buddy)
  getConfig: (options) => jsonRequest(CONFIG_PATH, options),
};
