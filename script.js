(() => {
  const STORAGE_KEY = "contact_manager_contacts_v1";

  const $ = (sel) => document.querySelector(sel);

  const contactForm = $("#contactForm");
  const contactsBody = $("#contactsBody");
  const emptyState = $("#emptyState");

  const contactIdEl = $("#contactId");
  const nameEl = $("#name");
  const phoneEl = $("#phone");
  const emailEl = $("#email");
  const companyEl = $("#company");

  const cancelBtn = $("#cancelBtn");
  const clearAllBtn = $("#clearAllBtn");
  const saveBtn = $("#saveBtn");

  const searchEl = $("#search");
  const sortByEl = $("#sortBy");
  const formHint = $("#formHint");

  function uid() {
    return "c_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function loadContacts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveContacts(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function sanitize(str) {
    return (str ?? "").toString().trim();
  }

  function matchesQuery(contact, q) {
    if (!q) return true;
    const hay = [contact.name, contact.phone, contact.email, contact.company]
      .map((x) => (x ?? "").toString().toLowerCase())
      .join(" ");
    return hay.includes(q.toLowerCase());
  }

  function sortContacts(list, sortBy) {
    const copy = [...list];
    switch (sortBy) {
      case "createdAsc":
        copy.sort((a, b) => a.createdAt - b.createdAt);
        return copy;
      case "nameAsc":
        copy.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        return copy;
      case "nameDesc":
        copy.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        return copy;
      case "createdDesc":
      default:
        copy.sort((a, b) => b.createdAt - a.createdAt);
        return copy;
    }
  }

  let state = { contacts: loadContacts() };

  function setHint(msg, kind = "") {
    formHint.textContent = msg;
    formHint.style.color =
      kind === "ok" ? "var(--ok)" : kind === "danger" ? "var(--danger)" : "var(--muted)";
  }

  function resetForm() {
    contactIdEl.value = "";
    nameEl.value = "";
    phoneEl.value = "";
    emailEl.value = "";
    companyEl.value = "";
    cancelBtn.hidden = true;
    saveBtn.textContent = "Save Contact";
    setHint("");
    nameEl.focus();
  }

  function startEdit(contact) {
    contactIdEl.value = contact.id;
    nameEl.value = contact.name ?? "";
    phoneEl.value = contact.phone ?? "";
    emailEl.value = contact.email ?? "";
    companyEl.value = contact.company ?? "";

    cancelBtn.hidden = false;
    saveBtn.textContent = "Update Contact";
    setHint("Editing contact...");
    nameEl.focus();
  }

  function deleteContact(id) {
    const idx = state.contacts.findIndex((c) => c.id === id);
    if (idx === -1) return;

    const contact = state.contacts[idx];
    const ok = confirm(`Delete ${contact.name || "this contact"}?`);
    if (!ok) return;

    state.contacts.splice(idx, 1);
    saveContacts(state.contacts);
    render();
    resetForm();
    setHint("Contact deleted.", "ok");
    setTimeout(() => setHint(""), 1500);
  }

  function escapeHtml(str) {
    return (str ?? "")
      .toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "<")
      .replaceAll(">", ">")
      .replaceAll('"', """)
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replaceAll("`", "&#096;");
  }

  function render() {
    const q = sanitize(searchEl.value);
    const sortBy = sortByEl.value;

    const filtered = state.contacts.filter((c) => matchesQuery(c, q));
    const sorted = sortContacts(filtered, sortBy);

    contactsBody.innerHTML = "";
    emptyState.style.display = sorted.length ? "none" : "flex";

    for (const c of sorted) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="rowTitle">
            <div style="font-weight:800;">${escapeHtml(c.name || "—")}</div>
            <div class="badge" style="width:max-content;">🆔 ${escapeHtml(c.id.slice(0, 8))}…</div>
          </div>
        </td>
        <td>${escapeHtml(c.phone || "—")}</td>
        <td>${escapeHtml(c.email || "—")}</td>
        <td>${escapeHtml(c.company || "—")}</td>
        <td>
          <div class="actionsCell">
            <button class="smallBtn edit" type="button" data-action="edit" data-id="${escapeAttr(c.id)}">Edit</button>
            <button class="smallBtn delete" type="button" data-action="delete" data-id="${escapeAttr(c.id)}">Delete</button>
          </div>
        </td>
      `;
      contactsBody.appendChild(tr);
    }
  }

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = sanitize(contactIdEl.value);
    const name = sanitize(nameEl.value);
    const phone = sanitize(phoneEl.value);
    const email = sanitize(emailEl.value);
    const company = sanitize(companyEl.value);

    if (!name || name.length < 2) {
      setHint("Name must be at least 2 characters.", "danger");
      nameEl.focus();
      return;
    }

    if (email) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!ok) {
        setHint("Email looks invalid.", "danger");
        emailEl.focus();
        return;
      }
    }

    if (id) {
      const idx = state.contacts.findIndex((c) => c.id === id);
      if (idx === -1) {
        setHint("Could not find contact to update.", "danger");
        return;
      }

      state.contacts[idx] = {
        ...state.contacts[idx],
        name,
        phone,
        email,
        company,
        updatedAt: Date.now(),
      };

      saveContacts(state.contacts);
      render();
      resetForm();
      setHint("Contact updated.", "ok");
      setTimeout(() => setHint(""), 1500);
    } else {
      const newContact = {
        id: uid(),
        name,
        phone,
        email,
        company,
        createdAt: Date.now(),
        updatedAt: null,
      };

      state.contacts.push(newContact);
      saveContacts(state.contacts);
      render();
      resetForm();
      setHint("Contact saved.", "ok");
      setTimeout(() => setHint(""), 1500);
    }
  });

  cancelBtn.addEventListener("click", () => resetForm());

  clearAllBtn.addEventListener("click", () => {
    const ok = confirm("Clear all contacts? This cannot be undone.");
    if (!ok) return;

    state.contacts = [];
    saveContacts(state.contacts);
    render();
    resetForm();
    setHint("All contacts cleared.", "ok");
    setTimeout(() => setHint(""), 1500);
  });

  contactsBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (!id) return;

    if (action === "edit") {
      const c = state.contacts.find((x) => x.id === id);
      if (c) startEdit(c);
    } else if (action === "delete") {
      deleteContact(id);
    }
  });

  searchEl.addEventListener("input", () => render());
  sortByEl.addEventListener("change", () => render());

  render();
  resetForm();
})();

