import { useState, useEffect, useCallback } from 'react';
import {
  UserCog,
  UserCheck,
  Shield,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Ban,
  Trash2,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { EmptyState } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import * as db from '@/lib/db';
import { formatDate } from '@/lib/format';

export function Users() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState<db.ProfileRow[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, 'admin' | 'sales'>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<db.ProfileRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await db.getAllProfiles();
      setUsers(rows);
      const roleMap: Record<string, 'admin' | 'sales'> = {};
      rows.forEach((r) => {
        roleMap[r.id] = (r.role === 'admin' ? 'admin' : 'sales');
      });
      setSelectedRoles(roleMap);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleSelectChange = (userId: string, value: 'admin' | 'sales') => {
    setSelectedRoles((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const saveUserRole = async (user: db.ProfileRow) => {
    const targetRole = selectedRoles[user.id] || (user.role as 'admin' | 'sales');

    if (user.id === currentUser.id && targetRole === 'sales') {
      setErrorMessage('لا يمكنك تخفيض صلاحيات حسابك الخاص من مدير إلى مندوب.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setBusyId(user.id);
    setErrorMessage(null);
    setToastMessage(null);

    try {
      await db.updateProfileRole(user.id, targetRole);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: targetRole } : u)));

      const roleArabicName = targetRole === 'admin' ? 'مدير نظام (كامل الصلاحيات)' : 'مندوب مبيعات وتوزيع';
      setToastMessage(`تم حفظ الإجراء بنجاح: تم تعيين دور "${user.name}" كـ (${roleArabicName}).`);

      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    } catch {
      setErrorMessage('تعذر حفظ تغيير الدور، الرجاء المحاولة مرة أخرى.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleBlock = async (user: db.ProfileRow) => {
    if (user.id === currentUser.id) {
      setErrorMessage('لا يمكنك حظر حسابك الخاص.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const willBlock = !user.is_blocked;
    setBusyId(user.id);
    setErrorMessage(null);
    setToastMessage(null);

    try {
      await db.toggleBlockProfile(user.id, willBlock);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_blocked: willBlock } : u)));

      if (willBlock) {
        setToastMessage(`تم حظر حساب المستخدم "${user.name}" بنجاح، ولن يتمكن من الدخول للنظام.`);
      } else {
        setToastMessage(`تم إلغاء الحظر عن المستخدم "${user.name}" بنجاح، وأصبح حسابه نشطاً.`);
      }

      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    } catch {
      setErrorMessage('حدث خطأ أثناء تعديل حالة الحظر للمستخدم.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser.id) {
      setErrorMessage('لا يمكنك حذف حسابك الخاص.');
      setUserToDelete(null);
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    setToastMessage(null);

    try {
      await db.deleteProfile(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setToastMessage(`تم حذف المستخدم "${userToDelete.name}" نهائياً من النظام.`);
      setUserToDelete(null);

      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    } catch {
      setErrorMessage('حدث خطأ أثناء محاولة حذف المستخدم.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const blockedCount = users.filter((u) => u.is_blocked).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-secondary-900">إدارة المستخدمين والصلاحيات والحظر</h2>
          <p className="text-sm text-secondary-500">
            {users.length} مستخدمين مسجلين • {adminCount} مدير • {users.length - adminCount} مندوب مبيعات
            {blockedCount > 0 && <span className="text-error-600 font-semibold mr-2">• ({blockedCount} محظور)</span>}
          </p>
        </div>
      </div>

      {/* Confirmation Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-success-50 border border-success-200 text-success-800 flex items-center justify-between gap-3 animate-slide-up shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-success-600 shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs text-success-700 hover:text-success-900 font-semibold underline shrink-0 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Error Toast Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-error-50 border border-error-200 text-error-800 flex items-center justify-between gap-3 animate-slide-up shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-error-600 shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-error-700 hover:text-error-900 font-semibold underline shrink-0 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-secondary-100 p-8 text-center">
          <EmptyState icon={<UserCog className="w-8 h-8" />} title="لا يوجد مستخدمون" description="يتم تسجيل المستخدمين عبر شاشة الدخول والتحقق" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white ring-1 ring-secondary-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-secondary-50 border-b border-secondary-100">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-secondary-500 items-center">
              <div className="col-span-12 md:col-span-4">المستخدم والحالة</div>
              <div className="col-span-12 md:col-span-3 hidden md:block">البريد الإلكتروني</div>
              <div className="col-span-6 md:col-span-3 text-center sm:text-right">الدور والصلاحية</div>
              <div className="col-span-6 md:col-span-2 text-center">إجراءات الحظر والحذف</div>
            </div>
          </div>
          <div className="divide-y divide-secondary-100">
            {users.map((u) => {
              const isAdmin = u.role === 'admin';
              const isYou = u.id === currentUser.id;
              const isBlocked = !!u.is_blocked;
              const currentSelectedRole = selectedRoles[u.id] || (u.role as 'admin' | 'sales');
              const hasChanged = currentSelectedRole !== u.role;
              const isBusy = busyId === u.id;

              return (
                <div
                  key={u.id}
                  className={`p-4 transition-colors ${
                    isBlocked ? 'bg-error-50/40 hover:bg-error-50/60' : 'hover:bg-secondary-50/50'
                  }`}
                >
                  <div className="grid grid-cols-12 gap-3 items-center">
                    {/* User Info */}
                    <div className="col-span-12 md:col-span-4 flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isBlocked
                            ? 'bg-error-100 text-error-700 ring-2 ring-error-300'
                            : isAdmin
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-success-100 text-success-700'
                        }`}
                      >
                        {isBlocked ? (
                          <Ban className="w-5 h-5" />
                        ) : isAdmin ? (
                          <UserCog className="w-5 h-5" />
                        ) : (
                          <UserCheck className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-secondary-900 truncate">
                            {u.name || 'بدون اسم'}
                          </p>
                          {isYou && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary-100 text-primary-700 font-medium shrink-0">
                              أنت
                            </span>
                          )}
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-100 text-error-700 border border-error-200">
                              <Ban className="w-3 h-3" />
                              محظور
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-50 text-success-700 border border-success-200">
                              نشط
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-secondary-400 md:hidden truncate" dir="ltr">{u.email}</p>
                        <p className="text-[11px] text-secondary-400">
                          الدور: <span className="font-semibold text-secondary-700">{isAdmin ? 'مدير' : 'مندوب'}</span>
                          <span className="mx-1">•</span>
                          {formatDate(u.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="col-span-12 md:col-span-3 hidden md:flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
                      <span className="text-sm text-secondary-600 truncate" dir="ltr">
                        {u.email}
                      </span>
                    </div>

                    {/* Role Selection Dropdown / Options */}
                    <div className="col-span-7 md:col-span-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={currentSelectedRole}
                          disabled={isBusy || isBlocked}
                          onChange={(e) => handleRoleSelectChange(u.id, e.target.value as 'admin' | 'sales')}
                          className={`w-full px-2.5 py-1.5 text-xs font-semibold rounded-xl border bg-white shadow-xs focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors ${
                            hasChanged
                              ? 'border-primary-500 ring-2 ring-primary-100 text-primary-900 bg-primary-50/30'
                              : 'border-secondary-200 text-secondary-700'
                          }`}
                        >
                          <option value="sales">مندوب مبيعات وتوزيع</option>
                          <option value="admin">مدير نظام (كامل الصلاحيات)</option>
                        </select>
                        {hasChanged && (
                          <button
                            onClick={() => saveUserRole(u)}
                            disabled={isBusy}
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-xs cursor-pointer transition-all"
                            title="حفظ تغيير الدور"
                          >
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>حفظ</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions: Block/Unblock & Delete */}
                    <div className="col-span-5 md:col-span-2 flex items-center justify-center gap-1.5">
                      {isYou ? (
                        <span className="text-[11px] text-secondary-400 italic">حسابك الأساسي</span>
                      ) : (
                        <>
                          {/* Block / Unblock Button */}
                          <button
                            onClick={() => handleToggleBlock(u)}
                            disabled={isBusy}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                              isBlocked
                                ? 'bg-success-100 hover:bg-success-200 text-success-800'
                                : 'bg-warning-50 hover:bg-warning-100 text-warning-800 border border-warning-200'
                            }`}
                            title={isBlocked ? 'إلغاء حظر هذا المستخدم' : 'حظر هذا المستخدم من تسجيل الدخول'}
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isBlocked ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>فك الحظر</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5" />
                                <span>حظر</span>
                              </>
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setUserToDelete(u)}
                            disabled={isBusy}
                            className="p-1.5 rounded-xl text-error-600 hover:bg-error-50 border border-transparent hover:border-error-200 transition-colors cursor-pointer"
                            title="حذف المستخدم نهائياً"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Permissions & Security Guidelines Box */}
      <div className="rounded-2xl bg-secondary-50 border border-secondary-200/80 p-4 text-xs text-secondary-700">
        <div className="flex items-center gap-2 font-bold text-secondary-900 mb-2">
          <Shield className="w-4 h-4 text-primary-600" />
          <span>إرشادات التحكم بالأمان والحسابات:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-xl border border-secondary-100">
            <span className="font-bold text-primary-700 block mb-1">👑 تغيير الصلاحيات:</span>
            <p className="text-secondary-600 leading-relaxed">
              اختر دور المستخدم ثم اضغط زر "حفظ" لتحديث صلاحياته فوراً في جميع الأقسام.
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-secondary-100">
            <span className="font-bold text-warning-700 block mb-1">🚫 خاصية الحظر (Block):</span>
            <p className="text-secondary-600 leading-relaxed">
              حظر المستخدم يمنعه فوراً من تسجيل الدخول أو إرسال أي فواتير دون مسح بياناته القديمة.
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-secondary-100">
            <span className="font-bold text-error-700 block mb-1">🗑️ حذف المستخدم (Delete):</span>
            <p className="text-secondary-600 leading-relaxed">
              إزالة سجل المستخدم نهائياً من قائمة النظام مع الاحتفاظ بالفواتير التاريخية الصادرة باسمه.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!userToDelete}
        onClose={() => !isDeleting && setUserToDelete(null)}
        title="تأكيد حذف المستخدم"
        size="md"
      >
        {userToDelete && (
          <div className="space-y-4">
            <div className="p-4 bg-error-50 rounded-2xl border border-error-200 flex items-start gap-3">
              <div className="p-2 bg-error-100 rounded-xl text-error-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-error-900">
                  هل أنت متأكد من حذف المستخدم نهائياً؟
                </h4>
                <p className="text-xs text-error-700 leading-relaxed">
                  أنت على وشك حذف حساب <strong className="font-bold text-error-900">{userToDelete.name}</strong> ({userToDelete.email}).
                  لن يتمكن هذا المستخدم من الدخول للنظام بعد الحذف.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-secondary-50 rounded-xl border border-secondary-100 text-xs text-secondary-600 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-secondary-400">الاسم:</span>
                <span className="font-semibold text-secondary-800">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-400">البريد الإلكتروني:</span>
                <span className="font-semibold text-secondary-800" dir="ltr">{userToDelete.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-400">الدور الحالي:</span>
                <span className="font-semibold text-secondary-800">
                  {userToDelete.role === 'admin' ? 'مدير نظام' : 'مندوب مبيعات'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-secondary-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary-600 hover:bg-secondary-100 transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-error-600 hover:bg-error-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>تأكيد الحذف نهائياً</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


