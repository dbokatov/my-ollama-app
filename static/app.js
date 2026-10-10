const form = document.querySelector("#rewrite-form");
const input = document.querySelector("#source-text");
const charCount = document.querySelector("#char-count");
const submitButton = document.querySelector("#submit-button");
const submitLabel = document.querySelector("#submit-label");
const stopButton = document.querySelector("#stop-button");
const clearButton = document.querySelector("#clear-button");
const copyButton = document.querySelector("#copy-button");
const outputPanel = document.querySelector(".output-panel");
const placeholder = document.querySelector("#placeholder");
const result = document.querySelector("#result");
const improvedText = document.querySelector("#improved-text");
const explanationText = document.querySelector("#explanation-text");
const errorMessage = document.querySelector("#error-message");
const streamStatus = document.querySelector("#stream-status");

const improvedMarker = "IMPROVED TEXT:";
const explanationMarker = "WHY I CHANGED IT:";
let activeController = null;
let accumulatedText = "";

function updateCounter() {
  charCount.textContent = `${input.value.length.toLocaleString()} / 20,000`;
}

function renderSections() {
  const improvedStart = accumulatedText.indexOf(improvedMarker);
  const explanationStart = accumulatedText.indexOf(explanationMarker);

  if (improvedStart === -1) {
    improvedText.textContent = accumulatedText;
    explanationText.textContent = "";
    return;
  }

  const improvedEnd = explanationStart === -1 ? accumulatedText.length : explanationStart;
  improvedText.textContent = accumulatedText
    .slice(improvedStart + improvedMarker.length, improvedEnd)
    .trim();

  explanationText.textContent = explanationStart === -1
    ? ""
    : accumulatedText.slice(explanationStart + explanationMarker.length).trim();
}

function setBusy(busy) {
  submitButton.disabled = busy;
  input.disabled = busy;
  clearButton.disabled = busy;
  stopButton.hidden = !busy;
  submitLabel.textContent = busy ? "Improving…" : "Improve text";
  streamStatus.hidden = !busy;
  outputPanel.setAttribute("aria-busy", String(busy));
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function parseEventBlock(block) {
  let eventName = "message";
  const dataLines = [];

  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }

  if (dataLines.length === 0) return;

  let payload;
  try {
    payload = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }

  if (eventName === "token") {
    accumulatedText += payload.text || "";
    renderSections();
  } else if (eventName === "error") {
    showError(payload.message || "The request failed.");
  }
}

async function readEventStream(response) {
  if (!response.body) throw new Error("This browser does not support response streaming.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");

    while (boundary !== -1) {
      parseEventBlock(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) parseEventBlock(buffer);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();

  errorMessage.hidden = true;
  errorMessage.textContent = "";
  if (!text) {
    input.focus();
    input.setCustomValidity("Add some text first.");
    input.reportValidity();
    input.setCustomValidity("");
    return;
  }

  accumulatedText = "";
  improvedText.textContent = "";
  explanationText.textContent = "";
  placeholder.hidden = true;
  result.hidden = false;
  copyButton.disabled = true;
  activeController = new AbortController();
  setBusy(true);

  try {
    const response = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: activeController.signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${response.status}).`);
    }

    await readEventStream(response);
    copyButton.disabled = !improvedText.textContent.trim();
  } catch (error) {
    if (error.name !== "AbortError") {
      showError(error.message || "Could not connect to the local text editor.");
      if (!accumulatedText) result.hidden = true;
      placeholder.hidden = Boolean(accumulatedText);
    }
  } finally {
    activeController = null;
    setBusy(false);
  }
});

input.addEventListener("input", updateCounter);
input.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    form.requestSubmit();
  }
});

clearButton.addEventListener("click", () => {
  input.value = "";
  updateCounter();
  input.focus();
});

stopButton.addEventListener("click", () => {
  activeController?.abort();
});

copyButton.addEventListener("click", async () => {
  const text = improvedText.textContent.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyButton.innerHTML = '<span aria-hidden="true">✓</span> Copied';
    window.setTimeout(() => {
      copyButton.innerHTML = '<span aria-hidden="true">▢</span> Copy';
    }, 1400);
  } catch {
    showError("The browser could not access the clipboard. Select and copy the improved text instead.");
  }
});

updateCounter();
