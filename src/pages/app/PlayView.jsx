import { Link, useParams } from "react-router-dom";

export default function PlayView() {
  const { playId } = useParams();

  return (
    <div className="min-h-screen bg-BrandBlack text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Play: {playId}</h1>
      <p className="text-gray-400">View play details</p>
      <div className="flex gap-4 text-sm">
        <Link to={`/app/plays/${playId}/edit`} className="text-BrandOrange underline">Edit Play</Link>
        <Link to="/app/plays" className="text-gray-400 underline">Back to Plays</Link>
      </div>
    </div>
  );
}
