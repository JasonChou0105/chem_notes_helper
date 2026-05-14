let formulaArray = [];
let element = "";
let attachedDoc = null;

function isDigit(str) {
  return typeof str === "string" && /^\d$/.test(str);
}

function isLetter(str) {
  return typeof str === "string" && /^[a-z]$/i.test(str);
}

function format_formula() {
  return formulaArray.join("");
}

function isChemicalFormula(formula) {
  if (!formula || /\s/.test(formula)) return false;

  let i = 0;
  let parenBalance = 0;
  let sawElement = false;

  while (i < formula.length) {
    const ch = formula[i];

    if (ch === "(") {
      parenBalance++;
      i++;
      continue;
    }

    if (ch === ")") {
      parenBalance--;
      if (parenBalance < 0) return false;
      i++;

      let num = "";
      while (i < formula.length && /\d/.test(formula[i])) {
        num += formula[i];
        i++;
      }
      if (num === "0") return false;
      continue;
    }

    if (/[A-Z]/.test(ch)) {
      sawElement = true;
      i++;

      if (i < formula.length && /[a-z]/.test(formula[i])) {
        i++;
      }

      let num = "";
      while (i < formula.length && /\d/.test(formula[i])) {
        num += formula[i];
        i++;
      }
      if (num === "0") return false;

      continue;
    }

    return false;
  }

  return sawElement && parenBalance === 0;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildFormulaClipboardData(tokens) {
  let plainText = "";
  let htmlText = "";

  for (const token of tokens) {
    const value = String(token);

    for (const ch of value) {
      plainText += ch;

      if (/\d/.test(ch)) {
        htmlText += `<span style="font-size:0.6em;vertical-align:sub;">${escapeHtml(ch)}</span>`;
      } else {
        htmlText += escapeHtml(ch);
      }
    }
  }

  plainText += " ";
  htmlText += " ";

  const wrappedHtml = `<span style="font-size: 11pt; font-family: Times New Roman, sans-serif; background-color: transparent; font-variant: normal; vertical-align: baseline; white-space: pre-wrap;">${htmlText}</span>`;

  return {
    plainText,
    htmlText: wrappedHtml,
  };
}

async function copyFormulaToClipboard(tokens) {
  const { plainText, htmlText } = buildFormulaClipboardData(tokens);

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/plain": new Blob([plainText], { type: "text/plain" }),
      "text/html": new Blob([htmlText], { type: "text/html" }),
    }),
  ]);
}

function getFormulaCharCount(tokens) {
  return tokens.map(String).join("").length;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDocsTarget() {
  const iframe = document.querySelector("iframe.docs-texteventtarget-iframe");
  if (!iframe) return null;

  try {
    return iframe.contentDocument || null;
  } catch {
    return null;
  }
}

function dispatchKey(targetDoc, key, code, options = {}) {
  const eventInit = {
    key,
    code,
    keyCode: options.keyCode ?? 0,
    which: options.which ?? 0,
    bubbles: true,
    cancelable: true,
    composed: true,
    ctrlKey: !!options.ctrlKey,
    metaKey: !!options.metaKey,
    shiftKey: !!options.shiftKey,
    altKey: !!options.altKey,
  };

  targetDoc.dispatchEvent(new KeyboardEvent("keydown", eventInit));
  targetDoc.dispatchEvent(new KeyboardEvent("keyup", eventInit));
}

async function highlightPreviousFormulaInDocs(charCount) {
  const targetDoc = getDocsTarget();
  if (!targetDoc) return;

  for (let i = 0; i < charCount; i++) {
    dispatchKey(targetDoc, "ArrowLeft", "ArrowLeft", {
      keyCode: 37,
      which: 37,
      shiftKey: true,
    });
    await sleep(8);
  }
}

function resetFormulaTracking() {
  formulaArray = [];
  element = "";
}

async function handleKeydown(event) {
  const isModifierShortcut = event.ctrlKey || event.metaKey || event.altKey;
  if (isModifierShortcut) {
    return;
  }
  const formattedFormula = format_formula();
  if (event.key === " " && /\d/.test(formattedFormula)) {
    if (element.length > 0) {
      formulaArray.push(element);
      element = "";
    }

    if (isChemicalFormula(formattedFormula)) {
      event.preventDefault();

      try {
        const tokens = [...formulaArray];
        await copyFormulaToClipboard(tokens);
        await highlightPreviousFormulaInDocs(getFormulaCharCount(tokens));
      } catch (err) {
        console.error("Formula highlight/copy failed:", err);
      }
    } else {
      resetFormulaTracking();
      return;
    }

    resetFormulaTracking();
    return;
  }

  if (event.key === "Backspace") {
    if (element.length > 0) {
      element = element.slice(0, -1);
    } else if (formulaArray.length > 0) {
      formulaArray.pop();
    }
    return;
  }

  if (event.key.length === 1) {
    if (isLetter(event.key)) {
      if (event.key === event.key.toLowerCase()) {
        element += event.key;
      } else {
        if (element.length > 0) {
          formulaArray.push(element);
        }
        element = event.key;
      }
      return;
    }

    if (isDigit(event.key)) {
      if (element.length > 0) {
        formulaArray.push(element);
        element = "";
      }

      const last = formulaArray[formulaArray.length - 1];

      // If last token is already a number, append to it
      if (last && /^\d+$/.test(last)) {
        formulaArray[formulaArray.length - 1] = last + event.key;
      } else {
        formulaArray.push(event.key);
      }

      return;
    }

    if (event.key === "(" || event.key === ")") {
      if (element.length > 0) {
        formulaArray.push(element);
        element = "";
      }
      formulaArray.push(event.key);
      return;
    }

    resetFormulaTracking();
  }
}

function handleDocsKeydown(event) {
  handleKeydown(event);
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
