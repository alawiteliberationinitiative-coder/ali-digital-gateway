import { useEffect, useState } from "react";

const SESSION_KEY = "ali_session_id";

export function useSession() {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    let stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, stored);
    }
    setSessionId(stored);
  }, []);

  return sessionId;
}
