export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >
  <title>VizAI People Flow</title>
  <link rel="stylesheet" href="/dashboard.css">
</head>
<body>
  <main>
    <header>
      <div>
        <p class="eyebrow">VizAI camera gateway</p>
        <h1>People-flow dashboard</h1>
      </div>

      <label>
        Logical camera
        <select id="camera-selector">
          <option value="">Loading cameras…</option>
        </select>
      </label>
    </header>

    <p id="message" role="status">
      Select a logical camera.
    </p>

    <section class="cards">
      <article>
        <span>Status</span>
        <strong id="status">—</strong>
      </article>
      <article>
        <span>Entered</span>
        <strong id="entered">—</strong>
      </article>
      <article>
        <span>Exited</span>
        <strong id="exited">—</strong>
      </article>
      <article>
        <span>Total traffic</span>
        <strong id="total">—</strong>
      </article>
      <article>
        <span>Hours reported</span>
        <strong id="measurements">—</strong>
      </article>
    </section>

    <section class="panel">
      <h2>Recent hourly measurements</h2>
      <table>
        <thead>
          <tr>
            <th>Period end</th>
            <th>Entered</th>
            <th>Exited</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody id="history"></tbody>
      </table>
    </section>
  </main>

  <script type="module" src="/dashboard.js"></script>
</body>
</html>`;

export const DASHBOARD_CSS = `
:root {
  color-scheme: dark;
  font-family:
    Inter, ui-sans-serif, system-ui, sans-serif;
  background: #09111f;
  color: #eef5ff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(
      circle at top right,
      #173b59,
      transparent 38rem
    ),
    #09111f;
}

main {
  width: min(1100px, calc(100% - 32px));
  margin: 0 auto;
  padding: 40px 0;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 24px;
}

h1 {
  margin: 4px 0;
  font-size: clamp(2rem, 5vw, 3.5rem);
}

.eyebrow,
label,
article span {
  color: #8fb3cf;
}

label {
  display: grid;
  gap: 8px;
}

select {
  min-width: 260px;
  padding: 12px;
  border: 1px solid #2a5878;
  border-radius: 10px;
  background: #102235;
  color: inherit;
}

.cards {
  display: grid;
  grid-template-columns:
    repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin: 24px 0;
}

article,
.panel {
  border: 1px solid #203f57;
  border-radius: 16px;
  background: rgba(15, 31, 48, 0.88);
  padding: 20px;
}

article {
  display: grid;
  gap: 12px;
}

article strong {
  font-size: 2rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #203f57;
}

#message {
  min-height: 24px;
  color: #9fd5ff;
}

@media (max-width: 650px) {
  header {
    align-items: stretch;
    flex-direction: column;
  }

  select {
    min-width: 100%;
  }

  .panel {
    overflow-x: auto;
  }
}
`;

export const DASHBOARD_JAVASCRIPT = `
const selector =
  document.querySelector("#camera-selector");
const message =
  document.querySelector("#message");
const historyBody =
  document.querySelector("#history");

const fields = {
  status: document.querySelector("#status"),
  entered: document.querySelector("#entered"),
  exited: document.querySelector("#exited"),
  total: document.querySelector("#total"),
  measurements:
    document.querySelector("#measurements")
};

selector.addEventListener("change", () => {
  const cameraId = selector.value;

  if (cameraId) {
    loadCamera(cameraId).catch(showFailure);
  }
});

loadCameras().catch(showFailure);

async function loadCameras() {
  const response = await fetch("/v1/cameras");
  const body = await readJson(response);

  selector.replaceChildren();

  for (const camera of body.cameras) {
    const option =
      document.createElement("option");

    option.value = camera.cameraId;
    option.textContent =
      camera.cameraId + " · " + camera.adapterId;

    selector.append(option);
  }

  if (body.cameras.length === 0) {
    const option =
      document.createElement("option");

    option.value = "";
    option.textContent =
      "No registered logical cameras";

    selector.append(option);
    message.textContent =
      "No cameras are currently registered.";
    return;
  }

  await loadCamera(selector.value);
}

async function loadCamera(cameraId) {
  resetWidgets();
  message.textContent =
    "Loading " + cameraId + "…";

  const to = new Date();
  const from =
    new Date(to.getTime() - 24 * 60 * 60 * 1000);

  const common =
    "cameraId=" + encodeURIComponent(cameraId)
    + "&from=" + encodeURIComponent(from.toISOString())
    + "&to=" + encodeURIComponent(to.toISOString())
    + "&limit=24";

  const [health, overview, history] =
    await Promise.all([
      fetch(
        "/v1/cameras/"
        + encodeURIComponent(cameraId)
        + "/health"
      ).then(readJson),
      fetch(
        "/v1/analytics/overview?" + common
      ).then(readJson),
      fetch(
        "/v1/people-flow/history?" + common
      ).then(readJson)
    ]);

  if (
    overview.overview.cameraId !== cameraId
    || history.cameraId !== cameraId
    || health.camera.cameraId !== cameraId
  ) {
    throw new Error(
      "The server returned another camera."
    );
  }

  fields.status.textContent =
    health.camera.status;
  fields.entered.textContent =
    String(overview.overview.entered);
  fields.exited.textContent =
    String(overview.overview.exited);
  fields.total.textContent =
    String(overview.overview.totalTraffic);
  fields.measurements.textContent =
    String(overview.overview.measurements);

  renderHistory(history.measurements);

  message.textContent =
    "Showing only " + cameraId + ".";
}

function renderHistory(measurements) {
  historyBody.replaceChildren();

  for (const measurement of measurements) {
    const row = document.createElement("tr");

    appendCell(
      row,
      new Date(
        measurement.period.end
      ).toLocaleString()
    );
    appendCell(
      row,
      String(measurement.counts.entered)
    );
    appendCell(
      row,
      String(measurement.counts.exited)
    );
    appendCell(
      row,
      measurement.source.protocol
    );

    historyBody.append(row);
  }
}

function appendCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.append(cell);
}

function resetWidgets() {
  for (const field of Object.values(fields)) {
    field.textContent = "—";
  }

  historyBody.replaceChildren();
}

async function readJson(response) {
  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      body.message ?? body.error ?? "Request failed."
    );
  }

  return body;
}

function showFailure(error) {
  resetWidgets();
  message.textContent =
    error instanceof Error
      ? error.message
      : "Dashboard request failed.";
}
`;