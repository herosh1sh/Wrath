import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toaster';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

export function Settings() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({ displayName: user?.displayName || '', email: user?.email || '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile(profileData);
    setSaving(false);
    if (result.success) {
      toast.success('Saved', 'Profile updated');
    } else {
      toast.error('Error', result.error);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Error', 'Passwords do not match');
      return;
    }
    setSaving(true);
    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
    setSaving(false);
    if (result.success) {
      toast.success('Changed', 'Password updated');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      toast.error('Error', result.error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground-primary mb-6">Settings</h1>

      <div className="flex gap-4 mb-6 border-b border-border-light">
        {['profile', 'account', 'appearance'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-tertiary hover:text-foreground-primary'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="space-y-4">
          <Input
            label="Display Name"
            value={profileData.displayName}
            onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
          />
          <Button type="submit" loading={saving}>Save Changes</Button>
        </form>
      )}

      {activeTab === 'account' && (
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
          />
          <Button type="submit" variant="danger" loading={saving}>Change Password</Button>
        </form>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-4">
          <p className="text-foreground-secondary">Appearance settings coming soon...</p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-border-light">
        <Button variant="danger" onClick={handleLogout}>Log Out</Button>
      </div>
    </div>
  );
}