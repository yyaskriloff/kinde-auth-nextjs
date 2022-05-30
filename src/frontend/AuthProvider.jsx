import React, {
  useContext,
  useState,
  createContext,
  useCallback,
  useEffect,
} from "react";
import { config } from "../config/index";

const handleError = () => {
  throw new Error(
    "Oops! Seems like you forgot to wrap your app in <KindeProvider>."
  );
};

export const AuthContext = createContext({
  ...config.initialState,
  user: handleError,
  isLoading: handleError,
  checkSession: handleError,
});

export const useKindeAuth = () => useContext(AuthContext);

const userFetcher = async (url) => {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new RequestError(0);
  }

  if (response.ok) {
    return response.json();
  } else if (response.status === 401) {
    return undefined;
  }
};

export default ({ children, initialUser }) => {
  const [state, setState] = useState({
    ...config.initialState,
    user: initialUser,
    isLoading: !initialUser,
  });

  const profileUrl = "/api/auth/me";

  // try and get the user (by fetching /api/auth/me) -> this needs to do the OAuth stuff
  const checkSession = useCallback(async () => {
    try {
      const user = await userFetcher(profileUrl);
      setState((previous) => ({
        ...previous,
        user,
        error: undefined,
      }));
    } catch (error) {
      setState((previous) => ({ ...previous, error }));
    }
  }, [profileUrl]);

  // if you get the user set loading false
  useEffect(() => {
    const checkLoading = async () => {
      await checkSession();
      setState((previous) => ({
        ...previous,
        isLoading: false,
      }));
    };
    if (!state.user) {
      checkLoading();
    }
  }, [state.user]);

  // provide this stuff to the rest of your app
  const { user, error, isLoading } = state;
  return (
    <AuthContext.Provider
      value={{ user, error, isLoading, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};
