import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Link } from "react-router-dom";
import { FiDownload, FiLayers, FiPlay, FiShare2, FiUsers } from "react-icons/fi";
import { useAdmin } from "../admin/AdminContext";
import { adminPath } from "../admin/adminNav";
import { adminFetchOptions, readAdminSession } from "../admin/adminTransport";
import { AdminShell, AdminHeader, AdminPage, AdminCard } from "../admin/components";
import PlayPreviewCard from "../components/PlayPreviewCard";
import ericPhoto from "../assets/pictures/faces/IMG_7356 (5).jpg";
import coachableLogo from "../assets/logos/full_Coachable_logo.png";

const SESSION_KEY = "coachable_admin_session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const CAPABILITIES = [
  {
    icon: FiLayers,
    title: "Design plays",
    body: "Build clear digital diagrams instead of starting on a whiteboard.",
  },
  {
    icon: FiShare2,
    title: "Share instantly",
    body: "Send one link to coaches and players so everyone sees the same plan.",
  },
];

const EXPORT_ROOT_ID = "one-pager-export";

function CapabilityCard({ icon: Icon, title, body }) {
  return (
    <div
      className="relative overflow-hidden rounded-[24px] p-5"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(246,242,238,0.95))",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "rgba(255,122,24,0.12)", color: "#ff7a18" }}
        >
          <Icon className="text-lg" />
        </div>
        <div>
          <h3 className="font-Manrope text-lg font-bold text-[#101521]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#4f596d]">{body}</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundGraphics() {
  return (
    <>
      <div
        className="absolute -left-20 top-20 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(255,122,24,0.10)" }}
      />
      <div
        className="absolute right-[-120px] top-[-60px] h-80 w-80 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(34, 97, 255, 0.10)" }}
      />
      <div
        className="absolute bottom-[-80px] left-[16%] h-64 w-64 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.06)" }}
      />
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 816 1056"
        fill="none"
        preserveAspectRatio="none"
      >
        <path d="M116 772C210 744 312 748 394 792" stroke="#111827" strokeOpacity="0.12" strokeWidth="2.5" strokeDasharray="12 12" />
        <path d="M460 866C514 820 598 800 706 820" stroke="#FF7A18" strokeWidth="2.5" strokeDasharray="9 9" />
      </svg>
    </>
  );
}

export default function AdminOnePage() {
  const { basePath } = useAdmin();
  const [session] = useState(() => readAdminSession() || "");
  const [downloading, setDownloading] = useState(false);
  const [footballDemoPlay, setFootballDemoPlay] = useState(null);
  const pageRef = useRef(null);
  const authed = basePath === "/staff" || Boolean(session);

  useEffect(() => {
    if (!authed) return;

    let cancelled = false;

    Promise.all([
      fetch(`${API_URL}/admin/page-sections`, adminFetchOptions())
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => (data.sections || []).find((s) => s.sectionKey === "one-pager.play") || null)
        .catch(() => null),
      fetch(`${API_URL}/admin/plays`, adminFetchOptions())
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => data.plays || [])
        .catch(() => []),
    ])
      .then(([section, plays]) => {
        if (cancelled) return;
        const assignedPlay = section?.playId ? plays.find((p) => p.id === section.playId) || null : null;
        setFootballDemoPlay(assignedPlay);
      })
      .catch(() => {
        if (!cancelled) setFootballDemoPlay(null);
      });

    return () => {
      cancelled = true;
    };
  }, [authed]);

  const handleDownload = useCallback(async () => {
    const pageEl = pageRef.current;
    if (!pageEl) return;

    setDownloading(true);

    try {
      if (document.fonts?.ready) await document.fonts.ready;

      const pngUrl = await toPng(pageEl, {
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = "coachable-one-pager.png";
      link.click();
    } finally {
      setDownloading(false);
    }
  }, []);

  if (!authed) {
    return (
      <AdminShell className="flex items-center justify-center">
        <AdminCard>
          <p className="mb-3 text-sm" style={{ color: "var(--adm-muted)" }}>Admin session required</p>
          <Link
            to={adminPath(basePath, "")}
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--adm-accent)" }}
          >
            Go to Admin Login
          </Link>
        </AdminCard>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <AdminHeader
        title="Company One Pager"
        backLabel="Dashboard"
        backTo={adminPath(basePath, "")}
        actions={(
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition hover:opacity-90"
            style={{
              backgroundColor: "var(--adm-accent)",
              color: "#fff",
              boxShadow: "0 12px 30px rgba(255,122,24,0.22)",
            }}
          >
            <FiDownload />
            {downloading ? "Exporting PNG..." : "Download PNG"}
          </button>
        )}
      />

      <AdminPage wide className="flex justify-center py-6 sm:py-8">
        <section
          id={EXPORT_ROOT_ID}
          ref={pageRef}
          className="relative w-full max-w-[8.5in] overflow-hidden rounded-[30px]"
          style={{
            minHeight: "11in",
            background: "linear-gradient(180deg, #fffdf9 0%, #f7f2eb 100%)",
            boxShadow: "0 30px 80px rgba(15, 23, 42, 0.16)",
          }}
        >
          <BackgroundGraphics />

          <div className="relative z-10 flex min-h-[11in] flex-col p-7 sm:p-10">
            <div className="flex items-start justify-between gap-4 pb-5">
              <div className="max-w-[42rem]">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#687385]">
                  Coachable Labs LLC
                </p>
                <img
                  src={coachableLogo}
                  alt="Coachable"
                  className="h-14 w-auto sm:h-[72px]"
                />
                <p className="mt-3 font-Manrope text-xl font-bold tracking-[0.08em] text-[#101521] sm:text-2xl">
                  Coachableplays.com
                </p>
                <h1 className="mt-4 font-Manrope text-[34px] font-bold leading-[1.02] text-[#101521] sm:text-[38px]">
                  A modern playbook platform
                  <br />
                  for teams that want to teach faster.
                </h1>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#687385]">One Pager</p>
                <p className="mt-2 text-sm text-[#4f596d]">Design. Animate. Share.</p>
              </div>
            </div>

            <div className="grid flex-1 gap-7 pt-7 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="flex flex-col gap-6">
                <div>
                  <div
                    className="rounded-[26px] p-6"
                    style={{
                      background: "rgba(255,255,255,0.75)",
                    }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff7a18]">Problem</p>
                    <p className="mt-3 font-Manrope text-2xl font-bold text-[#101521]">
                      Coaching tools are still too static.
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#4f596d]">
                      Whiteboards show shapes, not movement. Group chats fragment information. Coachable gives
                      teams one clean system for teaching strategy with more clarity.
                    </p>
                  </div>
                </div>

                <div
                  className="overflow-hidden rounded-[28px] p-3"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,242,235,0.96))",
                  }}
                >
                  {footballDemoPlay?.playData ? (
                    <PlayPreviewCard
                      playData={footballDemoPlay.playData}
                      autoplay="off"
                      shape="wide"
                      cameraMode="fit-distribution"
                      background="field"
                      paddingPx={24}
                      minSpanPx={140}
                      className="border-0"
                    />
                  ) : (
                    <div className="flex h-[220px] items-center justify-center rounded-[22px] bg-[#eff3f8] px-6 text-center">
                      <p className="text-sm leading-7 text-[#4f596d]">
                        Assign a play to the &ldquo;One Pager — Play Preview&rdquo; section in Admin → Plays → Page Sections.
                      </p>
                    </div>
                  )}
                </div>

                <div
                  className="group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[28px] p-8"
                  style={{
                    background: "linear-gradient(135deg, #101521 0%, #1b2333 100%)",
                    color: "#fff",
                  }}
                >
                  <div
                    className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full blur-2xl"
                    style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                  />
                  <div
                    className="pointer-events-none absolute -bottom-14 right-8 h-56 w-56 rounded-full blur-3xl"
                    style={{ backgroundColor: "rgba(255,122,24,0.16)" }}
                  />

                  <div className="relative z-10 flex flex-1 items-center justify-center">
                    <div className="w-full max-w-sm space-y-3">
                      <div
                        className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{
                          border: "1px solid rgba(255,255,255,0.14)",
                          backgroundColor: "rgba(8,11,18,0.55)",
                        }}
                      >
                        <div className="flex-1 truncate font-mono text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                          coachable.app/play/linebacker-blitz
                        </div>
                        <div
                          className="shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold"
                          style={{ backgroundColor: "rgba(255,122,24,0.18)", color: "#ff7a18" }}
                        >
                          Copy
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{
                          border: "1px solid rgba(255,255,255,0.10)",
                          backgroundColor: "rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="flex -space-x-2">
                          {[
                            { label: "JR", color: "#ff7a18" },
                            { label: "KD", color: "#4fa85d" },
                            { label: "MT", color: "#9aa0a6" },
                            { label: "+3", color: "#2a2e34" },
                          ].map((avatar) => (
                            <div
                              key={avatar.label}
                              className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[9px] font-bold text-white"
                              style={{ backgroundColor: avatar.color, borderColor: "#101521" }}
                            >
                              {avatar.label}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>4 teammates have access</span>
                        <div className="ml-auto h-2 w-2 rounded-full bg-[#4fa85d]" />
                      </div>

                      <div
                        className="flex items-center justify-between rounded-xl px-4 py-3"
                        style={{
                          border: "1px solid rgba(255,255,255,0.10)",
                          backgroundColor: "rgba(255,255,255,0.06)",
                        }}
                      >
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>View only</span>
                        <div className="flex gap-1">
                          <div
                            className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: "rgba(255,122,24,0.18)", color: "#ff7a18" }}
                          >
                            View
                          </div>
                          <div
                            className="rounded-md px-2 py-0.5 text-[10px]"
                            style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                          >
                            Edit
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 pt-6">
                    <div
                      className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "rgba(255,122,24,0.18)", color: "#ff7a18" }}
                    >
                      <FiUsers className="text-lg" />
                    </div>
                    <h3 className="font-Manrope text-2xl font-bold text-white">Share</h3>
                    <p className="mt-2 max-w-md text-sm leading-7" style={{ color: "rgba(255,255,255,0.65)" }}>
                      Instant access for players and coaches anywhere, anytime. One link, the whole playbook.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {CAPABILITIES.map((item) => (
                    <CapabilityCard key={item.title} {...item} />
                  ))}
                </div>

              </div>

              <div className="flex flex-col gap-6">
                <div className="relative">
                  <div
                    className="absolute -left-4 -top-4 h-full w-full rounded-[34px]"
                    style={{ backgroundColor: "#ff7a18" }}
                  />
                  <div className="relative overflow-hidden rounded-[34px] bg-[#111827]">
                    <img
                      src={ericPhoto}
                      alt="Eric Ishekwene portrait"
                      className="h-[420px] w-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#101521] via-transparent to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                      <p className="font-Manrope text-[30px] font-bold leading-none">Eric Ishekwene</p>
                      <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>Founder, developer, and the operator behind Coachable.</p>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-[28px] p-6"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(248,242,235,0.92))",
                  }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff7a18]">Solution</p>
                  <p className="mt-3 font-Manrope text-[30px] font-bold leading-tight text-[#101521]">
                    Coachable gives coaches one place to build, organize, and share strategy clearly.
                  </p>
                </div>

                <div
                  className="relative overflow-hidden rounded-[30px] p-6"
                  style={{
                    background: "linear-gradient(135deg, #131926 0%, #1c2537 100%)",
                    color: "#fff",
                  }}
                >
                  <div
                    className="absolute right-[-18px] top-[-18px] h-32 w-32 rounded-full blur-2xl"
                    style={{ backgroundColor: "rgba(255,122,24,0.18)" }}
                  />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: "rgba(255,255,255,0.58)" }}>
                    Why it matters
                  </p>
                  <p className="mt-3 max-w-[30rem] font-Manrope text-[27px] font-bold leading-tight">
                    Better communication means faster understanding, cleaner execution, and more aligned teams.
                  </p>
                  <div className="mt-5 grid gap-3">
                    {[
                      { value: "12+", label: "sports supported" },
                      { value: "1", label: "shareable team link" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-2xl px-4 py-4"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.05)",
                        }}
                      >
                        <div className="font-Manrope text-2xl font-bold text-white">{item.value}</div>
                        <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.56)" }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </AdminPage>
    </AdminShell>
  );
}
