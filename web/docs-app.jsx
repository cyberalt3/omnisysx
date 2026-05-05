// ----- Documentation app -----
const { useState, useEffect, useRef } = React;

function getSlugFromHash() {
  const h = location.hash.replace(/^#\/?/, "").replace(/^\/?/, "");
  if (!h) return "overview";
  return h.split("?")[0].split("/")[0] || "overview";
}

function DocsHeader() {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      borderBottom: "1px solid var(--line)"
    }}>
      <div style={{
        maxWidth: 1440, margin: "0 auto", padding: "0 24px",
        height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <a href="OmnisysX.html" style={{
          display: "flex", alignItems: "center", gap: 12,
          textDecoration: "none"
        }}>
          <Logo size={32} />
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>OmnisysX</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--muted-2)" }}>/docs</span>
          </div>
        </a>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <a href="OmnisysX.html" style={{
            fontSize: 13, color: "var(--muted)",
            padding: "8px 14px", borderRadius: 999,
            transition: "color 150ms",
            textDecoration: "none"
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}>
            ← Back to app
          </a>
          <a href="#" target="_blank" rel="noreferrer" style={{
            fontSize: 13, color: "var(--muted)",
            padding: "8px 14px", borderRadius: 999,
            display: "inline-flex", alignItems: "center", gap: 8,
            transition: "color 150ms",
            textDecoration: "none"
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5 3.3 9.3 7.8 10.8.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.5-1.5 7.8-5.8 7.8-10.8C23.5 5.7 18.3.5 12 .5z" /></svg>
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ currentSlug, onNavigate }) {
  return (
    <aside style={{
      width: 240,
      borderRight: "1px solid var(--line)",
      padding: "28px 20px 60px",
      position: "sticky",
      top: 60,
      height: "calc(100vh - 60px)",
      overflowY: "auto"
    }}>
      {DOCS_NAV.map((section, si) => (
        <div key={si} style={{ marginBottom: 24 }}>
          <p style={{
            fontSize: 10, fontWeight: 600, color: "var(--muted-2)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            margin: "0 0 8px", padding: "0 12px"
          }}>
            {section.section}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {section.pages.map((page) => {
              const active = page.slug === currentSlug;
              return (
                <li key={page.slug} style={{ margin: "1px 0" }}>
                  <a href={"#/" + page.slug}
                    onClick={(e) => { e.preventDefault(); onNavigate(page.slug); }}
                    style={{
                      display: "block",
                      padding: "7px 12px",
                      fontSize: 13.5,
                      color: active ? "var(--blue-2)" : "var(--muted)",
                      background: active ? "rgba(41,98,239,0.08)" : "transparent",
                      borderLeft: active ? "2px solid var(--blue)" : "2px solid transparent",
                      borderRadius: 8,
                      fontWeight: active ? 500 : 400,
                      textDecoration: "none",
                      transition: "all 150ms"
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "#fff";
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "var(--muted)";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}>
                    {page.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}

function TableOfContents({ slug }) {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      const article = document.querySelector(".doc-prose");
      if (!article) { setHeadings([]); return; }
      const list = Array.from(article.querySelectorAll("h2, h3"))
        .filter((el) => el.id)
        .map((el) => ({
          id: el.id,
          text: el.textContent,
          level: parseInt(el.tagName[1], 10)
        }));
      setHeadings(list);
    }, 50);
    return () => clearTimeout(t);
  }, [slug]);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setActiveId(e.target.id);
          break;
        }
      }
    }, { rootMargin: "-90px 0px -70% 0px" });
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return <div />;

  return (
    <aside style={{
      padding: "40px 20px",
      borderLeft: "1px solid var(--line)",
      position: "sticky", top: 60,
      alignSelf: "start",
      maxHeight: "calc(100vh - 60px)",
      overflowY: "auto"
    }}>
      <p style={{
        fontSize: 10, fontWeight: 600, color: "var(--muted-2)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        margin: "0 0 12px"
      }}>On this page</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {headings.map((h) => {
          const active = h.id === activeId;
          return (
            <li key={"toc-" + h.id}>
              <a href={"#" + h.id} style={{
                display: "block",
                fontSize: 12.5,
                paddingLeft: h.level === 3 ? 24 : 12,
                paddingTop: 4, paddingBottom: 4,
                borderLeft: "1px solid " + (active ? "var(--blue)" : "var(--line)"),
                color: active ? "var(--blue-2)" : "var(--muted-2)",
                fontWeight: active ? 500 : 400,
                textDecoration: "none",
                transition: "all 150ms"
              }}>
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function DocPagination({ slug, onNavigate }) {
  const { prev, next } = getAdjacentDocs(slug);
  const card = (doc, dir) => {
    if (!doc) return <span />;
    return (
      <a href={"#/" + doc.slug}
        onClick={(e) => { e.preventDefault(); onNavigate(doc.slug); }}
        style={{
          display: "block",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: "18px 20px",
          textDecoration: "none",
          textAlign: dir === "next" ? "right" : "left",
          transition: "all 200ms"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--blue)";
          e.currentTarget.style.background = "rgba(41,98,239,0.04)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--line)";
          e.currentTarget.style.background = "var(--surface)";
        }}>
        <p style={{
          fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em",
          color: "var(--muted-2)", fontWeight: 500, margin: "0 0 6px"
        }}>{dir === "next" ? "Next →" : "← Previous"}</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: 0 }}>{doc.title}</p>
      </a>
    );
  };
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
      marginTop: 80,
      paddingTop: 32,
      borderTop: "1px solid var(--line)"
    }}>
      {card(prev, "prev")}
      {card(next, "next")}
    </div>
  );
}

function DocsApp() {
  const [slug, setSlug] = useState(getSlugFromHash());

  function navigate(newSlug) {
    setSlug(newSlug);
    history.pushState(null, "", "#/" + newSlug);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const onHash = () => setSlug(getSlugFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const navInfo = findDocBySlug(slug);
    document.title = navInfo ? (navInfo.title + " · OmnisysX docs") : "OmnisysX docs";
  }, [slug]);

  const navInfo = findDocBySlug(slug);
  const content = getDoc(slug);

  return (
    <>
      <InteractiveBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        <DocsHeader />
        <div style={{
          maxWidth: 1440, margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "240px minmax(0,1fr) 200px",
          gap: 0
        }}>
          <Sidebar currentSlug={slug} onNavigate={navigate} />
          <main style={{ padding: "48px 56px 120px", maxWidth: 820, width: "100%" }}>
            {!content ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <h1 style={{ fontSize: 64, margin: "0 0 16px", color: "#fff" }}>404</h1>
                <p style={{ color: "var(--muted)", marginBottom: 32 }}>That doc page doesn't exist.</p>
                <a href="#/overview"
                  onClick={(e) => { e.preventDefault(); navigate("overview"); }}
                  style={{
                    color: "var(--blue-2)",
                    borderBottom: "1px solid rgba(91,158,255,0.3)",
                    textDecoration: "none"
                  }}>
                  Back to overview
                </a>
              </div>
            ) : (
              <>
                {navInfo && (
                  <p style={{
                    textTransform: "uppercase",
                    fontSize: 11, fontWeight: 600,
                    color: "var(--blue)",
                    letterSpacing: "0.1em",
                    margin: "0 0 12px"
                  }}>{navInfo.description}</p>
                )}
                <article className="doc-prose">{content}</article>
                <DocPagination slug={slug} onNavigate={navigate} />
              </>
            )}
          </main>
          <TableOfContents slug={slug} />
        </div>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<DocsApp />);
