import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FiArrowLeft, FiEdit2, FiPlay, FiClock, FiTag } from "react-icons/fi";

const MOCK_PLAY = {
  title: "Inside Pass Loop",
  tags: ["attack", "phase"],
  type: "Attack",
  updatedAt: "2 hours ago",
  createdBy: "Coach Williams",
};

export default function PlayView() {
  const { playId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCoach = user?.role === "coach";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-12">
      <button
        onClick={() => navigate("/app/plays")}
        className="mb-8 flex items-center gap-2 text-sm text-BrandGray transition hover:text-BrandText"
      >
        <FiArrowLeft />
        Back to Playbook
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-Manrope text-xl font-bold tracking-tight">{MOCK_PLAY.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs text-BrandGray2">
            <span className="flex items-center gap-1.5">
              <FiClock className="text-[10px]" />
              {MOCK_PLAY.updatedAt}
            </span>
            <span>by {MOCK_PLAY.createdBy}</span>
          </div>
        </div>
        {isCoach && (
          <Link
            to={`/app/plays/${playId}/edit`}
            className="flex items-center gap-2 rounded-lg border border-BrandGray2/30 px-4 py-2 text-sm text-BrandGray transition hover:border-BrandOrange hover:text-BrandOrange"
          >
            <FiEdit2 className="text-sm" />
            Edit
          </Link>
        )}
      </div>

      {/* Tags */}
      <div className="mt-4 flex flex-wrap gap-2">
        {MOCK_PLAY.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-BrandGray2/20 px-2.5 py-1 text-xs text-BrandGray"
          >
            <FiTag className="text-[10px]" />
            {tag}
          </span>
        ))}
        {MOCK_PLAY.type && (
          <span className="inline-flex items-center rounded-md bg-BrandOrange/10 px-2.5 py-1 text-xs text-BrandOrange">
            {MOCK_PLAY.type}
          </span>
        )}
      </div>

      {/* Play viewer placeholder */}
      <div className="mt-8 flex aspect-video items-center justify-center rounded-xl border border-BrandGray2/20 bg-BrandBlack2/50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-BrandOrange/10">
            <FiPlay className="text-xl text-BrandOrange" />
          </div>
          <p className="text-sm text-BrandGray2">Play viewer will render here</p>
        </div>
      </div>
    </div>
  );
}
