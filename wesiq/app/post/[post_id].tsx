// One Post (Opened From A Link, A Profile Grid Or A Chat)

import { useCallback } from "react"
import { StyleSheet, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useTranslation } from "react-i18next"
import { Button, EmptyState, ErrorState, Header, Screen, Skeleton } from "@/components/ui"
import { radii, spacing } from "@/theme"
import { useApiQuery } from "@/hooks/useApiQuery"
import { getPost } from "@/lib/api/endpoints/posts"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"
import PostCard from "@/components/features/posts/PostCard"
import { PlayingVideoProvider } from "@/components/features/posts/PostVideo"
import { usePostSheets } from "@/components/features/posts/usePostSheets"

import type { Post, PostAuthor } from "@/types/models"

export default function PostScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { post_id } = useLocalSearchParams<{ post_id:string }>() // Gets The Post ID
    const auth_sheet = useAuthSheet() // Opens The Login Sheet

    const { state, refetch, is_refreshing, setData } = useApiQuery(`post:${post_id ?? ""}`, async (signal:AbortSignal) => {
        const response = await getPost(post_id ?? "", signal) // Loads The Post
        return response.ok ? { ...response, data: response.data.post } : response
    }, { is_enabled: Boolean(post_id) })

    const updatePost = useCallback((post:Post) => setData(() => post), [setData])
    const updateAuthor = useCallback((_user_id:number, changes:Partial<PostAuthor>) => setData((previous) => previous ? { ...previous, user: { ...previous.user, ...changes } } : previous), [setData])
    const requireLogin = useCallback(() => auth_sheet.open("login_form"), [auth_sheet])

    const sheets = usePostSheets({
        updatePost,
        onRequireLogin: requireLogin,

        removePost: () => {
            if(router.canGoBack()) router.back()
            else router.replace("/")
        },
    })

    const post:Post|null = state.data // Gets The Post

    return (
        <PlayingVideoProvider>
            <Screen
                header={<Header title={post ? post.user.username : t("Príspevok")} has_back_button />}
                refresh={{ is_refreshing, onRefresh: refetch }}
                edges={["top", "left", "right", "bottom"]}
            >
                {state.status === "loading" && <Skeleton height={520} radius={radii.lg} />}

                {state.status === "error" && (
                    state.error.status === 404
                        ? <EmptyState icon="image" title={t("Príspevok sa nenašiel")} message={t("Mohol byť odstránený alebo je dostupný len pre sledovateľov.")} action={{ label: t("Späť na domov"), onPress: () => router.replace("/") }} />
                        : <ErrorState error={state.error} onRetry={refetch} />
                )}

                {!!post && (
                    <View style={styles.content}>
                        <PostCard
                            post={post}
                            onPostChange={sheets.handlePostChange}
                            onAuthorChange={updateAuthor}
                            onOpenComments={sheets.openComments}
                            onOpenMenu={sheets.openMenu}
                            onShare={sheets.openShare}
                            onRequireLogin={requireLogin}
                            is_detail
                        />

                        {post.allow_comments && (
                            <Button
                                label={post.comments_amount > 0 ? t("Zobraziť komentáre ({{count}})", { count: post.comments_amount }) : t("Pridať komentár...")}
                                icon="comment"
                                variant="secondary"
                                onPress={() => sheets.openComments(post)}
                                is_full_width
                            />
                        )}
                    </View>
                )}
            </Screen>

            {sheets.sheets}
        </PlayingVideoProvider>
    )
}

const styles = StyleSheet.create({
    content: {
        gap: spacing.lg,
    },
})
