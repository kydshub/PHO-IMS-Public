import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { useSettings } from '../hooks/useSettings';

const MailIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" /><path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" /></svg>;
const LockIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>;
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const EyeOffIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg>;

const Login: React.FC = () => {
  const { login, sendPasswordResetEmail } = useAuth();
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);

  useEffect(() => {
    const sessionExpired = localStorage.getItem('session-expired');
    if (sessionExpired) {
        setInfo('Your session has expired due to inactivity. Please log in again.');
        localStorage.removeItem('session-expired');
    }
 }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');
    setInfo('');

    try {
        await login(email, password);
    } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during login.');
    } finally {
        setLoading(false);
    }
  };

  const handleOpenResetModal = () => {
      setResetEmail('');
      setResetError('');
      setResetLoading(false);
      setIsResetSent(false);
      setIsResetModalOpen(true);
  };
  
  const handleCloseResetModal = () => {
      setIsResetModalOpen(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (resetLoading) return;
      
      setResetLoading(true);
      setResetError('');
      
      try {
          await sendPasswordResetEmail(resetEmail);
          setIsResetSent(true);
      } catch (err: any) {
          setResetError('An error occurred. Please try again later.');
      } finally {
          setResetLoading(false);
      }
  };

  return (
    <>
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
            <img 
                src="/public/Seal_of_Batangas.png"
                alt="Official Seal of Batangas Province" 
                className="mx-auto h-32 w-32 object-contain" 
            />
            <h1 className="mt-4 text-2xl font-bold text-primary-900">
                {settings.organizationName}
            </h1>
            <p className="text-lg text-secondary-700">
                {settings.appName}
            </p>
        </div>
        <Card>
            <form onSubmit={handleLogin} className="space-y-6 p-2">
                <h2 className="text-center text-2xl font-bold text-secondary-900">Sign in to your account</h2>
                
                {info && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-700 p-4" role="alert">
                        <p className="font-bold">Info</p>
                        <p>{info}</p>
                    </div>
                )}
                
                <div className="space-y-4 max-w-xs mx-auto w-full">
                    <div>
                      <label htmlFor="email" className="sr-only">Email address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MailIcon className="h-5 w-5 text-secondary-400" />
                        </div>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email address"
                          className="pl-10"
                        />
                      </div>
                    </div>
    
                    <div>
                      <label htmlFor="password" className="sr-only">Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LockIcon className="h-5 w-5 text-secondary-400" />
                        </div>
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className="pl-10 pr-10"
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-500 hover:text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                        </button>
                      </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 max-w-xs mx-auto w-full" role="alert">
                        <p className="font-bold">Login Failed</p>
                        <p>{error}</p>
                    </div>
                )}
                
                <div className="text-sm text-center">
                    <button
                        type="button" 
                        onClick={handleOpenResetModal}
                        className="font-medium text-primary-600 hover:text-primary-500"
                    >
                        Forgot your password?
                    </button>
                </div>
                
                <div className="text-center">
                  <Button type="submit" className="w-full justify-center max-w-xs" disabled={loading}>
                    {loading ? <Spinner size="sm" /> : 'Sign In'}
                  </Button>
                </div>
            </form>
        </Card>
      </div>
    </div>

    <Modal
        isOpen={isResetModalOpen}
        onClose={handleCloseResetModal}
        title="Reset Your Password"
        footer={!isResetSent ? (
            <div className="space-x-2">
                <Button variant="secondary" onClick={handleCloseResetModal}>Cancel</Button>
                <Button onClick={handlePasswordReset} disabled={resetLoading}>
                    {resetLoading ? <Spinner size="sm" /> : 'Send Reset Link'}
                </Button>
            </div>
        ) : (
            <Button onClick={handleCloseResetModal}>Close</Button>
        )}
    >
        {isResetSent ? (
            <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-medium text-secondary-900 mt-3">Check Your Email</h3>
                <p className="mt-2 text-sm text-secondary-600">
                    A password reset link has been sent to <strong>{resetEmail}</strong>. Please follow the instructions in the email to reset your password.
                </p>
            </div>
        ) : (
            <form onSubmit={handlePasswordReset} className="space-y-4">
                <p className="text-sm text-secondary-600">
                    Enter the email address associated with your account, and we'll send you a link to reset your password.
                </p>
                <Input
                    label="Email Address"
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoFocus
                />
                {resetError && (
                    <p className="text-sm text-red-600">{resetError}</p>
                )}
            </form>
        )}
    </Modal>
    </>
  );
};

export default Login;