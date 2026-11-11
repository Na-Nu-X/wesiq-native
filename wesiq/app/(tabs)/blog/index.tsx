// Blog: Articles With Search, Sorting And Categories

import { useState } from "react"
import { FlatList, ListRenderItemInfo, ScrollView, Share, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { useTranslation } from "react-i18next"
import { Card, Chip, EmptyState, ErrorState, Header, Icon, IconButton, Screen, Skeleton, Text, TextField } from "@/components/ui"
import { colors, layout, radii, spacing } from "@/theme"
import { useApiQuery } from "@/hooks/useApiQuery"
import { ArticleSort, getArticleImageUrl, getArticleWebLink, getArticles } from "@/lib/api/endpoints/blog"
import { getFormattedDate } from "@/utils/time"

import type { Article } from "@/types/models"

const CATEGORIES:readonly string[] = ["all", "static", "dynamic", "isotonic", "balance", "flexibility", "push", "pull", "legs", "beginner", "intermediate", "advanced", "elite"]
const SORTS:readonly ArticleSort[] = ["latest", "popular", "best", "a-z", "z-a"]

export default function BlogScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const [sort, setSort] = useState<ArticleSort>("latest")
    const [category, setCategory] = useState<string>("all")
    const [search, setSearch] = useState<string>("")

    const { state, refetch, is_refreshing } = useApiQuery(`articles:${sort}:${category}`, (signal:AbortSignal) => getArticles(sort, category, signal))

    const sort_labels:Record<ArticleSort, string> = {
        latest: t("Najnovšie články"),
        popular: t("Populárne články"),
        best: t("Najlepšie hodnotené"),
        "a-z": t("Podľa abecedy (A-Z)"),
        "z-a": t("Podľa abecedy (Z-A)"),
    }

    const category_labels:Record<string, string> = {
        all: t("Všetky kategórie"),
        static: t("Statické prvky"),
        dynamic: t("Dynamické triky"),
        isotonic: t("Izotonické cviky"),
        balance: t("O rovnováhe"),
        flexibility: t("O flexibilite"),
        push: t("Tlak"),
        pull: t("Ťah"),
        legs: t("Nohy"),
        beginner: t("Pre začiatočníkov"),
        intermediate: t("Pre stredne pokročilých"),
        advanced: t("Pre pokročilých"),
        elite: t("Pre profesionálov"),
    }

    const query:string = search.trim().toLowerCase() // Gets The Query
    const articles:Article[] = (state.data?.articles ?? []).filter((article:Article) => !query || article.title.toLowerCase().includes(query) || article.description.toLowerCase().includes(query))

    // Function For Open An Article (In-App Content When Available, Otherwise The Website)
    const openArticle = (article:Article):void => {
        if(article.html_filename) router.push({ pathname: "/blog/[article]", params: { article: article.link } })
        else WebBrowser.openBrowserAsync(getArticleWebLink(article)).catch(() => {})
    }

    // Function For Render One Article
    const renderArticle = ({ item }:ListRenderItemInfo<Article>) => {
        const image_url:string|null = getArticleImageUrl(item.image_name)

        return (
            <View>
            <Card padding="none" onPress={() => openArticle(item)} accessibility_label={item.title} style={styles.card}>
                <View style={styles.image}>
                    {image_url ? <Image source={{ uri: image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : <Icon name="book-open" size={28} color="text_muted" />}
                </View>

                <View style={styles.card_body}>
                    <Text variant="heading" numberOfLines={2} style={styles.title}>{item.title}</Text>

                    <Text variant="callout" color="text_secondary" numberOfLines={2}>{item.description}</Text>

                    <View style={styles.meta}>
                        <View style={styles.meta_item}>
                            <Icon name="star" size={12} color="premium" />
                            <Text variant="caption" color="text_secondary" is_tabular>{item.average_rating.toFixed(1)}</Text>
                        </View>

                        <View style={styles.meta_item}>
                            <Icon name="eye" size={12} color="text_muted" is_solid={false} />
                            <Text variant="caption" color="text_secondary" is_tabular>{item.visitors}</Text>
                        </View>

                        <Text variant="caption" color="text_muted">{getFormattedDate(item.creation_time)}</Text>

                        {!item.html_filename && (
                            <View style={styles.meta_item}>
                                <Icon name="arrow-up-right-from-square" size={10} color="text_muted" />
                                <Text variant="caption" color="text_muted">{t("Na webe")}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Card>

            {/* Outside The Pressable Card, Because Buttons Can't Be Nested On Web */}
            <View style={styles.share}>
                <IconButton icon="share-nodes" accessibility_label={t("Zdieľať článok")} onPress={() => Share.share({ title: item.title, message: `Wesiq - ${item.title}\n${getArticleWebLink(item)}`, url: getArticleWebLink(item) }).catch(() => {})} variant="soft" size={36} />
            </View>
            </View>
        )
    }

    const list_header = (
        <View style={styles.list_header}>
            <TextField icon="magnifying-glass" placeholder={t("Hľadať články")} accessibilityLabel={t("Hľadať články")} value={search} onChangeText={setSearch} autoCorrect={false} returnKeyType="search" />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
                {SORTS.map((one_sort:ArticleSort) => <Chip key={one_sort} label={sort_labels[one_sort]} is_selected={sort === one_sort} onPress={() => setSort(one_sort)} />)}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
                {CATEGORIES.map((one_category:string) => <Chip key={one_category} label={category_labels[one_category] ?? one_category} is_selected={category === one_category} onPress={() => setCategory(one_category)} />)}
            </ScrollView>

            {state.status === "success" && <Text variant="caption" color="text_muted">{t("Články: {{count}}", { count: articles.length })}</Text>}
        </View>
    )

    return (
        <Screen is_scrollable={false} is_padded={false} header={<Header title={t("Blog")} subtitle={t("Návody, techniky a tipy na tréning")} is_large />}>
            <FlatList
                data={articles}
                keyExtractor={(article:Article) => String(article.id)}
                renderItem={renderArticle}
                ListHeaderComponent={list_header}
                refreshing={is_refreshing}
                onRefresh={refetch}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.list_content}

                ListEmptyComponent={
                    state.status === "loading" ? <View style={styles.skeletons}>{[0, 1].map((index:number) => <Skeleton key={index} height={300} radius={radii.lg} />)}</View>
                    : state.status === "error" ? <ErrorState error={state.error} onRetry={refetch} />
                    : <EmptyState icon="book-open" title={t("Nenašli sa žiadne články.")} message={query ? t("Skúste iné slovo.") : undefined} is_compact />
                }
            />
        </Screen>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    list_content: {
        flexGrow: 1,
        gap: spacing.lg,
        paddingHorizontal: layout.screen_padding,
        paddingBottom: spacing.xxxl,
    },

    list_header: {
        gap: spacing.md,
    },

    chips: {
        gap: spacing.sm,
        paddingRight: spacing.lg,
    },

    skeletons: {
        gap: spacing.lg,
    },

    card: {
        overflow: "hidden",
    },

    image: {
        width: "100%",
        aspectRatio: 16 / 9,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface_raised,
    },

    card_body: {
        gap: spacing.sm,
        padding: spacing.lg,
    },

    title: {
        paddingRight: spacing.xxl,
    },

    share: {
        position: "absolute",
        top: spacing.md,
        right: spacing.md,
    },

    meta: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: spacing.md,
    },

    meta_item: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
})
