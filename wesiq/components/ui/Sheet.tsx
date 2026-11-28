// Modal Sheet: A Bottom Sheet On Phones (Drag Down To Close) And A Centered Dialog On Tablets And Web

import { ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { HostInstance, Keyboard, KeyboardAvoidingView, LayoutChangeEvent, Modal, ModalProps, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, ScrollViewInstance, StyleSheet, TextInput, useWindowDimensions, View } from "react-native"
import { GestureDetector, GestureHandlerRootView, usePanGesture } from "react-native-gesture-handler"
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { colors, durations, layout, radii, shadows, spacing } from "@/theme"
import Text from "./Text"
import IconButton from "./IconButton"
import ListContextReset from "./ListContextReset"
import { SheetScrollContext } from "./SheetScroll"

export interface SheetProps {
    visible:boolean,
    onClose:() => void,
    title:string,
    subtitle?:string,
    children:ReactNode,
    footer?:ReactNode, // Pinned Actions Below The Content
    header_right?:ReactNode, // Extra Header Action Next To The Close Button
    size?:"auto"|"large", // "auto" Fits The Content (Up To 90%), "large" Always Takes 90%
    is_scrollable?:boolean, // Wraps The Children In A ScrollView (Disable When The Children Are A FlatList)
    is_dismissable?:boolean, // False While Saving (Blocks Backdrop / Drag / Back Button)
    supported_orientations?:ModalProps["supportedOrientations"] // iOS: Allow Landscape When Opened Over A Landscape Screen (Fullscreen Video)
}

const WIDE_BREAKPOINT:number = 700 // Width From Which The Sheet Is Shown As A Centered Dialog
const DISMISS_DISTANCE:number = 120 // Drag Distance That Closes The Sheet
const DISMISS_VELOCITY:number = 900 // Drag Velocity That Closes The Sheet
const REVEAL_DELAY_MS:number = 120 // Waits For The Sheet To Shrink Above The Keyboard Before Measuring

export default function Sheet({
    visible,
    onClose,
    title,
    subtitle,
    children,
    footer,
    header_right,
    size = "auto",
    is_scrollable = true,
    is_dismissable = true,
    supported_orientations,
}:SheetProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { width, height } = useWindowDimensions() // Gets The Window Size
    const insets = useSafeAreaInsets() // Gets The Safe Area Insets
    const is_wide:boolean = width >= WIDE_BREAKPOINT // Stores The Information If The Dialog Layout Is Used (Tablets, Desktop Web)

    // Keeps The Modal Mounted Until The Close Animation Finishes (State Is Adjusted During Render, Not In An Effect)
    const [is_mounted, setIsMounted] = useState<boolean>(visible) // Stores If It Is Mounted
    const [previous_visible, setPreviousVisible] = useState<boolean>(visible) // Stores The Previous Visible

    if(visible !== previous_visible) {
        setPreviousVisible(visible) // Sets The Previous Visible
        if(visible) setIsMounted(true)
    }

    const [is_keyboard_open, setIsKeyboardOpen] = useState<boolean>(false) // Stores The Information If The Keyboard Is Shown

    const scroll_ref = useRef<ScrollViewInstance>(null) // Scrolls The Focused Input Into View
    const scroll_offset = useRef<number>(0) // Stores The Current Scroll Position
    const viewport_height = useRef<number>(0) // Stores The Visible Height Of The ScrollView
    const reveal_timeout = useRef<ReturnType<typeof setTimeout>|null>(null) // Debounces The Reveal

    // Function For Scroll The Focused Input Above The Keyboard (The Keyboard Avoiding View Only Shrinks The Sheet)
    const revealFocusedInput = useCallback((target?:HostInstance|null):void => {
        if(Platform.OS === "web") return // Browsers Scroll Focused Inputs Into View Themselves

        if(reveal_timeout.current) clearTimeout(reveal_timeout.current)

        reveal_timeout.current = setTimeout(() => {
            const input:HostInstance|null = target ?? TextInput.State.currentlyFocusedInput() ?? null // Gets The Target Or The Focused Input
            const content = scroll_ref.current?.getInnerViewRef() // Gets The Scroll Content
            if(!input || !content || viewport_height.current <= 0) return

            // Measures The Input Inside The Scroll Content (Fails For Inputs Outside Of It, E.g. In The Footer)
            input.measureLayout(content, (_x:number, y:number, _width:number, input_height:number) => {
                const visible_top:number = scroll_offset.current // Gets The Visible Top
                const visible_bottom:number = visible_top + viewport_height.current // Gets The Visible Bottom
                const margin:number = spacing.lg // Gets The Margin

                const is_too_tall:boolean = input_height + margin * 2 > viewport_height.current // Stores The Information If The View Doesn't Fit Above The Keyboard

                let scroll_target:number|null = null // Gets The Scroll Target

                if(target && is_too_tall) scroll_target = y - margin // A Tall Target (Input With Suggestions) Is Aligned To Its Top So The Input Stays Visible
                else if(y + input_height + margin > visible_bottom) scroll_target = y + input_height + margin - viewport_height.current // Below The Visible Area (Shows The Bottom, Where The Caret Is While Typing)
                else if(y - margin < visible_top) scroll_target = y - margin // Above The Visible Area

                if(scroll_target !== null) scroll_ref.current?.scrollTo({ y: Math.max(0, scroll_target), animated: true })
            }, () => {})
        }, REVEAL_DELAY_MS)
    }, [])

    // Initializes The Cleanup Of The Reveal Timeout
    useEffect(() => {
        return () => {
            if(reveal_timeout.current) clearTimeout(reveal_timeout.current)
        }
    }, [])

    // Initializes The Keyboard Listeners (The Footer Drops The Home Indicator Inset While Typing)
    useEffect(() => {
        if(!is_mounted) return

        const show_event = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow" // Gets The Show Event
        const hide_event = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide" // Gets The Hide Event
        // Gets The Show Subscription
        const show_subscription = Keyboard.addListener(show_event, () => {
            setIsKeyboardOpen(true) // Sets The Keyboard Open State
            revealFocusedInput()
        })
        const hide_subscription = Keyboard.addListener(hide_event, () => setIsKeyboardOpen(false)) // Gets The Hide Subscription

        return () => {
            show_subscription.remove()
            hide_subscription.remove()
        }
    }, [is_mounted, revealFocusedInput])

    const progress = useSharedValue<number>(0) // 0 = Hidden, 1 = Shown
    const drag_offset = useSharedValue<number>(0) // Current Drag Distance

    // Initializes The Open / Close Animation
    useEffect(() => {
        if(!is_mounted) return

        if(visible) {
            drag_offset.set(0)
            progress.set(withTiming(1, { duration: durations.normal + 50, easing: Easing.out(Easing.cubic) }))
        }

        else {
            progress.set(withTiming(0, { duration: durations.normal, easing: Easing.in(Easing.cubic) }, (is_finished?:boolean) => {
                if(is_finished) scheduleOnRN(setIsMounted, false)
            }))
        }
    }, [visible, is_mounted, progress, drag_offset])

    // Function For Request The Close
    const requestClose = ():void => {
        if(is_dismissable) onClose()
    }

    // Drag Down To Close (Only On The Handle And Header, So It Never Fights With Scrolling)
    const pan_gesture = usePanGesture({
        enabled: !is_wide && is_dismissable,
        activeOffsetY: 8,
        failOffsetX: [-20, 20],

        onUpdate: (event) => {
            drag_offset.set(Math.max(0, event.translationY))
        },

        onDeactivate: (event) => {
            if(event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) scheduleOnRN(onClose)
            else drag_offset.set(withSpring(0, { damping: 20, stiffness: 220 }))
        },
    })

    // Gets The Backdrop Style
    const backdrop_style = useAnimatedStyle(() => ({
        opacity: progress.get(),
    }))

    // Gets The Panel Style
    const panel_style = useAnimatedStyle(() => {
        if(is_wide) {
            return {
                opacity: progress.get(),
                transform: [{ scale: interpolate(progress.get(), [0, 1], [0.96, 1]) }],
            }
        }

        return {
            transform: [{ translateY: interpolate(progress.get(), [0, 1], [height, 0]) + drag_offset.get() }],
        }
    })

    if(!is_mounted) return null

    const max_height:number = is_wide ? Math.min(height * 0.85, 760) : height * 0.9 // Gets The Max Height

    // Gets The Content
    const content:ReactNode = is_scrollable ? (
        <ScrollView
            ref = {scroll_ref}
            style = {size === "large" ? styles.flex : styles.scroll} // Large Sheets Keep The Footer Pinned To The Bottom
            scrollEventThrottle = {32}

            onScroll = {(event:NativeSyntheticEvent<NativeScrollEvent>) => {
                scroll_offset.current = event.nativeEvent.contentOffset.y
            }}

            onLayout = {(event:LayoutChangeEvent) => {
                viewport_height.current = event.nativeEvent.layout.height
                if(is_keyboard_open) revealFocusedInput() // The Sheet Shrank Above The Keyboard
            }}

            contentContainerStyle = {[styles.scroll_content, size === "large" ? styles.scroll_content_large : null,!footer ? { paddingBottom: spacing.xl + (is_wide ? 0 : insets.bottom) } : null]}
            keyboardShouldPersistTaps = "handled"
            showsVerticalScrollIndicator = {false}
            bounces = {false}
        >
            <SheetScrollContext.Provider value = {revealFocusedInput}>
                {children}
            </SheetScrollContext.Provider>
        </ScrollView>
    ) : (
        <View style = {[styles.static_content, !footer && !is_wide ? { paddingBottom: insets.bottom } : null]}>{children}</View>
    )

    return (
        <Modal
            visible
            transparent
            animationType = "none"
            statusBarTranslucent
            navigationBarTranslucent
            supportedOrientations = {supported_orientations}
            onRequestClose = {requestClose} // Android Back Button
        >
            <GestureHandlerRootView style = {styles.flex}>
                <ListContextReset>
                <KeyboardAvoidingView
                    style = {styles.flex}
                    behavior = "padding"
                    enabled = {Platform.OS !== "web"}
                >
                    <View style = {[styles.flex, is_wide ? styles.center : [styles.bottom, { paddingTop: insets.top + spacing.sm }]]}>
                        <Animated.View style = {[StyleSheet.absoluteFill, styles.backdrop, backdrop_style]}>
                            <Pressable
                                style = {StyleSheet.absoluteFill}
                                onPress = {requestClose}
                                accessibilityRole = "button"
                                accessibilityLabel = {t("Zavrieť")}
                            />
                        </Animated.View>

                        <Animated.View
                            accessibilityViewIsModal
                            style = {[
                                styles.panel,
                                is_wide ? styles.panel_wide : styles.panel_sheet,
                                { maxHeight: max_height },
                                size === "large" ? { height: max_height } : null,
                                panel_style,
                            ]}
                        >
                            <GestureDetector gesture = {pan_gesture}>
                                <View style = {styles.header_area}>
                                    {!is_wide &&
                                        <View style = {styles.handle} />
                                    }

                                    <View style = {styles.header}>
                                        <View style = {styles.header_text}>
                                            <Text
                                                variant = "heading"
                                                accessibilityRole = "header"
                                                numberOfLines = {2}
                                            >
                                                {title}
                                            </Text>
                                            {!!subtitle &&
                                                <Text
                                                    variant = "callout"
                                                    color = "text_secondary"
                                                    numberOfLines = {2}
                                                >
                                                    {subtitle}
                                                </Text>
                                            }
                                        </View>

                                        {header_right}

                                        <IconButton
                                            icon = "xmark"
                                            accessibility_label = {t("Zavrieť")}
                                            onPress = {requestClose}
                                            is_disabled = {!is_dismissable}
                                            variant = "soft"
                                            size = {34}
                                        />
                                    </View>
                                </View>
                            </GestureDetector>

                            {content}

                            {!!footer && (
                                <View style = {[styles.footer, { paddingBottom: is_wide || is_keyboard_open ? spacing.md : Math.max(insets.bottom, spacing.lg) }]}>
                                    {footer}
                                </View>
                            )}
                        </Animated.View>
                    </View>
                </KeyboardAvoidingView>
                </ListContextReset>
            </GestureHandlerRootView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    center: {
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xxl,
    },

    bottom: {
        justifyContent: "flex-end",
    },

    backdrop: {
        backgroundColor: colors.overlay,
    },

    panel: {
        flexShrink: 1, // Shrinks Above The Keyboard Instead Of Overflowing The Screen (Large Sheets Have A Fixed Height)
        minHeight: 0,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: layout.hairline,
        overflow: "hidden",
        ...shadows.lg,
    },

    panel_sheet: {
        width: "100%",
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        borderBottomWidth: 0,
    },

    panel_wide: {
        width: "100%",
        maxWidth: layout.max_dialog_width,
        borderRadius: radii.xl,
    },

    header_area: {
        paddingTop: spacing.sm,
    },

    handle: {
        alignSelf: "center",
        width: 40,
        height: 5,
        marginBottom: spacing.xs,
        backgroundColor: colors.surface_strong,
        borderRadius: radii.pill,
    },

    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
    },

    header_text: {
        flex: 1,
        gap: 2,
        paddingTop: 4,
    },

    scroll: {
        flexGrow: 0,
        flexShrink: 1,
    },

    scroll_content: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
        gap: spacing.lg,
    },

    scroll_content_large: {
        flexGrow: 1,
    },

    static_content: {
        flexShrink: 1,
        flexGrow: 1,
        minHeight: 0,
    },

    footer: {
        gap: spacing.sm, // Column Layout (Wrap Buttons In A Row View To Place Them Side By Side)
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        borderTopWidth: layout.hairline,
        borderTopColor: colors.divider,
        backgroundColor: colors.surface,
    },
})
