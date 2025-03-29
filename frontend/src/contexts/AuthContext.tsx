/*
OpenFactoryAssistant

This file is part of OpenFactoryAssistant.

OpenFactoryAssistant is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

OpenFactoryAssistant is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with OpenFactoryAssistant. If not, see <https://www.gnu.org/licenses/>
*/

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getAuthToken, validateCurrentToken, signOut } from "../api/auth";

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  validateToken: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(() => {
    const storedToken = getAuthToken();
    return storedToken && validateCurrentToken() ? storedToken : null;
  });

  const isSignInPage = window.location.pathname.includes('/signin');

  const handleTokenInvalid = useCallback(() => {
    signOut();
    setTokenState(null);
  }, []);

  const validateToken = useCallback(() => {
    // Skip validation on signin page
    if (isSignInPage) {
      return false;
    }
    
    const currentToken = getAuthToken();
    if (!currentToken || !validateCurrentToken()) {
      handleTokenInvalid();
      return false;
    }
    return true;
  }, [handleTokenInvalid, isSignInPage]);

  const setToken = useCallback((newToken: string | null) => {
    if (newToken === null) {
      handleTokenInvalid();
    }
    setTokenState(newToken);
  }, [handleTokenInvalid]);

  useEffect(() => {
    // Skip validation setup on signin page
    if (isSignInPage) {
      return;
    }

    // Initial token validation
    validateToken();

    // Check token validity periodically
    const interval = setInterval(validateToken, 30000); // Check every 30 seconds

    // Validate token on window focus
    const handleFocus = () => {
      validateToken();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [validateToken, isSignInPage]);

  const value = {
    token,
    setToken,
    isAuthenticated: token !== null,
    validateToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
