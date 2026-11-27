import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { api, workspacesApi, authApi } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal, ModalContent, ModalFooter, ModalTitle, ModalDescription } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Dropdown, DropdownItem, DropdownSeparator } from '../components/ui/Dropdown';
import Tooltip from '../components/ui/Tooltip';
import { Upload, User, Moon, Sun, Monitor, Bell, Key, Shield, Trash2, Save, Eye, EyeOff, Palette, Globe, Lock, Unlock, Users, Settings as SettingsIcon, LogOut, X, Check, Loader2, Image as ImageIcon, Camera, AlertCircle, Plus } from 'lucide-react';

const AVATAR_COLORS = [
  '#DC2626', '#059669', '#D97706', '#7C3AED', '#DB2777',
  '#0D9488', '#CA8A04', '#65A30D', '#2563EB', '#9333EA', '#EC4899', '#0891B2',
];

export default function Settings() {
  const { user, updateProfile, changePassword, logout, api: authApi } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { currentWorkspace, workspaces, updateWorkspace, createWorkspace, deleteWorkspace, refetch: refetchWorkspaces } = useWorkspace();

  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Workspace form
  const [workspaceForm, setWorkspaceForm] = useState({
    name: currentWorkspace?.name || '',
    icon: currentWorkspace?.icon || '📝',
    iconColor: currentWorkspace?.iconColor || '#0891B2',
  });

  const [showWorkspaceIconPicker, setShowWorkspaceIconPicker] = useState(false);
  const [showDeleteWorkspaceConfirm, setShowDeleteWorkspaceConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const ICONS = ['📝', '📄', '📋', '📚', '📖', '📔', '📕', '📗', '📘', '📙', '🗂️', '🗃️', '🗄️', '📁', '📂', '🗒️', '🗓️', '📅', '📆', '📇', '🏠', '🏢', '🏭', '🏫', '🏪', '🏬', '⚙️', '🔧', '🔨', '⚡', '🔋', '💡', '🔍', '🔎', '🔑', '🗝️', '🎯', '🎨', '🎭', '🎪', '🎫', '🎬', '🎮', '🕹️', '🎲', '♟️', '🌟', '⭐', '💫', '✨', '🌙', '☀️', '☁️', '⛈️', '🌈', '🚀', '🛸', '🛩️', '✈️', '🚁', '🚂', '⛵'];

  // Handle profile update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ name: profileForm.name });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Новые пароли не совпадают');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setError('Пароль должен быть не менее 8 символов');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle workspace update
  const handleWorkspaceSubmit = async (e) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setSaving(true);
    setError(null);
    try {
      await updateWorkspace(currentWorkspace.id, {
        name: workspaceForm.name,
        icon: workspaceForm.icon,
        iconColor: workspaceForm.iconColor,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите файл изображения');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Изображение должно быть меньше 2 МБ');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/upload`, {
        method: 'POST',
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка загрузки');

      await updateProfile({ avatarUrl: data.url });
      setAvatarPreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // Handle workspace icon selection
  const handleWorkspaceIconSelect = (icon) => {
    setWorkspaceForm(prev => ({ ...prev, icon }));
    setShowWorkspaceIconPicker(false);
  };

  // Handle workspace color selection
  const handleWorkspaceColorSelect = (color) => {
    setWorkspaceForm(prev => ({ ...prev, iconColor: color }));
  };

  // Handle delete workspace
  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace || deleteConfirmText !== currentWorkspace.name) return;
    setSaving(true);
    try {
      await deleteWorkspace(currentWorkspace.id);
      await refetchWorkspaces();
      setShowDeleteWorkspaceConfirm(false);
      setDeleteConfirmText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Theme options
  const themeOptions = [
    { value: 'light', label: 'Светлая', icon: Sun, description: 'Всегда использовать светлую тему' },
    { value: 'dark', label: 'Тёмная', icon: Moon, description: 'Всегда использовать тёмную тему' },
    { value: 'system', label: 'Системная', icon: Monitor, description: 'Соответствовать настройкам системы' },
  ];

  const tabs = [
    { id: 'profile', label: 'Профиль', icon: User },
    { id: 'appearance', label: 'Внешний вид', icon: Palette },
    { id: 'workspace', label: 'Рабочее пространство', icon: SettingsIcon },
    { id: 'security', label: 'Безопасность', icon: Shield },
    { id: 'danger', label: 'Опасная зона', icon: Trash2 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-heading-1 font-heading font-semibold">Настройки</h1>
        <p className="text-foreground-muted mt-1">Управляйте своим аккаунтом, рабочим пространством и предпочтениями.</p>
      </div>

      {/* Success toast */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-sm bg-success/10 border border-success/20 text-success shadow-lg animate-in">
          <Check className="h-5 w-5 flex-shrink-0" />
          <span>Сохранено успешно</span>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-sm bg-destructive/10 border border-destructive/20 text-destructive shadow-lg animate-in">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-destructive/70 hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tab navigation */}
      <nav className="flex gap-1 border-b border-border" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-foreground-muted hover:text-foreground hover:bg-muted'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Tab panels */}
      <div className="space-y-6">
        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Avatar section */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Фото профиля</h2>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Предпросмотр" className="w-full h-full object-cover" />
                    ) : user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl" style={{ backgroundColor: AVATAR_COLORS[user?.name?.charCodeAt(0) % AVATAR_COLORS.length] }}>
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 btn-icon bg-accent text-white rounded-full shadow-lg hover:bg-accent-hover transition-colors" aria-label="Сменить аватар">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" disabled={uploadingAvatar} />
                  </label>
                </div>
                <div>
                  <p className="font-medium">{uploadingAvatar ? 'Загрузка...' : 'Нажмите на иконку камеры, чтобы сменить фото'}</p>
                  <p className="text-sm text-foreground-muted mt-1">JPG, PNG или GIF. Макс. 2 МБ.</p>
                </div>
              </div>
            </Card>

            {/* Profile form */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Информация профиля</h2>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Отображаемое имя</label>
                  <Input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ваше имя"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Имя пользователя</label>
                  <Input
                    value={profileForm.username}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-foreground-muted mt-1">Имя пользователя нельзя изменить.</p>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Сохранение...' : 'Сохранить изменения'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Account info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Информация об аккаунте</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-foreground-muted">ID пользователя</dt>
                  <dd className="font-mono text-xs break-all">{user?.id}</dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">Участник с</dt>
                  <dd>{user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}</dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">Последний вход</dt>
                  <dd>{user?.updated_at ? new Date(user.updated_at).toLocaleString('ru-RU') : 'Неизвестно'}</dd>
                </div>
              </dl>
            </Card>
          </div>
        )}

        {/* Appearance tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Тема</h2>
              <p className="text-foreground-muted mb-6">Выберите, как Wrath будет выглядеть на вашем устройстве.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {themeOptions.map(option => (
                  <label
                    key={option.value}
                    className={`relative flex flex-col items-center p-6 rounded-lg border-2 transition-all cursor-pointer ${
                      theme === option.value
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={option.value}
                      checked={theme === option.value}
                      onChange={() => setTheme(option.value)}
                      className="sr-only"
                    />
                    <option.icon className="h-8 w-8 mb-3 text-foreground-muted" />
                    <span className="font-medium text-center">{option.label}</span>
                    <p className="text-xs text-foreground-muted text-center mt-1">{option.description}</p>
                    {theme === option.value && (
                      <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Предпросмотр</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-surface">
                  <h3 className="font-medium mb-2">Пример карточки</h3>
                  <p className="text-foreground-muted text-sm">Так будет выглядеть контент с текущими настройками темы.</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-muted">
                  <h3 className="font-medium mb-2">Приглушённый фон</h3>
                  <p className="text-foreground-muted text-sm">Вторичные области контента используют приглушённые фоны.</p>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="primary"><Save className="h-4 w-4" /> Основная</Button>
                  <Button variant="secondary"><Save className="h-4 w-4" /> Вторичная</Button>
                  <Button variant="outline"><Save className="h-4 w-4" /> Контурная</Button>
                  <Button variant="ghost"><Save className="h-4 w-4" /> Прозрачная</Button>
                  <Button variant="destructive"><Trash2 className="h-4 w-4" /> Опасная</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Workspace tab */}
        {activeTab === 'workspace' && currentWorkspace && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Настройки рабочего пространства</h2>
              <form onSubmit={handleWorkspaceSubmit} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowWorkspaceIconPicker(true)}
                      className="flex items-center justify-center w-14 h-14 rounded-lg bg-muted text-3xl hover:bg-muted-foreground/10 transition-colors"
                      aria-label="Сменить иконку рабочего пространства"
                    >
                      {workspaceForm.icon}
                    </button>
                    {showWorkspaceIconPicker && (
                      <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-surface border border-border rounded-lg shadow-xl p-3 animate-in">
                        <div className="mb-3">
                          <label className="block text-sm font-medium mb-2">Цвет иконки</label>
                          <div className="flex flex-wrap gap-1">
                            {AVATAR_COLORS.map(color => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => handleWorkspaceColorSelect(color)}
                                className={`w-7 h-7 rounded transition-colors ${
                                  workspaceForm.iconColor === color ? 'ring-2 ring-accent ring-offset-2 scale-110' : 'hover:ring-1 ring-border'
                                }`}
                                style={{ backgroundColor: color }}
                                aria-label={`Цвет ${color}`}
                              />
                            ))}
                          </div>
                        </div>
                        <DropdownSeparator />
                        <div className="grid grid-cols-7 gap-1 max-h-56 overflow-auto">
                          {ICONS.map(icon => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => handleWorkspaceIconSelect(icon)}
                              className={`p-1.5 text-xl rounded transition-colors hover:bg-muted ${
                                workspaceForm.icon === icon ? 'bg-muted ring-2 ring-accent' : ''
                              }`}
                              aria-label={`Иконка ${icon}`}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Название рабочего пространства</label>
                    <Input
                      value={workspaceForm.name}
                      onChange={(e) => setWorkspaceForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Название рабочего пространства"
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Сохранение...' : 'Сохранить изменения'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Workspace members */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Участники</h2>
              <p className="text-foreground-muted mb-4">Управляйте доступом к рабочему пространству.</p>
              <div className="space-y-3">
                {currentWorkspace && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Avatar src={user?.avatar_url} fallback={user?.name?.charAt(0)} size="md" />
                      <div>
                        <p className="font-medium">{user?.name} (Вы)</p>
                        <p className="text-sm text-foreground-muted">Владелец</p>
                      </div>
                    </div>
                    <Badge variant="primary">Владелец</Badge>
                  </div>
                )}
                <Button variant="outline" onClick={() => {}} className="w-full">
                  <Plus className="h-4 w-4" />
                  Пригласить участника
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Смена пароля</h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Текущий пароль</label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Введите текущий пароль"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Новый пароль</label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Введите новый пароль (мин. 8 символов)"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Подтвердите новый пароль</label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Подтвердите новый пароль"
                    disabled={saving}
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                    {saving ? 'Обновление...' : 'Обновить пароль'}
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Сессии</h2>
              <p className="text-foreground-muted mb-4">Управляйте активными сессиями входа.</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-foreground-muted" />
                    <div>
                      <p className="font-medium">Текущая сессия</p>
                      <p className="text-sm text-foreground-muted">Это устройство • Активна сейчас</p>
                    </div>
                  </div>
                  <Badge variant="success">Активна</Badge>
                </div>
                <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10">
                  <LogOut className="h-4 w-4" />
                  Выйти из всех остальных сессий
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Двухфакторная аутентификация</h2>
              <p className="text-foreground-muted mb-4">Добавьте дополнительный уровень безопасности к аккаунту.</p>
              <Button variant="outline">
                <Shield className="h-4 w-4" />
                Включить 2FA
              </Button>
            </Card>
          </div>
        )}

        {/* Danger Zone tab */}
        {activeTab === 'danger' && (
          <div className="space-y-6">
            <Card className="p-6 border-destructive/20">
              <h2 className="text-lg font-semibold text-destructive mb-2">Опасная зона</h2>
              <p className="text-foreground-muted mb-6">Необратимые и деструктивные действия.</p>

              {/* Delete workspace */}
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-destructive">Удалить рабочее пространство</h3>
                    <p className="text-sm text-foreground-muted mt-1">
                      Безвозвратно удалить это рабочее пространство и все его страницы, блоки, комментарии и данные. Это действие нельзя отменить.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setShowDeleteWorkspaceConfirm(true)}>
                    <Trash2 className="h-4 w-4" />
                    Удалить рабочее пространство
                  </Button>
                </div>
              </div>

              {/* Delete account */}
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 mt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-destructive">Удалить аккаунт</h3>
                    <p className="text-sm text-foreground-muted mt-1">
                      Безвозвратно удалить ваш аккаунт и все связанные данные во всех рабочих пространствах. Это действие нельзя отменить.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => {}}>
                    <User className="h-4 w-4" />
                    Удалить аккаунт
                  </Button>
                </div>
              </div>
            </Card>

            {/* Delete workspace confirmation modal */}
            <Modal
              isOpen={showDeleteWorkspaceConfirm}
              onClose={() => { setShowDeleteWorkspaceConfirm(false); setDeleteConfirmText(''); }}
              title="Удалить рабочее пространство"
              description="Это действие нельзя отменить. Все страницы, блоки, комментарии и данные будут безвозвратно удалены."
            >
              <ModalContent>
                <p className="text-sm text-foreground-muted mb-4">Введите название рабочего пространства для подтверждения:</p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={currentWorkspace?.name}
                  disabled={saving}
                />
              </ModalContent>
              <ModalFooter>
                <Button variant="ghost" onClick={() => { setShowDeleteWorkspaceConfirm(false); setDeleteConfirmText(''); }}>
                  Отмена
                </Button>
                <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={deleteConfirmText !== currentWorkspace?.name || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Удалить рабочее пространство
                </Button>
              </ModalFooter>
            </Modal>
          </div>
        )}
      </div>
    </div>
  );
}

