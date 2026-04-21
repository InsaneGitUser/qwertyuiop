(function() {
    const fullPath = decodeURIComponent(window.location.hash.slice(1));
	window.FULL_PATH = fullPath.startsWith('/') ? 'file://' + fullPath : fullPath;
    window.USER_HASH = (fullPath.match(/u-([^/]+)/) || [])[1];
	history.replaceState(null, '', window.location.origin + window.location.pathname);

    function showDenied() {
        const overlay = document.createElement("div");
        overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      background: #0f0f0f; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: sans-serif; color: #fff;
    `;
        overlay.innerHTML = `
      <h1 style="font-size: 48px; margin: 0 0 8px;">Access Denied</h1>
      <p style="color: #888; margin: 0;">You are not authorised to use this tool.</p>
    `;
        document.documentElement.appendChild(overlay);
        throw new Error("Access denied — halting script execution.");
    }

    function showWelcome(username, pfp) {
        const overlay = document.createElement("div");
        overlay.id = "auth-overlay";
        overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      background: #0f0f0f; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: sans-serif; color: #fff;
    `;
        overlay.innerHTML = `
      <style>
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        #auth-overlay .card {
          display: flex; flex-direction: column; align-items: center;
          animation: fadeUp 0.5s ease forwards;
        }
        #auth-overlay .pfp {
          width: 100px; height: 100px; border-radius: 50%;
          object-fit: cover;
          border: 3px solid #333;
          margin-bottom: 20px;
          box-shadow: 0 0 0 6px #1a1a1a;
        }
        #auth-overlay .welcome {
          font-size: 28px; font-weight: 600; margin: 0 0 6px;
          letter-spacing: -0.5px;
        }
        #auth-overlay .sub {
          font-size: 14px; color: #666; margin: 0 0 32px;
        }
        #auth-overlay .enter-btn {
          padding: 12px 40px; font-size: 15px; font-weight: 500;
          background: #fff; color: #0f0f0f;
          border: none; border-radius: 999px;
          cursor: pointer; transition: background 0.2s, transform 0.1s;
          letter-spacing: 0.2px;
        }
        #auth-overlay .enter-btn:hover  { background: #f5c400; }
        #auth-overlay .enter-btn:active { transform: scale(0.97); }
      </style>
      <div class="card">
        <img class="pfp" src="${pfp}" alt="${username}" />
        <p class="welcome">Welcome, ${username}</p>
        <p class="sub">Greep</p>
        <button class="enter-btn" id="enter-btn">Enter</button>
      </div>
    `;
        document.documentElement.appendChild(overlay);

        document.getElementById("enter-btn").addEventListener("click", () => {
            overlay.style.transition = "opacity 0.4s ease";
            overlay.style.opacity = "0";
            setTimeout(() => overlay.remove(), 400);
        });
    }

    if (!USER_HASH) {
        showDenied();
        return;
    }

    fetch("users.xml")
        .then(r => r.text())
        .then(xml => {
            const doc = new DOMParser().parseFromString(xml, "text/xml");
            const users = doc.querySelectorAll("user");
            let found = null;

            users.forEach(u => {
                if (u.querySelector("hash").textContent.trim() === USER_HASH) {
                    found = {
                        username: u.querySelector("username").textContent.trim(),
                        pfp: u.querySelector("pfp").textContent.trim()
                    };
                }
            });

            if (!found) {
                showDenied();
                return;
            }
            showWelcome(found.username, found.pfp);
        })
        .catch(() => showDenied());
})();