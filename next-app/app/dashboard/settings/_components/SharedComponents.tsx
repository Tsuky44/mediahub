import { LucideIcon, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

export interface InputFieldProps {
    label: string
    value: string
    onChange: (value: string) => void
    type?: string
    placeholder?: string
    required?: boolean
    readOnly?: boolean
    description?: string
}

export const InputField = ({ label, value, onChange, type = "text", placeholder = "", required = false, readOnly = false, description }: InputFieldProps) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'

    return (
        <div className="space-y-1.5 w-full">
            <label className="block text-sm font-semibold text-white/80">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            <div className="relative rounded-xl shadow-sm">
                <input
                    type={isPassword ? (showPassword ? 'text' : 'password') : type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={readOnly}
                    className={clsx(
                        "block w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder-white/30 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:text-sm disabled:opacity-50 transition-all duration-200",
                        isPassword && "pr-12"
                    )}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white transition-colors"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                )}
            </div>
            {description && <p className="text-xs text-white/40 leading-relaxed">{description}</p>}
        </div>
    )
}

export const CheckboxField = ({
    label,
    checked,
    onChange,
    description,
    readOnly = false,
}: {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
    description?: string
    readOnly?: boolean
}) => (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200">
        <div className="text-sm space-y-1">
            <label 
                className={clsx(
                    "font-medium text-white/95 select-none", 
                    !readOnly && "cursor-pointer"
                )}
                onClick={() => !readOnly && onChange(!checked)}
            >
                {label}
            </label>
            {description && <p className="text-xs text-white/50 leading-relaxed max-w-xl select-none">{description}</p>}
        </div>
        <button
            type="button"
            disabled={readOnly}
            onClick={() => onChange(!checked)}
            className={clsx(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed",
                checked ? "bg-indigo-600" : "bg-white/10"
            )}
        >
            <span
                className={clsx(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    </div>
)

export const SectionHeader = ({ icon: Icon, title, description }: { icon: LucideIcon, title: string, description: string }) => (
    <div className="mb-6 flex items-start gap-4 border-b border-white/5 pb-5">
        <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400 border border-indigo-500/10 shadow-inner shrink-0">
            <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
            <h2 className="text-lg font-bold text-white tracking-wide">{title}</h2>
            <p className="text-sm text-white/60 leading-relaxed">{description}</p>
        </div>
    </div>
)

export interface TestResult {
    success: boolean
    message: string
}

export const TestButton = ({ 
    onClick, 
    loading, 
    result, 
    label = "Tester la connexion" 
}: { 
    onClick: () => void, 
    loading: boolean, 
    result: TestResult | null, 
    label?: string 
}) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4">
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 active:scale-95 disabled:opacity-50 transition-all duration-200"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : null}
            {label}
        </button>
        {result && (
            <div className={clsx("flex items-center gap-2.5 text-sm font-medium px-4 py-2 rounded-xl border", 
                result.success 
                    ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20" 
                    : "text-rose-400 bg-rose-500/5 border-rose-500/20"
            )}>
                {result.success ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" /> : <XCircle className="h-4.5 w-4.5 text-rose-400" />}
                {result.message}
            </div>
        )}
    </div>
)
