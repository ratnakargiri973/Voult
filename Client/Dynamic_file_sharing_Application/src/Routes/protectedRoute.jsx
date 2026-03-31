import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { handleAuth } from "../utils/handleAuth";

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking"); 

  useEffect(() => {
    handleAuth().then(({ authenticated }) => {
      setStatus(authenticated ? "ok" : "redirect");
    });
  }, []);

  if (status === "checking") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#0c0e12"
      }}>
        <div style={{
          width: 28, height: 28,
          border: "2px solid rgba(0,212,170,0.2)",
          borderTopColor: "#00d4aa",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite"
        }} />
      </div>
    );
  }

  if (status === "redirect") return <Navigate to="/login" replace />;

  return children;
}