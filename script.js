(function () {
  var KEY = "design_md_generator_v1";
  var store = {};
  try {
    store = JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch (e) {}

  // ---- persistence + autosize, wired to any [data-k] (incl. cloned rows)
  function wire(el) {
    var k = el.getAttribute("data-k");
    if (!k) return;
    if (store[k] !== undefined) el.value = store[k];
    if (el.tagName === "TEXTAREA") grow(el);
    var ev = el.type === "color" ? "change" : "input";
    el.addEventListener(ev, function () {
      try {
        store[k] = el.value;
        localStorage.setItem(KEY, JSON.stringify(store));
        flash();
      } catch (e) {}
      if (el.tagName === "TEXTAREA") grow(el);
    });
  }
  function wireAll(root) {
    (root || document).querySelectorAll("[data-k]").forEach(wire);
  }
  function grow(t) {
    t.style.height = "auto";
    t.style.height = t.scrollHeight + 2 + "px";
  }

  // keep a color picker and its hex field in sync
  function wireColorSync(tokenEl) {
    var picker = tokenEl.querySelector(".tk-color");
    var hex = tokenEl.querySelector(".tk-value");
    if (!picker || !hex) return;
    picker.addEventListener("input", function () {
      hex.value = picker.value;
      hex.dispatchEvent(new Event("input"));
    });
    hex.addEventListener("input", function () {
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.value.trim()))
        picker.value = hex.value.trim();
    });
  }
  document.querySelectorAll("#colorGroup .token").forEach(wireColorSync);

  // ---- save indicator
  var sv = document.getElementById("saveNote"),
    tmr;
  function flash() {
    if (!sv) return;
    sv.textContent = "Saved";
    clearTimeout(tmr);
    tmr = setTimeout(function () {
      sv.textContent = "Saves automatically in your browser";
    }, 1100);
  }

  // ---- add-row (clone) handling, with unique data-k so each persists
  var counters = { ux: 2, gr: 2, color: 1, type: 1, space: 1, other: 1 };
  var groupMap = {
    ux: { el: "uxGroup", prefix: "ux" },
    gr: { el: "grGroup", prefix: "gr" },
    color: { el: "colorGroup", prefix: "col" },
    type: { el: "typeGroup", prefix: "ty" },
    space: { el: "spaceGroup", prefix: "sp" },
    other: { el: "otherGroup", prefix: "ot" },
  };
  document.querySelectorAll(".addrow").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-clone");
      var info = groupMap[key];
      var group = document.getElementById(info.el);
      var template = group.querySelector(
        ".token:last-of-type, .app-item:last-of-type",
      );
      var clone = template.cloneNode(true);
      counters[key]++;
      var n = counters[key];
      clone.querySelectorAll("[data-k]").forEach(function (el) {
        // build a fresh key like col3v from prefix + n + suffix
        var old = el.getAttribute("data-k");
        var suffix = old.replace(/^[a-z]+\d+/i, "");
        el.setAttribute("data-k", info.prefix + n + suffix);
        if (el.type === "color") {
          el.value = "#8cffa7";
        } else {
          el.value = "";
        }
      });
      group.appendChild(clone);
      wireAll(clone);
      wireColorSync(clone);
    });
  });

  // ---- markdown assembly
  function cell(v) {
    return String(v || "")
      .trim()
      .replace(/\|/g, "\\|")
      .replace(/\s*\n+\s*/g, " ");
  }
  function val(k) {
    var el = document.querySelector('[data-k="' + k + '"]');
    return el ? el.value.trim() : "";
  }
  function bullet(label, v) {
    return v ? "- **" + label + ":** " + v.replace(/\n+/g, " ") + "\n" : "";
  }
  function appTable(groupId, col2) {
    var rows = [];
    document
      .querySelectorAll("#" + groupId + " .app-item")
      .forEach(function (it) {
        var name = it.querySelector(".ai-name");
        var purpose = it.querySelector(".ai-purpose");
        name = name ? name.value : "";
        purpose = purpose ? purpose.value : "";
        if (name.trim() || purpose.trim()) rows.push([name, purpose]);
      });
    if (!rows.length) return "";
    var s = "| " + col2[0] + " | " + col2[1] + " |\n|---|---|\n";
    rows.forEach(function (r) {
      s += "| " + cell(r[0]) + " | " + cell(r[1]) + " |\n";
    });
    return s + "\n";
  }
  function tokenTable(groupId) {
    var rows = [];
    document.querySelectorAll("#" + groupId + " .token").forEach(function (t) {
      var get = function (c) {
        var el = t.querySelector(c);
        return el ? el.value : "";
      };
      var r = [
        get(".tk-name"),
        get(".tk-value"),
        get(".tk-purpose"),
        get(".tk-constraint"),
      ];
      if (
        r.some(function (x) {
          return x.trim();
        })
      )
        rows.push(r);
    });
    if (!rows.length) return "";
    var s =
      "| Token | Value | Purpose / context | Constraints / boundary |\n|---|---|---|---|\n";
    rows.forEach(function (r) {
      s +=
        "| " +
        cell(r[0]) +
        " | " +
        cell(r[1]) +
        " | " +
        cell(r[2]) +
        " | " +
        cell(r[3]) +
        " |\n";
    });
    return s + "\n";
  }

  function buildMarkdown() {
    var name = val("bName") || "Untitled Brand";
    var md = "# " + name + " — DESIGN.md\n\n";
    md +=
      "_A living design reference. Every choice below exists to serve the brand and its audience._\n\n";

    // 1. Brand foundation
    var s1 =
      bullet("What it is", val("bDesc")) +
      bullet("Personality and voice", val("bPers")) +
      bullet("Design principles", val("bPrin")) +
      bullet("Feeling to evoke", val("bFeel")) +
      bullet("Feeling to avoid", val("bAvoid"));
    if (s1) md += "## 1. Brand foundation\n\n" + s1 + "\n";

    // 2. Audience & context
    var s2 =
      bullet("Primary audience", val("aWho")) +
      bullet("What they need", val("aNeeds")) +
      bullet("Context of use", val("aCtx")) +
      bullet("Emotional response", val("aEmo")) +
      bullet("Accessibility requirements", val("aA11y"));
    if (s2) md += "## 2. Audience and context\n\n" + s2 + "\n";

    // 3. Application areas
    var ux = appTable("uxGroup", [
      "Component / experience",
      "What it should accomplish for the user",
    ]);
    var gr = appTable("grGroup", [
      "Graphic / asset",
      "Value delivered / what it should accomplish",
    ]);
    if (ux || gr) {
      md += "## 3. Application areas\n\n";
      if (ux) md += "### UX/UI components and digital experiences\n\n" + ux;
      if (gr) md += "### Graphics and imagery\n\n" + gr;
    }

    // 4. Design tokens
    var col = tokenTable("colorGroup");
    var typ = tokenTable("typeGroup");
    var spc = tokenTable("spaceGroup");
    var oth = tokenTable("otherGroup");
    if (col || typ || spc || oth) {
      md += "## 4. Design tokens\n\n";
      if (col) md += "### Color\n\n" + col;
      if (typ) md += "### Typography\n\n" + typ;
      if (spc) md += "### Spacing\n\n" + spc;
      if (oth) md += "### Other tokens\n\n" + oth;
    }

    var d = new Date();
    md +=
      "---\n\n_Generated " +
      d.toISOString().slice(0, 10) +
      " with the Personalized DESIGN.md Generator._\n";
    return md;
  }

  // ---- actions
  function download() {
    var md = buildMarkdown();
    var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "DESIGN.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function copy() {
    var md = buildMarkdown();
    var done = function () {
      var b = document.getElementById("copyBtn");
      var t = b.textContent;
      b.textContent = "Copied";
      setTimeout(function () {
        b.textContent = t;
      }, 1100);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = md;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        done();
      } catch (e) {}
      ta.remove();
    }
  }
  var preview = document.getElementById("preview");
  function showPreview() {
    document.getElementById("previewText").textContent = buildMarkdown();
    preview.classList.add("open");
    preview.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  document.getElementById("downloadBtn").onclick = download;
  document.getElementById("copyBtn").onclick = copy;
  document.getElementById("previewBtn").onclick = showPreview;
  document.getElementById("closePreview").onclick = function () {
    preview.classList.remove("open");
  };
  document.getElementById("resetBtn").onclick = function () {
    if (!confirm("Clear all entries on this device?")) return;
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
    location.reload();
  };

  wireAll(document);
})();
