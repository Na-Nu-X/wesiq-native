// The Sheets Every Article List Needs (Share) Wired To The List's Update Functions

import { useCallback, useState } from "react"
import ShareArticleSheet, { SharedArticleInfo } from "./ShareArticleSheet"

import type { Article } from "@/types/models"

export function useArticleSheets() {
    const [share_article, setShareArticle] = useState<SharedArticleInfo|null>(null)

    const sheets = (
        <ShareArticleSheet article={share_article} onClose={() => setShareArticle(null)} />
    )

    return {
        sheets,
        openShare: useCallback((article:Article) => setShareArticle({ id: article.id, article_title: article.title, article_link: article.link }), []),
    }
}
