"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { setUser } from "@/redux/featured/auth/authSlice";

type Props = {
  children: ReactNode;
};

export function AuthSync({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (session?.user) {
      dispatch(setUser({
        id: session.user.email,
        name: session.user.name,
        email: session.user.email,
        role: "admin",
        image: session.user.image,
      }));
    }
  }, [session, dispatch]);

  return <>{children}</>;
}

export const AuthProvider = ({ children }: Props) => {
  return <SessionProvider>{children}</SessionProvider>;
};
