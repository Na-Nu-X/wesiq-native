// Last 7 Days At A Glance (Average Time, Count, Latest And Longest Activity)

import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Card, Icon, Skeleton, Text } from "@/components/ui"
import { radii, spacing } from "@/theme"
import { getMinimalistFormattedTime, getTimeAgo } from "@/utils/time"

import type { IconName } from "@/components/ui"
import type { ActivityStats } from "@/lib/api/endpoints/activity"
import type { Activity } from "@/types/models"

interface StatsGridProps {
    stats:ActivityStats|null,
    is_loading:boolean
}

export default function StatsGrid({ stats, is_loading }:StatsGridProps) {
    const { t } = useTranslation() // Initializes The Translations

    if(is_loading && !stats) {
        return <View style={styles.grid}>{[0, 1, 2, 3].map((index:number) => <Skeleton key={index} height={92} radius={radii.lg} style={styles.tile} />)}</View>
    }

    const describe = (activity:Activity|null):string|undefined => activity ? `${activity.gained_xp} XP · ${getTimeAgo(activity.end_time)}` : undefined

    const tiles:{ icon:IconName, label:string, value:string, detail?:string }[] = [
        { icon: "clock", label: t("Priemer · 7 dní"), value: stats ? getMinimalistFormattedTime(stats.average_activity_time) : "0s" },
        { icon: "calendar-check", label: t("Aktivity · 7 dní"), value: String(stats?.activities_amount ?? 0) },
        { icon: "list", label: t("Posledná"), value: stats?.latest_activity ? getMinimalistFormattedTime(stats.latest_activity.elapsed_time) : "—", detail: describe(stats?.latest_activity ?? null) ?? t("Zatiaľ žiadna") },
        { icon: "medal", label: t("Najdlhšia"), value: stats?.longest_activity ? getMinimalistFormattedTime(stats.longest_activity.elapsed_time) : "—", detail: describe(stats?.longest_activity ?? null) ?? t("Zatiaľ žiadna") },
    ]

    return (
        <View style={styles.grid}>
            {tiles.map((tile) => (
                <Card key={tile.label} padding="md" style={styles.tile}>
                    <View accessible accessibilityLabel={[tile.label, tile.value, tile.detail].filter(Boolean).join(", ")} style={styles.tile_content}>
                        <View style={styles.label_row}>
                            <Icon name={tile.icon} size={12} color="primary" is_solid={false} />
                            <Text variant="caption" color="text_secondary" numberOfLines={1} style={styles.flex}>{tile.label}</Text>
                        </View>

                        <Text variant="heading" is_tabular numberOfLines={1}>{tile.value}</Text>
                        {!!tile.detail && <Text variant="caption" color="text_muted" numberOfLines={1}>{tile.detail}</Text>}
                    </View>
                </Card>
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
    },

    tile: {
        flexGrow: 1,
        flexBasis: "45%",
    },

    tile_content: {
        gap: spacing.xs,
    },

    label_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
    },
})
