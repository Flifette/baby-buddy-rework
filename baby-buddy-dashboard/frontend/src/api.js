const API_BASE = "./api/baby-buddy";
const CONFIG_PATH = "./api/config";
const MILK_WASTE_PATH = "./api/milk-waste";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}/${endpoint}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`API error ${response.status}: ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function qs(params) {
  if (!params) return "";
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  );
  const s = new URLSearchParams(filtered).toString();
  return s ? `?${s}` : "";
}

async function dashboardRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`API error ${response.status}: ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  // Children
  getChildren: () => request("children/"),

  // Feedings
  getFeedings: (params) => request(`feedings/${qs(params)}`),
  createFeeding: (data) =>
    request("feedings/", { method: "POST", body: JSON.stringify(data) }),
  updateFeeding: (id, data) =>
    request(`feedings/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteFeeding: (id) => request(`feedings/${id}/`, { method: "DELETE" }),

  // Sleep
  getSleep: (params) => request(`sleep/${qs(params)}`),
  createSleep: (data) =>
    request("sleep/", { method: "POST", body: JSON.stringify(data) }),
  updateSleep: (id, data) =>
    request(`sleep/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSleep: (id) => request(`sleep/${id}/`, { method: "DELETE" }),

  // Diapers (changes)
  getChanges: (params) => request(`changes/${qs(params)}`),
  createChange: (data) =>
    request("changes/", { method: "POST", body: JSON.stringify(data) }),
  updateChange: (id, data) =>
    request(`changes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteChange: (id) => request(`changes/${id}/`, { method: "DELETE" }),

  // Tummy time
  getTummyTimes: (params) => request(`tummy-times/${qs(params)}`),
  createTummyTime: (data) =>
    request("tummy-times/", { method: "POST", body: JSON.stringify(data) }),
  updateTummyTime: (id, data) =>
    request(`tummy-times/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTummyTime: (id) => request(`tummy-times/${id}/`, { method: "DELETE" }),

  // Temperature
  getTemperature: (params) => request(`temperature/${qs(params)}`),
  createTemperature: (data) =>
    request("temperature/", { method: "POST", body: JSON.stringify(data) }),
  updateTemperature: (id, data) =>
    request(`temperature/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTemperature: (id) => request(`temperature/${id}/`, { method: "DELETE" }),

  // Weight
  getWeight: (params) => request(`weight/${qs(params)}`),
  createWeight: (data) =>
    request("weight/", { method: "POST", body: JSON.stringify(data) }),
  updateWeight: (id, data) =>
    request(`weight/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWeight: (id) => request(`weight/${id}/`, { method: "DELETE" }),

  // Height
  getHeight: (params) => request(`height/${qs(params)}`),
  createHeight: (data) =>
    request("height/", { method: "POST", body: JSON.stringify(data) }),
  updateHeight: (id, data) =>
    request(`height/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteHeight: (id) => request(`height/${id}/`, { method: "DELETE" }),

  // Pumping
  getPumping: (params) => request(`pumping/${qs(params)}`),
  createPumping: (data) =>
    request("pumping/", { method: "POST", body: JSON.stringify(data) }),
  updatePumping: (id, data) => request(`pumping/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePumping: (id) => request(`pumping/${id}/`, { method: "DELETE" }),

  // Milk discarded after a bottle was started. Stored by this dashboard,
  // separately from Baby Buddy feedings so it never counts as a meal.
  getMilkWaste: (params) => dashboardRequest(`${MILK_WASTE_PATH}${qs(params)}`),
  createMilkWaste: (data) => dashboardRequest(MILK_WASTE_PATH, { method: "POST", body: JSON.stringify(data) }),
  updateMilkWaste: (id, data) => dashboardRequest(`${MILK_WASTE_PATH}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMilkWaste: (id) => dashboardRequest(`${MILK_WASTE_PATH}/${id}`, { method: "DELETE" }),

  // Notes
  getNotes: (params) => request(`notes/${qs(params)}`),
  createNote: (data) =>
    request("notes/", { method: "POST", body: JSON.stringify(data) }),
  updateNote: (id, data) =>
    request(`notes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteNote: (id) => request(`notes/${id}/`, { method: "DELETE" }),

  // Timers
  getTimers: () => request("timers/"),
  createTimer: (data) =>
    request("timers/", { method: "POST", body: JSON.stringify(data) }),
  updateTimer: (id, data) =>
    request(`timers/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTimer: (id) => request(`timers/${id}/`, { method: "DELETE" }),

  // Config (our backend, not Baby Buddy)
  getConfig: () => fetch(CONFIG_PATH).then((r) => r.json()),
};
