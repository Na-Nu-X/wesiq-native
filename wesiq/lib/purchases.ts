// In-App Subscription Purchases Through RevenueCat (Configured By usePurchasesUser After Login; Not Available On Web)

import { Platform } from "react-native"
import Purchases, { CustomerInfo, PurchasesError, PurchasesPackage } from "react-native-purchases"

export type PaidPlan = "basic"|"premium"

export const ENTITLEMENT_ID:string = "subscription" // Same Entitlement As Before

export const are_purchases_supported:boolean = Platform.OS === "ios" || Platform.OS === "android"

export type PurchaseResult =
    | { status:"purchased" }
    | { status:"cancelled" }
    | { status:"error" }

// Function For Get The Store Packages By Plan (Empty When The Store Isn't Available)
export const getPlanPackages = async ():Promise<Partial<Record<PaidPlan, PurchasesPackage>>> => {
    if(!are_purchases_supported) return {}

    try {
        if(!(await Purchases.isConfigured())) return {} // Configured Only For Logged In Users

        const offerings = await Purchases.getOfferings() // Gets The Offerings
        const packages:PurchasesPackage[] = offerings.current?.availablePackages ?? []

        return {
            basic: packages.find((one_package:PurchasesPackage) => one_package.identifier === "basic") ?? packages[0],
            premium: packages.find((one_package:PurchasesPackage) => one_package.identifier === "premium") ?? packages[1],
        }
    }

    catch {
        return {}
    }
}

const hasEntitlement = (customer_info:CustomerInfo):boolean => customer_info.entitlements.active[ENTITLEMENT_ID] !== undefined

// Function For Buy A Package
export const purchasePackage = async (store_package:PurchasesPackage):Promise<PurchaseResult> => {
    try {
        const { customerInfo } = await Purchases.purchasePackage(store_package) // Opens The Store Sheet
        return hasEntitlement(customerInfo) ? { status: "purchased" } : { status: "error" }
    }

    catch(error) {
        return (error as PurchasesError).userCancelled ? { status: "cancelled" } : { status: "error" }
    }
}

// Function For Restore Earlier Purchases (Returns If An Active Subscription Was Found, Null On Error)
export const restorePurchases = async ():Promise<boolean|null> => {
    try {
        return hasEntitlement(await Purchases.restorePurchases())
    }

    catch {
        return null
    }
}

let configured_user_id:string|null = null // RevenueCat Can Be Configured Only Once Per App Launch

// Function For Link The Store Customer To The Logged In User (Null = Logged Out)
export const syncPurchasesUser = async (api_key:string, user_id:number|null):Promise<void> => {
    if(!are_purchases_supported) return

    const is_real_key:boolean = /^(appl|goog)_/.test(api_key) // Placeholder Keys Would Only Log Store Errors

    try {
        if(user_id === null) {
            if(configured_user_id !== null && !(await Purchases.isAnonymous())) await Purchases.logOut()
            return
        }

        const app_user_id:string = user_id.toString()

        if(!(await Purchases.isConfigured())) {
            if(!is_real_key) return
            Purchases.configure({ apiKey: api_key, appUserID: app_user_id })
        }

        else if(configured_user_id !== app_user_id) await Purchases.logIn(app_user_id) // Another Account On The Same Device

        configured_user_id = app_user_id
    }

    catch {
        // Store Unavailable, The Subscribe Screen Falls Back To Default Prices
    }
}
