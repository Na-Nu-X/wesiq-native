// One Blog Article: Overview, Statistics, Rating, Content And Comments

import { ComponentType, useCallback, useMemo, useState } from "react"
import { Pressable, Share, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { router, useLocalSearchParams } from "expo-router"
import { useTranslation } from "react-i18next"
import { Button, Card, EmptyState, ErrorState, Header, Icon, IconButton, Screen, Skeleton, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { showAlert } from "@/lib/alert"
import { useApiQuery } from "@/hooks/useApiQuery"
import { addArticleComment, ArticleDetail, deleteArticleComment, getArticle, getArticleComments, getArticleImageUrl, getArticleWebLink, rateArticle, reportArticleComment, toggleArticleCommentLike } from "@/lib/api/endpoints/blog"
import { getFormattedDate } from "@/utils/time"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"
import CommentsSheet, { CommentsSource } from "@/components/features/posts/CommentsSheet"
import FrontLever from "@/components/pages/articles/front_lever"

// In-App Article Bodies By Their Server File Name
const ARTICLE_BODIES:Record<string, ComponentType> = {
    "front_lever.html": FrontLever,
}

export default function ArticleScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { article: link } = useLocalSearchParams<{ article:string }>() // Gets The Article Link
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const auth_sheet = useAuthSheet() // Opens The Login Sheet
    const [is_comments_open, setIsCommentsOpen] = useState<boolean>(false)
    const [is_rating, setIsRating] = useState<boolean>(false)

    const { state, refetch, is_refreshing, setData } = useApiQuery(`article:${link ?? ""}`, (signal:AbortSignal) => getArticle(link ?? "", signal), { is_enabled: Boolean(link) })
    const article:ArticleDetail|null = state.data && !state.data.not_found && state.data.article ? state.data.article : null

    const updateArticle = useCallback((changes:Partial<ArticleDetail>) => setData((previous) => previous?.article ? { ...previous, article: { ...previous.article, ...changes } } : previous), [setData])

    // Comments Source (Stable While The Article Stays The Same)
    const article_id:number|null = article?.id ?? null
    const comments_count:number = article?.comments_amount ?? 0

    const comments_source:CommentsSource|null = useMemo(() => article_id === null ? null : ({
        key: `article:${article_id}`,
        comments_count,
        allow_comments: true,
        load: (page:number, signal?:AbortSignal) => getArticleComments(article_id, page, signal),
        add: (comment:string, parent_id:number|null) => addArticleComment(article_id, comment, parent_id),
        like: toggleArticleCommentLike,
        report: reportArticleComment,
        remove: deleteArticleComment,
    }), [article_id, comments_count])

    // Function For Rate The Article
    const rate = async (rating:number):Promise<void> => {
        if(!article) return
        if(!logged_in_user) {
            auth_sheet.open("login_form")
            return
        }

        setIsRating(true)
        const response = await rateArticle(article.id, rating) // Sends The Rating
        setIsRating(false)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        updateArticle({ given_rating: rating })
        refetch() // Reloads The Average
    }

    // Labels Of The Statistics (Same Thresholds As Before)
    const getDifficultyLabel = (value:number):string => value <= 10 ? t("jednoduchá") : value <= 30 ? t("stredná") : value <= 60 ? t("náročná") : value <= 90 ? t("veľmi náročná") : t("elitná")
    const getRarityLabel = (value:number):string => value <= 10 ? t("bežné") : value <= 30 ? t("nevídané") : value <= 60 ? t("vzácne") : value <= 90 ? t("epické") : t("legendárne")

    const header = (
        <Header
            title={article?.title ?? t("Článok")}
            has_back_button

            right={article ? (
                <IconButton icon="share-nodes" accessibility_label={t("Zdieľať článok")} onPress={() => Share.share({ title: article.title, message: `Wesiq - ${article.title}\n${getArticleWebLink(article)}`, url: getArticleWebLink(article) }).catch(() => {})} variant="soft" size={38} />
            ) : undefined}
        />
    )

    if(state.status === "loading") return <Screen header={header}><Skeleton height={220} radius={radii.lg} /><Skeleton height={140} radius={radii.lg} /></Screen>
    if(state.status === "error") return <Screen header={header}><ErrorState error={state.error} onRetry={refetch} /></Screen>

    if(!article) {
        return (
            <Screen header={header}>
                <EmptyState icon="book-open" title={t("Článok sa nenašiel")} action={{ label: t("Späť na blog"), onPress: () => router.replace("/blog") }} />
            </Screen>
        )
    }

    const Body:ComponentType|undefined = article.html_filename ? ARTICLE_BODIES[article.html_filename] : undefined
    const image_url:string|null = getArticleImageUrl(article.image_name)

    const stats:{ label:string, value:number|null, text?:string }[] = [
        { label: t("Obtiažnosť"), value: article.difficulty, text: article.difficulty !== null ? getDifficultyLabel(article.difficulty) : undefined },
        { label: t("Doba učenia"), value: article.time_to_learn, text: article.time_to_learn_text === "2 - 6 months" ? t("2 - 6 mesiacov") : article.time_to_learn_text ?? undefined },
        { label: t("Vzácnosť"), value: article.rarity, text: article.rarity !== null ? getRarityLabel(article.rarity) : undefined },
        { label: t("Sila"), value: article.strength },
        { label: t("Technika"), value: article.technique },
    ]

    return (
        <>
            <Screen header={header} refresh={{ is_refreshing, onRefresh: refetch }}>
                {image_url && (
                    <View style={styles.image}>
                        <Image source={{ uri: image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                    </View>
                )}

                <View style={styles.intro}>
                    <Text variant="title" accessibilityRole="header">{article.title}</Text>
                    <Text variant="body" color="text_secondary">{article.description}</Text>

                    <Text variant="caption" color="text_muted">
                        {getFormattedDate(article.creation_time)} · {t("Zobrazenia")}: {article.visitors} · @{article.user.username}
                    </Text>
                </View>

                {/* ---------- Rating ---------- */}
                <Card padding="md" style={styles.rating_card}>
                    <View style={styles.flex}>
                        <Text variant="body_strong">{article.average_rating > 0 ? `${article.average_rating.toFixed(1)} / 5` : t("Zatiaľ žiadne hodnotenia")}</Text>
                        <Text variant="caption" color="text_muted">{article.given_rating ? t("Vaše hodnotenie: {{rating}}", { rating: article.given_rating }) : t("Ohodnoťte článok")}</Text>
                    </View>

                    <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={t("Ohodnoťte článok")}>
                        {[1, 2, 3, 4, 5].map((star:number) => {
                            const is_filled:boolean = star <= (article.given_rating ?? Math.round(article.average_rating))

                            return (
                                <Pressable key={star} onPress={() => rate(star)} disabled={is_rating} hitSlop={4} accessibilityRole="button" accessibilityLabel={t("{{count}} z 5", { count: star })}>
                                    <Icon name="star" size={22} color={is_filled ? "premium" : "surface_strong"} />
                                </Pressable>
                            )
                        })}
                    </View>
                </Card>

                {/* ---------- Statistics ---------- */}
                {stats.some((stat) => stat.value != null) && (
                    <Card padding="lg" style={styles.stats}>
                        {stats.filter((stat) => stat.value != null).map((stat) => ( // != Also Skips Missing Fields
                            <View key={stat.label} style={styles.stat} accessible accessibilityLabel={`${stat.label}: ${stat.text ?? `${stat.value}%`}`}>
                                <View style={styles.stat_row}>
                                    <Text variant="label" color="text_secondary">{stat.label}</Text>
                                    <Text variant="label" color="text">{stat.text ?? `${stat.value}%`}</Text>
                                </View>

                                <View style={styles.track}>
                                    <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, stat.value ?? 0))}%` }]} />
                                </View>
                            </View>
                        ))}
                    </Card>
                )}

                {/* ---------- Content ---------- */}
                {Body ? <Card padding="lg"><Body /></Card> : <EmptyState icon="pen-ruler" title={t("Tento článok nie je ešte dokončený.")} is_compact />}

                <Button
                    label={article.comments_amount > 0 ? t("Zobraziť komentáre ({{count}})", { count: article.comments_amount }) : t("Pridať komentár...")}
                    icon="comment"
                    variant="secondary"
                    onPress={() => setIsCommentsOpen(true)}
                    is_full_width
                />
            </Screen>

            <CommentsSheet
                source={is_comments_open ? comments_source : null}
                onClose={() => setIsCommentsOpen(false)}
                onRequireLogin={() => auth_sheet.open("login_form")}
                onCommentsCountChange={(delta:number) => updateArticle({ comments_amount: Math.max(0, article.comments_amount + delta) })}
            />
        </>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    image: {
        width: "100%",
        aspectRatio: 16 / 9,
        overflow: "hidden",
        backgroundColor: colors.surface_raised,
        borderRadius: radii.lg,
    },

    intro: {
        gap: spacing.sm,
    },

    rating_card: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },

    stars: {
        flexDirection: "row",
        gap: spacing.xs + 2,
    },

    stats: {
        gap: spacing.md,
    },

    stat: {
        gap: spacing.xs + 2,
    },

    stat_row: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    track: {
        height: 6,
        overflow: "hidden",
        backgroundColor: colors.surface_strong,
        borderRadius: radii.pill,
    },

    fill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: radii.pill,
    },
})
