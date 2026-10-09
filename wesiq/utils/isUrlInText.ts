// Function For Check If The URL Is In Text
export const isUrlInText = (text:string|null):boolean => {
    if(!text) return false
    const url_regex:RegExp = /(https?:\/\/[^\s]+)/g
    return url_regex.test(text)
}