'use client';

import React from 'react';
import { ShieldCheck, Users, BadgeDollarSign, User, CheckCircle2 } from 'lucide-react';
import { UserRole, ROLE_DEFINITIONS } from '@/types/auth';

interface RoleSelectorProps {
  selectedRole: UserRole | null;
  onRoleChange: (role: UserRole) => void;
  disabled?: boolean;
  className?: string;
}

export function RoleSelector({
  selectedRole,
  onRoleChange,
  disabled = false,
  className = '',
}: RoleSelectorProps) {
  const roles: UserRole[] = ['ADMIN', 'HR', 'ACCOUNTANT', 'EMPLOYEE'];

  const getRoleIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-indigo-400" />;
      case 'Users':
        return <Users className="w-5 h-5 text-blue-400" />;
      case 'BadgeDollarSign':
        return <BadgeDollarSign className="w-5 h-5 text-emerald-400" />;
      case 'User':
        return <User className="w-5 h-5 text-purple-400" />;
      default:
        return <User className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, role: UserRole) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRoleChange(role);
    }
  };

  return (
    <div className={`w-full ${className}`} role="radiogroup" aria-label="Select Account Role">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {roles.map((roleKey) => {
          const role = ROLE_DEFINITIONS[roleKey];
          const isSelected = selectedRole === roleKey;

          return (
            <div
              key={roleKey}
              role="radio"
              aria-checked={isSelected}
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && onRoleChange(roleKey)}
              onKeyDown={(e) => handleKeyDown(e, roleKey)}
              className={`
                relative flex flex-col p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none outline-none
                ${
                  disabled
                    ? 'opacity-50 cursor-not-allowed border-gray-800 bg-gray-900/40'
                    : isSelected
                    ? 'border-indigo-500/80 bg-gradient-to-br from-indigo-950/40 to-slate-900/80 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'border-gray-800/80 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-800/40 focus-visible:ring-2 focus-visible:ring-indigo-500'
                }
              `}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <div
                    className={`p-1.5 rounded-lg border ${
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/40'
                        : 'bg-gray-800/70 border-gray-700/60'
                    }`}
                  >
                    {getRoleIcon(role.iconName)}
                  </div>
                  <div>
                    <span className="text-sm font-semibold tracking-wide text-white">
                      {role.title}
                    </span>
                  </div>
                </div>

                {isSelected ? (
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-gray-700 shrink-0" />
                )}
              </div>

              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                {role.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
