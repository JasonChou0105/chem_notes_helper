let formula = "";
let formulaArray = [];
let element = "";

function handleKeydown(event) {
  if (event.key === " ") {
    if (element.length > 0) {
      formulaArray.push(element);
      element = "";
    }

    const formattedFormula = format_formula();
    if (isChemicalFormula(formattedFormula)) {
      copyFormulaToClipboard(formulaArray);
      showToast("Formatted formula copied. Paste to replace.");
    }
    formula = "";
    element = "";
    formulaArray = [];
    return;
  }

  if (event.key === "Backspace") {
    if (element.length > 0) {
      element = element.substring(0, element.length - 1);
    } else if (formulaArray.length > 0) {
      formulaArray.pop();
    }
  } else if (event.key.length === 1) {
    if (isLetter(event.key)) {
      if (event.key === event.key.toLowerCase()) {
        element += event.key;
      } else {
        if (element.length > 0) {
          formulaArray.push(element);
        }
        element = event.key;
      }
    } else if (isDigit(event.key)) {
      if (element.length > 0) {
        formulaArray.push(element);
        element = "";
      }
      formulaArray.push(event.key);
    } else if (event.key === "(" || event.key === ")") {
      if (element.length > 0) {
        formulaArray.push(element);
        element = "";
      }
      formulaArray.push(event.key);
    }
  }
}

document.addEventListener("keydown", handleKeydown);

function format_formula() {
  let formattedFormula = "";
  for (let i = 0; i < formulaArray.length; i++) {
    formattedFormula += formulaArray[i];
  }
  return formattedFormula;
}

function isChemicalFormula(formula) {
  return true; // Placeholder: Implement actual validation logic if needed
}

function handleReplacement() {}

function isDigit(str) {
  if (typeof str != "string") return false;
  return !isNaN(str) && !isNaN(parseFloat(str));
}

function isLetter(str) {
  return str.length === 1 && str.match(/[a-z]/i);
}

let attachedDoc = null;
let toastEl = null;
let fadeTimeout = null;
let removeTimeout = null;

function showToast(message, doc = document) {
  if (!doc || !doc.documentElement) return;

  if (!toastEl || toastEl.ownerDocument !== doc) {
    toastEl = doc.createElement("div");
    toastEl.style.position = "fixed";
    toastEl.style.bottom = "20px";
    toastEl.style.left = "20px";
    toastEl.style.zIndex = "2147483647";
    toastEl.style.background = "rgba(30, 30, 30, 0.9)";
    toastEl.style.color = "#fff";
    toastEl.style.padding = "8px 12px";
    toastEl.style.borderRadius = "10px";
    toastEl.style.fontSize = "14px";
    toastEl.style.fontFamily = "Arial, sans-serif";
    toastEl.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.25)";
    toastEl.style.transition = "opacity 0.3s ease";
    toastEl.style.opacity = "0";
    doc.documentElement.appendChild(toastEl);
  }

  toastEl.textContent = message;
  toastEl.style.opacity = "1";

  clearTimeout(fadeTimeout);
  clearTimeout(removeTimeout);

  fadeTimeout = setTimeout(() => {
    toastEl.style.opacity = "0";
  }, 2000);

  removeTimeout = setTimeout(() => {
    if (toastEl) {
      toastEl.remove();
      toastEl = null;
    }
  }, 2300);
}

function handleDocsKeydown(event) {
  if (event.key === " ") {
    console.log("space detected in docs iframe");
    showToast("Formatted formula copied. Paste to replace.", document);
  }
}

function attachDocsListener() {
  const iframe = document.querySelector("iframe.docs-texteventtarget-iframe");
  if (!iframe) return;

  let iframeDoc;
  try {
    iframeDoc = iframe.contentDocument;
  } catch {
    return;
  }

  if (!iframeDoc) return;
  if (attachedDoc === iframeDoc) return;

  if (attachedDoc) {
    attachedDoc.removeEventListener("keydown", handleDocsKeydown, true);
  }

  iframeDoc.addEventListener("keydown", handleDocsKeydown, true);
  attachedDoc = iframeDoc;
}

attachDocsListener();

const observer = new MutationObserver(() => {
  attachDocsListener();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildFormulaClipboardData(formulaArray) {
  let plainText = "";
  let htmlText = "";

  for (const token of formulaArray) {
    const value = String(token);

    for (const ch of value) {
      plainText += ch;

      if (/\d/.test(ch)) {
        htmlText += `<span style="font-size:0.6em;vertical-align:sub;">${ch}</span>`;
      } else {
        htmlText += escapeHtml(ch);
      }
    }
  }

  const wrappedHtml = `<span style="font-size: 11pt; font-family: Arial, sans-serif; background-color: transparent; font-variant: normal; vertical-align: baseline; white-space: pre-wrap;">${htmlText}</span>`;

  return {
    plainText,
    htmlText: wrappedHtml,
  };
}

async function copyFormulaToClipboard(formulaArray) {
  const { plainText, htmlText } = buildFormulaClipboardData(formulaArray);

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/plain": new Blob([plainText], { type: "text/plain" }),
      "text/html": new Blob([htmlText], { type: "text/html" }),
    }),
  ]);
}
