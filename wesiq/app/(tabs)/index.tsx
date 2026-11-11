// Home: Community Feed

import { useCallback, useState } from "react"
import { ActivityIndicator, FlatList, ListRenderItemInfo, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { EmptyState, ErrorState, Header, IconButton, Screen, Skeleton, Text, TextField } from "@/components/ui"
import { colors, fonts, layout, radii, spacing } from "@/theme"
import { emitAppEvent } from "@/lib/events"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"
import UploadPostSheet, { CompressTask } from "@/components/features/upload-post/UploadPostSheet"
import PostCard from "@/components/features/posts/PostCard"
import ProcessingPostCard from "@/components/features/posts/ProcessingPostCard"
import { PlayingVideoProvider } from "@/components/features/posts/PostVideo"
import { usePostsFeed } from "@/components/features/posts/usePostsFeed"
import { usePostSheets } from "@/components/features/posts/usePostSheets"
import { useUploadTracking } from "@/components/features/posts/useUploadTracking"

import type { Post, ProcessingPost } from "@/types/models"

export default function HomeScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const auth_sheet = useAuthSheet() // Opens The Login Sheet

    const [search, setSearch] = useState<string>("") // Stores The Typed Search
    const debounced_search:string = useDebouncedValue(search.trim(), 400) // Waits Until Typing Stops
    const [is_upload_open, setIsUploadOpen] = useState<boolean>(false) // Stores The Information If The Upload Sheet Is Open

    const feed = usePostsFeed(debounced_search) // Loads The Feed
    const uploads = useUploadTracking(logged_in_user !== null) // Tracks Posts Being Processed

    const requireLogin = useCallback(() => auth_sheet.open("login_form"), [auth_sheet])
    const sheets = usePostSheets({ updatePost: feed.updatePost, removePost: feed.removePost, onRequireLogin: requireLogin })

    // Function For Handle A Finished Upload
    const handleUploaded = async (tasks:CompressTask[]):Promise<void> => {
        if(tasks.length > 0) await uploads.addTasks(tasks)
        emitAppEvent("posts_changed") // Photos Are Ready Immediately, Videos After Processing
    }

    // Function For Render One Post
    const renderPost = useCallback(({ item }:ListRenderItemInfo<Post>) => (
        <PostCard
            post={item}
            onPostChange={sheets.handlePostChange}
            onAuthorChange={feed.updateAuthor}
            onOpenComments={sheets.openComments}
            onOpenMenu={sheets.openMenu}
            onShare={sheets.openShare}
            onRequireLogin={requireLogin}
        />
    ), [sheets.handlePostChange, feed.updateAuthor, sheets.openComments, sheets.openMenu, sheets.openShare, requireLogin])

    const list_header = (
        <View style={styles.list_header}>
            <TextField
                icon="magnifying-glass"
                placeholder={t("Hľadať príspevky")}
                accessibilityLabel={t("Hľadať príspevky")}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
            />

            {uploads.processing_posts.map((post:ProcessingPost) => <ProcessingPostCard key={post.id} post={post} tasks={uploads.tracked} />)}
        </View>
    )

    // Function For Render The Content When There Are No Posts
    const renderEmpty = () => {
        if(feed.is_loading) return <View style={styles.skeletons}>{[0, 1].map((index:number) => <Skeleton key={index} height={420} radius={radii.lg} />)}</View>
        if(feed.error) return <ErrorState error={feed.error} onRetry={feed.refresh} />
        if(debounced_search) return <EmptyState icon="magnifying-glass" title={t("Nenašli sa žiadne príspevky.")} message={t("Skúste iné slovo alebo hashtag.")} />

        return (
            <EmptyState
                icon="images"
                title={t("Zatiaľ tu nič nie je")}
                message={t("Sledujte ľudí z komunity alebo pridajte svoj prvý príspevok.")}
                action={logged_in_user ? { label: t("Nový príspevok"), onPress: () => setIsUploadOpen(true) } : { label: t("Prihlásiť sa"), onPress: requireLogin }}
            />
        )
    }

    return (
        <PlayingVideoProvider>
            <Screen
                is_scrollable={false}
                is_padded={false}

                header={
                    <Header
                        left={<Text style={styles.wordmark} accessibilityRole="header">Wesiq</Text>}

                        right={
                            <>
                                <IconButton icon="user-plus" accessibility_label={t("Hľadať ľudí")} onPress={() => router.push("/users")} variant="soft" size={38} />
                                <IconButton icon="plus" accessibility_label={t("Nový príspevok")} onPress={() => logged_in_user ? setIsUploadOpen(true) : requireLogin()} variant="solid" size={38} />
                            </>
                        }
                    />
                }
            >
                <FlatList
                    data={feed.posts}
                    keyExtractor={(post:Post) => post.id}
                    renderItem={renderPost}
                    ListHeaderComponent={list_header}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={feed.is_loading_more ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : feed.posts.length > 0 && !feed.has_next ? <Text variant="caption" color="text_muted" align="center" style={styles.footer}>{t("Videli ste všetky príspevky.")}</Text> : undefined}
                    onEndReached={feed.loadMore}
                    onEndReachedThreshold={0.6}
                    refreshing={feed.is_refreshing}
                    onRefresh={feed.refresh}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.list_content}
                    windowSize={7}
                    initialNumToRender={3}
                    maxToRenderPerBatch={3}
                />
            </Screen>

            {sheets.sheets}

            <UploadPostSheet visible={is_upload_open} onClose={() => setIsUploadOpen(false)} onUploaded={handleUploaded} />
        </PlayingVideoProvider>
    )
}

const styles = StyleSheet.create({
    wordmark: {
        fontFamily: fonts.brand,
        fontSize: 24,
        lineHeight: 30,
        color: colors.text,
    },

    list_content: {
        flexGrow: 1,
        gap: spacing.lg,
        paddingHorizontal: layout.screen_padding,
        paddingBottom: spacing.xxxl,
    },

    list_header: {
        gap: spacing.md,
        paddingTop: spacing.xs,
    },

    skeletons: {
        gap: spacing.lg,
    },

    footer: {
        paddingVertical: spacing.xl,
    },
})
