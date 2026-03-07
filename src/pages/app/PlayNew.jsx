import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiX } from "react-icons/fi";

const PRESET_TAGS = [
  // Phase of Play
  "Attack", "Defense", "Transition", "Counterattack", "Build Up", "Press", "Reset", "Fast Break",
  // Set Piece / Restart
  "Set Piece", "Kickoff", "Free Kick", "Penalty", "Lineout", "Scrum", "Throw-In", "Corner", "Inbound",
  // Tactical Objective
  "Scoring", "Territory Gain", "Ball Retention", "Pressure", "Overload", "Isolation",
  "Misdirection", "Decoy", "Screen", "Pick", "Switch", "Cross",
  // Formation / Structure
  "Spread", "Compact", "Diamond", "Triangle", "Stack", "Trips", "Bunch", "Zone", "Man Marking",
  // Tempo / Style
  "Fast", "Slow", "Quick Hit", "Delayed", "Structured", "Improvised",
  // Difficulty / Complexity
  "Beginner", "Intermediate", "Advanced", "Game Ready",
  // Practice Context
  "Training Drill", "Game Play", "End Game", "Special Situation",
  // Field Location
  "Red Zone", "Midfield", "Defensive Third", "Attacking Third", "Sideline", "Goal Line",
];

export default function PlayNew() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const suggestions = tagInput.trim()
    ? PRESET_TAGS.filter(
        (t) =>
          t.toLowerCase().includes(tagInput.toLowerCase()) &&
          !tags.includes(t)
      ).slice(0, 8)
    : [];

  useEffect(() => {
    setHighlightedIndex(0);
  }, [tagInput]);

  const addTag = (tag) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      if (suggestions.length > 0 && showSuggestions) {
        e.preventDefault();
        addTag(suggestions[highlightedIndex]);
      } else if (e.key === "Enter" && tagInput.trim()) {
        e.preventDefault();
        addTag(tagInput.trim());
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const playId = "p-" + Date.now();
    navigate(`/app/plays/${playId}/edit`);
  };

  const inputClass =
    "w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 font-DmSans text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]";

  return (
    <div className="mx-auto max-w-lg px-6 py-8 md:px-10 md:py-16">
      <button
        onClick={() => navigate("/app/plays")}
        className="mb-8 flex items-center gap-2 text-sm text-BrandGray transition hover:text-BrandText"
      >
        <FiArrowLeft />
        Back to Playbook
      </button>

      <h1 className="font-Manrope text-xl font-bold tracking-tight">Create New Play</h1>
      <p className="mt-1.5 text-sm text-BrandGray">
        Add some details, then open the editor.
      </p>

      <form onSubmit={handleCreate} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Inside Pass Loop"
            className={inputClass}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">
            Tags <span className="font-normal text-BrandGray2">(optional)</span>
          </label>

          {/* Tag chips + input */}
          <div
            className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-2.5 py-2 transition focus-within:border-BrandOrange focus-within:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
            onClick={() => inputRef.current?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-BrandOrange/10 px-2 py-1 text-xs text-BrandOrange"
              >
                {tag}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                  className="ml-0.5 rounded-sm text-BrandOrange/60 transition hover:text-BrandOrange"
                >
                  <FiX className="text-[10px]" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length === 0 ? "Type to search tags..." : ""}
              className="min-w-[120px] flex-1 bg-transparent text-sm text-BrandText outline-none placeholder:text-BrandGray2"
            />
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="relative">
              <div className="absolute left-0 right-0 top-0 z-20 max-h-56 overflow-auto rounded-lg border border-BrandGray2/30 bg-BrandBlack shadow-lg">
                {suggestions.map((tag, i) => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addTag(tag)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    className={`flex w-full items-center px-3.5 py-2.5 text-left text-sm transition ${
                      i === highlightedIndex
                        ? "bg-BrandOrange/10 text-BrandOrange"
                        : "text-BrandGray hover:bg-BrandBlack2 hover:text-BrandText"
                    }`}
                  >
                    {tag}
                    <span className="ml-auto text-[10px] text-BrandGray2">
                      {i === highlightedIndex ? "Tab / Enter" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!title.trim()}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create & Open Editor
        </button>
      </form>
    </div>
  );
}
