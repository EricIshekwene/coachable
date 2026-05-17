import { Navigate } from "react-router-dom";
import { useAdmin } from "./AdminContext";

/**
 * Page-level permission guard. Owner short-circuits. While the staff
 * session is still loading, renders nothing (avoid flash of unauthorized
 * content). When denied, redirect back into the valid shell root instead
 * of rendering a dead-end "no access" page.
 *
 * @param {{ perm?: string, anyOf?: string[], ownerOnly?: boolean, children: React.ReactNode }} props
 */
export default function RequirePerm({ perm, anyOf = null, ownerOnly = false, children }) {
  const { basePath, hasPerm, isOwner, sessionLoaded } = useAdmin();

  if (!sessionLoaded) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "var(--adm-bg)" }}>
        <div className="h-10 w-10 rounded-full border-[3px] border-BrandOrange/30 border-t-BrandOrange animate-spin" />
      </div>
    );
  }

  if (ownerOnly && !isOwner) return <Navigate to={basePath} replace />;

  if (perm && !hasPerm(perm)) return <Navigate to={basePath} replace />;
  if (Array.isArray(anyOf) && anyOf.length > 0 && !anyOf.some((path) => hasPerm(path))) {
    return <Navigate to={basePath} replace />;
  }

  return children;
}
