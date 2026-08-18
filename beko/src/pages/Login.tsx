import { useState } from 'react';
import { Settings, Loader2, Mail, Lock, User as UserIcon, KeyRound, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset_code';

export function Login() {
  const { signIn, signUp, resetPasswordForEmail, verifyOtpAndSetPassword, isConfigured } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetState = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleLoginOrSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    setBusy(true);

    if (mode === 'login') {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error);
    } else if (mode === 'signup') {
      if (name.trim().length < 2) {
        setError('الرجاء إدخال اسمك الكامل');
        setBusy(false);
        return;
      }
      if (password.length < 6) {
        setError('كلمة المرور يجب أن تكون 6 خانات على الأقل');
        setBusy(false);
        return;
      }
      const { error } = await signUp(email.trim(), password, name.trim());
      if (error) {
        setError(error);
      } else {
        setSuccessMsg('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول مباشرة أو تأكيد البريد الإلكتروني في حال تفعيل التأكيد.');
        setMode('login');
      }
    }
    setBusy(false);
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    if (!email.trim()) {
      setError('الرجاء إدخال بريدك الإلكتروني');
      return;
    }

    setBusy(true);
    const { error } = await resetPasswordForEmail(email.trim());
    setBusy(false);

    if (error) {
      setError(error);
    } else {
      setSuccessMsg('تم إرسال رمز ورابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى إدخال الرمز وكلمة المرور الجديدة أدناه.');
      setMode('reset_code');
    }
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();

    if (!otpCode.trim()) {
      setError('الرجاء إدخال رمز التحقق المستلم');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور الجديدة يجب أن تكون 6 خانات على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setBusy(true);
    const { error } = await verifyOtpAndSetPassword(email.trim(), otpCode.trim(), password);
    setBusy(false);

    if (error) {
      setError(error);
    } else {
      setSuccessMsg('تم تعيين كلمة المرور الجديدة بنجاح! يمكنك الآن تسجيل الدخول.');
      setPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setMode('login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-secondary-50 via-primary-50 to-secondary-100" style={{ direction: 'rtl' }}>
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary-600 items-center justify-center text-white shadow-lg shadow-primary-600/20 mb-3">
            <Settings className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-900">أبناء الحاتمي لقطع الغيار</h1>
          <p className="text-xs text-secondary-500 mt-1">نظام إدارة ومبيعات الجملة والتوزيع الميداني</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-secondary-200/50 p-6 sm:p-8 border border-secondary-100">
          {/* Tabs for Login & Signup */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex gap-1 p-1 bg-secondary-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); resetState(); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'login' ? 'bg-white text-primary-700 shadow-xs' : 'text-secondary-500 hover:text-secondary-700'
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); resetState(); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'signup' ? 'bg-white text-primary-700 shadow-xs' : 'text-secondary-500 hover:text-secondary-700'
                }`}
              >
                حساب جديد
              </button>
            </div>
          )}

          {/* Recovery Header */}
          {(mode === 'forgot' || mode === 'reset_code') && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); resetState(); }}
                className="inline-flex items-center gap-1.5 text-xs text-secondary-500 hover:text-primary-600 font-medium mb-2 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة لتسجيل الدخول</span>
              </button>
              <h2 className="text-lg font-bold text-secondary-900">
                {mode === 'forgot' ? 'استعادة كلمة المرور' : 'إدخال رمز التحقق وتعيين كلمة المرور'}
              </h2>
              <p className="text-xs text-secondary-500 mt-1">
                {mode === 'forgot'
                  ? 'أدخل بريدك الإلكتروني المسجل لنرسل لك رمزاً لتأكيد هويتك وتعيين كلمة سر جديدة.'
                  : `أدخل الرمز المكون من 6 أرقام المرسل إلى ${email}`}
              </p>
            </div>
          )}

          {/* Success Message Banner */}
          {successMsg && (
            <div className="mb-4 text-xs font-medium text-success-800 bg-success-50 rounded-xl p-3.5 border border-success-200 flex items-start gap-2.5 animate-slide-up">
              <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="mb-4 text-xs font-medium text-error-700 bg-error-50 rounded-xl p-3.5 border border-error-200 flex items-start gap-2.5 animate-slide-up">
              <AlertCircle className="w-4 h-4 text-error-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form: Login / Sign up */}
          {(mode === 'login' || mode === 'signup') && (
            <form onSubmit={handleLoginOrSignup} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-secondary-700 mb-1.5">
                    الاسم الكامل <span className="text-error-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: أحمد الحاتمي"
                      required
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                      disabled={busy}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-secondary-700 mb-1.5">
                  البريد الإلكتروني الحقيقي <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                    disabled={busy}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-secondary-700">
                    كلمة المرور <span className="text-error-500">*</span>
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); resetState(); }}
                      className="text-xs text-primary-600 hover:text-primary-800 font-semibold transition-colors"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                    disabled={busy}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 cursor-pointer mt-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب والتحقق'}
              </button>
            </form>
          )}

          {/* Form: Forgot Password (Request Code) */}
          {mode === 'forgot' && (
            <form onSubmit={handleSendResetCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary-700 mb-1.5">
                  البريد الإلكتروني المسجل <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                    disabled={busy}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>إرسال رمز إعادة التعيين إلى بريدي</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('reset_code'); resetState(); }}
                  className="text-xs text-secondary-500 hover:text-primary-600 underline"
                >
                  معي رمز تحقق مسبقاً؟ إدخال الرمز مباشرة
                </button>
              </div>
            </form>
          )}

          {/* Form: Reset Code & New Password */}
          {mode === 'reset_code' && (
            <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary-700 mb-1.5">
                  رمز التحقق المستلم (OTP) <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="مثال: 123456"
                    required
                    maxLength={12}
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-secondary-200 text-sm font-mono tracking-widest text-center focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                    disabled={busy}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-700 mb-1.5">
                  كلمة المرور الجديدة <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                    disabled={busy}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-700 mb-1.5">
                  تأكيد كلمة المرور الجديدة <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                    disabled={busy}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-xl bg-success-600 hover:bg-success-700 text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-success-600/20 cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>حفظ كلمة المرور الجديدة</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleSendResetCode}
                  disabled={busy}
                  className="text-primary-600 hover:text-primary-800 font-semibold underline"
                >
                  إعادة إرسال رمز جديد
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('login'); resetState(); }}
                  className="text-secondary-500 hover:text-secondary-800"
                >
                  إلغاء والعودة
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-secondary-500 mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-secondary-400" />
          <span>نظام مشفر ومحمي عبر التحقق من البريد الإلكتروني وكلمة المرور</span>
        </div>
      </div>
    </div>
  );
}

