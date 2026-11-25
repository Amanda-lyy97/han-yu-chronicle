/* =========================================================
   韩昌黎 · 行迹与文心
   ========================================================= */
(function () {
  "use strict";

  const DATA = window.DATA;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (str) =>
    String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const worksById = new Map(DATA.works.map((w) => [w.id, w]));
  const timelineByWork = new Map();
  DATA.timeline.forEach((t) => {
    (t.works || []).forEach((id) => timelineByWork.set(id, t));
  });

  const state = {
    stage: "全部",
    era: "全部",
    recite: "全部",
    q: "",
    activeRoutes: new Set(DATA.map.routes.map((r) => r.id)),
    currentWork: null,
    lastFocus: null
  };

  /* ---------- static renders ---------- */

  function renderHeroStats() {
    const host = $("#hero-stats");
    if (!host) return;
    host.innerHTML = DATA.stats
      .map(
        (s) => `
        <div class="hero-stat" title="${esc(s.note)}">
          <strong>${esc(s.value)}<small>${esc(s.unit)}</small></strong>
          <span>${esc(s.label)}</span>
        </div>`
      )
      .join("");
  }

  function renderLenses() {
    const host = $("#lens-grid");
    if (!host) return;
    host.innerHTML = DATA.lenses
      .map(
        (l) => `
        <article class="lens-card">
          <div class="lens-no">${esc(l.no)}</div>
          <h4>${esc(l.title)}</h4>
          <p>${esc(l.text)}</p>
        </article>`
      )
      .join("");
  }

  function renderStudy() {
    const host = $("#study-path");
    if (!host) return;
    host.innerHTML = DATA.studySteps
      .map(
        (s) => `
        <article class="study-step">
          <div class="study-year">${esc(s.year)}</div>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.text)}</p>
          <span class="study-tag">${esc(s.tag)}</span>
        </article>`
      )
      .join("");
  }

  function renderLadder() {
    const host = $("#ladder");
    if (!host) return;
    host.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>年份</th>
            <th>岁数</th>
            <th>官职</th>
            <th>品级</th>
            <th>相当于今天</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          ${DATA.ladder
            .map(
              (l) => `
            <tr${l.year === "803" ? ' class="key-row"' : ""}>
              <td class="career-year" data-label="年份">${esc(l.year)}</td>
              <td class="career-age" data-label="岁数">${esc(l.age)}</td>
              <td class="career-office" data-label="官职"><strong>${esc(l.office)}</strong><small>${esc(l.detail)}</small></td>
              <td class="career-rank" data-label="品级">${esc(l.rank)}</td>
              <td class="career-modern" data-label="相当于今天">${esc(l.modern)}</td>
              <td class="career-note" data-label="备注">${esc(l.note)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  }

  /* ---------- timeline ---------- */

  function renderTimeline() {
    const host = $("#timeline-list");
    if (!host) return;

    host.innerHTML = DATA.timeline
      .map((t, i) => {
        const works = (t.works || [])
          .map((id) => {
            const w = worksById.get(id);
            if (!w) return "";
            const mark =
              w.recite === "required"
                ? '<i class="chip-mark required"></i>'
                : w.recite === "optional"
                ? '<i class="chip-mark optional"></i>'
                : "";
            return `<button class="work-chip" type="button" data-work="${esc(w.id)}">${mark}${esc(w.title)}</button>`;
          })
          .join("");
        return `
          <article class="tl-item" id="tl-${esc(t.id)}" data-stage="${esc(t.stage)}" style="transition-delay:${Math.min(
          i * 18,
          180
        )}ms">
            <div class="tl-card">
              <div class="tl-top">
                <div class="tl-year">${esc(t.year)}<small>${esc(t.yearLabel)}</small></div>
                <span class="tl-stage">${esc(t.stage)}</span>
              </div>
              <h3>${esc(t.title)}</h3>
              <p class="tl-place">${esc(t.place)} · ${esc(t.age)} · ${esc(t.position)}</p>
              <p class="tl-history">${esc(t.history)}</p>
              <p class="tl-study">${esc(t.study)}</p>
              ${works ? `<div class="tl-works">${works}</div>` : ""}
            </div>
          </article>`;
      })
      .join("");

    renderStageFilter();
    observeTimelineItems();
    const note = $("#timeline-note");
    if (note) note.textContent = DATA.meta.note;
  }

  function renderStageFilter() {
    const host = $("#stage-filter");
    if (!host) return;
    const stages = ["全部", ...Array.from(new Set(DATA.timeline.map((t) => t.stage)))];
    host.innerHTML = stages
      .map(
        (s) =>
          `<button type="button" class="filter-pill${s === state.stage ? " active" : ""}" data-stage="${esc(
            s
          )}">${esc(s)}</button>`
      )
      .join("");
  }

  function applyStageFilter() {
    $$(".timeline .tl-item").forEach((el) => {
      const show = state.stage === "全部" || el.dataset.stage === state.stage;
      el.classList.toggle("is-hidden", !show);
    });
  }

  function observeTimelineItems() {
    if (!("IntersectionObserver" in window)) {
      $$(".tl-item").forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    $$(".tl-item").forEach((el) => observer.observe(el));
  }

  /* ---------- map ---------- */

  function renderMap() {
    const routeLayer = $("#map-route-layer");
    const pointLayer = $("#map-point-layer");
    const routeHost = $("#map-routes");
    if (!routeLayer || !pointLayer) return;

    routeLayer.innerHTML = DATA.map.routes
      .map(
        (r) =>
          `<path class="map-route-path" data-route="${esc(r.id)}" d="${esc(r.d)}" stroke="${esc(
            r.color
          )}" />`
      )
      .join("");

    pointLayer.innerHTML = DATA.map.points
      .map((p) => {
        const minor = ["languan", "shaozhou", "xuancheng"].includes(p.id) ? " minor" : "";
        return `
          <g class="map-point${minor}" data-point="${esc(p.id)}" transform="translate(${p.x} ${p.y})" role="button" tabindex="0" aria-label="${esc(
          p.name
        )}">
            <circle r="4.5" />
            <text x="9" y="4">${esc(p.name)}</text>
          </g>`;
      })
      .join("");

    if (routeHost) {
      routeHost.innerHTML = DATA.map.routes
        .map(
          (r) =>
            `<button type="button" class="route-pill active" data-route-toggle="${esc(
              r.id
            )}" aria-pressed="true"><i style="background:${esc(r.color)}"></i>${esc(r.name)}</button>`
        )
        .join("");
    }

    renderMapPanel(null);
    updateRouteVisuals();
  }

  function renderMapPanel(pointId) {
    const host = $("#map-panel");
    if (!host) return;

    if (pointId) {
      const p = DATA.map.points.find((item) => item.id === pointId);
      if (!p) return;
      const works = (p.works || [])
        .map((id) => {
          const w = worksById.get(id);
          return w ? `<button class="work-chip" type="button" data-work="${esc(w.id)}">${esc(w.title)}</button>` : "";
        })
        .join("");
      host.innerHTML = `
        <p class="eyebrow">行迹节点</p>
        <div class="map-point-title">
          <h4>${esc(p.name)}</h4>
          <span>${esc(p.years)}</span>
          <p>${esc(p.note)}</p>
          ${works ? `<div class="tl-works">${works}</div>` : '<p style="margin:14px 0 0;color:var(--ink-faint);font-size:11px;">此节点以行迹为主，暂无系年文章。</p>'}
        </div>
        <div class="map-route-list">
          <button class="map-route-item" type="button" data-map-reset><i style="background:var(--cinnabar)"></i><span><strong>回到总览</strong>查看四条行迹路线</span></button>
        </div>`;
      return;
    }

    host.innerHTML = `
      <p class="eyebrow">行迹总览</p>
      <h3>一条被时代拉长的路</h3>
      <p>韩愈的迁徙，几乎都与政治有关：兄贬而南下，言事而贬阳山，谏佛骨而贬潮州，宣慰而北上镇州。路越走越远，文章却越写越深。</p>
      <div class="map-route-list">
        ${DATA.map.routes
          .map(
            (r) => `
            <button class="map-route-item" type="button" data-route-toggle="${esc(r.id)}">
              <i style="background:${esc(r.color)}"></i>
              <span><strong>${esc(r.name)}</strong>${esc(r.text)}</span>
            </button>`
          )
          .join("")}
      </div>`;
  }

  function updateRouteVisuals() {
    $$(".map-route-path").forEach((path) => {
      path.classList.toggle("dim", !state.activeRoutes.has(path.dataset.route));
    });
    $$("[data-route-toggle]").forEach((btn) => {
      const on = state.activeRoutes.has(btn.dataset.routeToggle);
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
  }

  function toggleRoute(id) {
    if (state.activeRoutes.has(id)) {
      state.activeRoutes.delete(id);
    } else {
      state.activeRoutes.add(id);
    }
    updateRouteVisuals();
  }

  /* ---------- works ---------- */

  function workHaystack(w) {
    return [
      w.title,
      w.alias || "",
      w.eye || "",
      w.eyeNote || "",
      w.yearLabel,
      w.year,
      w.place,
      w.position,
      w.genre,
      w.era,
      w.context,
      w.why,
      w.what,
      w.how,
      w.quote && w.quote.text,
      (w.people || []).map((p) => p.name + p.note).join(" "),
      (w.events || []).map((e) => e.name + e.note).join(" "),
      (w.tags || []).join(" ")
    ]
      .join(" ")
      .toLowerCase();
  }

  DATA.works.forEach((w) => {
    w._haystack = workHaystack(w);
  });

  function renderWorkFilters() {
    const eraHost = $("#era-filter");
    const reciteHost = $("#recite-filter");
    if (eraHost) {
      const eras = ["全部", ...Array.from(new Set(DATA.works.map((w) => w.era)))];
      eraHost.innerHTML = eras
        .map(
          (e) =>
            `<button type="button" class="filter-pill${e === state.era ? " active" : ""}" data-era="${esc(
              e
            )}">${esc(e === "全部" ? "全部时期" : e)}</button>`
        )
        .join("");
    }
    if (reciteHost) {
      const recites = [
        { key: "全部", label: "全部" },
        { key: "required", label: "讲稿必背" },
        { key: "optional", label: "建议背诵" }
      ];
      reciteHost.innerHTML = recites
        .map(
          (r) =>
            `<button type="button" class="filter-pill${r.key === state.recite ? " active" : ""}" data-recite="${esc(
              r.key
            )}">${esc(r.key === "全部" ? "全部标记" : r.label)}</button>`
        )
        .join("");
    }
  }

  function cardSeal(w) {
    if (w.recite === "required") return '<span class="card-seal">必背</span>';
    if (w.recite === "optional") return '<span class="card-seal optional">可背</span>';
    return "";
  }

  function renderWorks() {
    const host = $("#works-grid");
    const empty = $("#works-empty");
    const count = $("#works-count");
    if (!host) return;

    const q = state.q.trim().toLowerCase();
    const filtered = DATA.works.filter((w) => {
      if (state.era !== "全部" && w.era !== state.era) return false;
      if (state.recite !== "全部" && w.recite !== state.recite) return false;
      if (q && !w._haystack.includes(q)) return false;
      return true;
    });

    host.innerHTML = filtered
      .map(
        (w) => `
        <article class="work-card ${w.recite === "none" ? "" : w.recite}" role="button" tabindex="0" data-work="${esc(w.id)}">
          ${cardSeal(w)}
          <div class="work-card-top">
            <span class="work-genre">${esc(w.genre)}</span>
            <span>${esc(w.year)} · ${esc(w.age)}岁</span>
          </div>
          <h3>${esc(w.title)}</h3>
          <p class="work-card-meta">${esc(w.yearLabel)} · ${esc(w.place)}</p>
          <p class="work-card-quote">“${esc((w.quote && w.quote.text) || w.context)}”</p>
          <p class="work-card-eye"><span>文眼</span>${esc(w.eye || "")}</p>
          <div class="work-card-foot">
            <span class="work-card-people">${esc((w.people || []).slice(0, 2).map((p) => p.name).join(" · ") || w.genre)}</span>
            <span class="work-card-arrow" aria-hidden="true"><svg><use href="#i-arrow"/></svg></span>
          </div>
        </article>`
      )
      .join("");

    if (empty) empty.hidden = filtered.length !== 0;
    if (count) count.textContent = `共 ${filtered.length} 篇 / ${DATA.works.length} 篇`;
  }

  function renderReciteSection() {
    const requiredHost = $("#recite-grid");
    const optionalHost = $("#recite-optional");
    const notHost = $("#recite-not");

    const card = (w, index, optional) => `
      <article class="recite-card ${optional ? "optional" : "required"}">
        <div class="recite-badge">${optional ? "可背" : "讲稿必背"}</div>
        <p class="recite-no">${optional ? "附" : String(index + 1).padStart(2, "0")}</p>
        <h3>${esc(w.title)}</h3>
        <p class="recite-meta">${esc(w.yearLabel)}（${esc(w.year)}）· ${esc(w.age)}岁 · ${esc(w.place)}</p>
        <blockquote>${esc((w.quote && w.quote.text) || "")}</blockquote>
        <p class="recite-note">${esc(w.reciteNote || "")}</p>
        <button class="text-link" data-work="${esc(w.id)}">查看三段论 <svg><use href="#i-arrow"/></svg></button>
      </article>`;

    const required = DATA.works.filter((w) => w.recite === "required");
    if (requiredHost) {
      requiredHost.innerHTML = required.map((w, i) => card(w, i, false)).join("");
    }

    const optional = DATA.works.filter((w) => w.recite === "optional");
    if (optionalHost) {
      optionalHost.innerHTML = optional.map((w, i) => card(w, i, true)).join("");
    }

    if (notHost) {
      notHost.innerHTML = `
        <div class="recite-not">
          <p class="eyebrow">讲稿明确说不必背</p>
          <h3>这三篇，讲稿反而说“不必背”</h3>
          <div class="recite-not-list">
            <div class="recite-not-item">
              <strong>争臣论</strong>
              <span>第十四讲：“此文不必背。”</span>
            </div>
            <div class="recite-not-item">
              <strong>柳子厚墓志铭</strong>
              <span>第十一讲：“我也不要求你们去背诵，这篇文章熟读即可。”</span>
            </div>
            <div class="recite-not-item">
              <strong>五箴</strong>
              <span>第十六讲：“也不一定要背诵这个《五箴》。”</span>
            </div>
          </div>
        </div>`;
    }
  }

  /* ---------- history ---------- */

  function renderHistory() {
    const tabs = $("#era-tabs");
    const panel = $("#era-panel");
    const emperorHost = $("#emperor-strip");
    if (!tabs || !panel) return;

    tabs.innerHTML = DATA.eras
      .map(
        (e, i) => `
        <button type="button" class="era-tab${i === 0 ? " active" : ""}" role="tab" aria-selected="${i === 0}" data-era-tab="${esc(
          e.id
        )}">
          <span>${esc(e.years)}</span>
          <strong>${esc(e.name)}</strong>
        </button>`
      )
      .join("");

    renderEraPanel(DATA.eras[0].id);

    if (emperorHost) {
      emperorHost.innerHTML = DATA.emperors
        .map(
          (e) => `
          <article class="emperor-card">
            <div class="emperor-name">${esc(e.name)}</div>
            <div class="emperor-years">${esc(e.years)}</div>
            <span class="emperor-tone">${esc(e.tone)}</span>
            <p>${esc(e.relation)}</p>
          </article>`
        )
        .join("");
    }
  }

  function renderEraPanel(id) {
    const panel = $("#era-panel");
    if (!panel) return;
    const era = DATA.eras.find((e) => e.id === id);
    if (!era) return;
    panel.innerHTML = `
      <div class="era-panel-left">
        <div class="era-years">${esc(era.years)}</div>
        <div class="era-emperor">${esc(era.emperor)}</div>
        <h3>${esc(era.name)}</h3>
        <p>${esc(era.summary)}</p>
      </div>
      <div class="era-events">
        ${era.events
          .map(
            (ev) => `
            <div class="era-event">
              <div class="era-event-year">${esc(ev.year)}</div>
              <div>
                <h4>${esc(ev.title)}</h4>
                <p>${esc(ev.text)}</p>
              </div>
            </div>`
          )
          .join("")}
      </div>`;
    $$("[data-era-tab]").forEach((tab) => {
      const active = tab.dataset.eraTab === id;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }

  /* ---------- sources ---------- */

  function renderSources() {
    const host = $("#sources");
    if (!host) return;
    host.innerHTML = `
      <h3>主要参考</h3>
      <div class="sources-grid">
        ${DATA.sources
          .map(
            (s, i) => `
            <div class="source-item">
              <div class="source-no">${String(i + 1).padStart(2, "0")}</div>
              <div>
                ${
                  s.url
                    ? `<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.label)}</a>`
                    : `<strong>${esc(s.label)}</strong>`
                }
                <p>${esc(s.note)}</p>
              </div>
            </div>`
          )
          .join("")}
      </div>`;
  }

  /* ---------- modal ---------- */

  const modal = $("#modal");
  const modalBody = $("#modal-body");
  const modalClose = $("#modal-close");
  const modalPrev = $("#modal-prev");
  const modalNext = $("#modal-next");

  function workIndex(id) {
    return DATA.works.findIndex((w) => w.id === id);
  }

  function openWork(id, trigger) {
    const idx = workIndex(id);
    if (idx < 0) return;
    state.currentWork = id;
    state.lastFocus = trigger || document.activeElement;
    renderModal();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    setTimeout(() => modalClose && modalClose.focus(), 30);
  }

  function closeModal() {
    if (!modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    if (state.lastFocus && typeof state.lastFocus.focus === "function") {
      state.lastFocus.focus();
    }
  }

  function renderModal() {
    const w = worksById.get(state.currentWork);
    if (!w) return;
    const idx = workIndex(w.id);
    const prev = DATA.works[idx - 1];
    const next = DATA.works[idx + 1];
    const timelineNode = timelineByWork.get(w.id);

    if (modalPrev) {
      modalPrev.disabled = !prev;
      modalPrev.innerHTML = `<svg><use href="#i-arrow-left"/></svg><span>${prev ? esc(prev.title) : "已到首篇"}</span>`;
    }
    if (modalNext) {
      modalNext.disabled = !next;
      modalNext.innerHTML = `<span>${next ? esc(next.title) : "已到末篇"}</span><svg><use href="#i-arrow"/></svg>`;
    }

    const sealText = w.recite === "required" ? "讲稿<br />必背" : w.recite === "optional" ? "可背" : "";
    const seal = sealText
      ? `<div class="modal-seal ${w.recite}">${sealText}</div>`
      : "";

    const reciteBanner =
      w.recite !== "none"
        ? `<div class="modal-recite ${w.recite}">
             <strong>${w.recite === "required" ? "讲稿必背" : "可背"}</strong>
             <span>${esc(w.reciteNote || "")}</span>
           </div>`
        : "";

    modalBody.innerHTML = `
      <div class="modal-kicker">
        <span>${esc(w.yearLabel)} · ${esc(w.year)}</span>
        <span>${esc(w.age)}岁</span>
        <span>${esc(w.place)}</span>
        <span>${esc(w.era)}</span>
      </div>
      <div class="modal-title-row">
        <div class="modal-title-text">
          <h2 id="modal-title">${esc(w.title)}</h2>
          ${w.alias ? `<p class="modal-alias">${esc(w.alias)}</p>` : ""}
        </div>
        <span class="modal-genre">${esc(w.genre)}</span>
        ${seal}
      </div>
      ${reciteBanner}
      <dl class="modal-meta">
        <div><dt>系年</dt><dd>${esc(w.yearLabel)}（${esc(w.year)}）</dd></div>
        <div><dt>时年</dt><dd>${esc(w.age)}岁</dd></div>
        <div><dt>地点</dt><dd>${esc(w.place)}</dd></div>
        <div><dt>官职 / 身份</dt><dd>${esc(w.position)}</dd></div>
      </dl>

      <div class="modal-context">
        <strong>历史现场</strong>
        ${esc(w.context)}
      </div>

      <div class="modal-eye">
        <span class="modal-eye-label">文眼</span>
        <div>
          <strong>${esc(w.eye || "")}</strong>
          <p>${esc(w.eyeNote || "")}</p>
        </div>
      </div>

      <section class="modal-section">
        <div class="modal-section-head">
          <span class="num">三段论</span>
          <h3>为什么写 · 写了什么 · 怎样写</h3>
        </div>
        <div class="triad">
          <article class="triad-card">
            <h4>为什么写</h4>
            <p>${esc(w.why)}</p>
          </article>
          <article class="triad-card">
            <h4>写了什么</h4>
            <p>${esc(w.what)}</p>
          </article>
          <article class="triad-card">
            <h4>怎样写</h4>
            <p>${esc(w.how)}</p>
          </article>
        </div>
      </section>

      ${
        w.quote && w.quote.text
          ? `<div class="modal-quote">
               <blockquote>${esc(w.quote.text)}</blockquote>
               <cite>${esc(w.quote.note || "")}</cite>
             </div>`
          : ""
      }

      ${
        (w.people || []).length
          ? `<section class="modal-section">
               <div class="modal-section-head">
                 <span class="num">人物</span>
                 <h3>相关人物</h3>
               </div>
               <div class="people-grid">
                 ${w.people
                   .map(
                     (p, i) => `
                     <div class="person-item">
                       <span class="person-mark">${String(i + 1).padStart(2, "0")}</span>
                       <div><strong>${esc(p.name)}</strong><p>${esc(p.note)}</p></div>
                     </div>`
                   )
                   .join("")}
               </div>
             </section>`
          : ""
      }

      ${
        (w.events || []).length
          ? `<section class="modal-section">
               <div class="modal-section-head">
                 <span class="num">事件</span>
                 <h3>相关大事件</h3>
               </div>
               <div class="event-list">
                 ${w.events
                   .map(
                     (e) => `
                     <div class="event-item">
                       <div><strong>${esc(e.name)}</strong><p>${esc(e.note)}</p></div>
                     </div>`
                   )
                   .join("")}
               </div>
             </section>`
          : ""
      }

      ${
        timelineNode
          ? `<div class="modal-timeline-link">
               <button type="button" data-timeline-jump="${esc(timelineNode.id)}">在时间轴中定位：${esc(
              timelineNode.year
            )} · ${esc(timelineNode.title)} <svg><use href="#i-arrow"/></svg></button>
             </div>`
          : ""
      }

      ${
        (w.tags || []).length
          ? `<div class="modal-tags">${w.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`
          : ""
      }

      <div class="modal-source-link">
        <a href="https://zh.wikisource.org/wiki/昌黎先生集" target="_blank" rel="noreferrer">在维基文库读《昌黎先生集》原文 <svg><use href="#i-arrow"/></svg></a>
      </div>
    `;

    if (modalBody) modalBody.scrollTop = 0;
  }

  function navigateWork(dir) {
    const idx = workIndex(state.currentWork);
    const target = DATA.works[idx + dir];
    if (!target) return;
    state.currentWork = target.id;
    renderModal();
  }

  function jumpToTimeline(nodeId) {
    closeModal();
    if (state.stage !== "全部") {
      state.stage = "全部";
      renderStageFilter();
      applyStageFilter();
    }
    const el = document.getElementById("tl-" + nodeId);
    if (el) {
      setTimeout(() => scrollToEl(el), 80);
    }
  }

  /* ---------- interactions ---------- */

  function scrollToEl(el) {
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 82;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const workTrigger = event.target.closest("[data-work]");
      if (workTrigger) {
        event.preventDefault();
        openWork(workTrigger.dataset.work, workTrigger);
        return;
      }

      const stageBtn = event.target.closest("[data-stage]");
      if (stageBtn) {
        state.stage = stageBtn.dataset.stage;
        renderStageFilter();
        applyStageFilter();
        return;
      }

      const eraBtn = event.target.closest("[data-era]");
      if (eraBtn) {
        state.era = eraBtn.dataset.era;
        renderWorkFilters();
        renderWorks();
        return;
      }

      const reciteBtn = event.target.closest("[data-recite]");
      if (reciteBtn) {
        state.recite = reciteBtn.dataset.recite;
        renderWorkFilters();
        renderWorks();
        return;
      }

      const routeBtn = event.target.closest("[data-route-toggle]");
      if (routeBtn) {
        toggleRoute(routeBtn.dataset.routeToggle);
        return;
      }

      const point = event.target.closest("[data-point]");
      if (point) {
        $$(".map-point").forEach((p) => p.classList.remove("active"));
        point.classList.add("active");
        renderMapPanel(point.dataset.point);
        return;
      }

      if (event.target.closest("[data-map-reset]")) {
        $$(".map-point").forEach((p) => p.classList.remove("active"));
        renderMapPanel(null);
        return;
      }

      const eraTab = event.target.closest("[data-era-tab]");
      if (eraTab) {
        renderEraPanel(eraTab.dataset.eraTab);
        return;
      }

      const jump = event.target.closest("[data-timeline-jump]");
      if (jump) {
        jumpToTimeline(jump.dataset.timelineJump);
        return;
      }

      if (event.target.closest("[data-close]")) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target.closest(".map-point")) {
        event.preventDefault();
        event.target.closest(".map-point").dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return;
      }
      if ((event.key === "Enter" || event.key === " ") && event.target.closest(".work-card")) {
        event.preventDefault();
        openWork(event.target.closest(".work-card").dataset.work, event.target.closest(".work-card"));
        return;
      }
      if (!modal.classList.contains("open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      } else if (event.key === "ArrowLeft") {
        navigateWork(-1);
      } else if (event.key === "ArrowRight") {
        navigateWork(1);
      } else if (event.key === "Tab") {
        const focusable = $$(
          'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          modal
        ).filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    if (modalClose) modalClose.addEventListener("click", closeModal);
    if (modalPrev) modalPrev.addEventListener("click", () => navigateWork(-1));
    if (modalNext) modalNext.addEventListener("click", () => navigateWork(1));

    const search = $("#work-search");
    const clear = $("#search-clear");
    if (search) {
      let timer = 0;
      search.addEventListener("input", () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          state.q = search.value;
          renderWorks();
          if (clear) clear.hidden = !search.value;
        }, 120);
      });
    }
    if (clear && search) {
      clear.addEventListener("click", () => {
        search.value = "";
        state.q = "";
        clear.hidden = true;
        renderWorks();
        search.focus();
      });
    }

    const navToggle = $("#nav-toggle");
    const nav = $("#nav");
    if (navToggle && nav) {
      navToggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        navToggle.setAttribute("aria-expanded", String(open));
      });
      $$(".nav a").forEach((a) =>
        a.addEventListener("click", () => {
          nav.classList.remove("open");
          navToggle.setAttribute("aria-expanded", "false");
        })
      );
    }

    const topbar = $("#topbar");
    const onScroll = () => {
      if (topbar) topbar.classList.toggle("scrolled", window.scrollY > 42);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- nav active + reveal ---------- */

  function initNavObserver() {
    if (!("IntersectionObserver" in window)) return;
    const links = $$(".nav a");
    const map = {
      timeline: "时间轴",
      map: "行迹图",
      works: "文章库",
      recite: "背诵",
      history: "唐史"
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const label = map[entry.target.id];
          if (!label) return;
          links.forEach((link) => {
            link.classList.toggle("active", link.textContent.trim() === label);
          });
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );
    Object.keys(map).forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  function initReveal() {
    const targets = $$(
      ".section-head, .intro-copy, .quote-card, .lens-head, .study-step, .ladder-block, .map-shell, .works-toolbar, .works-meta, .recite-card, .recite-bottom, .era-tabs, .era-panel, .emperor-strip, .method-card, .method-note, .sources"
    );
    targets.forEach((el) => el.classList.add("reveal"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );
    targets.forEach((el) => observer.observe(el));
  }

  /* ---------- init ---------- */

  function init() {
    renderHeroStats();
    renderLenses();
    renderStudy();
    renderLadder();
    renderTimeline();
    renderMap();
    renderWorkFilters();
    renderWorks();
    renderReciteSection();
    renderHistory();
    renderSources();
    bindEvents();
    initNavObserver();
    initReveal();
    applyStageFilter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
