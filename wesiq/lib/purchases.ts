// In-App Subscription Purchases Through RevenueCat (Configured By usePurchasesUser After Login; Not Available On Web)

import { Platform } from "react-native"
import Purchases, { CustomerInfo, PurchasesError, PurchasesPackage } from "react-native-purchases"

export type PaidPlan = "basic"|"premium"

// RevenueCat Entitlements Per Plan (The Server Webhook Uses The Same IDs)
export const ENTITLEMENT_IDS:Record<PaidPlan, string> = { basic: "basic_access", premium: "premium_access" } // Defines The Entitlement IDs

export const are_purchases_supported:boolean = Platform.OS === "ios" || Platform.OS === "android" // Checks If The Purchases Are Supported

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
        const packages:PurchasesPackage[] = offerings.current?.availablePackages ?? [] // Gets The Packages

        // Strictly By Identifier (A Positional Fallback Could Sell The Wrong Plan); A Missing Package Can't Be Bought
        const result:Partial<Record<PaidPlan, PurchasesPackage>> = {} // Gets The Result
        const basic:PurchasesPackage|undefined = packages.find((one_package:PurchasesPackage) => one_package.identifier === "basic") // Gets The Basic
        const premium:PurchasesPackage|undefined = packages.find((one_package:PurchasesPackage) => one_package.identifier === "premium") // Gets The Premium
        if(basic) result.basic = basic
        if(premium) result.premium = premium

        return result
    }

    catch {
        return {}
    }
}

// Function For Check If Entitlement
const hasEntitlement = (customer_info:CustomerInfo):boolean => Object.values(ENTITLEMENT_IDS).some((entitlement_id:string) => customer_info.entitlements.active[entitlement_id] !== undefined)

type ProductChangeInfo = Parameters<typeof Purchases.purchasePackage>[2] // StoreProductChangeInfo (Android Only)

// Function For Get The Product Change Of A Switch Between Basic And Premium On Google Play (Null For A New Subscription)
// Without It Google Play Starts A Second Subscription Next To The Old One And Bills Both
// Function For Get The Product Change Info
const getProductChangeInfo = async (store_package:PurchasesPackage, plan:PaidPlan):Promise<ProductChangeInfo> => {
    if(Platform.OS !== "android") return null // The App Store Switches Plans Inside The Subscription Group By Itself

    const customer_info:CustomerInfo = await Purchases.getCustomerInfo() // Gets The Current Purchases

    // Gets The Running Google Play Plan (Premium First, A Premium Product May Also Unlock Basic)
    const current_plan:PaidPlan|undefined = (["premium", "basic"] as const).find((one_plan:PaidPlan) => customer_info.entitlements.active[ENTITLEMENT_IDS[one_plan]]?.store === "PLAY_STORE") // Gets The Current Plan
    if(!current_plan) return null

    const old_product_id:string = customer_info.entitlements.active[ENTITLEMENT_IDS[current_plan]]?.productIdentifier ?? "" // Gets The Old Product ID
    const getSubscriptionId = (product_id:string):string => product_id.split(":")[0] ?? product_id // "subscription:base-plan" → "subscription"

    if(!old_product_id || getSubscriptionId(old_product_id) === getSubscriptionId(store_package.product.identifier)) return null

    return {
        oldProductIdentifier: getSubscriptionId(old_product_id),

        // Upgrade: Premium Right Away, Paying Only The Difference For The Rest Of The Month
        // Downgrade: Premium Stays Until The Paid Month Ends, Then Basic Starts
        replacementMode: current_plan === "basic" && plan === "premium" ? Purchases.STORE_REPLACEMENT_MODE.CHARGE_PRORATED_PRICE : Purchases.STORE_REPLACEMENT_MODE.DEFERRED,
    }
}

// Function For Buy A Package (Switches The Running Google Play Plan Instead Of Adding A Second Subscription)
export const purchasePackage = async (store_package:PurchasesPackage, plan:PaidPlan, user_id:number):Promise<PurchaseResult> => {
    try {
        if(!(await isIdentifiedAs(user_id))) return { status: "error" } // An Anonymous Purchase Would Never Reach The Wesiq Account

        const product_change_info:ProductChangeInfo = await getProductChangeInfo(store_package, plan) // Gets The Plan Switch
        const { customerInfo } = await Purchases.purchasePackage(store_package, null, product_change_info) // Opens The Store Sheet
        return hasEntitlement(customerInfo) ? { status: "purchased" } : { status: "error" }
    }

    catch(error) {
        return (error as PurchasesError).userCancelled ? { status: "cancelled" } : { status: "error" }
    }
}

// Function For Restore Earlier Purchases (Returns If An Active Subscription Was Found, Null On Error)
export const restorePurchases = async (user_id:number):Promise<boolean|null> => {
    try {
        if(!(await isIdentifiedAs(user_id))) return null // Restoring Into An Anonymous Customer Would Move The Purchase Away From The Account

        return hasEntitlement(await Purchases.restorePurchases())
    }

    catch {
        return null
    }
}

// Function For Get The RevenueCat User ID Of A Wesiq User (The Server Maps It Back To The User's Primary Key)
export const getAppUserId = (user_id:number):string => String(user_id)

// Function For Link The Store Customer To The Logged In User (Null = Logged Out)
// RevenueCat's Own Current User Is Checked Every Time, So Logging Out And Back In As The Same User Logs In Again
// Function For Sync The Purchases User
export const syncPurchasesUser = async (api_key:string, user_id:number|null):Promise<void> => {
    if(!are_purchases_supported) return

    const is_real_key:boolean = /^(appl|goog)_/.test(api_key) // Placeholder Keys Would Only Log Store Errors

    try {
        if(user_id === null) {
            if(await Purchases.isConfigured() && !(await Purchases.isAnonymous())) await Purchases.logOut() // Back To An Anonymous Customer
            return
        }

        const app_user_id:string = getAppUserId(user_id) // Gets The App User ID

        if(!(await Purchases.isConfigured())) {
            if(!is_real_key) return
            Purchases.configure({ apiKey: api_key, appUserID: app_user_id })
        }

        else if((await Purchases.getAppUserID()) !== app_user_id) await Purchases.logIn(app_user_id) // Logged Out Before Or Another Account On The Same Device
    }

    catch {
        // Store Unavailable, The Subscribe Screen Shows No Prices And Can't Purchase
    }
}

// Function For Check That RevenueCat's Customer Is Exactly The Logged In User (Never Anonymous "$RCAnonymousID:...")
const isIdentifiedAs = async (user_id:number):Promise<boolean> => {
    if(!(await Purchases.isConfigured()) || await Purchases.isAnonymous()) return false
    return (await Purchases.getAppUserID()) === getAppUserId(user_id)
}
