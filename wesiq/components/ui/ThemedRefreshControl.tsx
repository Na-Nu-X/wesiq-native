// Pull-To-Refresh With The Shared Spinner Color (Pass It As "refreshControl" Instead Of The "refreshing" / "onRefresh" List Props)

import { RefreshControl, RefreshControlProps } from "react-native"
import { colors } from "@/theme"

export default function ThemedRefreshControl(props:RefreshControlProps) {
    return (
        <RefreshControl
            tintColor = {colors.spinner} // iOS
            colors = {[colors.spinner]} // Android
            progressBackgroundColor = {colors.surface_raised} // Android
            {...props} // Also Passes The Scroll View Children On Android
        />
    )
}
