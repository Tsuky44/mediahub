
import { getCurrentUser } from "@/lib/auth"
import { ImpersonationBannerClient } from "./ImpersonationBannerClient"

export async function ImpersonationBanner() {
  const user = await getCurrentUser()
  
  if (!(user as any)?.isImpersonated) {
    return null
  }

  return (
    <ImpersonationBannerClient 
      roleName={(user as any).role} 
    />
  )
}
