import { LucideIcon, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import clsx from 'clsx'

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

export const InputField = ({ label, value, onChange, type = "text", placeholder = "", required = false, readOnly = false, description }: InputFieldProps) => (
    <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">
            {label} {required && <span className="text-red-400">*</span>}
        </label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={readOnly}
            className="block w-full rounded-md border-gray-600 bg-gray-700/50 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm disabled:opacity-50"
        />
        {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
)

export const SectionHeader = ({ icon: Icon, title, description }: { icon: LucideIcon, title: string, description: string }) => (
    <div className="mb-6 flex items-center gap-3 border-b border-gray-700 pb-4">
        <div className="rounded-lg bg-indigo-500/10 p-2">
            <Icon className="h-6 w-6 text-indigo-400" />
        </div>
        <div>
            <h2 className="text-lg font-medium text-white">{title}</h2>
            <p className="text-sm text-gray-400">{description}</p>
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
    <div className="flex items-center gap-3 pt-4">
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className="flex items-center gap-2 rounded-md bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {label}
        </button>
        {result && (
            <div className={clsx("flex items-center gap-2 text-sm", result.success ? "text-green-400" : "text-red-400")}>
                {result.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {result.message}
            </div>
        )}
    </div>
)
