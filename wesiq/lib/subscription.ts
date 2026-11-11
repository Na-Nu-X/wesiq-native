// Subscription Helpers

import type { LoggedInUser, SubscriptionPlan } from "@/types/models"

// Function For Get The Active Subscription Plan ("free" When There Is No Active Subscription)
export const getActiveSubscriptionPlan = (user:Pick<LoggedInUser, "subscription">|null|undefined):SubscriptionPlan => {
    const subscription = user?.subscription // Gets The Subscription
    if(!subscription || !subscription.is_active) return "free"

    return subscription.plan ?? "free"
}
