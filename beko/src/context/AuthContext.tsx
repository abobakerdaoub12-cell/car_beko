import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null; otpSent?: boolean }>;
  verifyOtpAndSetPassword: (email: string, token: string, newPassword: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Supabase getSession error:', error);
        setLoading(false);
        return;
      }
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.warn('Supabase getSession network error:', err);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) {
        loadProfile(sess.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    let profileData: any = null;
    const resWithBlock = await supabase
      .from('profiles')
      .select('id, name, role, is_blocked')
      .eq('id', userId)
      .maybeSingle();

    if (resWithBlock.error) {
      // Fallback if is_blocked column does not exist on Supabase table yet
      const fallbackRes = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', userId)
        .maybeSingle();

      if (fallbackRes.error) {
        console.error('Profile load error:', fallbackRes.error);
        setLoading(false);
        return;
      }
      profileData = fallbackRes.data;
    } else {
      profileData = resWithBlock.data;
    }

    if (profileData) {
      if (profileData.is_blocked) {
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        return;
      }
      const rawName = (profileData.name || '').trim();
      const metaName = (session?.user?.user_metadata?.name || '').trim();
      const finalName = (rawName && !/^(admin|مستخدم)$/i.test(rawName))
        ? rawName
        : (metaName || rawName || 'أبوبكر دعوب');

      setUser({
        id: profileData.id,
        name: finalName,
        role: profileData.role as 'admin' | 'sales',
        isBlocked: false,
      });
    } else {
      const metaName = (session?.user?.user_metadata?.name || '').trim();
      setUser({ id: userId, name: metaName || 'مستخدم النظام', role: 'sales', isBlocked: false });
    }
    setLoading(false);
  }

  async function signUp(email: string, password: string, name: string): Promise<{ error: string | null }> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });

    if (error) return { error: translateError(error.message) };

    if (data.user) {
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name: name.trim(),
        role: 'sales',
        is_blocked: false,
        email: email.trim(),
      });
      if (upsertErr) {
        // Fallback without is_blocked if column is not present
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: name.trim(),
          role: 'sales',
          email: email.trim(),
        });
      }
    }

    return { error: null };
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: translateError(error.message) };
    
    if (signInData.user) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, name, role, is_blocked')
          .eq('id', signInData.user.id)
          .maybeSingle();
        if (prof?.is_blocked) {
          await supabase.auth.signOut();
          return { error: 'تم حظر هذا الحساب من قبل الإدارة، يرجى التواصل مع المسؤول.' };
        }
      } catch {
        // Safe ignore if is_blocked column doesn't exist yet
      }
    }

    return { error: null };
  }

  async function resetPasswordForEmail(email: string): Promise<{ error: string | null; otpSent?: boolean }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/#reset-password`,
    });

    if (error) return { error: translateError(error.message) };
    return { error: null, otpSent: true };
  }

  async function verifyOtpAndSetPassword(email: string, token: string, newPassword: string): Promise<{ error: string | null }> {
    // Try token as recovery OTP first
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'recovery',
    });

    if (otpError) {
      return { error: translateError(otpError.message) };
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { error: translateError(updateError.message) };
    }

    return { error: null };
  }

  async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: translateError(error.message) };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signUp,
        signIn,
        resetPasswordForEmail,
        verifyOtpAndSetPassword,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'هذا البريد مسجل بالفعل';
  if (msg.includes('Password should be')) return 'كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل';
  if (msg.includes('Unable to send email')) return 'تعذر إرسال رسالة البريد، يرجى التأكد من صحة البريد المدخل';
  if (msg.includes('Token has expired') || msg.includes('expired')) return 'انتهت صلاحية الرمز، يرجى طلب رمز جديد';
  if (msg.includes('invalid') || msg.includes('Invalid')) return 'الرمز المدخل أو البيانات غير صحيحة';
  return msg || 'حدث خطأ، حاول مرة أخرى';
}
