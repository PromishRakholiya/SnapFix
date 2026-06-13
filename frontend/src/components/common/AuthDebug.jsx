import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  debugAuthState,
  decodeJWT,
  getTimeUntilExpiry,
  isTokenExpired,
} from "../../utils/helpers";

const AuthDebug = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const [tokenInfo, setTokenInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const updateTokenInfo = () => {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        const payload = decodeJWT(accessToken);
        const timeUntilExpiry = getTimeUntilExpiry(accessToken);
        const expired = isTokenExpired(accessToken);

        setTokenInfo({
          payload,
          timeUntilExpiry,
          expired,
          token: accessToken.substring(0, 20) + "...",
        });
      } else {
        setTokenInfo(null);
      }
    };

    updateTokenInfo();
    const interval = setInterval(updateTokenInfo, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleForceSync = () => {
    if (window.forceSyncAuth) {
      window.forceSyncAuth();
    } else {
      console.log("Force sync function not available");
    }
  };

  const handleClearAuth = () => {
    if (window.clearAuthData) {
      window.clearAuthData();
    } else {
      console.log("Clear auth function not available");
    }
  };

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="bg-danger-500 text-white px-3 py-2 rounded text-sm font-mono"
      >
        Auth Debug
      </button>

      {showDebug && (
        <div className="absolute bottom-12 right-0 bg-black text-green-400 p-4 rounded text-xs font-mono max-w-md">
          <div className="mb-2">
            <strong>Auth State:</strong>
            <div>Loading: {loading ? "Yes" : "No"}</div>
            <div>Authenticated: {isAuthenticated ? "Yes" : "No"}</div>
            <div>User: {user ? `${user.name} (${user.role})` : "None"}</div>
          </div>

          {tokenInfo && (
            <div className="mb-2">
              <strong>Token Info:</strong>
              <div>Token: {tokenInfo.token}</div>
              <div>Expired: {tokenInfo.expired ? "Yes" : "No"}</div>
              <div>
                Time Left: {Math.floor(tokenInfo.timeUntilExpiry / 60)}m{" "}
                {Math.floor(tokenInfo.timeUntilExpiry % 60)}s
              </div>
              {tokenInfo.payload && (
                <div>
                  Expires:{" "}
                  {new Date(tokenInfo.payload.exp * 1000).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          <div className="mb-2">
            <strong>LocalStorage:</strong>
            <div>
              Access Token:{" "}
              {localStorage.getItem("accessToken") ? "Present" : "Missing"}
            </div>
            <div>
              Refresh Token:{" "}
              {localStorage.getItem("refreshToken") ? "Present" : "Missing"}
            </div>
            <div>
              User Data: {localStorage.getItem("user") ? "Present" : "Missing"}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={debugAuthState}
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
            >
              Log Debug
            </button>
            <button
              onClick={handleForceSync}
              className="bg-primary-500 text-white px-2 py-1 rounded text-xs"
            >
              Force Sync
            </button>
            <button
              onClick={handleClearAuth}
              className="bg-danger-500 text-white px-2 py-1 rounded text-xs"
            >
              Clear Auth
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthDebug;
