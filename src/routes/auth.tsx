import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("fake_session", JSON.stringify({ user: { id: "local-user" } }));
    toast.success("Signed in!");
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas">
      <form onSubmit={submit} className="flex flex-col gap-4 p-6 border rounded-xl bg-panel">
        <input 
          placeholder="Username" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)}
          className="p-2 border rounded"
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 border rounded"
        />
        <button type="submit" className="p-2 bg-primary text-white rounded">Sign in</button>
      </form>
    </main>
  );
}
