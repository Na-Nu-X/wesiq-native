// Rewrites Incoming Links Before Expo Router Matches Them. The Password Reset Email Links To The Website's
// Language-Prefixed, Translated Route (E.g. https://wesiq.com/en/password-reset?password-reset-code=123456), Which Has
// No Matching Route Here, So It Is Sent To /password-reset?code=…

// Translated Slugs Of The Django "password_reset_url" Route (Keep In Sync With The intentFilters In app.json)
const PASSWORD_RESET_SLUGS:ReadonlySet<string> = new Set<string>([
    "obnova-hesla", // sk, cs
    "password-reset", // en
    "recuperacion-de-contrasena", // es
    "recuperation-de-mot-de-passe", // fr
    "vidnovlennya-parolya", // uk
    "vosstanovleniye-parolya", // ru
    "recuperacao-de-senha", // pt-br
    "passwortwiederherstellung" // de
])

// Function For Redirect A System Path To The Matching App Route
export function redirectSystemPath({ path }:{ path:string, initial:boolean }):string {
    try {
        const url:URL = new URL(path, "https://wesiq.com") // Accepts Both Full URLs And Bare Paths
        const segments:string[] = url.pathname.split("/").filter(Boolean) // E.g. ["en", "password-reset"]
        const slug:string|undefined = segments[segments.length - 1] // Gets The Slug

        if(slug !== undefined && segments.length <= 2 && PASSWORD_RESET_SLUGS.has(slug)) {
            const code:string|null = url.searchParams.get("password-reset-code") ?? url.searchParams.get("code") // Gets The Code
            return code ? `/password-reset?code=${encodeURIComponent(code)}` : "/password-reset"
        }
    } 
    
    catch {
        // Unparsable Links Fall Through Unchanged
    }

    return path
}
