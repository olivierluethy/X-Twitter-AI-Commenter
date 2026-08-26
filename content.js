(function () {
  const ICONS = {
    // Fröhlicher Smiley (statt Häkchen)
    positive: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,

    // Lachender Smiley (Witz)
    joke: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M18 13c0 3.3-2.7 5-6 5s-6-1.7-6-5h12z"></path>
    <path d="M7 9l2 2-2 2"></path>
    <path d="M17 9l-2 2 2 2"></path>
</svg>`,

    // Glühbirne (Idee)
    idea: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-7 7c0 2.5 2 4.5 2 6.5h10c0-2 2-4 2-6.5a7 7 0 0 0-7-7z"></path></svg>`,

    // Minus-Symbol (Ablehnung)
    disagree: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>`,

    // Fragezeichen (Frage)
    question: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  };

  function insertTextIntoReply(text) {
    const editor = document.querySelector(
      'div[data-testid="tweetTextarea_0"][contenteditable="true"]',
    );
    if (!editor) return;

    editor.focus();

    const textSpan = editor.querySelectorAll('div[class*="public-Draft"]');

    // Wenn bereits Text existiert → ersetze ihn
    if (textSpan.length > 0) {
      textSpan[0].innerText = text;
      editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
      return;
    }

    // Wenn kein Text existiert → normalen Insert verwenden
    document.execCommand("insertText", false, text);
    editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }

  function getTweetText() {
    const tweet = document.querySelector("article div[lang]");

    if (!tweet) return "";

    return tweet.innerText.trim();
  }

  // Text the user has already typed into the reply/compose editor. Used when
  // there is no tweet to reply to (composing an original post) so the AI can
  // enhance the user's own draft instead of replying to someone else.
  function getDraftText() {
    const editor = document.querySelector(
      'div[data-testid="tweetTextarea_0"][contenteditable="true"]',
    );

    if (!editor) return "";

    return editor.innerText.trim();
  }

  function createCustomToolbar(nativeToolbar) {
    const toolbar = document.createElement("div");
    toolbar.className = "my-custom-x-toolbar";

    Object.assign(toolbar.style, {
      display: "flex",
      gap: "4px",
      padding: "8px 12px",
      borderTop: "1px solid rgb(47, 51, 54)",
      backgroundColor: "transparent",
    });

    const buttons = [
      { id: "positive", label: "Positive", icon: ICONS.positive },
      { id: "joke", label: "Joke", icon: ICONS.joke },
      { id: "idea", label: "Idea", icon: ICONS.idea },
      { id: "disagree", label: "Disagree", icon: ICONS.disagree },
      { id: "question", label: "Question", icon: ICONS.question },
    ];

    // Track every button so we can disable them all while one is generating.
    const allButtons = [];

    // Enable/disable all buttons at once (issue: disable all options while generating).
    function setButtonsDisabled(disabled) {
      allButtons.forEach((b) => {
        b.disabled = disabled;
        b.style.opacity = disabled ? "0.6" : "1";
        b.style.cursor = disabled ? "not-allowed" : "pointer";
      });
    }

    buttons.forEach((data) => {
      const btn = document.createElement("button");
      allButtons.push(btn);

      btn.className = "my-x-btn";

      btn.innerHTML = `${data.icon} <span style="font-weight:700;font-size:14px;margin-left:4px;">${data.label}</span>`;

      Object.assign(btn.style, {
        background: "transparent",
        color: "rgb(29,155,240)",
        border: "none",
        borderRadius: "9999px",
        padding: "0 12px",
        height: "34px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        transition: "background-color 0.2s",
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      });

      btn.onmouseover = () =>
        (btn.style.backgroundColor = "rgba(29,155,240,0.1)");
      btn.onmouseout = () => (btn.style.backgroundColor = "transparent");

      btn.onclick = async (e) => {
        e.preventDefault();

        if (btn.disabled) return;

        const originalHTML = btn.innerHTML; // speichere das Original-Icon+Label

        // Disable ALL buttons while generating so only one request runs at a time.
        setButtonsDisabled(true);

        // Lade-Animation anzeigen
        btn.innerHTML = `<span class="spinner" style="
      border: 2px solid rgba(0,0,0,0.2);
      border-top: 2px solid rgb(29,155,240);
      border-radius: 50%;
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
      display: inline-block;
      margin-right: 6px;
    "></span>Loading...`;

        // Spinner CSS hinzufügen (falls noch nicht vorhanden)
        if (!document.getElementById("spinner-style")) {
          const style = document.createElement("style");
          style.id = "spinner-style";
          style.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
          document.head.appendChild(style);
        }

        const tweetText = getTweetText(nativeToolbar);
        // No tweet to reply to → enhance the user's own draft instead.
        const draftText = tweetText ? "" : getDraftText();

        try {
          const aiText = await requestAI(data.id, tweetText, draftText);
          insertTextIntoReply(aiText);
        } catch (err) {
          console.error("AI request failed:", err);
        } finally {
          // Button-Text wiederherstellen und alle Buttons reaktivieren.
          btn.innerHTML = originalHTML;
          setButtonsDisabled(false);
        }
      };

      toolbar.appendChild(btn);
    });

    return toolbar;
  }

  function injectToolbar() {
    const replyToolbars = document.querySelectorAll(
      'div[data-testid="toolBar"]',
    );

    replyToolbars.forEach((toolbar) => {
      const container =
        toolbar.closest('div[data-testid="cellInnerDiv"]') ||
        toolbar.parentElement;

      if (container.querySelector(".my-custom-x-toolbar")) return;

      const customToolbar = createCustomToolbar(toolbar);

      toolbar.insertAdjacentElement("afterend", customToolbar);
    });
  }

  const observer = new MutationObserver(() => injectToolbar());

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  injectToolbar();
})();

async function requestAI(action, tweetText, draftText) {
  const payload = {
    action: action,
    tweet: tweetText,
    draft: draftText || "",
    url: window.location.href,
  };

  // Hier loggen wir den Request, bevor er an die API geht
  console.log("Sending API request:", payload);

  const response = await fetch("https://x.prompt-in.com/api.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return data.reply || "Error: No reply received.";
}
