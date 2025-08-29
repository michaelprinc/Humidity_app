import React, { useEffect, useRef, useState } from 'react';
import { Shield, User, Settings, LogOut, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { 
  GoogleAuth, 
  addAuthStateListener, 
  removeAuthStateListener,
  initializeGoogleSignIn,
  renderGoogleSignInButton,
  requestDeviceAccess,
  signOut,
  getAuthStatus
} from '../integrations/GoogleAuth';

/**
 * Modern Google Authentication Button Component
 * 
 * Handles the complete Google Sign-In and OAuth 2.0 authorization flow
 * for Smart Device Management API access.
 */
export default function GoogleAuthButton({ onAuthSuccess, onAuthError }) {
  const signInButtonRef = useRef(null);
  const [authState, setAuthState] = useState({
    isConfigured: false,
    isSignedIn: false,
    hasDeviceAccess: false,
    userInfo: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Google Sign-In on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if Google Auth is configured
        const status = getAuthStatus();
        if (!status.isConfigured) {
          setError('Google Home integration not configured. Check environment variables.');
          return;
        }

        // Initialize Google Sign-In
        await initializeGoogleSignIn();
        setIsInitialized(true);
        
        // Render the sign-in button if user is not signed in
        if (signInButtonRef.current && !authState.isSignedIn) {
          renderGoogleSignInButton(signInButtonRef.current);
        }
        
      } catch (error) {
        console.error('Google Auth initialization failed:', error);
        setError(`Initialization failed: ${error.message}`);
        if (onAuthError) {
          onAuthError(error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const handleAuthStateChange = (newState) => {
      setAuthState(newState);
      
      // If user just signed in and we have the button element, render it again
      if (newState.isSignedIn && signInButtonRef.current && !newState.hasDeviceAccess) {
        // Clear the sign-in button since user is now signed in
        signInButtonRef.current.innerHTML = '';
      }
      
      // Notify parent component of successful authentication
      if (newState.isSignedIn && newState.hasDeviceAccess && onAuthSuccess) {
        onAuthSuccess(newState);
      }
    };

    addAuthStateListener(handleAuthStateChange);
    
    return () => {
      removeAuthStateListener(handleAuthStateChange);
    };
  }, [onAuthSuccess]);

  // Request device access (OAuth 2.0 authorization)
  const handleRequestDeviceAccess = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await requestDeviceAccess();
      
    } catch (error) {
      console.error('Device access request failed:', error);
      setError(`Device access failed: ${error.message}`);
      if (onAuthError) {
        onAuthError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    signOut();
    setError(null);
    
    // Re-render sign-in button
    setTimeout(() => {
      if (signInButtonRef.current && isInitialized) {
        renderGoogleSignInButton(signInButtonRef.current);
      }
    }, 100);
  };

  // Render different states
  if (!isInitialized && isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading Google services...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!authState.isSignedIn) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sign in with Google
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Connect your Google account to access your Nest devices
          </p>
        </div>
        
        {/* Google Sign-In Button Container */}
        <div className="flex justify-center">
          <div ref={signInButtonRef} className="google-signin-button"></div>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          <p>By signing in, you agree to share your basic profile information</p>
          <p>and grant access to your Nest devices for temperature monitoring.</p>
        </div>
      </div>
    );
  }

  if (authState.isSignedIn && !authState.hasDeviceAccess) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Signed in as {authState.userInfo?.name}
              </p>
              <p className="text-xs text-green-600">{authState.userInfo?.email}</p>
            </div>
          </div>
          <Button
            onClick={handleSignOut}
            size="sm"
            variant="outline"
            className="text-green-700 border-green-300 hover:bg-green-100"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sign Out
          </Button>
        </div>

        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Grant Device Access
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Allow access to your Nest devices to automatically retrieve indoor temperature
          </p>
          
          <Button
            onClick={handleRequestDeviceAccess}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Requesting Access...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Grant Nest Device Access
              </>
            )}
          </Button>
          
          <div className="text-xs text-gray-500 mt-2">
            <p>This will open a popup to grant permission for your Nest devices.</p>
            <p>You can revoke this access anytime from your Google account settings.</p>
          </div>
        </div>
      </div>
    );
  }

  if (authState.isSignedIn && authState.hasDeviceAccess) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Google Home Connected
                </p>
                <p className="text-xs text-green-600">
                  {authState.userInfo?.name} • Device access granted
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  // Could open a settings modal here
                  console.log('Settings clicked');
                }}
                size="sm"
                variant="outline"
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleSignOut}
                size="sm"
                variant="outline"
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-green-700">
            ✓ Indoor temperature will be automatically retrieved from your Nest devices
          </div>
        </div>
      </div>
    );
  }

  return null;
}
