import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { logAuditEvent } from '../services/audit';

// --- Helper Components & Functions from InitialSetup ---
const CheckIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const XIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

interface PasswordStrength {
  score: number; // 0-5
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

const checkPasswordStrength = (password: string): PasswordStrength => {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const score = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  return { score, hasLength, hasUpper, hasLower, hasNumber, hasSpecial };
};

const RequirementItem: React.FC<{ met: boolean; children: React.ReactNode }> = ({ met, children }) => (
    <li className={`flex items-center text-sm transition-colors ${met ? 'text-green-600' : 'text-secondary-500'}`}>
        {met ? <CheckIcon className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" /> : <XIcon className="w-4 h-4 mr-2 text-secondary-400 flex-shrink-0" />}
        {children}
    </li>
);

// --- Main Component ---

interface ForcePasswordChangeProps {
  user: User;
}

const ForcePasswordChange: React.FC<ForcePasswordChangeProps> = ({ user }) => {
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [strength, setStrength] = useState<PasswordStrength>(checkPasswordStrength(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPasswordValue = e.target.value;
    setNewPassword(newPasswordValue);
    setStrength(checkPasswordStrength(newPasswordValue));
    if (error) setError('');
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const currentStrength = checkPasswordStrength(newPassword);
    if (currentStrength.score < 5) {
      setError('Password does not meet all security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (!user) throw new Error("No authenticated user found.");
      
      await updatePassword(newPassword);
      
      await logAuditEvent(user, 'Forced Password Change', { detail: 'User successfully changed their password on first login.' });

      setSuccess(true);
      // The parent App component will re-render due to the DB change and show the dashboard automatically.
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the password.');
      setLoading(false); // Only set loading to false on error, to avoid UI flicker on success
    }
  };
  
  const strengthColors = ['bg-secondary-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const strengthWidths = ['w-0', 'w-1/5', 'w-2/5', 'w-3/5', 'w-4/5', 'w-full'];

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="text-center mb-6">
            <img 
                src="/public/Seal_of_Batangas.png"
                alt="Official Seal of Batangas Province" 
                className="mx-auto h-32 w-32 object-contain" 
            />
            <h1 className="mt-4 text-2xl font-bold text-primary-900">
                Provincial Health Office
            </h1>
            <p className="text-lg text-secondary-700">
                Inventory Management System
            </p>
        </div>
        <Card>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary-800">Welcome, {user.name}!</h2>
            <p className="mt-2 text-secondary-600">For security purposes, please create a new password for your account.</p>
          </div>
          
          <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <Input 
                        label="New Password" 
                        type="password" 
                        value={newPassword} 
                        onChange={handlePasswordChange}
                        placeholder="Enter your new password"
                        autoComplete="new-password"
                        required
                        disabled={loading || success}
                    />
                    <div className="w-full bg-secondary-200 rounded-full h-1.5 mt-2">
                        <div className={`h-1.5 rounded-full ${strengthColors[strength.score]} ${strengthWidths[strength.score]} transition-all duration-300`}></div>
                    </div>
                </div>

                <div className="p-3 bg-secondary-50 rounded-md">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        <RequirementItem met={strength.hasLength}>At least 8 characters</RequirementItem>
                        <RequirementItem met={strength.hasUpper}>One uppercase letter</RequirementItem>
                        <RequirementItem met={strength.hasLower}>One lowercase letter</RequirementItem>
                        <RequirementItem met={strength.hasNumber}>One number</RequirementItem>
                        <RequirementItem met={strength.hasSpecial}>One special character</RequirementItem>
                    </ul>
                </div>
                
                <div>
                    <Input 
                        label="Confirm New Password" 
                        type="password" 
                        value={confirmPassword} 
                        onChange={handleConfirmPasswordChange}
                        placeholder="Confirm your new password"
                        autoComplete="new-password"
                        required
                        disabled={loading || success}
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-3" role="alert">
                        <p className="font-bold">Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

              <Button type="submit" disabled={loading || success} className="w-full">
                {loading && <Spinner size="sm" />}
                {success && 'Password Updated! Redirecting...'}
                {!loading && !success && 'Set New Password'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
