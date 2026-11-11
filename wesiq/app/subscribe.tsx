// Subscription Plans: Compare Free, Basic And Premium, Buy Or Restore

import { useEffect, useState } from "react"
import { Pressable, PressableStateCallbackType, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Button, Card, Header, Icon, Screen, Skeleton, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { showAlert } from "@/lib/alert"
import { formatDuration, formatMegabytes } from "@/lib/format"
import { getActiveSubscriptionPlan } from "@/lib/subscription"
import { are_purchases_supported, getPlanPackages, PaidPlan, purchasePackage, restorePurchases } from "@/lib/purchases"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"
import { getMediaLimits, MediaLimits } from "@/components/features/upload-post/mediaRules"

import type { PurchasesPackage } from "react-native-purchases"
import type { IconName } from "@/components/ui"
import type { SubscriptionPlan } from "@/types/models"

const FALLBACK_PRICES:Record<PaidPlan, string> = { basic: "0,99 €", premium: "2,99 €" } // Shown When The Store Isn't Available
const PLANS:readonly PaidPlan[] = ["basic", "premium"]

export default function SubscribeScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user, refreshLoggedInUser } = useLoggedInUser() // Gets The Logged In User
    const auth_sheet = useAuthSheet() // Opens The Login Sheet
    const [selected_plan, setSelectedPlan] = useState<PaidPlan>("premium")
    const [packages, setPackages] = useState<Partial<Record<PaidPlan, PurchasesPackage>>|null>(null) // Null While Loading
    const [busy_action, setBusyAction] = useState<"purchase"|"restore"|null>(null)

    const current_plan:SubscriptionPlan = getActiveSubscriptionPlan(logged_in_user) // Gets The Current Plan
    const user_id:number|null = logged_in_user?.id ?? null

    // Initializes The Load Of The Store Prices (Again After Login, Because The Store Is Configured Per User)
    useEffect(() => {
        let is_active:boolean = true
        getPlanPackages().then((loaded) => { if(is_active) setPackages(loaded) })

        return () => {
            is_active = false
        }
    }, [user_id])

    const getPrice = (plan:PaidPlan):string => packages?.[plan]?.product.priceString ?? FALLBACK_PRICES[plan]

    const plan_names:Record<SubscriptionPlan, string> = {
        free: t("Zadarmo"),
        basic: t("Základné"),
        premium: t("Prémiové"),
    }

    const plan_descriptions:Record<PaidPlan, string> = {
        basic: t("Vážime si Vašu podporu, ktorá nám pomáha držať aplikáciu pri živote."),
        premium: t("Pre náročných používateľov, ktorí chcú z aplikácie vyťažiť absolútne maximum."),
    }

    // Function For Get The Benefits Of A Plan (Limits Come From The Same Rules As The Upload)
    const getBenefits = (plan:SubscriptionPlan):{ icon:IconName, label:string }[] => {
        const limits:MediaLimits = getMediaLimits(plan) // Gets The Limits

        return [
            { icon: "crown", label: t("Odznak na profile") },
            { icon: "image", label: t("Obrázky do {{size}}", { size: formatMegabytes(limits.max_image_bytes) }) },
            { icon: "film", label: t("Videá do {{size}}", { size: formatMegabytes(limits.max_video_bytes) }) },
            { icon: "clock", label: t("Videá dlhé až {{duration}}", { duration: formatDuration(limits.max_video_seconds) }) },
            { icon: "wand-magic-sparkles", label: plan === "premium" ? t("Najlepšia kvalita obrázkov a videí") : t("Lepšia kvalita obrázkov a videí") },
        ]
    }

    // Function For Buy The Selected Plan
    const purchase = async ():Promise<void> => {
        if(!logged_in_user) {
            auth_sheet.open("login_form")
            return
        }

        const store_package:PurchasesPackage|undefined = packages?.[selected_plan] // Gets The Package

        if(!store_package) {
            showAlert(t("Chyba"), t("Predplatné sa momentálne nedá kúpiť. Skúste to neskôr."))
            return
        }

        setBusyAction("purchase")
        const result = await purchasePackage(store_package) // Opens The Store
        setBusyAction(null)

        if(result.status === "cancelled") return

        if(result.status === "error") {
            showAlert(t("Chyba"), t("Pri nákupe predplatného nastala chyba."))
            return
        }

        haptics.success()
        showAlert(t("Úspech"), t("Ďakujeme, predplatné bolo úspešne kúpené!"))
        refreshLoggedInUser() // Loads The New Subscription
    }

    // Function For Restore Earlier Purchases
    const restore = async ():Promise<void> => {
        setBusyAction("restore")
        const has_subscription:boolean|null = await restorePurchases() // Asks The Store
        setBusyAction(null)

        if(has_subscription === null) {
            showAlert(t("Chyba"), t("Nákupy sa nepodarilo obnoviť."))
            return
        }

        if(has_subscription) {
            haptics.success()
            refreshLoggedInUser()
        }

        showAlert(has_subscription ? t("Úspech") : t("Žiadne nákupy"), has_subscription ? t("Predplatné bolo obnovené.") : t("Nenašli sa žiadne predplatné na obnovenie."))
    }

    const is_current_selected:boolean = current_plan === selected_plan
    const is_loading_prices:boolean = are_purchases_supported && packages === null

    const footer = are_purchases_supported ? (
        <View style={styles.footer}>
            <Button
                label={!logged_in_user ? t("Prihlásiť sa a predplatiť") : is_current_selected ? t("Váš aktuálny plán") : t("Predplatiť {{plan}} · {{price}}", { plan: plan_names[selected_plan], price: getPrice(selected_plan) })}
                icon={is_current_selected ? "check" : "crown"}
                onPress={purchase}
                is_loading={busy_action === "purchase"}
                is_disabled={is_current_selected || busy_action !== null}
                is_full_width
                size="lg"
            />

            {logged_in_user && <Button label={t("Obnoviť nákupy")} variant="ghost" size="sm" onPress={restore} is_loading={busy_action === "restore"} is_disabled={busy_action !== null} />}
        </View>
    ) : undefined

    return (
        <Screen header={<Header title={t("Predplatné")} has_back_button />} footer={footer} has_glow>
            <View style={styles.hero}>
                <View style={styles.hero_icon}><Icon name="crown" size={28} color="premium" /></View>
                <Text variant="title" align="center" accessibilityRole="header">{t("Získajte viac z Wesiq")}</Text>
                <Text variant="body" color="text_secondary" align="center">{t("Väčšie a dlhšie videá, lepšia kvalita a odznak na profile.")}</Text>
            </View>

            {current_plan !== "free" && (
                <Card variant="highlighted" padding="md" style={styles.current}>
                    <Icon name="circle-check" size={18} color="success" />
                    <Text variant="body_strong" style={styles.flex}>{t("Máte aktívne predplatné: {{plan}}", { plan: plan_names[current_plan] })}</Text>
                </Card>
            )}

            {/* ---------- Plans ---------- */}
            <View style={styles.plans} accessibilityRole="radiogroup">
                {PLANS.map((plan:PaidPlan) => {
                    const is_selected:boolean = selected_plan === plan

                    return (
                        <Pressable
                            key={plan}
                            onPress={() => {
                                haptics.selection()
                                setSelectedPlan(plan)
                            }}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: is_selected }}
                            accessibilityLabel={`${plan_names[plan]}, ${getPrice(plan)} ${t("mesačne")}`}
                            style={({ pressed }:PressableStateCallbackType) => [styles.plan, is_selected ? styles.plan_selected : null, pressed ? styles.plan_pressed : null]}
                        >
                            <View style={styles.plan_top}>
                                <View style={[styles.radio, is_selected ? styles.radio_selected : null]}>{is_selected && <View style={styles.radio_dot} />}</View>
                                <Text variant="heading" style={styles.flex}>{plan_names[plan]}</Text>
                                {plan === "premium" && <View style={styles.badge}><Text variant="caption" color="premium">{t("Najviac možností")}</Text></View>}
                                {current_plan === plan && <View style={styles.badge_current}><Text variant="caption" color="success">{t("Aktuálny")}</Text></View>}
                            </View>

                            <Text variant="callout" color="text_secondary">{plan_descriptions[plan]}</Text>

                            <View style={styles.price_row}>
                                {is_loading_prices ? <Skeleton width={80} height={28} radius={radii.sm} /> : <Text variant="title" is_tabular>{getPrice(plan)}</Text>}
                                <Text variant="callout" color="text_muted">/ {t("mesiac")}</Text>
                            </View>

                            <View style={styles.benefits}>
                                {getBenefits(plan).map((benefit) => (
                                    <View key={benefit.icon} style={styles.benefit}>
                                        <Icon name={benefit.icon} size={13} color={is_selected ? "primary" : "text_muted"} />
                                        <Text variant="callout" style={styles.flex}>{benefit.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </Pressable>
                    )
                })}
            </View>

            {/* ---------- Free Plan For Comparison ---------- */}
            <Card padding="md" style={styles.free}>
                <Text variant="label" color="text_secondary">{t("Zadarmo")}</Text>
                <Text variant="caption" color="text_muted">
                    {(() => {
                        const limits:MediaLimits = getMediaLimits("free") // Gets The Free Limits
                        return t("Obrázky do {{image}}, videá do {{video}} a {{duration}}.", { image: formatMegabytes(limits.max_image_bytes), video: formatMegabytes(limits.max_video_bytes), duration: formatDuration(limits.max_video_seconds) })
                    })()}
                </Text>
            </Card>

            {are_purchases_supported ? (
                <Text variant="caption" color="text_muted" align="center">{t("Predplatné sa obnovuje automaticky každý mesiac. Zrušiť ho môžete kedykoľvek v nastaveniach obchodu.")}</Text>
            ) : (
                <Card variant="outlined" padding="md" style={styles.current}>
                    <Icon name="mobile-screen" size={18} color="primary" />
                    <Text variant="callout" color="text_secondary" style={styles.flex}>{t("Predplatné si môžete kúpiť v aplikácii Wesiq pre iOS alebo Android.")}</Text>
                </Card>
            )}
        </Screen>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    hero: {
        alignItems: "center",
        gap: spacing.sm,
        paddingVertical: spacing.md,
    },

    hero_icon: {
        width: 64,
        height: 64,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.xs,
        backgroundColor: colors.premium_soft,
        borderRadius: radii.pill,
    },

    current: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },

    plans: {
        gap: spacing.md,
    },

    plan: {
        gap: spacing.sm,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radii.lg,
    },

    plan_selected: {
        backgroundColor: colors.primary_soft,
        borderColor: colors.primary,
    },

    plan_pressed: {
        opacity: 0.85,
    },

    plan_top: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    radio: {
        width: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: colors.border_strong,
        borderRadius: radii.pill,
    },

    radio_selected: {
        borderColor: colors.primary,
    },

    radio_dot: {
        width: 10,
        height: 10,
        backgroundColor: colors.primary,
        borderRadius: radii.pill,
    },

    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        backgroundColor: colors.premium_soft,
        borderRadius: radii.pill,
    },

    badge_current: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        backgroundColor: colors.success_soft,
        borderRadius: radii.pill,
    },

    price_row: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: spacing.xs,
    },

    benefits: {
        gap: spacing.sm,
        paddingTop: spacing.xs,
    },

    benefit: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    free: {
        gap: 2,
    },

    footer: {
        alignItems: "center",
        gap: spacing.xs,
    },
})
