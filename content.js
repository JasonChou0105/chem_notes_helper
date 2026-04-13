const VALID_ELEMENTS = new Set([
  "H",
  "He",
  "Li",
  "Be",
  "B",
  "C",
  "N",
  "O",
  "F",
  "Ne",
  "Na",
  "Mg",
  "Al",
  "Si",
  "P",
  "S",
  "Cl",
  "Ar",
  "K",
  "Ca",
  "Sc",
  "Ti",
  "V",
  "Cr",
  "Mn",
  "Fe",
  "Co",
  "Ni",
  "Cu",
  "Zn",
  "Ga",
  "Ge",
  "As",
  "Se",
  "Br",
  "Kr",
  "Rb",
  "Sr",
  "Y",
  "Zr",
  "Nb",
  "Mo",
  "Tc",
  "Ru",
  "Rh",
  "Pd",
  "Ag",
  "Cd",
  "In",
  "Sn",
  "Sb",
  "Te",
  "I",
  "Xe",
  "Cs",
  "Ba",
  "La",
  "Ce",
  "Pr",
  "Nd",
  "Pm",
  "Sm",
  "Eu",
  "Gd",
  "Tb",
  "Dy",
  "Ho",
  "Er",
  "Tm",
  "Yb",
  "Lu",
  "Hf",
  "Ta",
  "W",
  "Re",
  "Os",
  "Ir",
  "Pt",
  "Au",
  "Hg",
  "Tl",
  "Pb",
  "Bi",
  "Po",
  "At",
  "Rn",
  "Fr",
  "Ra",
  "Ac",
  "Th",
  "Pa",
  "U",
  "Np",
  "Pu",
  "Am",
  "Cm",
  "Bk",
  "Cf",
  "Es",
  "Fm",
  "Md",
  "No",
  "Lr",
  "Rf",
  "Db",
  "Sg",
  "Bh",
  "Hs",
  "Mt",
  "Ds",
  "Rg",
  "Cn",
  "Nh",
  "Fl",
  "Mc",
  "Lv",
  "Ts",
  "Og",
]);

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
  if (!formula || typeof formula !== "string") return false;
  if (/\s/.test(formula)) return false;

  let i = 0;
  let parenBalance = 0;
  let sawElement = false;
  let lastTokenType = null; // "element" | "openParen" | "closeParen"

  while (i < formula.length) {
    const ch = formula[i];

    if (ch === "(") {
      if (lastTokenType === "element" || lastTokenType === "closeParen") {
        return false;
      }

      parenBalance++;
      lastTokenType = "openParen";
      i++;
      continue;
    }

    if (ch === ")") {
      if (parenBalance === 0) return false;
      if (lastTokenType === "openParen") return false;

      parenBalance--;
      i++;
      lastTokenType = "closeParen";

      let num = "";
      while (i < formula.length && /\d/.test(formula[i])) {
        num += formula[i];
        i++;
      }

      if (num.startsWith("0")) return false;
      continue;
    }

    if (/[A-Z]/.test(ch)) {
      let symbol = ch;

      if (i + 1 < formula.length && /[a-z]/.test(formula[i + 1])) {
        symbol += formula[i + 1];
      }

      if (symbol.length === 2 && !VALID_ELEMENTS.has(symbol)) {
        symbol = ch;
      }

      if (!VALID_ELEMENTS.has(symbol)) return false;

      sawElement = true;
      lastTokenType = "element";
      i += symbol.length;

      let num = "";
      while (i < formula.length && /\d/.test(formula[i])) {
        num += formula[i];
        i++;
      }

      if (num.startsWith("0")) return false;
      continue;
    }

    return false;
  }

  return sawElement && parenBalance === 0 && lastTokenType !== "openParen";
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

  const wrappedHtml = `<span style="font-size: 11pt; font-family: Arial, sans-serif; background-color: transparent; font-variant: normal; vertical-align: baseline; white-space: pre-wrap;">${htmlText}</span>`;

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

  if (event.key === " ") {
    if (element.length > 0) {
      formulaArray.push(element);
      element = "";
    }

    const formattedFormula = format_formula();

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
      formulaArray.push(event.key);
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
