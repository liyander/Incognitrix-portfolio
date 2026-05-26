import React, { useState } from "react";

function UserLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [step, setStep] = useState(1); // 1: Login, 2: 2FA, 3: Success
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, markAttendanceOnly: true }),
      });
      const data = await response.json();
      if (data.success && data.attendanceRecorded !== undefined) {
        setAttendanceMessage(data.message);
        setStep(3);
      } else if (data.success && data.requires2FA) {
        setIsFirstTime(data.isFirstTime);
        if (data.qr) setQrCode(data.qr);
        setStep(2);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Cannot connect to server. Ensure backend is running.");
      console.error(err);
    }
    setLoading(false);
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/user/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, token: otp }),
      });
      const data = await response.json();
      if (data.success) {
        setAttendanceMessage(data.message);
        setStep(3); // Go to success screen
      } else {
        setError(data.message || "Invalid OTP code");
      }
    } catch (err) {
      setError("Cannot connect to server.");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[500px] p-6 relative animate-fade-slide">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 blur-[150px] rounded-full pointer-events-none animate-pulse"></div>

      <div className="w-full max-w-md bg-surface-dim/80 backdrop-blur-xl border border-primary/30 p-10 relative z-10 shadow-[0_0_50px_rgba(0,245,255,0.05)] text-center">
        
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary"></div>

        <div className="mb-8">
          <span className="material-symbols-outlined text-primary text-5xl mb-4 jarvis-text">
            {step === 1 ? 'fingerprint' : step === 2 ? 'verified_user' : 'how_to_reg'}
          </span>
          <h2 className="font-headline text-2xl font-bold text-on-surface uppercase tracking-widest jarvis-text">
            {step === 1 ? 'Operative Login' : step === 2 ? '2FA Verification' : 'Attendance'}
          </h2>
          <p className="font-body text-xs text-primary/70 tracking-widest uppercase mt-2">
            {step === 1 ? 'AUTHORIZATION REQUIRED' : step === 2 ? 'ENTER AUTHENTICATOR CODE' : 'STATUS CONFIRMED'}
          </p>
        </div>

        {error && <div className="p-3 mb-6 bg-error/10 border border-error/50 text-error font-mono text-xs uppercase tracking-widest animate-pulse">{error}</div>}
        
        {step === 1 ? (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col text-left">
              <label className="font-mono text-xs text-outline tracking-widest uppercase mb-2">Username</label>
              <input
                type="text"
                required
                className="bg-surface-lowest border border-outline-variant rounded p-3 text-on-surface font-mono placeholder:text-outline/50 focus:border-primary focus:outline-none transition-colors"
                placeholder="ENTER USER_ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col text-left">
              <label className="font-mono text-xs text-outline tracking-widest uppercase mb-2">Password</label>
              <input
                type="password"
                required
                className="bg-surface-lowest border border-outline-variant rounded p-3 text-on-surface font-mono focus:border-primary focus:outline-none transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-primary-container text-on-primary-fixed font-headline font-bold text-sm tracking-widest uppercase py-4 rounded hover:bg-primary transition-colors disabled:opacity-50"
            >
              {loading ? 'AUTHENTICATING...' : 'INITIATE LOGIN'}
            </button>
          </form>
        ) : step === 2 ? (
          <form onSubmit={handle2FASubmit} className="flex flex-col gap-6">
            {isFirstTime && (
              <div className="mb-4 flex flex-col items-center">
                <p className="text-sm font-mono text-outline mb-4">Scan this QR code with Google Authenticator or Authy to configure 2FA.</p>
                {qrCode && <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border border-primary p-2 bg-white" />}
              </div>
            )}
            <div className="flex flex-col text-left">
              <label className="font-mono text-xs text-outline tracking-widest uppercase mb-2">Authenticator Code</label>
              <input
                type="text"
                required
                className="bg-surface-lowest border border-outline-variant rounded p-3 text-center text-on-surface font-mono text-2xl tracking-widest focus:border-primary focus:outline-none transition-colors"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-primary-container text-on-primary-fixed font-headline font-bold text-sm tracking-widest uppercase py-4 rounded hover:bg-primary transition-colors disabled:opacity-50"
            >
              {loading ? 'VERIFYING...' : 'VERIFY & ACCESS'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-6 items-center">
            <div className="p-4 bg-primary/10 border border-primary/50 text-primary font-mono text-sm uppercase tracking-widest">
              {attendanceMessage}
            </div>
            <button
              onClick={() => onLogin(username)} // Return to portal
              className="mt-4 bg-surface-lowest text-outline border border-outline-variant font-headline font-bold text-sm tracking-widest uppercase py-2 px-6 rounded hover:text-primary hover:border-primary transition-colors"
            >
              RETURN TO DIRECTIVES
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserLogin;
