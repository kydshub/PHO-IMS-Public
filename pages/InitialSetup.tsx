import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Role, User, UserStatus, Facility, FacilityStatus } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { useDatabase } from '../hooks/useDatabase';
import { auth, db } from '../services/firebase';

// --- Helper Components & Functions ---

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

interface InitialSetupProps {
  onComplete: () => void;
}

const APP_NAME = 'Batangas PHO-IMS'; // Local constant for one-time setup page

const InitialSetup: React.FC<InitialSetupProps> = ({ onComplete }) => {
  const { initializeDatabase } = useDatabase();
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [strength, setStrength] = useState<PasswordStrength>(checkPasswordStrength(''));
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    if (!email) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Invalid email address format.';
    return '';
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    if (errors[fieldName]) {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
        });
    }
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPassword = e.target.value;
      setAdminPassword(newPassword);
      setStrength(checkPasswordStrength(newPassword));
      if (errors.adminPassword || errors.confirmPassword) {
          setErrors(prev => ({...prev, adminPassword: '', confirmPassword: ''}));
      }
  };
  
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    let newErrors: Record<string, string> = {};

    if (!adminName.trim()) newErrors.adminName = "Admin name is required.";
    
    const emailError = validateEmail(adminEmail);
    if (emailError) newErrors.adminEmail = emailError;

    const currentStrength = checkPasswordStrength(adminPassword);
    if (currentStrength.score < 5) {
      newErrors.adminPassword = 'Password does not meet all security requirements.';
    }
    
    if (adminPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setIsLoading(true);

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(adminEmail, adminPassword);
        const adminUid = userCredential.user!.uid;
        
        const adminUser: User = {
            uid: adminUid,
            name: adminName,
            email: adminEmail,
            role: Role.SystemAdministrator,
            status: UserStatus.Active,
            position: 'System Administrator',
        };
        
        const facilityRef = db.ref('facilities').push();
        const facilityId = facilityRef.key!;

        const firstFacility: Omit<Facility, 'id'> = {
            name: 'Provincial Health Office',
            location: 'Kumintang Ibaba, Batangas City, Batangas, 4200',
            status: FacilityStatus.Active,
        };

        await initializeDatabase(adminUser, firstFacility, facilityId);
        await auth.signOut();
        onComplete();
        // Force a reload to ensure all state is reset and the user is properly redirected to the login page.
        window.location.reload();
        
    } catch (error: any) {
        setErrors({ adminPassword: `An error occurred: ${error.message}` });
        setIsLoading(false);
    }
  };
  
  const strengthColors = ['bg-secondary-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const strengthWidths = ['w-0', 'w-1/5', 'w-2/5', 'w-3/5', 'w-4/5', 'w-full'];

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
         <div className="text-center mb-4">
            <img 
                src="/public/Seal_of_Batangas.png"
                alt="Official Seal of Batangas Province" 
                className="mx-auto h-32 w-32 object-contain" 
            />
            <h1 className="mt-4 text-2xl font-bold text-primary-900">{APP_NAME}</h1>
            <p className="text-lg text-secondary-700">Initial System Setup</p>
        </div>
        <Card>
            <div className="mt-8">
              <form onSubmit={handleFinish} className="space-y-6">
                  <div>
                      <h3 className="text-lg font-medium text-secondary-900">Create System Administrator</h3>
                      <p className="text-sm text-secondary-500 mb-4">This will be the primary administrator account for the system.</p>
                      <div className="space-y-4">
                        <div>
                          <Input 
                            label="Full Name" 
                            type="text" 
                            value={adminName} 
                            onChange={handleInputChange(setAdminName, 'adminName')}
                            placeholder="e.g., Juan dela Cruz"
                            autoComplete="name"
                            required
                          />
                          {errors.adminName && <p className="text-red-600 text-sm mt-1">{errors.adminName}</p>}
                        </div>
                        <div>
                          <Input 
                            label="Email" 
                            type="email" 
                            value={adminEmail} 
                            onChange={handleInputChange(setAdminEmail, 'adminEmail')}
                            placeholder="admin@your-organization.com"
                            autoComplete="email"
                            required
                          />
                          {errors.adminEmail && <p className="text-red-600 text-sm mt-1">{errors.adminEmail}</p>}
                        </div>
                      </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-secondary-900 mt-6">Set Password</h3>
                    <div className="space-y-4 mt-4">
                       <div>
                          <Input 
                            label="Password" 
                            type="password" 
                            value={adminPassword} 
                            onChange={handlePasswordChange}
                            placeholder="Enter a secure password"
                            autoComplete="new-password"
                            required
                          />
                           <div className="w-full bg-secondary-200 rounded-full h-1.5 mt-2">
                              <div className={`h-1.5 rounded-full ${strengthColors[strength.score]} ${strengthWidths[strength.score]} transition-all duration-300`}></div>
                            </div>
                          {errors.adminPassword && <p className="text-red-600 text-sm mt-1">{errors.adminPassword}</p>}
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
                            label="Confirm Password" 
                            type="password" 
                            value={confirmPassword} 
                            onChange={handleConfirmPasswordChange}
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                            required
                          />
                          {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>}
                        </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={checkPasswordStrength(adminPassword).score < 5 || !adminName || !adminEmail || adminPassword !== confirmPassword || isLoading} className="mt-6 w-full">
                    {isLoading ? <Spinner size="sm" /> : 'Finish Setup'}
                  </Button>
              </form>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default InitialSetup;