
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db, secondaryAuth } from '../services/firebase';
import { User, UserStatus, UserPresence } from '../types';
import { logAuditEvent } from '../services/audit';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (user: Omit<User, 'uid' | 'status'>, password: string) => Promise<firebase.auth.UserCredential>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  impersonate: (userToImpersonate: User, navigate: any) => void;
  stopImpersonating: (navigate: any) => void;
  originalUser: User | null;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [impersonatedUserFacilityId, setImpersonatedUserFacilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((authUser: firebase.User | null) => {
      if (authUser) {
        const userRef = db.ref('users/' + authUser.uid);
        userRef.on('value', (snapshot) => {
            const dbUser = snapshot.val();
            if (dbUser) {
                setUser({ ...dbUser, uid: authUser.uid });
                setLoading(false);
            } else {
                const creationTime = new Date(authUser.metadata.creationTime!).getTime();
                const now = new Date().getTime();
                if ((now - creationTime) > 5000) {
                    auth.signOut();
                    setLoading(false);
                }
            }
        });
      } else {
        setUser(null);
        setOriginalUser(null);
        setImpersonatedUserFacilityId(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Presence management effect
  useEffect(() => {
    // Only manage presence for the real, authenticated user.
    // Do NOT run this logic during impersonation.
    if (!user || originalUser) {
        return;
    }

    const userPresenceRef = db.ref(`/presences/${user.uid}`);
    const connectedRef = db.ref('.info/connected');

    const listener = connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === false) {
            // We are disconnected. The onDisconnect handler will take care of our status.
            return;
        };

        // We're connected (or reconnected).
        // First, set up the onDisconnect handler. This is a promise that resolves when the write is confirmed by the server.
        userPresenceRef.onDisconnect().set({
            isOnline: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP as unknown as number
        })
        .then(() => {
            // Once the onDisconnect is established, set the user's online status.
            userPresenceRef.set({
                isOnline: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP as unknown as number
            });
        })
        .catch(err => {
             console.error("Firebase onDisconnect setup failed:", user.uid, err.message);
        });
    });

    // The cleanup function is critical.
    return () => {
        // When the component unmounts (e.g., user logs out, page is closed),
        // we should detach the listener for `.info/connected`.
        connectedRef.off('value', listener);
        
        // The `onDisconnect` operation needs to remain on the server to handle cases
        // where the browser tab is closed or the connection is lost unexpectedly.
        // It will be overwritten on the next successful login.
    };
  }, [user, originalUser]); // Re-run when the logged-in user changes.

  const login = async (email: string, password: string): Promise<void> => {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        if (!userCredential.user) {
            throw new Error("Authentication failed, user not found.");
        }

        const userRef = db.ref('users/' + userCredential.user.uid);
        const snapshot = await userRef.get();
        const dbUser = snapshot.val();
        if (dbUser && dbUser.status === UserStatus.Suspended) {
            await auth.signOut();
            throw new Error("Your account is suspended. Please contact an administrator.");
        }
        await logAuditEvent({ uid: userCredential.user.uid, email }, 'User Login', {});
    } catch (error: any) {
        if (error.code === 'auth/invalid-credential') {
            throw new Error('Invalid email or password.');
        }
        if (error.code === 'auth/too-many-requests') {
            throw new Error('Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.');
        }
        throw error;
    }
  };

  const logout = async (): Promise<void> => {
    const userToSetOffline = originalUser || user;
    if (userToSetOffline) {
        const userPresenceRef = db.ref(`/presences/${userToSetOffline.uid}`);
        // On a clean logout, we explicitly set the user offline.
        // We do not cancel the onDisconnect handler; it acts as a fallback for unexpected
        // browser closes during the logout process, and will be overwritten on the next successful login.
        try {
            await userPresenceRef.set({
                isOnline: false,
                lastSeen: firebase.database.ServerValue.TIMESTAMP as unknown as number,
            });
            await logAuditEvent(userToSetOffline, 'User Logout', {});
        } catch (error) {
             console.error("Failed to set user offline during logout:", error);
            // Still proceed to sign out even if this fails.
        }
    }
    await auth.signOut();
  };
  
  const register = async (newUser: Omit<User, 'uid' | 'status'>, password: string): Promise<firebase.auth.UserCredential> => {
      const userCredential = await secondaryAuth.createUserWithEmailAndPassword(newUser.email, password);
      const userData: Omit<User, 'uid'> = {
          ...newUser,
          status: UserStatus.Active,
          requiresPasswordChange: true,
      };
      await db.ref(`users/${userCredential.user!.uid}`).set(userData);
      await secondaryAuth.signOut();
      return userCredential;
  };
  
  const sendPasswordResetEmail = async (email: string) => {
    try {
      await auth.sendPasswordResetEmail(email);
    } catch (error: any) {
        console.error("Password reset error:", error);
        throw new Error("Failed to send password reset email.");
    }
  }

  const updatePassword = async (newPassword: string) => {
    if (auth.currentUser) {
        try {
            await auth.currentUser.updatePassword(newPassword);
            await db.ref(`users/${auth.currentUser.uid}`).update({
                requiresPasswordChange: false
            });
        } catch (error: any) {
            console.error("Password update error:", error);
            throw new Error(error.message || "Failed to update password.");
        }
    } else {
        throw new Error("No authenticated user found to update password for.");
    }
  };
  
  const impersonate = (userToImpersonate: User, navigate: any) => {
      if (user) {
        logAuditEvent(user, 'User Impersonation Start', { impersonatedUser: userToImpersonate.email });
      }
      setOriginalUser(user);
      setUser(userToImpersonate);
      setImpersonatedUserFacilityId(userToImpersonate.facilityId || null);
      navigate('/analytics', { replace: true });
  }
  
  const stopImpersonating = (navigate: any) => {
      if (originalUser) {
          logAuditEvent(originalUser, 'User Impersonation Stop', { returnedTo: originalUser.email });
          const facilityIdToReturnTo = impersonatedUserFacilityId;
          setUser(originalUser);
          setOriginalUser(null);
          setImpersonatedUserFacilityId(null);
          
          if (facilityIdToReturnTo) {
              navigate('/users', { replace: true, state: { preselectedFacilityId: facilityIdToReturnTo } });
          } else {
              navigate('/users', { replace: true });
          }
      }
  }

  const value = { user, originalUser, loading, login, logout, register, sendPasswordResetEmail, impersonate, stopImpersonating, updatePassword };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
