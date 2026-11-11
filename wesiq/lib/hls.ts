// HLS Playback Helper: iOS And Android Players Play HLS Natively, So Nothing Is Needed Here (See hls.web.ts)

import type { VideoPlayer } from "expo-video"

export const needs_hls_library:boolean = false // Native Players Load The .m3u8 Source Themselves

export const useHlsSource = (_player:VideoPlayer, _hls_uri:string|null, _user_token:string|null):void => {} // Native Players Keep Their Position Between Views Themselves
