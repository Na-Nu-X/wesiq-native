// Three Column Grid Of Post Thumbnails (Profile Posts And Saved Posts, Long Press A Tile To Enlarge It)

import { useState } from "react"
import { LayoutChangeEvent, StyleSheet, View } from "react-native"
import EnlargingPost from "./EnlargingPost"

import type { ProfilePostPreview } from "@/types/models"

const COLUMNS:number = 3
const GAP:number = 3

export default function PostGrid({ posts, author_username }:{ posts:ProfilePostPreview[], author_username:string }) {
    const [width, setWidth] = useState<number>(0) // Stores The Grid Width
    const tile:number = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0 // Gets The Tile Size

    return (
        <View style={styles.grid} onLayout={(event:LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
            {tile > 0 && posts.map((post:ProfilePostPreview) => (
                <EnlargingPost key={post.id} post={post} size={tile} author_username={author_username} />
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: GAP,
    },
})
