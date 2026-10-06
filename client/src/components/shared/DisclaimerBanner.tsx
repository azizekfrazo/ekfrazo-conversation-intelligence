import { ShieldCheck } from 'lucide-react'

export function DisclaimerBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-[#1C2333] border border-[#4D3200] px-4 py-3 text-xs text-[#D29922]">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span>
        <strong>For demo and coaching purposes only.</strong> Final field messaging should follow
        approved medical, legal, and regulatory guidance from your organisation.
      </span>
    </div>
  )
}
