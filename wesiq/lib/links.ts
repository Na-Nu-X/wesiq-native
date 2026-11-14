// Bio Links: Display Domain And The Brand Icon Of Well-Known Sites

import type { IconName } from "@/components/ui"

// Brand Icons Keyed By The Site's Domains (Subdomains Like m. Or open. Match Too)
const BRAND_ICONS:{ icon:IconName, domains:string[] }[] = [
    { icon: "instagram", domains: ["instagram.com", "instagr.am"] },
    { icon: "facebook", domains: ["facebook.com", "fb.com", "fb.me"] },
    { icon: "x-twitter", domains: ["x.com", "twitter.com"] },
    { icon: "youtube", domains: ["youtube.com", "youtu.be"] },
    { icon: "tiktok", domains: ["tiktok.com"] },
    { icon: "reddit", domains: ["reddit.com", "redd.it"] },
    { icon: "threads", domains: ["threads.net", "threads.com"] },
    { icon: "bluesky", domains: ["bsky.app"] },
    { icon: "linkedin", domains: ["linkedin.com", "lnkd.in"] },
    { icon: "github", domains: ["github.com"] },
    { icon: "gitlab", domains: ["gitlab.com"] },
    { icon: "twitch", domains: ["twitch.tv"] },
    { icon: "discord", domains: ["discord.com", "discord.gg"] },
    { icon: "spotify", domains: ["spotify.com", "spotify.link"] },
    { icon: "soundcloud", domains: ["soundcloud.com"] },
    { icon: "pinterest", domains: ["pinterest.com", "pin.it"] },
    { icon: "snapchat", domains: ["snapchat.com"] },
    { icon: "telegram", domains: ["t.me", "telegram.me", "telegram.org"] },
    { icon: "whatsapp", domains: ["whatsapp.com", "wa.me"] },
    { icon: "strava", domains: ["strava.com", "strava.app.link"] },
    { icon: "patreon", domains: ["patreon.com"] },
    { icon: "medium", domains: ["medium.com"] },
    { icon: "vimeo", domains: ["vimeo.com"] },
    { icon: "tumblr", domains: ["tumblr.com"] },
    { icon: "vk", domains: ["vk.com"] },
]

// Function For Get The Display Domain Of A Link
export const getLinkDomain = (url:string):string => {
    return url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0] || url
}

// Function For Get The Icon Of A Link (The Brand For Well-Known Sites, Otherwise A Plain Link)
export const getLinkIcon = (url:string):IconName => {
    const host:string = getLinkDomain(url).toLowerCase().replace(/:\d+$/, "") // Gets The Host Without The Port

    const brand = BRAND_ICONS.find(({ domains }) => domains.some((domain:string) => host === domain || host.endsWith(`.${domain}`)))
    return brand?.icon ?? "link"
}
