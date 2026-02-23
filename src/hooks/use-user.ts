import { useState, useEffect, useCallback } from "react";

export interface User {
  id: string;
  displayName: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/session");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const createUser = useCallback(async (displayName: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return data;
      } else {
        const error = await res.text();
        throw new Error(error || "Failed to create user");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/session", { method: "DELETE" });
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { user, loading, createUser, logout };
}
